require("dotenv").config();

const path = require("path");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const IS_PRODUCTION = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";

// Request limits for /api/chat.
const MAX_BODY_SIZE = "256kb";
const MAX_INCOMING_MESSAGES = 40;   // the site sends at most 16
const MAX_HISTORY_MESSAGES = 16;
const MAX_HISTORY_ITEM_CHARS = 2000;
const MAX_USER_MESSAGE_CHARS = 1000;

app.disable("x-powered-by");

app.use(helmet({
  contentSecurityPolicy: false,
  frameguard: false
}));

// Browsers may call the API only from the BrandiQue website (and Cloudflare Pages previews of it).
// localhost is allowed only outside production.
const ALLOWED_ORIGINS = new Set(["https://brandique.in", "https://www.brandique.in"]);
const PAGES_PREVIEW_ORIGIN = /^https:\/\/(?:[a-z0-9-]+\.)?brandique\.pages\.dev$/;
const LOCAL_ORIGIN = /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$/;

function isAllowedOrigin(origin) {
  if (typeof origin !== "string" || !origin) return false;
  if (ALLOWED_ORIGINS.has(origin) || PAGES_PREVIEW_ORIGIN.test(origin)) return true;
  return !IS_PRODUCTION && LOCAL_ORIGIN.test(origin);
}

// Allow the chatbot to be embedded by the BrandiQue website.
// CSP frame-ancestors controls which parent pages may frame this application.
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "frame-ancestors 'self' https://www.brandique.in https://brandique.in https://aistudio.google.com https://*.aistudio.google.com"
  );
  res.vary("Origin");

  const origin = req.headers.origin;
  const allowed = isAllowedOrigin(origin);
  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "600");
  }

  if (req.method === "OPTIONS") return res.sendStatus(origin && !allowed ? 403 : 204);
  if (req.path.startsWith("/api/")) res.setHeader("Cache-Control", "no-store");
  next();
});
app.use(express.json({ limit: MAX_BODY_SIZE, strict: true }));
app.use(express.static(path.join(__dirname, "public"), { dotfiles: "ignore", index: "index.html" }));

// Best-effort per-IP limits. On serverless each warm instance keeps its own counters,
// so these slow down abuse but are not a global guarantee.
function clientIp(req) {
  const forwarded = process.env.VERCEL
    ? req.headers["x-real-ip"] || String(req.headers["x-forwarded-for"] || "").split(",")[0]
    : "";
  return String(forwarded || req.ip || req.socket?.remoteAddress || "unknown").trim();
}

const limiterDefaults = {
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => rateLimit.ipKeyGenerator(clientIp(req)),
  validate: { xForwardedForHeader: false },
  message: { error: "Too many requests. Please try again in a minute." }
};
const apiLimiter = rateLimit({ ...limiterDefaults, windowMs: 60 * 1000, limit: 30 });
const apiHourlyLimiter = rateLimit({
  ...limiterDefaults,
  windowMs: 60 * 60 * 1000,
  limit: 300,
  message: { error: "Too many requests. Please try again later." }
});

const {
  SYSTEM_PROMPT, ANSWERS, PAGES, matchIntent, inferLinks, extractLinks, toBullets,
  violatesFounderRule, founderAnswer, isFounderQuestion, wantsLinks, extractProfile, isVoiceQuestion
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
  const intro = text.match(/^(?:hi+|hello|hey|namaste|namaskaram)?[,! ]*(?:my name is|call me|naa peru|na peru|i am|i'm|im|iam|this is|nenu)\s+([a-z][a-z .'-]{1,40}?)(?:\s+(?:here|nenu))?[.!?,]*$/i);
  if (intro && profile.name) {
    const name = profile.name;
    return { message: "Nice to meet you, **" + name + "** 🙂 How can I help: a website, AI automation, design or a voice calling agent?", links: [] };
  }
  // Follow-up price question ("pricing entha?") right after a voice-agent question gets the voice plans.
  if (/\b(price|pricing|prices|cost|charges?|rates?|how much|fees?|entha|enta|plans?|packages?|differen\w*|compare|comparison|tedha|teda|monthly|month|nelaki|subscription|renewal)\b/i.test(text) && !matchIntentIsSpecific(text)) {
    const prevUser = (Array.isArray(messages) ? messages : []).filter((m) => m?.role === "user").map((m) => String(m.content || "").trim()).filter((c) => c && c !== text).slice(-1)[0];
    if (prevUser && isVoiceQuestion(prevUser.toLowerCase())) {
      if (/\b(monthly|month|months|nelaki|nelala|subscription|renewal|renew|agent fee|per agent)\b/i.test(text)) return ANSWERS.voiceNoMonthly;
      return /\b(differen\w*|compare|comparison|tedha|teda)\b/i.test(text) ? ANSWERS.voiceDifferences : ANSWERS.voicePricing;
    }
  }
  return null;
}

// True when the message itself names a service, so conversation context should not override it.
function matchIntentIsSpecific(text) {
  const intent = matchIntent(text);
  return Boolean(intent && intent !== ANSWERS.pricing && intent !== ANSWERS.memberships);
}

function findBuiltInBusinessAnswer(userText, messages = [], profile = {}) {
  return contextualAnswer(userText, messages, profile) || matchIntent(userText);
}

// Replies are rendered as plain text with **bold** and "- " bullets; never pass HTML through.
function stripHtml(value) {
  let text = String(value || "");
  for (let i = 0; i < 5; i++) {
    const next = text
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<\s*(script|style|iframe|object|embed|svg|math)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
      .replace(/<\s*\/?\s*[a-z][a-z0-9-]*(?:\s[^<>]*)?\/?\s*>/gi, "");
    if (next === text) break;
    text = next;
  }
  // Anything still tag-like after repeated passes is neutralised.
  return /<\s*\/?\s*[a-z!]/i.test(text) ? text.replace(/</g, "‹").replace(/>/g, "›") : text;
}

function cleanProviderOutput(content) {
  if (typeof content !== "string") return null;
  let text = content.trim();
  if (!text || /^__NEED_SHEET__$/i.test(text)) return null;
  const forbidden = /user\s*safety|response\s*safety|content\s*policy|policy\s*violation|safety\s*filter|moderation|api\s*key|system\s*prompt|internal\s*error|tool\s*error/i;
  if (forbidden.test(text)) return null;
  text = text.replace(/^\s*(assistant|response)\s*:\s*/i, "");
  text = stripHtml(text);
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

// Error logs stay short and never include visitor messages.
function shortError(value) {
  return String(value || "").replace(/\s+/g, " ").slice(0, 300);
}

function isProviderAvailable(provider) {
  return Date.now() >= Number(providerCooldownUntil[provider] || 0);
}

function markProviderCooldown(provider, reason = "") {
  providerCooldownUntil[provider] = Date.now() + PROVIDER_COOLDOWN_MS;
  console.error(provider + " temporarily disabled:", shortError(reason || "provider failure"));
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

          resolve(result.content);
          return;
        }

        errors.push(result.model + ": " + result.error);
        console.error("gemini model " + result.model + " failed:", shortError(result.error));

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
      const lastUser = [...conversationMessages].reverse().find((m) => m.role === "user")?.content || "";
      const mentioned = (lastUser.match(/\b(praveen|karri)\b/gi) || []).join(" ");
      if (cleaned && violatesFounderRule(cleaned.message, [memory?.name, mentioned].filter(Boolean).join(" "))) return founderAnswer(lastUser);
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

      console.error(provider + " request failed:", shortError(message));
    }
  }

  throw new Error(errors.join(" | ") || "No AI provider available");
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Visitor details are short plain values; control characters, angle brackets and newlines
// are removed so they cannot add instructions or markup.
function cleanProfileValue(value) {
  return String(value)
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function sanitizeProfile(raw) {
  const out = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const key of ["name", "business", "city", "phone", "email"]) {
    if (typeof raw[key] !== "string") continue;
    const value = cleanProfileValue(raw[key]);
    if (value) out[key] = value;
  }
  return out;
}

const VALID_LINK_PATHS = new Set(Object.values(PAGES).map((page) => page.path));

// Links are only BrandiQue site paths (rendered by the widget as https://brandique.in + path).
function safeLinks(links) {
  if (!Array.isArray(links)) return [];
  return links
    .filter((link) => link && typeof link.path === "string" && VALID_LINK_PATHS.has(link.path))
    .map((link) => ({ path: link.path, label: stripHtml(link.label || link.path).slice(0, 60) }))
    .slice(0, 3);
}

app.post("/api/chat", apiHourlyLimiter, apiLimiter, async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body) || !Array.isArray(body.messages)) {
    return res.status(400).json({ error: "Invalid request." });
  }
  if (body.messages.length > MAX_INCOMING_MESSAGES) {
    return res.status(400).json({ error: "Invalid request." });
  }
  if (body.profile !== undefined && body.profile !== null && (typeof body.profile !== "object" || Array.isArray(body.profile))) {
    return res.status(400).json({ error: "Invalid request." });
  }

  // Only visitor and assistant turns are accepted; client-supplied system or other roles are ignored.
  const validMessages = body.messages
    .filter((message) =>
      message &&
      typeof message === "object" &&
      (message.role === "user" || message.role === "assistant") &&
      typeof message.content === "string"
    )
    .slice(-MAX_HISTORY_MESSAGES);

  const latestRaw = [...validMessages].reverse().find((message) => message.role === "user");
  if (latestRaw && latestRaw.content.trim().length > MAX_USER_MESSAGE_CHARS) {
    return res.status(413).json({ error: "Your message is too long. Please keep it under " + MAX_USER_MESSAGE_CHARS + " characters." });
  }

  const messages = validMessages
    .map((message) => ({ role: message.role, content: message.content.slice(0, MAX_HISTORY_ITEM_CHARS) }));

  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  const userText = latestUserMessage?.content || "";
  const profile = sanitizeProfile(extractProfile(userText, sanitizeProfile(body.profile)));
  const showLinks = wantsLinks(userText);

  const send = (answer) => res.json({
    message: stripHtml(answer.message),
    links: showLinks ? safeLinks(answer.links) : [],
    profile
  });

  if (!messages.length) return send(ANSWERS.greeting);

  const memory = { ...extractConversationMemory(messages), ...profile };

  try {
    const personal = contextualAnswer(userText, messages, profile);
    if (personal) return send(personal);
    if (isFounderQuestion(userText)) return send(founderAnswer(userText));

    const direct = findBuiltInBusinessAnswer(userText, messages, profile);
    const detailed = userText.trim().split(/\s+/).length > 8;

    // Short questions get the verified answer instantly; longer or personalised questions
    // get a tailored AI answer grounded in the same knowledge, falling back to the verified one.
    // Voice-agent plans and prices are always answered from the verified text, whatever the length,
    // so a model can never paraphrase a price or feature wrongly.
    const VOICE_ANSWERS = [ANSWERS.voice, ANSWERS.voicePricing, ANSWERS.voiceDifferences, ANSWERS.voiceStarter, ANSWERS.voiceGrowth, ANSWERS.voicePremium, ANSWERS.voiceVsTelecaller, ANSWERS.voiceNoMonthly];
    if (direct && VOICE_ANSWERS.includes(direct)) return send(direct);
    if (direct && (!detailed || direct.links.length === 0)) return send(direct);

    try {
      const answer = await callProviderWithFallback(messages, "", memory);
      if (answer) return send(answer);
    } catch (error) {
      console.error("AI answer failed:", shortError(error?.message || error));
    }
    if (direct) return send(direct);
  } catch (error) {
    console.error("Chat request failed:", error?.message || error);
  }

  return send(safeFallback(userText, messages));
});

app.all("/api/chat", (_req, res) => {
  res.setHeader("Allow", "POST, OPTIONS");
  res.status(405).json({ error: "Method not allowed." });
});

app.all("/api/health", (_req, res) => {
  res.setHeader("Allow", "GET, HEAD, OPTIONS");
  res.status(405).json({ error: "Method not allowed." });
});

// Unknown API routes, file-like paths (server.js, package.json, .env, .git/...) and non-GET requests are 404.
// Other page paths fall back to the chat page.
app.use((req, res) => {
  const requestPath = req.path || "/";
  if (requestPath === "/api" || requestPath.startsWith("/api/")) {
    return res.status(404).json({ error: "Not found." });
  }
  if ((req.method !== "GET" && req.method !== "HEAD") || /(^|\/)\.|\.[^/]*$/.test(requestPath)) {
    return res.status(404).type("text/plain").send("Not found");
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Generic errors only: no stack traces, provider details or request content.
app.use((error, _req, res, _next) => {
  const status = Number(error?.status || error?.statusCode) || 500;
  const code = status >= 400 && status < 600 ? status : 500;
  if (code >= 500) console.error("Unhandled server error:", error?.name || "Error");
  if (res.headersSent) return;
  res.status(code).json({
    error: code === 413 ? "Request too large." : code < 500 ? "Invalid request." : "Something went wrong. Please try again."
  });
});

if (!process.env.VERCEL) {
app.listen(PORT, () => {
  console.log("BrandiQue ChatBot running on port " + PORT);
});
}

module.exports = app;
