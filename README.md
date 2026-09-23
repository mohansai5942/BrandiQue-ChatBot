# BrandiQue ChatBot

Premium AI customer-support chatbot for BrandiQue Web Solutions.

## Architecture

The chatbot uses OpenRouter as its AI provider.

Business facts that are already verified in the application, such as the founder and published starter prices, are answered directly without an AI request. This makes those answers fast and prevents provider timeouts from breaking basic business questions.

Google Sheets knowledge is optional and is queried only when an exact business fact is not already built into the chatbot.

## Environment variables

Copy `.env.example` to `.env` locally. For Railway, add the same variables in Railway Variables.

```env
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=openrouter/free
PORT=3000
SITE_URL=https://www.brandique.in
GOOGLE_SHEETS_API_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

Never commit `.env` or API keys to GitHub.

## Local setup

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Railway

Deploy this repository as a Node.js service. Railway will use the `start` script.

Add the API key and configuration under Railway Variables. No API key belongs in the frontend or repository.

## Notes

OpenRouter's `openrouter/free` route selects an available free model. Free usage is rate-limited, so response time can vary.

The server does not contact Google Sheets during startup. Google Sheets is used only when needed, so a Sheets outage cannot stop the chatbot from starting or answering built-in BrandiQue facts.
