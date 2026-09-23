# BrandiQue ChatBot

Premium AI customer-support chatbot for BrandiQue Web Solutions.

## AI fallback architecture

The backend tries providers in this order:

`Groq → Gemini → OpenRouter`

If a provider is unavailable, rate-limited, times out, has a bad key, or returns another API error, the backend automatically tries the next configured provider.

Change the order with:

`PROVIDER_ORDER=groq,gemini,openrouter`

You can also run only the providers for which you have keys. Unconfigured providers are skipped automatically.

## Environment variables

Copy `.env.example` to `.env` locally. For Railway, add the same variables in Railway Variables.

- `GROQ_API_KEY`
- `GROQ_MODEL`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `PROVIDER_ORDER`
- `SITE_URL`
- `PORT`

Never commit `.env` or API keys to GitHub.

## Local setup

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Railway

Deploy this repository as a Node.js service. Railway will use the `start` script:

```bash
npm start
```

Add the provider API keys and configuration under Railway Variables. No API keys belong in the frontend or repository.

## Notes

Free API tiers still have provider-specific rate limits. Fallback improves availability; it does not create unlimited inference.
