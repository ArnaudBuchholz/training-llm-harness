import { createInterface } from 'node:readline/promises';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import OpenAI from 'openai';
import { PROVIDER } from './config.js';

// --- Session trace ---

const sessionDir = join('tmp', new Date().toISOString().replace(/[:.]/g, '-'));
mkdirSync(sessionDir, { recursive: true });
let traceIndex = 0;

function trace(label: string, payload: unknown): void {
  const n = String(traceIndex++).padStart(3, '0');
  const file = join(sessionDir, `${n}-${label}.json`);
  writeFileSync(file, JSON.stringify(payload, null, 2));
}

// --- Tool definition ---

interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema object
  script: string; // path to executable; receives args as JSON on stdin, returns result on stdout
}

// Register tools here
const TOOLS: Tool[] = [
  // {
  //   name: 'get_weather',
  //   description: 'Get current weather for a city',
  //   parameters: {
  //     type: 'object',
  //     properties: { city: { type: 'string', description: 'City name' } },
  //     required: ['city'],
  //   },
  //   script: './tools/get_weather.sh',
  // },
];

// --- Tool execution ---

function executeTool(toolName: string, args: Record<string, unknown>): Promise<string> {
  const tool = TOOLS.find((t) => t.name === toolName);
  if (!tool) return Promise.resolve(`Error: unknown tool "${toolName}"`);

  return new Promise((resolve) => {
    const child = spawn(tool.script, [], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
    child.on('close', (code) => {
      resolve(code === 0 ? stdout.trim() : `Error (exit ${String(code)}): ${stderr.trim() || stdout.trim()}`);
    });
    child.stdin.write(JSON.stringify(args));
    child.stdin.end();
  });
}

// --- Token tracking ---

let totalInput = 0;
let totalOutput = 0;

function estimateHistoryTokens(messages: OpenAI.Chat.ChatCompletionMessageParam[]): number {
  return Math.ceil(JSON.stringify(messages).length / 4);
}

// --- Main loop ---

const client = new OpenAI({ apiKey: PROVIDER.apiKey, baseURL: PROVIDER.baseURL });
const systemPrompt = process.env.SYSTEM_PROMPT ?? 'You are a helpful assistant.';
const history: OpenAI.Chat.ChatCompletionMessageParam[] = [];

const openaiTools: OpenAI.Chat.ChatCompletionTool[] = TOOLS.map((t) => ({
  type: 'function' as const,
  function: { name: t.name, description: t.description, parameters: t.parameters },
}));

const rl = createInterface({ input: process.stdin, output: process.stdout });

console.log(`Provider: ${PROVIDER.name}  Model: ${PROVIDER.model}`);
console.log(`System: ${systemPrompt}`);
if (TOOLS.length > 0) console.log(`Tools: ${TOOLS.map((t) => t.name).join(', ')}`);
console.log(`Session traces: ${sessionDir}`);
console.log('Type a message or "exit" to quit.\n');

while (true) {
  const input = (await rl.question('You: ')).trim();
  if (!input) continue;
  if (input.toLowerCase() === 'exit') break;

  history.push({ role: 'user', content: input });

  // Agentic loop — keep calling until no tool_calls remain
  while (true) {
    const request = {
      model: PROVIDER.model,
      messages: [{ role: 'system', content: systemPrompt }, ...history],
      ...(openaiTools.length > 0 ? { tools: openaiTools } : {}),
    };
    trace('request', request);
    const response = await client.chat.completions.create(request);
    trace('response', response);

    const usage = response.usage;
    if (usage) {
      totalInput += usage.prompt_tokens;
      totalOutput += usage.completion_tokens;
    }

    const choice = response.choices[0];
    if (!choice) break;

    history.push(choice.message as OpenAI.Chat.ChatCompletionMessageParam);

    if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
      for (const call of choice.message.tool_calls) {
        const args = JSON.parse(call.function.arguments) as Record<string, unknown>;
        process.stdout.write(`[tool] ${call.function.name}(${call.function.arguments})\n`);
        const result = await executeTool(call.function.name, args);
        process.stdout.write(`[tool result] ${result}\n`);
        history.push({ role: 'tool', tool_call_id: call.id, content: result });
      }
      continue; // send tool results back to the model
    }

    // Final text response
    console.log(`\nAssistant: ${choice.message.content ?? ''}`);
    console.log(
      `\n[tokens] turn — in: ${String(usage?.prompt_tokens ?? '?')}, out: ${String(usage?.completion_tokens ?? '?')}` +
      ` | session total — in: ${String(totalInput)}, out: ${String(totalOutput)}` +
      ` | history est.: ~${String(estimateHistoryTokens(history))} tokens\n`,
    );
    break;
  }
}

rl.close();
console.log(`\nSession ended. Total tokens — input: ${String(totalInput)}, output: ${String(totalOutput)}`);
