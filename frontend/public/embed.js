/**
 * ChatBot AI – Standalone Embed Widget
 * Auto-generated at build time. Do not edit manually.
 * For the source template, see src/lib/embed-script.ts
 */
(function () {
  "use strict";

  var CHAT_BASE_URL = window.ChatBotAIConfig && window.ChatBotAIConfig.baseUrl
    ? window.ChatBotAIConfig.baseUrl
    : "";

  var botId = document.currentScript
    ? document.currentScript.getAttribute("data-bot-id")
    : null;

  if (!botId) {
    var scripts = document.querySelectorAll("script[data-bot-id]");
    if (scripts.length) botId = scripts[scripts.length - 1].getAttribute("data-bot-id");
  }

  if (!botId) {
    console.warn("[ChatBot AI] No data-bot-id found on embed script.");
    return;
  }

  var primaryColor = document.currentScript
    ? document.currentScript.getAttribute("data-color") || "#6366f1"
    : "#6366f1";

  var buttonSize = 56;
  var isOpen = false;
  var iframe = null;

  // ── Button ──────────────────────────────────────────────────────
  var btn = document.createElement("button");
  btn.id = "chatbotai-toggle";
  btn.setAttribute("aria-label", "Open chat");
  btn.style.cssText = [
    "position:fixed",
    "bottom:24px",
    "right:24px",
    "width:" + buttonSize + "px",
    "height:" + buttonSize + "px",
    "border-radius:50%",
    "background:" + primaryColor,
    "border:none",
    "cursor:pointer",
    "box-shadow:0 4px 14px rgba(0,0,0,0.25)",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "z-index:2147483646",
    "transition:transform 0.2s",
  ].join(";");

  btn.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';

  btn.addEventListener("mouseenter", function () { btn.style.transform = "scale(1.1)"; });
  btn.addEventListener("mouseleave", function () { btn.style.transform = "scale(1)"; });

  // ── Chat frame ──────────────────────────────────────────────────
  var frameWrap = document.createElement("div");
  frameWrap.id = "chatbotai-frame";
  frameWrap.style.cssText = [
    "position:fixed",
    "bottom:" + (buttonSize + 32) + "px",
    "right:24px",
    "width:380px",
    "height:580px",
    "max-width:calc(100vw - 48px)",
    "max-height:calc(100vh - 120px)",
    "border-radius:16px",
    "box-shadow:0 8px 40px rgba(0,0,0,0.18)",
    "overflow:hidden",
    "z-index:2147483645",
    "display:none",
    "border:1px solid #e5e7eb",
    "background:#fff",
  ].join(";");

  frameWrap.innerHTML =
    '<iframe src="' + CHAT_BASE_URL + '/chat/' + botId + '" style="width:100%;height:100%;border:none;" allow="microphone" title="Chat"></iframe>';

  // ── Toggle logic ────────────────────────────────────────────────
  btn.addEventListener("click", function () {
    isOpen = !isOpen;
    frameWrap.style.display = isOpen ? "block" : "none";
    btn.setAttribute("aria-label", isOpen ? "Close chat" : "Open chat");
    btn.innerHTML = isOpen
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
  });

  document.body.appendChild(frameWrap);
  document.body.appendChild(btn);
})();
