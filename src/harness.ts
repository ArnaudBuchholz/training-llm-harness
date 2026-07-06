import { createInterface } from 'node:readline/promises';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import OpenAI from 'openai';
import { PROVIDER } from './config.js';
import type { ITool } from './ITool.js';

const sessionDir = join('tmp', new Date().toISOString().replace(/[:.]/g, '-'));
mkdirSync(sessionDir, { recursive: true });
let traceIndex = 0;

function trace(label: string, payload: unknown): void {
  const n = String(traceIndex++).padStart(3, '0');
  const file = join(sessionDir, `${n}-${label}.json`);
  writeFileSync(file, JSON.stringify(payload, null, 2));
}

let SYSTEM_PROMPT = 'You are a helpful assistant.';
let TOOLS: ITool[] = [];

if (process.env.SCENARIO) {
  const scenario = await import(`./scenarios/${process.env.SCENARIO}.ts`);
  SYSTEM_PROMPT = scenario.SYSTEM_PROMPT;
  TOOLS = scenario.TOOLS;
}

async function executeTool(toolName: string, args: Record<string, string>): Promise<string> {
  const tool = TOOLS.find(({ name }) => name === toolName);
  if (!tool) return `Error: unknown tool "${toolName}"`;
  return await tool.execute(args);
}

let totalInputTokens = 0;
let totalOutputTokens = 0;

function estimateHistoryTokens(messages: OpenAI.Chat.ChatCompletionMessageParam[]): number {
  return Math.ceil(JSON.stringify(messages).length / 4);
}

const client = new OpenAI({ apiKey: PROVIDER.apiKey, baseURL: PROVIDER.baseURL });
const history: OpenAI.Chat.ChatCompletionMessageParam[] = [];

const openaiTools: OpenAI.Chat.ChatCompletionTool[] = TOOLS.map((tool) => ({
  type: 'function' as const,
  function: {
    name: tool.name,
    description: tool.description,
    parameters: { type: 'object', properties: tool.parameters },
  },
}));

const rl = createInterface({ input: process.stdin, output: process.stdout });

console.log(`Provider: ${PROVIDER.name}  Model: ${PROVIDER.model}`);
console.log(`Scenario: ${process.env.SCENARIO ?? 'default'}`);
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
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
      ...(openaiTools.length > 0 ? { tools: openaiTools } : {}),
    };
    trace('request', request);
    const response = await client.chat.completions.create(request);
    trace('response', response);

    const usage = response.usage;
    if (usage) {
      totalInputTokens += usage.prompt_tokens;
      totalOutputTokens += usage.completion_tokens;
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
      ` | session total — in: ${String(totalInputTokens)}, out: ${String(totalOutputTokens)}` +
      ` | history est.: ~${String(estimateHistoryTokens(history))} tokens\n`,
    );
    break;
  }
}

rl.close();
console.log(`\nSession ended. Total tokens — input: ${String(totalInputTokens)}, output: ${String(totalOutputTokens)}`);
