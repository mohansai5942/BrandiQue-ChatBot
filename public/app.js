const messagesEl = document.getElementById("messages");
const input = document.getElementById("input");
const form = document.getElementById("chatForm");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");
const suggestions = document.getElementById("suggestions");

let history = [];

function scrollBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addMessage(role, content, options = {}) {
  const row = document.createElement("div");
  row.className = `message-row ${role}`;

  if (role === "assistant" && options.welcome) {
    row.innerHTML = `<div class="bubble welcome"><h2>How can I help?</h2><p>${escapeHtml(content)}</p></div>`;
  } else {
    row.innerHTML = `<div class="bubble">${escapeHtml(content)}</div>`;
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

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
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
  input.value = "";
  input.style.height = "auto";
  setLoading(true);

  const typing = addTyping();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history })
    });

    const data = await response.json();
    typing.remove();

    if (!response.ok) throw new Error(data?.error || "Unable to get a response.");

    history.push({ role: "assistant", content: data.message });
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
  history = [];
  messagesEl.innerHTML = "";
  suggestions.style.display = "flex";
  addMessage(
    "assistant",
    "I’m Darling, BrandiQue’s AI assistant. Ask me about our services, websites, branding, SEO, AI automation or e-commerce solutions.",
    { welcome: true }
  );
  input.focus();
});

addMessage(
  "assistant",
  "I’m Darling, BrandiQue’s AI assistant. Ask me about our services, websites, branding, SEO, AI automation or e-commerce solutions.",
  { welcome: true }
);
