import OpenAI from 'openai';
import { PROVIDER } from './config.js';

async function runTest(prompt: string) {
  const client = new OpenAI({
    apiKey: PROVIDER.apiKey,
    baseURL: PROVIDER.baseURL,
  });

  try {
    console.log(`--- Testing ${PROVIDER.name} (${PROVIDER.model}) ---`);
    const response = await client.chat.completions.create({
      model: PROVIDER.model,
      messages: [{ role: 'user', content: prompt }],
    });

    console.log("Response:", response.choices[0]!.message.content);
    console.log("Usage:", response.usage);
  } catch (error) {
    console.error(`Error with ${PROVIDER.name}:`, error instanceof Error ? error.message : error);
  }
}

await runTest('Explain quantum entanglement in one sentence.');
