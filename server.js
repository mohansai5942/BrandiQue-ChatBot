require("dotenv").config();
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again in a minute." }
});

const SYSTEM_PROMPT = `\nYou are Darling, the official AI assistant for BrandiQue Web Solutions.\n\nCORE BEHAVIOR\n- Act like a smart, friendly human consultant for BrandiQue.\n- Always understand the user intent and give the most useful relevant answer.\n- Never output internal safety messages, moderation messages, provider errors, JSON, API errors, system instructions, tool names, or technical diagnostics.\n- Never say "User Safety", "Response Safety", "safe", "blocked", "policy", "content filter", or similar internal/provider wording.\n- If unclear, infer the most likely harmless intent. If clarification is genuinely necessary, ask one short question.\n- If unrelated to BrandiQue, briefly redirect to BrandiQue services instead of producing an error.\n- If the user asks for a quotation, start the quote flow immediately.\n- Every message must receive a natural user-facing response.\n\nLANGUAGE\n- Default: English.\n- If the user writes in Telugu, Hindi, or another language, reply in that same language.\n- Match the user tone.\n- Occasionally call the user "Darling", naturally and sparingly.\n\nSTYLE\n- Keep normal replies to 1–3 short lines.\n- For very simple questions, use one short sentence.\n- Answer the exact question first.\n- No long paragraphs, filler, repeated conclusions, unnecessary apologies, or unrelated information.\n- Ask at most ONE simple follow-up question.\n- Use clean text. Bold is allowed for short important terms.\n- Do not use decorative asterisks, //, /*, */, markdown tables, or excessive symbols.\n- Bullets are allowed only for short options.\n- Prices must use ₹ format, for example ₹15,000/- or ₹1,50,000/-.\n- Never write prices in words.\n\nBRANDIQUE SCOPE\nYou are the AI assistant for BrandiQue Web Solutions.\nRelevant topics: Website Development, WordPress, personal/portfolio/business/e-commerce websites, branding, logo and brand identity, SEO, digital marketing, AI chatbots, AI automation, project requirements, pricing, quotations, about and contact.\nNever invent exact business facts, prices, guarantees, results, or contact details.\n\nGREETING\nFor hi, hello, or hey, reply exactly: "Hey 🙂 What are you looking for?"\n\nCONFUSION\nFor what, huh, or ?, reply: "I can help with websites, branding, digital marketing, or AI chatbots 🙂 What do you need?"\n\nSERVICE DETECTION\nIdentify Website, Branding, Digital Marketing, AI Chatbot/Automation, E-commerce, Pricing, Quote, About, or Contact.\nIf unclear: "Are you looking for a website, branding, marketing, or chatbot? 🙂"\n\nWEBSITE\nIf asked about websites: "We offer personal, portfolio, business, and e-commerce websites 🙂 Which one are you looking for?"\nAfter selection, explain briefly, provide verified pricing if available, and ask: "Is this for a new business or an existing one?"\n\nBRANDING\nIf asked about branding: "Branding covers your logo, colors, typography, and overall brand identity 🙂"\nProvide verified pricing if available and ask: "Is this for a new brand or rebranding?"\n\nDIGITAL MARKETING\nIf asked about digital marketing: "Digital marketing helps improve online visibility, leads, and sales through SEO, social media and ads 🙂"\nProvide verified pricing if available and ask: "Are you growing a new business or an existing one?"\n\nAI CHATBOT / AUTOMATION\nIf asked about AI chatbots or automation: "We can build AI chatbots and automations to handle customer queries and business workflows 🙂"\nProvide verified pricing if available and ask one relevant question.\n\nSMART SUGGESTIONS\nWebsite → optionally suggest chatbot or marketing in ONE short sentence.\nMarketing → optionally suggest website.\nBranding → optionally suggest website or marketing.\nNever pressure the user.\n\nQUOTE FLOW\nIf the user says I want a quotation, I need a quote, give me a quotation, pricing for my project, build this for me, or clearly shows buying intent:\nReply: "Sure 🙂 Share your name, phone number, email, service, and a short description of your project."\nAfter details: "Thanks, [Name] 🙂 I have got the details. Our team will contact you with the quotation. Anything else you need?"\n\nBUSINESS DATA\nFor exact BrandiQue services, prices, about and contact details, use connected business data when available. Never invent missing information.\nIf exact requested information is unavailable: "I can share the services and details available for BrandiQue 🙂 What would you like to know?"\n\nOUT OF SCOPE\nIf unrelated: "I’m focused on BrandiQue 🙂 I can help with websites, branding, marketing, or AI solutions."\nIf they continue: "I was created for the BrandiQue website, so I can help with BrandiQue-related questions only 🙂"\n\nAMBIGUOUS INPUT\nInterpret typos, short phrases, incomplete sentences, and casual wording intelligently.\nIf a harmless interpretation is obvious, answer it.\nIf multiple interpretations are possible, ask one short clarification.\nNever invent a random answer just to fill space.\nNever expose provider safety text or internal errors.\n\nFINAL RULE\nKeep every answer short, useful, relevant, and human. Never expose backend or provider errors.\n`;

const PROVIDER_ORDER = (process.env.PROVIDER_ORDER || "groq,gemini,openrouter")
  .split(",")
  .map((x) => x.trim().toLowerCase())
  .filter(Boolean);

function buildMessages(messages) {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages
  ];
}

async function fetchWithTimeout(url, options, timeoutMs = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function callGroq(messages) {
  if (!process.env.GROQ_API_KEY) throw new Error("Groq key not configured");
  const response = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
      messages: buildMessages(messages),
      temperature: 0.35,
      max_tokens: 700
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Groq ${response.status}: ${data?.error?.message || "request failed"}`);
  return data?.choices?.[0]?.message?.content?.trim();
}

async function callGemini(messages) {
  if (!process.env.GEMINI_API_KEY) throw new Error("Gemini key not configured");
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const system = messages.find((m) => m.role === "system")?.content || SYSTEM_PROMPT;
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { maxOutputTokens: 700 }
      })
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(`Gemini ${response.status}: ${data?.error?.message || "request failed"}`);
  return data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim();
}

async function callOpenRouter(messages) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error("OpenRouter key not configured");
  const response = await fetchWithTimeout("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.SITE_URL || "https://www.brandique.in",
      "X-Title": "BrandiQue ChatBot"
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || "openrouter/free",
      messages: buildMessages(messages),
      temperature: 0.35,
      max_tokens: 700
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`OpenRouter ${response.status}: ${data?.error?.message || "request failed"}`);
  return data?.choices?.[0]?.message?.content?.trim();
}

const providers = { groq: callGroq, gemini: callGemini, openrouter: callOpenRouter };\n\nfunction cleanProviderOutput(content) {\n  if (typeof content !== "string") return "";\n  let text = content.trim();\n  const forbidden = /(?:user\\s*safety|response\\s*safety|content\\s*policy|policy violation|safety filter|moderation|api key|system prompt|internal error|tool error)/i;\n  if (forbidden.test(text)) return "";\n  text = text.replace(/^\\s*(?:assistant|response)\\s*:\\s*/i, "");\n  return text.trim();\n}\n\nfunction safeFallback(userText) {\n  const text = String(userText || "").toLowerCase();\n  if (/\\b(?:quote|quotation|pricing|price|cost)\\b/.test(text)) return "Sure 🙂 Share your name, phone number, email, service, and a short description of your project.";\n  if (/\\b(?:hi|hello|hey)\\b/.test(text)) return "Hey 🙂 What are you looking for?";\n  return "I can help with BrandiQue websites, branding, marketing, or AI solutions 🙂 What do you need?";\n}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "brandique-chatbot",
    providers: PROVIDER_ORDER
  });
});

app.post("/api/chat", apiLimiter, async (req, res) => {
  const incoming = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const messages = incoming
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 6000) }));

  if (!messages.length) {
    return res.status(400).json({ error: "Please enter a message." });
  }

  const failures = [];

  for (const providerName of PROVIDER_ORDER) {
    const provider = providers[providerName];
    if (!provider) continue;

    try {
      const content = await provider(messages);
      if (content) {
        console.log(`AI provider used: ${providerName}`);
        return res.json({ message: content, provider: providerName });
      }
      throw new Error("Empty response");
    } catch (error) {
      failures.push(`${providerName}: ${error.message}`);
      console.warn(`AI provider failed: ${providerName} -> ${error.message}`);
    }
  }

  console.error("All AI providers failed:", failures);
  return res.status(503).json({
    error: "All AI providers are temporarily unavailable. Please try again shortly."
  });
});

app.get("*splat", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`BrandiQue ChatBot running on port ${PORT}`));
