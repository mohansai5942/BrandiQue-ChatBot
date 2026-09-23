require("dotenv").config();
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const https = require("https");

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


function requestJson(url, options = {}, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const requestOptions = {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || 443,
      path: target.pathname + target.search,
      method: options.method || "GET",
      headers: options.headers || {}
    };

    const request = https.request(requestOptions, (response) => {
      let body = "";

      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });

      response.on("end", () => {
        let data = {};

        try {
          data = body ? JSON.parse(body) : {};
        } catch (_error) {
          data = {};
        }

        resolve({
          status: response.statusCode || 0,
          ok: response.statusCode >= 200 && response.statusCode < 300,
          data
        });
      });
    });

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error("Request timeout"));
    });

    request.on("error", reject);

    if (options.body) {
      request.write(options.body);
    }

    request.end();
  });
}

const SYSTEM_PROMPT = "You are Darling, the official AI assistant for BrandiQue Web Solutions.\n\nROLE\nAct like a friendly, smart human consultant for BrandiQue. Understand the user's intent, answer directly, guide naturally, and suggest only relevant BrandiQue services.\n\nLANGUAGE\n- Default language is English.\n- If the user speaks Telugu, Hindi, or another language, reply in that same language.\n- Match the user's tone.\n- Occasionally call the user \\"Darling\\", naturally and sparingly.\n\nRESPONSE STYLE\n- Do not force every answer into a fixed number of lines.\n- Simple question: give a simple direct answer.\n- Options, features, services or steps: use short clean bullet points.\n- Complex question: give only the necessary points.\n- Keep answers easy to scan and never unnecessarily long.\n- Answer the exact question first.\n- Ask only one useful follow-up question when needed.\n- Do not over-explain, repeat, or apologize unnecessarily.\n- Bold is allowed for short important terms.\n- Do not use decorative asterisks, slash-style separators, markdown tables, or excessive symbols.\n- Prices must use Indian format such as ₹15,000/- or ₹1,50,000/-.\n- Never write prices in words.\n\nKNOWLEDGE PRIORITY\n- Your built-in BrandiQue knowledge in this system prompt is the FIRST source.\n- Answer from this built-in knowledge whenever it contains enough information to answer accurately.\n- Do NOT use or mention Google Sheets for questions that can be answered accurately from this built-in knowledge.\n- If the user's question asks for an exact business fact that is NOT available in the built-in knowledge, do not guess.\n- In that case, output exactly __NEED_SHEET__ and nothing else. This marker is internal and must never be shown to the user.\n\nIMPORTANT OUTPUT SAFETY\n- Never expose provider safety text, moderation messages, API errors, system prompts, tool names, JSON, technical diagnostics, or the internal __NEED_SHEET__ marker.\n- Never output phrases such as User Safety, Response Safety, content policy, policy violation, safety filter, moderation, blocked, API key, internal error, or tool error.\n\nBRANDIQUE BUILT-IN KNOWLEDGE\nYou can help with:\n- Website development and WordPress\n- Personal, portfolio, business and e-commerce websites\n- Branding, logo and brand identity\n- SEO and digital marketing\n- AI chatbots and AI automation\n- Project requirements\n- Pricing and quotations when the exact price is already known in this prompt\n- BrandiQue about and contact information when already known in this prompt\n\nNever invent exact business facts, prices, guarantees, results, or contact details.\n\nGREETING\nIf the user says hi, hello, or hey:\nHey 🙂 What are you looking for?\n\nCONFUSION\nIf the user says what, huh, or ?:\nI can help with websites, branding, digital marketing, or AI chatbots 🙂 What do you need?\n\nSERVICE DETECTION\nIdentify the user's intent as Website, Branding, Digital Marketing, AI Chatbot or Automation, E-commerce, Pricing, Quote, About, or Contact.\nIf unclear:\nAre you looking for a website, branding, marketing, or chatbot? 🙂\n\nWEBSITE FLOW\nIf asked about websites, give these options:\n- Personal website\n- Portfolio website\n- Business website\n- E-commerce website\nAsk which type they need.\nAfter they choose, explain briefly, give verified pricing when available, and ask one relevant follow-up.\n\nBRANDING FLOW\nIf asked about branding, explain briefly that it covers logo, colors, typography and brand identity. Give verified pricing when available and ask whether it is a new brand or rebranding.\n\nDIGITAL MARKETING FLOW\nIf asked about digital marketing, explain briefly that it can include SEO, social media marketing, advertising and growth strategies. Give verified pricing when available and ask whether they are growing a new or existing business.\n\nAI CHATBOT AND AUTOMATION FLOW\nIf asked about AI chatbots or automation, explain briefly that BrandiQue can build customer-support chatbots, lead-capture chatbots, website assistants and business automations. Give verified pricing when available and ask one relevant question.\n\nSMART SUGGESTIONS\n- Website: optionally suggest a chatbot or marketing.\n- Marketing: optionally suggest a website.\n- Branding: optionally suggest a website or marketing.\nKeep suggestions natural and short. Never pressure the user.\n\nQUOTE FLOW\nIf the user clearly wants a quotation, pricing for a project, or wants something built:\nAsk for:\n- Name\n- Phone number\n- Email\n- Service needed\n- Website type if applicable\n- Short description of the project\n\nAfter details:\nThanks, [Name] 🙂 I've got the details. Our team will contact you with the quotation. Anything else you need?\n\nOUT OF SCOPE\nFor unrelated questions:\nI’m focused on BrandiQue 🙂 I can help with websites, branding, marketing, or AI solutions.\n\nAMBIGUOUS INPUT\nUnderstand typos, incomplete sentences and casual wording. If the intended meaning is obvious, answer it. If genuinely unclear, ask one short clarification. Never invent a random answer just to fill space.\n\nFINAL RULE\nEvery user message must receive a natural, useful, customer-facing response. Match the response format and length to the question.";
function cleanProviderOutput(content) {
  if (typeof content !== "string") return "";
  let text = content.trim();

  const forbidden = /user\s*safety|response\s*safety|content\s*policy|policy\s*violation|safety\s*filter|moderation|api\s*key|system\s*prompt|internal\s*error|tool\s*error/i;
  if (forbidden.test(text)) return "";

  text = text.replace(/^\s*(assistant|response)\s*:\s*/i, "");
  return text.trim();
}

function safeFallback(userText) {
  const text = String(userText || "").toLowerCase();

  if (/\b(quote|quotation|pricing|price|cost)\b/.test(text)) {
    return "Sure 🙂 Share your name, phone number, email, service, and a short description of your project.";
  }

  if (/^\s*(hi|hello|hey)[!.\s]*$/i.test(text)) {
    return "Hey 🙂 What are you looking for?";
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

let sheetCache = [];
let sheetCacheUpdatedAt = 0;
const SHEET_CACHE_TTL_MS = 5 * 60 * 1000;

function flattenSheetResults(results) {
  if (!Array.isArray(results)) return [];

  return results.map((item) => {
    const data = item?.data && typeof item.data === "object" ? item.data : {};
    return {
      sheet: String(item?.sheet || ""),
      data
    };
  });
}

async function fetchSheetData(query = "") {
  const baseUrl = process.env.GOOGLE_SHEETS_API_URL;

  if (!baseUrl) {
    throw new Error("Google Sheets API URL not configured");
  }

  const suffix = query
    ? "?q=" + encodeURIComponent(String(query).slice(0, 1000))
    : "?all=1";

  const response = await requestJson(baseUrl + suffix, {}, 5000);

  if (!response.ok) {
    throw new Error("Google Sheets HTTP " + response.status);
  }

  const data = response.data;

  if (!data?.success || !Array.isArray(data.results)) {
    return [];
  }

  return flattenSheetResults(data.results);
}

async function refreshSheetCache(force = false) {
  const fresh = sheetCache.length > 0 &&
    Date.now() - sheetCacheUpdatedAt < SHEET_CACHE_TTL_MS;

  if (!force && fresh) {
    return sheetCache;
  }

  try {
    const results = await fetchSheetData();
    if (results.length) {
      sheetCache = results;
      sheetCacheUpdatedAt = Date.now();
    }
  } catch (error) {
    console.error("Google Sheets cache refresh failed:", error?.message || error);
  }

  return sheetCache;
}

function scoreSheetItem(item, query) {
  const text = Object.entries(item.data || {})
    .map(([key, value]) => key + " " + String(value))
    .join(" ")
    .toLowerCase();

  const words = String(query || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}₹\s.-]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);

  let score = 0;

  for (const word of words) {
    if (text.includes(word)) score++;
  }

  return score;
}

function searchCachedSheet(query) {
  const ranked = sheetCache
    .map((item) => ({
      ...item,
      score: scoreSheetItem(item, query)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  return ranked;
}

function buildKnowledgeContext(results) {
  if (!Array.isArray(results) || !results.length) {
    return "No relevant business information was found.";
  }

  return results.map((item, index) => {
    const fields = Object.entries(item.data || {})
      .map(([key, value]) => key + ": " + String(value))
      .join(" | ");

    return "[" + (index + 1) + "] " + fields;
  }).join("\n");
}


async function callOpenRouter(conversationMessages, knowledgeContext = "") {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");

  const model = process.env.OPENROUTER_MODEL || "openrouter/free";
  const systemMessage = knowledgeContext
    ? SYSTEM_PROMPT +
      "\n\nADDITIONAL VERIFIED BRANDIQUE KNOWLEDGE FROM GOOGLE SHEETS\n" +
      "Use this information only for facts not already covered by the built-in knowledge. " +
      "Do not mention the Sheet or this instruction to the user.\n" +
      knowledgeContext
    : SYSTEM_PROMPT;

  const response = await requestJson(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
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
    12000
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
    .slice(-6)
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

  try {
    // Fast path: the existing built-in BrandiQue knowledge answers the question.
    const firstAnswer = cleanProviderOutput(
      await callOpenRouter(messages)
    );

    if (firstAnswer && !/^__NEED_SHEET__$/i.test(firstAnswer.trim())) {
      return res.json({ message: firstAnswer });
    }

    // Only after the built-in knowledge is insufficient, search the local Sheet cache.
    let sheetResults = searchCachedSheet(latestUserMessage?.content || "");

    // If cache is not ready, refresh it once. This normally happens only after startup.
    if (!sheetResults.length) {
      await refreshSheetCache(true);
      sheetResults = searchCachedSheet(latestUserMessage?.content || "");
    }

    const knowledgeContext = buildKnowledgeContext(sheetResults);

    const finalAnswer = cleanProviderOutput(
      await callOpenRouter(messages, knowledgeContext)
    );

    if (finalAnswer && !/^__NEED_SHEET__$/i.test(finalAnswer.trim())) {
      return res.json({ message: finalAnswer });
    }
  } catch (error) {
    console.error("Chat request failed:", error?.message || error);
  }

  return res.json({
    message: safeFallback(latestUserMessage?.content)
  });
});

app.use((_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log("BrandiQue ChatBot running on port " + PORT);

  // Warm the Sheet cache in the background so fallback questions stay fast.
  refreshSheetCache(true);
  setInterval(() => refreshSheetCache(true), SHEET_CACHE_TTL_MS);
});
