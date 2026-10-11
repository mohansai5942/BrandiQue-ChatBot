require("dotenv").config();

const path = require("path");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(helmet({
  contentSecurityPolicy: false,
  frameguard: false
}));

// Allow the chatbot to be embedded by the BrandiQue website.
// CSP frame-ancestors controls which parent pages may frame this application.
app.use((_req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "frame-ancestors 'self' https://www.brandique.in https://brandique.in https://aistudio.google.com https://*.aistudio.google.com"
  );
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (_req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again in a minute." }
});

const {
  SYSTEM_PROMPT, ANSWERS, matchIntent, inferLinks, extractLinks, toBullets,
  violatesFounderRule, founderAnswer, isFounderQuestion, wantsLinks, extractProfile
} = require("./knowledge");

const BUSINESS_FACT_PATTERNS = [/\b(price|pricing|cost|package|service|quote)\b/i];
const USE_SHEETS = /^(1|true|yes)$/i.test(String(process.env.USE_SHEETS_KNOWLEDGE || ""));

function isBusinessFactQuestion(text) {
  return USE_SHEETS && BUSINESS_FACT_PATTERNS.some((pattern) => pattern.test(String(text || "")));
}

function extractConversationMemory(messages) {
  const memory = { name: "", lastTopic: "" };
  for (const message of Array.isArray(messages) ? messages : []) {
    if (message?.role !== "user") continue;
    const text = String(message.content || "").trim();
    const m = text.match(/\b(?:my name is|call me|naa peru|na peru)\s+([a-z][a-z .'-]{1,40})/i);
    if (m) memory.name = m[1].trim().replace(/[.!?,]+$/, "");
    const intent = matchIntent(text);
    if (intent && intent.links && intent.links[0]) memory.lastTopic = intent.links[0].label;
  }
  return memory;
}

function contextualAnswer(userText, messages, profile = {}) {
  const text = String(userText || "").trim();
  if (/\b(remember my name|what is my name|what's my name|who am i|naa peru enti|na peru enti|naa peru gurtunda)\b/i.test(text)) {
    return profile.name
      ? { message: "Yes 🙂 your name is **" + profile.name + "**.", links: [] }
      : { message: "I don't have your name yet 🙂 Tell me and I'll remember it.", links: [] };
  }
  const intro = text.match(/^(?:hi|hello|hey)?[,! ]*(?:my name is|call me|naa peru|na peru|i am|i'm)\s+([a-z][a-z .'-]{1,40})[.!?,]*$/i);
  if (intro) {
    const name = profile.name || intro[1].trim();
    return { message: "Nice to meet you, **" + name + "** 🙂 How can I help: a website, AI automation or design?", links: [] };
  }
  return null;
}

function findBuiltInBusinessAnswer(userText, messages = [], profile = {}) {
  return contextualAnswer(userText, messages, profile) || matchIntent(userText);
}

function cleanProviderOutput(content) {
  if (typeof content !== "string") return null;
  let text = content.trim();
  if (!text || /^__NEED_SHEET__$/i.test(text)) return null;
  const forbidden = /user\s*safety|response\s*safety|content\s*policy|policy\s*violation|safety\s*filter|moderation|api\s*key|system\s*prompt|internal\s*error|tool\s*error/i;
  if (forbidden.test(text)) return null;
  text = text.replace(/^\s*(assistant|response)\s*:\s*/i, "");
  const parsed = extractLinks(text);
  if (!parsed.text) return null;
  return {
    message: toBullets(parsed.text),
    links: parsed.links.length ? parsed.links : inferLinks(parsed.text)
  };
}

function safeFallback(userText, messages = []) {
  return findBuiltInBusinessAnswer(userText, messages) || ANSWERS.fallback;
}

async function fetchJson(url, options = {}, timeoutMs = 15000, externalSignal = null) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const signal = externalSignal
    ? AbortSignal.any([controller.signal, externalSignal])
    : controller.signal;

  try {
    const response = await fetch(url, {
      ...options,
      redirect: "follow",
      signal
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
const OPENROUTER_TIMEOUT_MS = Math.min(Number(process.env.OPENROUTER_TIMEOUT_MS || 1000), 1000);
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 7000);
const PROVIDER_FAILOVER_DELAY_MS = Math.min(Number(process.env.PROVIDER_FAILOVER_DELAY_MS || 1000), 1000);
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const GEMINI_FALLBACK_MODELS = String(process.env.GEMINI_FALLBACK_MODELS || "gemini-3.7-flash,gemini-3.6-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

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
    .filter((item) => Object.keys(item.data).length > 0)
    .filter((item) => !/praveen|karri|co[- ]?founder/i.test(JSON.stringify(item.data)));
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
    memory.name ? "Visitor name: " + memory.name : "",
    memory.business ? "Visitor business: " + memory.business : "",
    memory.city ? "Visitor city: " + memory.city : "",
    memory.phone ? "Visitor phone: " + memory.phone : "",
    memory.email ? "Visitor email: " + memory.email : "",
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
        max_tokens: 500,
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

async function callGeminiModel(model, conversationMessages, knowledgeContext, memory, abortSignal) {
  const apiKey = process.env.GEMINI_API_KEY;

  const memoryContext = [
    memory.name ? "Visitor name: " + memory.name : "",
    memory.business ? "Visitor business: " + memory.business : "",
    memory.city ? "Visitor city: " + memory.city : "",
    memory.phone ? "Visitor phone: " + memory.phone : "",
    memory.email ? "Visitor email: " + memory.email : "",
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
          thinkingConfig: {
            thinkingLevel: "low"
          },
          maxOutputTokens: 500
        }
      })
    },
    GEMINI_TIMEOUT_MS,
    abortSignal
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

async function callGemini(conversationMessages, knowledgeContext = "", memory = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const models = [GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS]
    .filter((model, index, list) => model && list.indexOf(model) === index);

  const errors = [];
  const controllers = models.map(() => new AbortController());
  let settled = false;

  const attempts = models.map((model, index) =>
    callGeminiModel(
      model,
      conversationMessages,
      knowledgeContext,
      memory,
      controllers[index].signal
    )
      .then((content) => ({ ok: true, content, model }))
      .catch((error) => ({
        ok: false,
        model,
        error: error?.message || String(error)
      }))
  );

  return new Promise((resolve, reject) => {
    let completed = 0;

    attempts.forEach((attempt) => {
      attempt.then((result) => {
        if (settled) return;

        completed++;

        if (result.ok && result.content) {
          settled = true;

          controllers.forEach((controller, index) => {
            if (models[index] !== result.model) controller.abort();
          });

          console.log("Gemini response served by:", result.model);
          resolve(result.content);
          return;
        }

        errors.push(result.model + ": " + result.error);
        console.error("gemini model " + result.model + " failed:", result.error);

        if (completed === attempts.length) {
          settled = true;
          reject(new Error(errors.join(" | ") || "All Gemini models failed"));
        }
      });
    });
  });
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
      if (cleaned && violatesFounderRule(cleaned.message)) return founderAnswer("");
      if (cleaned) return cleaned;

      throw new Error(provider + " returned empty content");
    } catch (error) {
      const message = error?.message || String(error);
      errors.push(provider + ": " + message);

      if (provider === "openrouter" && /HTTP 429|quota|rate limit/i.test(message)) {
        providerCooldownUntil[provider] = Date.now() + 24 * 60 * 60 * 1000;
        console.error("openrouter disabled after quota/rate-limit response; Gemini failover remains active.");
      } else if (provider === "openrouter" && /HTTP 408|HTTP 5\d\d|timeout|temporarily unavailable/i.test(message)) {
        markProviderCooldown(provider, message);
      } else if (provider === "gemini" && /HTTP 429|quota|rate limit/i.test(message)) {
        console.error("Gemini model-level limit reached; all configured Gemini models were attempted.");
      } else if (provider === "gemini" && /HTTP 408|HTTP 5\d\d|timeout|temporarily unavailable/i.test(message)) {
        console.error("Gemini transient failure; another configured Gemini model was attempted.");
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
    geminiModel: GEMINI_MODEL,
    geminiFallbackModels: GEMINI_FALLBACK_MODELS,
    failoverDelayMs: PROVIDER_FAILOVER_DELAY_MS,
    memory: "conversation"
  });
});

function sanitizeProfile(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const key of ["name", "business", "city", "phone", "email"]) {
    if (typeof raw[key] === "string" && raw[key].trim()) out[key] = raw[key].trim().slice(0, 80);
  }
  return out;
}

app.post("/api/chat", apiLimiter, async (req, res) => {
  const incoming = Array.isArray(req.body?.messages) ? req.body.messages : [];

  const messages = incoming
    .filter((message) =>
      message &&
      (message.role === "user" || message.role === "assistant") &&
      typeof message.content === "string"
    )
    .slice(-16)
    .map((message) => ({ role: message.role, content: message.content.slice(0, 2000) }));

  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  const userText = latestUserMessage?.content || "";
  const profile = extractProfile(userText, sanitizeProfile(req.body?.profile));
  const showLinks = wantsLinks(userText);

  const send = (answer) => res.json({
    message: answer.message,
    links: showLinks ? (answer.links || []) : [],
    profile
  });

  if (!messages.length) return send(ANSWERS.greeting);

  const memory = { ...extractConversationMemory(messages), ...profile };

  try {
    if (isFounderQuestion(userText)) return send(founderAnswer(userText));

    const direct = findBuiltInBusinessAnswer(userText, messages, profile);
    const detailed = userText.trim().split(/\s+/).length > 8;

    // Short questions get the verified answer instantly; longer or personalised questions
    // get a tailored AI answer grounded in the same knowledge, falling back to the verified one.
    if (direct && (!detailed || direct.links.length === 0)) return send(direct);

    try {
      const answer = await callProviderWithFallback(messages, "", memory);
      if (answer) return send(answer);
    } catch (error) {
      console.error("AI answer failed:", error?.message || error);
    }
    if (direct) return send(direct);
  } catch (error) {
    console.error("Chat request failed:", error?.message || error);
  }

  return send(safeFallback(userText, messages));
});

app.use((_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

if (!process.env.VERCEL) {
app.listen(PORT, () => {
  console.log("BrandiQue ChatBot running on port " + PORT);
  console.log("Provider order:", PROVIDER_ORDER.join(" -> "));
  console.log("OpenRouter model:", process.env.OPENROUTER_MODEL || "openrouter/free");
  console.log("Gemini models:", [GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS].join(" -> "));
  console.log("Google Sheets knowledge:", process.env.GOOGLE_SHEETS_API_URL ? "enabled on demand" : "not configured");
});
}

module.exports = app;
