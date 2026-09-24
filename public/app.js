const messagesEl = document.getElementById("messages");
const input = document.getElementById("input");
const form = document.getElementById("chatForm");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");
const suggestions = document.getElementById("suggestions");

const STORAGE_KEY = "brandique_darling_chat_history";
const API_BASE = window.location.hostname.endsWith("github.io")
  ? "https://brandique-chatbot.vercel.app"
  : "";
let history = loadHistory();

function loadHistory() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);

    // Migrate the previous local-only history key once.
    if (!raw) {
      const legacyRaw = localStorage.getItem("brandique_chat_history_v2");
      if (legacyRaw) {
        raw = legacyRaw;
        localStorage.setItem(STORAGE_KEY, legacyRaw);
        localStorage.removeItem("brandique_chat_history_v2");
      }
    }

    const saved = JSON.parse(raw || "[]");
    if (!Array.isArray(saved)) return [];

    return saved
      .filter((message) =>
        message &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string"
      )
      .slice(-40);
  } catch (_error) {
    return [];
  }
}

function saveHistory() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-40)));
  } catch (_error) {}
}

function scrollBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addMessage(role, content, options = {}) {
  const row = document.createElement("div");
  row.className = `message-row ${role}`;

  if (role === "assistant" && options.welcome) {
    row.innerHTML = `<div class="bubble welcome"><h2>How can I help?</h2><p>${formatMessage(content)}</p></div>`;
  } else {
    row.innerHTML = `<div class="bubble">${formatMessage(content)}</div>`;
  }

  messagesEl.appendChild(row);
  scrollBottom();
  return row;
}

function addTyping() {
  const row = document.createElement("div");
  row.className = "message-row assistant";
  row.innerHTML = '<div class="bubble typing"><i></i><i></i><i></i></div>';
  messagesEl.appendChild(row);
  scrollBottom();
  return row;
}

function formatMessage(value) {
  const div = document.createElement("div");
  div.textContent = value;
  const escaped = div.innerHTML;
  return escaped
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|\n)\s*[•*]\s+/g, "$1");
}

function setLoading(loading) {
  sendBtn.disabled = loading;
  input.disabled = loading;
}

async function sendMessage(text) {
  const trimmed = text.trim();
  if (!trimmed || sendBtn.disabled) return;

  suggestions.style.display = "none";
  addMessage("user", trimmed);
  history.push({ role: "user", content: trimmed });
  saveHistory();

  input.value = "";
  input.style.height = "auto";
  setLoading(true);

  const typing = addTyping();

  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history.slice(-20) })
    });

    const data = await response.json();
    typing.remove();

    if (!response.ok) throw new Error(data?.error || "Unable to get a response.");

    history.push({ role: "assistant", content: data.message });
    saveHistory();
    addMessage("assistant", data.message);
  } catch (error) {
    typing.remove();
    addMessage("assistant", error.message || "Something went wrong. Please try again.");
  } finally {
    setLoading(false);
    input.focus();
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  sendMessage(input.value);
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 140) + "px";
});

document.querySelectorAll("[data-prompt]").forEach((btn) => {
  btn.addEventListener("click", () => sendMessage(btn.dataset.prompt));
});

clearBtn.addEventListener("click", () => {
  const confirmed = window.confirm("Clear your Darling AI chat history from this browser?");
  if (!confirmed) return;

  history = [];
  localStorage.removeItem(STORAGE_KEY);
  messagesEl.innerHTML = "";
  suggestions.style.display = "flex";
  addMessage(
    "assistant",
    "I’m Darling, BrandiQue’s AI assistant. Ask me about our services, websites, branding, SEO, AI automation or e-commerce solutions.",
    { welcome: true }
  );
  input.focus();
});

function restoreChat() {
  if (!history.length) {
    addMessage(
      "assistant",
      "I’m Darling, BrandiQue’s AI assistant. Ask me about our services, websites, branding, SEO, AI automation or e-commerce solutions.",
      { welcome: true }
    );
    return;
  }

  suggestions.style.display = "none";

  for (const message of history) {
    addMessage(message.role, message.content);
  }
}

restoreChat();
