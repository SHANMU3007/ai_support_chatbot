/**
 * ChatBot AI Embed Widget entry point.
 *
 * Usage on a customer website:
 *   <script src="https://yourapp.com/embed.js"
 *           data-bot-id="YOUR_BOT_ID"
 *           data-color="#6366f1">
 *   </script>
 *
 * The script injects a shadow-DOM container and mounts the React widget.
 */
import React from "react";
import { createRoot } from "react-dom/client";
import ChatWidget from "./ChatWidget";
import styles from "./styles.css?inline";

function init() {
  const currentScript =
    (document.currentScript as HTMLScriptElement) ||
    [...document.querySelectorAll<HTMLScriptElement>("script[data-bot-id]")].pop();

  if (!currentScript) {
    console.warn("[ChatBot AI] Could not locate the embed script element.");
    return;
  }

  const botId = currentScript.getAttribute("data-bot-id") || "";
  const primaryColor = currentScript.getAttribute("data-color") || "#6366f1";
  const baseUrl = currentScript.getAttribute("data-base-url") || window.location.origin;

  if (!botId) {
    console.warn("[ChatBot AI] Missing data-bot-id attribute.");
    return;
  }

  // Mount into a shadow root so styles are fully isolated
  const host = document.createElement("div");
  host.id = "chatbotai-root";
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  const styleTag = document.createElement("style");
  styleTag.textContent = styles;
  shadow.appendChild(styleTag);

  const mountPoint = document.createElement("div");
  mountPoint.classList.add("cbai-widget");
  shadow.appendChild(mountPoint);

  const root = createRoot(mountPoint);
  root.render(
    <ChatWidget botId={botId} baseUrl={baseUrl} primaryColor={primaryColor} />
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
