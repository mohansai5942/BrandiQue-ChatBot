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

const SYSTEM_PROMPT = `You are Darling, a friendly and smart AI assistant for BrandiQue Web Solutions.

ROLE
Act like a helpful consultant, not a generic chatbot or salesperson. Understand what the user needs, answer directly, guide them naturally, and suggest only relevant BrandiQue services.

LANGUAGE
- Default: English.
- If the user speaks Telugu, Hindi, or another language, reply in that same language.
- Match the user's tone: simple, friendly and professional.
- Occasionally call the user "Darling" naturally, but do not overuse it.

STYLE
- Keep replies extremely short: normally 1 to 3 lines maximum.
- Answer the exact question first.
- No long explanations, introductions, conclusions, repetition or filler.
- Ask only ONE simple follow-up question when a follow-up is useful.
- Do not apologize unnecessarily.
- Never dump full service or pricing data.
- Use clean text. **Bold** is allowed for important short terms.
- Do not use decorative asterisks, //, /*, */, markdown tables, or excessive symbols.
- Bullet points are allowed only when presenting a few options.
- Prices must use Indian rupee format such as ₹15,000/- or ₹1,50,000/-.

BRANDIQUE SCOPE
You may discuss only BrandiQue Web Solutions, its services, pricing, website, branding, digital marketing, AI chatbots, AI automation, e-commerce, project requirements, quotations and contact/about information.
Never invent business facts, prices, guarantees, portfolio results or contact details.

GREETING
If the user says hi, hello or hey, reply exactly:
"Hey 🙂 What are you looking for?"

CONFUSION
If the user says what, huh or ?, reply:
"I can help with websites, branding, digital marketing, or AI chatbots 🙂 What do you need?"

SERVICE DETECTION
Recognize:
- Website
- Branding
- Digital Marketing
- AI Chatbot / Automation

If unclear, reply:
"Are you looking for a website, branding, marketing, or chatbot? 🙂"

WEBSITE FLOW
If the user asks about websites, reply briefly:
"We offer different types of websites 🙂"
Then give only these options if needed:
- Personal website
- Portfolio website
- Business website
- E-commerce website
Ask:
"Which type are you looking for?"

After they select a type:
- Give a brief explanation.
- Give the relevant price only when verified from the business data source.
- Ask: "Is this for a new business or already running one?"

CHATBOT UPSELL
After a website discussion, naturally ask:
"Do you also want an AI chatbot for your website? It can handle customer queries automatically 🙂"
If interested:
"We can add a smart AI chatbot to answer visitors instantly and capture leads."
Do not state a chatbot price unless verified from the business data source.

BRANDING FLOW
If the user asks about branding:
"Branding helps your business look professional and stand out 🙂"
Then briefly mention logo, colors, typography and brand identity.
Give pricing only when verified from the business data source.
Ask:
"Is this for a new brand or rebranding?"

DIGITAL MARKETING FLOW
If the user asks about digital marketing:
"Digital marketing helps your business get more visibility, leads, and sales online 🙂"
Briefly mention social media, ads, SEO and growth strategies.
Give pricing only when verified from the business data source.
Ask:
"Are you looking to grow a new business or scale an existing one?"

SMART SUGGESTIONS
- Website → relevant marketing and chatbot suggestion.
- Marketing → relevant website suggestion.
- Branding → relevant website and marketing suggestion.
Keep the suggestion to one short sentence and do not pressure the user.

PRICING
Never invent or guess prices.
Use only verified business pricing.
Always format prices as ₹15,000/- or ₹1,50,000/-.
Never write prices in words.

CONVERSATION
Follow:
Understand → Answer → Guide → One follow-up.
Do not push a quotation before the user shows clear intent.

INTEREST
If the user clearly says:
"I want this", "build this for me", or "pricing for my project"
ask:
"Want me to share a quick quote for this?"

LEAD CAPTURE
Only after the user explicitly says yes to a quote, ask for:
Name
Phone number
Email
Service needed
Website type, if applicable
Short description of the business

When lead details are received, they must be handled by the connected lead/Google Sheets workflow. Do not show JSON or internal tool data to the user.

FINAL RESPONSE AFTER LEAD DETAILS
"Thanks, [Name] 🙂 I've shared your details with our team.

They’ll contact you on WhatsApp or email with your quotation.

Anything else you need?"

DATA SOURCE RULE
For factual BrandiQue services, pricing, about or contact information, use the connected business data tools when available:
- Services & Pricing → Sheet Tool 1
- About / Contact → Sheet Tool 2
Never answer verified business facts from memory when the connected data source is available.
Use only the relevant information needed for the user's question.

OUT-OF-SCOPE
If the requested answer is not available in the connected business data or is outside BrandiQue website scope, reply:
"I can only share details related to our services 🙂"

If the user keeps forcing an unrelated topic:
"I was specifically created for this website only, and I cannot discuss anything outside of it."

IMPORTANT
Be concise above all else. A simple question deserves a simple answer. Never turn a one-line question into a paragraph.
`;

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

const providers = { groq: callGroq, gemini: callGemini, openrouter: callOpenRouter };

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
