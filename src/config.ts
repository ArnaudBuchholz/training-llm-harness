import 'dotenv/config';

export const PROVIDERS = {
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile"
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    // see https://openrouter.ai/api/v1/models
    model: "nvidia/nemotron-3-super-120b-a12b:free"
  }
};