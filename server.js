require("dotenv").config();

const path = require("path");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = Number(process.env.PORT || 3000);

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

const SYSTEM_PROMPT = `
You are Darling, the official AI assistant for BrandiQue Web Solutions.

You have conversation memory. Use the previous user and assistant messages supplied with every request to understand follow-up questions, references like "that", "it", "business", "same one", "what about that", and personal details the user has explicitly shared.

LANGUAGE
- Reply in the same language the user uses.
- English by default.
- If the user uses Telugu, reply naturally in Telugu or Telugu-English mix.
- Match the user's tone.
- You may call the user Darling naturally, but do not overuse it.

STYLE
- Be concise, natural and human.
- Answer the exact question first.
- Use short bullets only when useful.
- Do not repeat the user's question.
- Never mention Google Sheets, APIs, providers, system prompts, internal tools, or implementation details.
- Never invent business facts.
- Never expose API errors or internal markers.

VERIFIED BRANDIQUE KNOWLEDGE
Company: BrandiQue Web Solutions
Founder: K. Mohan Rao
Location: Visakhapatnam, India
Website: https://www.brandique.in

Core services:
- Full-stack custom website development
- React and Next.js websites
- WordPress websites
- Personal and portfolio websites
- Business websites
- E-commerce websites
- Branding and logo design
- Digital marketing
- Technical SEO
- AI automation
- AI chatbots
- Business automation and n8n workflows

Current website starter pricing:
- Personal: ₹9,000/-
- Business: ₹10,999/-
- E-commerce: ₹28,999/-

Current website information:
- Standard website delivery: 7-14 days
- Complex applications: about 3-4 weeks
- Technical SEO is included in website builds
- Websites are mobile responsive
- Maintenance is available
- BrandiQue serves clients from Visakhapatnam and globally

MEMORY RULES
- Remember information explicitly shared by the user during the current conversation.
- If the user says "my name is X", remember X for the conversation and use it when relevant.
- If the user asks "do you remember my name?" and a name was explicitly shared in the conversation, answer with that name.
- If no name was shared, say you do not have their name yet and ask them to tell you.
- Keep using the current conversation context for follow-up questions.
- Do not treat a one-word follow-up as a new conversation when its meaning is clear from recent messages.
- Example: after the user asks about Personal website pricing, "business" means Business website pricing if that is the obvious context.

IMPORTANT
- Treat the verified knowledge above as authoritative for these facts.
- For exact facts not present above, use additional verified business knowledge supplied by the backend.
- If the exact fact is unavailable, do not guess.
- Never claim a price is final unless the user asks about the published starter price.
- For project-specific quotations, ask for the information needed for a quote.

GREETING
For hi, hello or hey:
Hey 🙂 What are you looking for?

FOUNDER
If asked who founded BrandiQue, who the founder is, owner, CEO or similar:
BrandiQue Web Solutions was founded by K. Mohan Rao.

SERVICES
If asked about services, give the relevant services directly. Do not dump the full list unless asked.

PRICING
If asked for pricing, give the published starter prices above and clarify that project-specific pricing can vary based on requirements.

QUOTE
If the user clearly wants a quote, ask for:
- Name
- Phone number
- Email
- Service needed
- Website type if applicable
- Short project description

OUT OF SCOPE
For unrelated questions:
I’m focused on BrandiQue 🙂 I can help with websites, branding, marketing, or AI solutions.
`;

const BUSINESS_FACT_PATTERNS = [
  /\b(founder|founder name|founded|who owns|owner|ceo|director)\b/i,
  /\b(about|company|brandique|contact|phone|mobile|email|address|location|office)\b/i,
  /\b(website url|domain|price|pricing|cost|package|packages|service price|quotation|quote)\b/i,
  /\b(portfolio|instagram|telegram|linkedin|social media|delivery time|maintenance)\b/i,
  /\b(marketing|digital marketing|seo|search engine optimization|social media marketing|advertising|ai automation|ai chatbot|branding|logo design|brand identity)\b/i
];

function isBusinessFactQuestion(text) {
  return BUSINESS_FACT_PATTERNS.some((pattern) => pattern.test(String(text || "")));
}

function extractConversationMemory(messages) {
  const memory = {
    name: "",
    lastWebsiteType: "",
    lastTopic: "",
    lastAssistantAnswer: ""
  };

  const all = Array.isArray(messages) ? messages : [];

  for (const message of all) {
    const text = String(message?.content || "").trim();
    const lower = text.toLowerCase();

    if (message?.role === "user") {
      const nameMatch =
        lower.match(/\bmy name is\s+([a-z][a-z .'-]{1,50})$/i) ||
        lower.match(/\bcall me\s+([a-z][a-z .'-]{1,50})$/i) ||
        lower.match(/\bi am\s+([a-z][a-z .'-]{1,50})$/i);

      if (nameMatch) {
        memory.name = nameMatch[1].trim().replace(/[.!?,]+$/, "");
      }

      if (/\bpersonal\b/.test(lower) && /\bwebsite|site\b/.test(lower)) {
        memory.lastWebsiteType = "Personal";
      } else if (/\bbusiness\b/.test(lower) && /\bwebsite|site\b/.test(lower)) {
        memory.lastWebsiteType = "Business";
      } else if (/\b(e[- ]?commerce|online store)\b/.test(lower)) {
        memory.lastWebsiteType = "E-commerce";
      } else if (/\bportfolio\b/.test(lower)) {
        memory.lastWebsiteType = "Portfolio";
      }

      if (/\b(personal|business|e[- ]?commerce|portfolio)\b/.test(lower)) {
        memory.lastTopic = "website";
      } else if (/\b(pric|cost|quote|quotation)\b/.test(lower)) {
        memory.lastTopic = "pricing";
      }
    }

    if (message?.role === "assistant" && text) {
      memory.lastAssistantAnswer = text;
    }
  }

  return memory;
}

function contextualBusinessAnswer(userText, messages) {
  const text = String(userText || "").trim();
  const lower = text.toLowerCase();
  const memory = extractConversationMemory(messages);

  const nameMatch =
    lower.match(/^my name is\s+([a-z][a-z .'-]{1,50})[.!?,]*$/i) ||
    lower.match(/^call me\s+([a-z][a-z .'-]{1,50})[.!?,]*$/i) ||
    lower.match(/^i am\s+([a-z][a-z .'-]{1,50})[.!?,]*$/i) ||
    lower.match(/^i'm\s+([a-z][a-z .'-]{1,50})[.!?,]*$/i);

  if (nameMatch) {
    const name = nameMatch[1].trim().replace(/[.!?,]+$/, "");
    return "Nice to meet you, " + name + " 🙂 I’ll remember your name during this conversation.";
  }

  if (/\b(do you remember my name|remember my name|what is my name|what's my name)\b/i.test(lower)) {
    return memory.name
      ? "Yes 🙂 Your name is " + memory.name + "."
      : "I don’t have your name yet 🙂 Tell me your name and I’ll remember it during this conversation.";
  }

  const oneWordWebsiteType =
    /^(business|business website|business site)$/i.test(text)
      ? "Business"
      : /^(personal|personal website|personal site)$/i.test(text)
        ? "Personal"
        : /^(e[- ]?commerce|ecommerce|online store)$/i.test(text)
          ? "E-commerce"
          : /^(portfolio|portfolio website|portfolio site)$/i.test(text)
            ? "Portfolio"
            : "";

  if (oneWordWebsiteType && (memory.lastTopic === "website" || memory.lastWebsiteType || memory.lastTopic === "pricing")) {
    if (oneWordWebsiteType === "Business") {
      return "The published starter price for a Business website is ₹10,999/-.";
    }
    if (oneWordWebsiteType === "Personal") {
      return "The published starter price for a Personal website is ₹9,000/-.";
    }
    if (oneWordWebsiteType === "E-commerce") {
      return "The published starter price for an E-commerce website is ₹28,999/-.";
    }
    return "A Portfolio website is available. Tell me if you want its pricing or details.";
  }

  if (/^(how much|price|pricing|cost)$/i.test(text) && memory.lastWebsiteType) {
    if (memory.lastWebsiteType === "Business") return "The published starter price for a Business website is ₹10,999/-.";
    if (memory.lastWebsiteType === "Personal") return "The published starter price for a Personal website is ₹9,000/-.";
    if (memory.lastWebsiteType === "E-commerce") return "The published starter price for an E-commerce website is ₹28,999/-.";
  }

  return "";
}

function findBuiltInBusinessAnswer(userText, messages = []) {
  const contextual = contextualBusinessAnswer(userText, messages);
  if (contextual) return contextual;

  const text = String(userText || "").toLowerCase().trim();

  if (/\b(founder|founder name|founded|who founded|owner|ceo|director)\b/.test(text)) {
    return "BrandiQue Web Solutions was founded by K. Mohan Rao.";
  }

  if (/\b(who are you|what is brandique|about brandique|about the company)\b/.test(text)) {
    return "BrandiQue Web Solutions is a digital studio focused on websites, branding, digital marketing, AI automation and AI chatbots.";
  }

  if (/\b(website url|website link|domain|official website)\b/.test(text)) {
    return "BrandiQue's official website is https://www.brandique.in.";
  }

  if (/\b(personal website|personal site)\b/.test(text) && /\b(price|pricing|cost|how much)\b/.test(text)) {
    return "The published starter price for a Personal website is ₹9,000/-.";
  }

  if (/\b(business website|business site)\b/.test(text) && /\b(price|pricing|cost|how much)\b/.test(text)) {
    return "The published starter price for a Business website is ₹10,999/-.";
  }

  if (/\b(e[- ]?commerce|online store)\b/.test(text) && /\b(price|pricing|cost|how much)\b/.test(text)) {
    return "The published starter price for an E-commerce website is ₹28,999/-.";
  }

  if (/\b(price|pricing|cost|packages?)\b/.test(text) && !/\b(project|custom|quote|quotation)\b/.test(text)) {
    return "Published starter prices are: Personal ₹9,000/-, Business ₹10,999/-, and E-commerce ₹28,999/-.";
  }

  if (/\b(delivery|delivery time|how long)\b/.test(text)) {
    return "Standard website builds take 7-14 days. Complex applications usually take about 3-4 weeks.";
  }

  if (/\b(maintenance|maintain)\b/.test(text)) {
    return "Yes. BrandiQue offers ongoing website maintenance and technical support.";
  }

  if (/\b(technical seo|seo included|seo include)\b/.test(text)) {
    return "Yes. Technical SEO is included in BrandiQue website builds.";
  }

  if (/\b(location|office|address)\b/.test(text)) {
    return "BrandiQue Web Solutions is based in Visakhapatnam, India and serves clients globally.";
  }

  if (/\b(tell me more about marketing|digital marketing|marketing services|what marketing services|marketing)\b/.test(text)) {
    return "BrandiQue offers digital marketing focused on SEO, social media marketing, advertising and digital growth. If you tell me your business type and goal, I can explain the relevant marketing approach.";
  }

  if (/^\s*(seo|tell me about seo|what is seo|seo service|i want seo|i need seo)\s*[.!?]*$/i.test(text) ||
      /\b(technical seo|search engine optimization|seo service)\b/.test(text)) {
    return "BrandiQue provides Technical SEO to improve a website’s search visibility, structure and crawlability. Technical SEO is included in BrandiQue website builds.";
  }

  if (/\b(social media marketing|social media)\b/.test(text)) {
    return "BrandiQue can help with social media marketing, content strategy, audience growth and campaign support.";
  }

  if (/\b(advertising|ads|paid ads|google ads|meta ads)\b/.test(text)) {
    return "BrandiQue can help with digital advertising and campaign strategy. The exact approach depends on your business, audience and goal.";
  }

  if (/\b(ai automation|automation|ai chatbot|chatbot)\b/.test(text)) {
    return "BrandiQue builds AI chatbots and business automations, including workflow automation and n8n-based solutions.";
  }

  if (/\b(branding|logo design|brand identity)\b/.test(text)) {
    return "BrandiQue offers logo design and complete brand identity solutions for businesses and creators.";
  }

  return "";
}

function cleanProviderOutput(content) {
  if (typeof content !== "string") return "";

  let text = content.trim();

  if (!text || /^__NEED_SHEET__$/i.test(text)) return "";

  const forbidden = /user\s*safety|response\s*safety|content\s*policy|policy\s*violation|safety\s*filter|moderation|api\s*key|system\s*prompt|internal\s*error|tool\s*error/i;

  if (forbidden.test(text)) return "";

  text = text.replace(/^\s*(assistant|response)\s*:\s*/i, "");
  return text.trim();
}

function safeFallback(userText, messages = []) {
  const text = String(userText || "").toLowerCase().trim();

  const builtIn = findBuiltInBusinessAnswer(text, messages);
  if (builtIn) return builtIn;

  if (/^\s*(hi|hello|hey)[!.\s]*$/i.test(text)) {
    return "Hey 🙂 What are you looking for?";
  }

  if (/\b(quote|quotation|custom quote)\b/.test(text)) {
    return "Sure 🙂 Share your name, phone number, email, service, and a short description of your project.";
  }

  if (/\b(website|web site|web development)\b/.test(text)) {
    return "We offer personal, portfolio, business, and e-commerce websites 🙂 Which type do you need?";
  }

  if (/\b(branding|logo|brand identity)\b/.test(text)) {
    return "We can help with logo design and complete brand identity 🙂 What are you looking to build?";
  }

  if (/\b(marketing|seo|digital marketing)\b/.test(text)) {
    return "We can help with SEO, social media marketing, advertising, and digital growth 🙂 What are you looking to improve?";
  }

  if (/\b(chatbot|automation|ai)\b/.test(text)) {
    return "We can build AI chatbots and business automations 🙂 What would you like to automate?";
  }

  return "I can help with BrandiQue websites, branding, marketing, or AI solutions 🙂 What do you need?";
}

async function fetchJson(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      redirect: "follow",
      signal: controller.signal
    });

    const raw = await response.text();
    let data = {};

    try {
      data = raw ? JSON.parse(raw) : {};
    } catch (_error) {
      data = {};
    }

    return {
      status: response.status,
      ok: response.ok,
      data
    };
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("Request timeout");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

const PROVIDER_ORDER = String(process.env.PROVIDER_ORDER || "openrouter,gemini")
  .split(",")
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);

const PROVIDER_COOLDOWN_MS = Number(process.env.PROVIDER_COOLDOWN_MS || 60 * 60 * 1000);
const OPENROUTER_TIMEOUT_MS = Number(process.env.OPENROUTER_TIMEOUT_MS || 6000);
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 7000);

const providerCooldownUntil = {
  openrouter: 0,
  gemini: 0
};

function isProviderAvailable(provider) {
  return Date.now() >= Number(providerCooldownUntil[provider] || 0);
}

function markProviderCooldown(provider, reason = "") {
  providerCooldownUntil[provider] = Date.now() + PROVIDER_COOLDOWN_MS;
  console.error(provider + " temporarily disabled:", reason || "provider failure");
}

function providerIsConfigured(provider) {
  if (provider === "openrouter") return Boolean(process.env.OPENROUTER_API_KEY);
  if (provider === "gemini") return Boolean(process.env.GEMINI_API_KEY);
  return false;
}

let sheetCache = [];
let sheetCacheUpdatedAt = 0;
const SHEET_CACHE_TTL_MS = 10 * 60 * 1000;
let sheetRequestInFlight = null;

function flattenSheetResults(results) {
  if (!Array.isArray(results)) return [];

  return results
    .map((item) => ({
      sheet: String(item?.sheet || ""),
      data: item?.data && typeof item.data === "object" ? item.data : {}
    }))
    .filter((item) => Object.keys(item.data).length > 0);
}

async function fetchSheetData(query = "") {
  const baseUrl = process.env.GOOGLE_SHEETS_API_URL;
  if (!baseUrl) return [];

  const url = new URL(baseUrl);
  if (query) url.searchParams.set("q", String(query).slice(0, 500));
  else url.searchParams.set("all", "1");

  const response = await fetchJson(url.toString(), {}, 15000);

  if (!response.ok) throw new Error("Google Sheets HTTP " + response.status);
  if (!response.data?.success || !Array.isArray(response.data.results)) return [];

  return flattenSheetResults(response.data.results);
}

async function refreshSheetCache() {
  const fresh = sheetCache.length > 0 && Date.now() - sheetCacheUpdatedAt < SHEET_CACHE_TTL_MS;
  if (fresh) return sheetCache;
  if (sheetRequestInFlight) return sheetRequestInFlight;

  sheetRequestInFlight = fetchSheetData()
    .then((results) => {
      if (results.length) {
        sheetCache = results;
        sheetCacheUpdatedAt = Date.now();
      }
      return sheetCache;
    })
    .catch((error) => {
      console.error("Google Sheets cache refresh failed:", error?.message || error);
      return sheetCache;
    })
    .finally(() => {
      sheetRequestInFlight = null;
    });

  return sheetRequestInFlight;
}

function scoreSheetItem(item, query) {
  const source = Object.entries(item.data || {})
    .map(([key, value]) => key + " " + String(value))
    .join(" ")
    .toLowerCase();

  const normalizedQuery = String(query || "").toLowerCase().trim();
  const words = normalizedQuery
    .replace(/[^\p{L}\p{N}₹\s.-]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);

  let score = normalizedQuery && source.includes(normalizedQuery) ? 5 : 0;
  for (const word of words) if (source.includes(word)) score++;

  return score;
}

function searchSheet(results, query) {
  return results
    .map((item) => ({ ...item, score: scoreSheetItem(item, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

function searchCachedSheet(query) {
  return searchSheet(sheetCache, query);
}

function buildKnowledgeContext(results) {
  if (!Array.isArray(results) || !results.length) return "No additional verified business information was found.";

  return results.map((item, index) => {
    const fields = Object.entries(item.data || {})
      .filter(([, value]) => String(value).trim())
      .map(([key, value]) => key + ": " + String(value))
      .join(" | ");

    return "[" + (index + 1) + "] " + fields;
  }).join("\n");
}

async function getSheetKnowledge(userText) {
  let results = searchCachedSheet(userText);
  if (results.length) return results;

  try {
    results = searchSheet(await fetchSheetData(userText), userText);
    if (results.length) return results;
  } catch (error) {
    console.error("Google Sheets query failed:", error?.message || error);
  }

  try {
    results = searchCachedSheet(userText);
    if (!results.length) results = searchSheet(await refreshSheetCache(), userText);
  } catch (error) {
    console.error("Google Sheets cache lookup failed:", error?.message || error);
  }

  return results;
}

async function callOpenRouter(conversationMessages, knowledgeContext = "", memory = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");

  const model = process.env.OPENROUTER_MODEL || "openrouter/free";
  const memoryContext = [
    memory.name ? "User name: " + memory.name : "",
    memory.lastWebsiteType ? "Current website type in conversation: " + memory.lastWebsiteType : "",
    memory.lastTopic ? "Current topic: " + memory.lastTopic : ""
  ].filter(Boolean).join("\n");

  const systemMessage = SYSTEM_PROMPT +
    (memoryContext ? "\n\nCONVERSATION MEMORY\n" + memoryContext : "") +
    (knowledgeContext
      ? "\n\nADDITIONAL VERIFIED BRANDIQUE KNOWLEDGE\nUse these facts when relevant. Do not mention the source.\n" + knowledgeContext
      : "");

  const response = await fetchJson(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.SITE_URL || "https://www.brandique.in",
        "X-Title": "BrandiQue ChatBot"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemMessage },
          ...conversationMessages
        ],
        max_tokens: 300,
        temperature: 0.4
      })
    },
    OPENROUTER_TIMEOUT_MS
  );

  const data = response.data || {};
  if (!response.ok) {
    const providerMessage = data?.error?.message || data?.error?.metadata?.raw || "OpenRouter request failed";
    throw new Error("OpenRouter HTTP " + response.status + ": " + providerMessage);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("OpenRouter returned no message content");

  return content.trim();
}

function buildGeminiContents(conversationMessages) {
  const contents = [];

  for (const message of conversationMessages) {
    const role = message.role === "assistant" ? "model" : "user";
    const text = String(message.content || "").trim();
    if (!text) continue;

    const last = contents[contents.length - 1];
    if (last && last.role === role) {
      last.parts[0].text += "\n" + text;
    } else {
      contents.push({
        role,
        parts: [{ text }]
      });
    }
  }

  if (contents.length && contents[0].role !== "user") {
    contents.unshift({
      role: "user",
      parts: [{ text: "Continue the conversation naturally." }]
    });
  }

  return contents;
}

async function callGemini(conversationMessages, knowledgeContext = "", memory = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const memoryContext = [
    memory.name ? "User name: " + memory.name : "",
    memory.lastWebsiteType ? "Current website type in conversation: " + memory.lastWebsiteType : "",
    memory.lastTopic ? "Current topic: " + memory.lastTopic : ""
  ].filter(Boolean).join("\n");

  const systemMessage = SYSTEM_PROMPT +
    (memoryContext ? "\n\nCONVERSATION MEMORY\n" + memoryContext : "") +
    (knowledgeContext
      ? "\n\nADDITIONAL VERIFIED BRANDIQUE KNOWLEDGE\nUse these facts when relevant. Do not mention the source.\n" + knowledgeContext
      : "");

  const response = await fetchJson(
    "https://generativelanguage.googleapis.com/v1beta/models/" +
      encodeURIComponent(model) +
      ":generateContent",
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemMessage }]
        },
        contents: buildGeminiContents(conversationMessages),
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 300
        }
      })
    },
    GEMINI_TIMEOUT_MS
  );

  const data = response.data || {};
  if (!response.ok) {
    const providerMessage =
      data?.error?.message ||
      data?.error?.status ||
      "Gemini request failed";
    throw new Error("Gemini HTTP " + response.status + ": " + providerMessage);
  }

  const content = data?.candidates?.[0]?.content?.parts
    ?.map((part) => String(part?.text || ""))
    .join("")
    .trim();

  if (!content) {
    const reason = data?.candidates?.[0]?.finishReason || "no message content";
    throw new Error("Gemini returned " + reason);
  }

  return content;
}

async function callProviderWithFallback(conversationMessages, knowledgeContext = "", memory = {}) {
  const errors = [];

  for (const provider of PROVIDER_ORDER) {
    if (!["openrouter", "gemini"].includes(provider)) continue;

    if (!providerIsConfigured(provider)) {
      errors.push(provider + " is not configured");
      continue;
    }

    if (!isProviderAvailable(provider)) {
      continue;
    }

    try {
      const content = provider === "gemini"
        ? await callGemini(conversationMessages, knowledgeContext, memory)
        : await callOpenRouter(conversationMessages, knowledgeContext, memory);

      const cleaned = cleanProviderOutput(content);
      if (cleaned) return cleaned;

      throw new Error(provider + " returned empty content");
    } catch (error) {
      const message = error?.message || String(error);
      errors.push(provider + ": " + message);

      if (/HTTP 429|HTTP 408|HTTP 5\d\d|timeout|temporarily unavailable|quota|rate limit/i.test(message)) {
        markProviderCooldown(provider, message);
      }

      console.error(provider + " request failed:", message);
    }
  }

  throw new Error(errors.join(" | ") || "No AI provider available");
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "brandique-chatbot",
    providers: PROVIDER_ORDER,
    openrouterConfigured: Boolean(process.env.OPENROUTER_API_KEY),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    geminiModel: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    memory: "conversation"
  });
});

app.post("/api/chat", apiLimiter, async (req, res) => {
  const incoming = Array.isArray(req.body?.messages) ? req.body.messages : [];

  const messages = incoming
    .filter((message) =>
      message &&
      (message.role === "user" || message.role === "assistant") &&
      typeof message.content === "string"
    )
    .slice(-20)
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, 2500)
    }));

  if (!messages.length) return res.json({ message: safeFallback("") });

  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  const userText = latestUserMessage?.content || "";
  const memory = extractConversationMemory(messages);

  try {
    const directBusinessAnswer = findBuiltInBusinessAnswer(userText, messages);
    if (directBusinessAnswer) return res.json({ message: directBusinessAnswer });

    if (isBusinessFactQuestion(userText)) {
      const sheetResults = await getSheetKnowledge(userText);

      if (sheetResults.length) {
        try {
          const answer = await callProviderWithFallback(
            messages,
            buildKnowledgeContext(sheetResults),
            memory
          );
          if (answer) return res.json({ message: answer });
        } catch (error) {
          console.error("Sheet answer generation failed:", error?.message || error);
        }
      }
    }

    try {
      const answer = await callProviderWithFallback(messages, "", memory);
      if (answer) return res.json({ message: answer });
    } catch (error) {
      console.error("AI provider fallback failed:", error?.message || error);
    }
  } catch (error) {
    console.error("Chat request failed:", error?.message || error);
  }

  return res.json({ message: safeFallback(userText, messages) });
});

app.use((_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log("BrandiQue ChatBot running on port " + PORT);
  console.log("Provider order:", PROVIDER_ORDER.join(" -> "));
  console.log("OpenRouter model:", process.env.OPENROUTER_MODEL || "openrouter/free");
  console.log("Gemini model:", process.env.GEMINI_MODEL || "gemini-3.6-flash");
  console.log("Google Sheets knowledge:", process.env.GOOGLE_SHEETS_API_URL ? "enabled on demand" : "not configured");
});
