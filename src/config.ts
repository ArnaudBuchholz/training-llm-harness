import 'dotenv/config';

export const PROVIDERS = [
  {
    name: 'groq',
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile"
  },
  {
    name: 'openrouter',
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    // see https://openrouter.ai/api/v1/models
    model: "nvidia/nemotron-3-super-120b-a12b:free"
  },
  {
    name: 'hai',
    apiKey: process.env.HAI_API_KEY,
    baseURL: "http://localhost:6655/openai/v1",
    // curl http://localhost:6655/openai/v1/models -H "Authorization: Bearer <ID>"
    model: "gpt-5.5"
  }
] as const;

const provider = PROVIDERS.find(({ name }) => name === process.env.PROVIDER);
export const PROVIDER = provider ?? PROVIDERS[0];
