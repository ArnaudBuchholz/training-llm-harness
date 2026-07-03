import OpenAI from 'openai';
import { PROVIDERS } from './config.js';

async function runTest(providerName: keyof typeof PROVIDERS, prompt: string) {
  const config = PROVIDERS[providerName];

  console.log(config);
  
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });

  try {
    console.log(`--- Testing ${providerName} (${config.model}) ---`);
    const response = await client.chat.completions.create({
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
    });

    console.log("Response:", response.choices[0]!.message.content);
    console.log("Usage:", response.usage);
  } catch (error) {
    console.error(`Error with ${providerName}:`, error instanceof Error ? error.message : error);
  }
}

// await runTest('groq', 'Explain quantum entanglement in one sentence.');
await runTest('openrouter', 'Explain quantum entanglement in one sentence.');
