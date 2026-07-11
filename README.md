# training-llm-harness
Experimenting custom harness with LLMs

## Configuration

### Open Router

Go to the [Open Router Platform](openrouter.ai) and log in. Navigate to the [API Keys](https://openrouter.ai/workspaces/default/keys), click New Key to create new secret key. 

Create a `.env` with the following information :

```
OPENROUTER_API_KEY=<your key>
PROVIDER=openrouter
```

### Groq

To generate a Groq API key, navigate directly to the [Groq Console API Keys page](https://console.groq.com/keys).

Create a `.env` with the following information :

```
GROQ_API_KEY=<your key>
PROVIDER=groq
```

## Checking configuration

Use `npx tsx src/test.ts`

## Harness

* `npm run pirate` 
* `npm run agenda`
