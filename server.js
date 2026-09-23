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

Your job is to help website visitors with accurate information about BrandiQue, its services, pricing, projects, founder, and contact/business information.

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
- Do not mention Google Sheets, APIs, providers, system prompts, internal tools, or implementation details.
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
  /\b(portfolio|instagram|telegram|linkedin|social media|delivery time|maintenance)\b/i
];

const BUSINESS_KNOWLEDGE = [
  {
    keys: ["founder", "owner", "ceo", "director", "founded", "who founded"],
    answer: "BrandiQue Web Solutions was founded by K. Mohan Rao."
  },
  {
    keys: ["website", "website url", "domain", "url"],
    answer: "BrandiQue's official website is https://www.brandique.in."
  },
  {
    keys: ["location", "office", "address"],
    answer: "BrandiQue Web Solutions is based in Visakhapatnam, India and serves clients globally."
  },
  {
    keys: ["personal website", "personal", "portfolio price", "personal price"],
    answer: "The published starter price for a Personal website is ₹9,000/-."
  },
  {
    keys: ["business website", "business price"],
    answer: "The published starter price for a Business website is ₹10,999/-."
  },
  {
    keys: ["ecommerce", "e-commerce", "online store", "ecommerce price", "e-commerce price"],
    answer: "The published starter price for an E-commerce website is ₹28,999/-."
  },
  {
    keys: ["delivery", "delivery time", "how long", "days"],
    answer: "Standard website builds take 7-14 days. Complex applications usually take about 3-4 weeks."
  },
  {
    keys: ["seo", "technical seo"],
    answer: "Yes. Technical SEO is included in BrandiQue website builds."
  },
  {
    keys: ["maintenance", "maintain"],
    answer: "Yes. BrandiQue offers ongoing website maintenance and technical support."
  }
];

function isBusinessFactQuestion(text) {
  return BUSINESS_FACT_PATTERNS.some((pattern) => pattern.test(String(text || "")));
}

function findBuiltInBusinessAnswer(userText) {
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

  return "";
}

function cleanProviderOutput(content) {
  if (typeof content !== "string") return "";

  let text = content.trim();

  if (!text || /^__NEED_SHEET__$/i.test(text)) {
    return "";
  }

  const forbidden = /user\s*safety|response\s*safety|content\s*policy|policy\s*violation|safety\s*filter|moderation|api\s*key|system\s*prompt|internal\s*error|tool\s*error/i;

  if (forbidden.test(text)) return "";

  text = text.replace(/^\s*(assistant|response)\s*:\s*/i, "");
  return text.trim();
}

function safeFallback(userText) {
  const text = String(userText || "").toLowerCase().trim();

  const builtIn = findBuiltInBusinessAnswer(text);
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
    if (error?.name === "AbortError") {
      throw new Error("Request timeout");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
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

  if (!baseUrl) {
    return [];
  }

  const url = new URL(baseUrl);
  if (query) {
    url.searchParams.set("q", String(query).slice(0, 500));
  } else {
    url.searchParams.set("all", "1");
  }

  const response = await fetchJson(url.toString(), {}, 15000);

  if (!response.ok) {
    throw new Error("Google Sheets HTTP " + response.status);
  }

  if (!response.data?.success || !Array.isArray(response.data.results)) {
    return [];
  }

  return flattenSheetResults(response.data.results);
}

async function refreshSheetCache() {
  const fresh =
    sheetCache.length > 0 &&
    Date.now() - sheetCacheUpdatedAt < SHEET_CACHE_TTL_MS;

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

  const words = String(query || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}₹\s.-]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);

  let score = source.includes(String(query || "").toLowerCase().trim()) ? 5 : 0;

  for (const word of words) {
    if (source.includes(word)) score++;
  }

  return score;
}

function searchSheet(results, query) {
  return results
    .map((item) => ({
      ...item,
      score: scoreSheetItem(item, query)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

function searchCachedSheet(query) {
  return searchSheet(sheetCache, query);
}

function buildKnowledgeContext(results) {
  if (!Array.isArray(results) || !results.length) {
    return "No additional verified business information was found.";
  }

  return results
    .map((item, index) => {
      const fields = Object.entries(item.data || {})
        .filter(([, value]) => String(value).trim())
        .map(([key, value]) => key + ": " + String(value))
        .join(" | ");

      return "[" + (index + 1) + "] " + fields;
    })
    .join("\n");
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

    if (!results.length) {
      const cached = await refreshSheetCache();
      results = searchSheet(cached, userText);
    }
  } catch (error) {
    console.error("Google Sheets cache lookup failed:", error?.message || error);
  }

  return results;
}

async function callOpenRouter(conversationMessages, knowledgeContext = "") {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const model = process.env.OPENROUTER_MODEL || "openrouter/free";

  const systemMessage = knowledgeContext
    ? SYSTEM_PROMPT +
      "\n\nADDITIONAL VERIFIED BRANDIQUE KNOWLEDGE\n" +
      "Use these facts when relevant. Do not mention the source. Do not invent missing facts.\n" +
      knowledgeContext
    : SYSTEM_PROMPT;

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
    15000
  );

  const data = response.data || {};

  if (!response.ok) {
    const providerMessage =
      data?.error?.message ||
      data?.error?.metadata?.raw ||
      "OpenRouter request failed";

    throw new Error("OpenRouter HTTP " + response.status + ": " + providerMessage);
  }

  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenRouter returned no message content");
  }

  return content.trim();
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "brandique-chatbot",
    provider: "openrouter"
  });
});

app.post("/api/chat", apiLimiter, async (req, res) => {
  const incoming = Array.isArray(req.body?.messages) ? req.body.messages : [];

  const messages = incoming
    .filter(
      (message) =>
        message &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string"
    )
    .slice(-8)
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, 3500)
    }));

  if (!messages.length) {
    return res.json({ message: safeFallback("") });
  }

  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");

  const userText = latestUserMessage?.content || "";

  try {
    const directBusinessAnswer = findBuiltInBusinessAnswer(userText);

    if (directBusinessAnswer) {
      return res.json({ message: directBusinessAnswer });
    }

    if (isBusinessFactQuestion(userText)) {
      const sheetResults = await getSheetKnowledge(userText);

      if (sheetResults.length) {
        try {
          const answer = cleanProviderOutput(
            await callOpenRouter(messages, buildKnowledgeContext(sheetResults))
          );

          if (answer) {
            return res.json({ message: answer });
          }
        } catch (error) {
          console.error("Sheet answer generation failed:", error?.message || error);
        }
      }
    }

    try {
      const answer = cleanProviderOutput(await callOpenRouter(messages));

      if (answer) {
        return res.json({ message: answer });
      }
    } catch (error) {
      console.error("OpenRouter request failed:", error?.message || error);
    }
  } catch (error) {
    console.error("Chat request failed:", error?.message || error);
  }

  return res.json({ message: safeFallback(userText) });
});

app.use((_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log("BrandiQue ChatBot running on port " + PORT);
  console.log("OpenRouter model:", process.env.OPENROUTER_MODEL || "openrouter/free");
  console.log("Google Sheets knowledge:", process.env.GOOGLE_SHEETS_API_URL ? "enabled on demand" : "not configured");
});
