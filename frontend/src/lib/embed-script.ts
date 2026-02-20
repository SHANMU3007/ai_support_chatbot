export function generateEmbedScript(botId: string, color: string, appUrl: string): string {
  return `
(function() {
  'use strict';
  
  var BOT_ID = '${botId}';
  var PRIMARY_COLOR = '${color}';
  var APP_URL = '${appUrl}';
  
  // Avoid double-loading
  if (window.__chatbotLoaded) return;
  window.__chatbotLoaded = true;
  
  var isOpen = false;
  
  // Inject styles
  var style = document.createElement('style');
  style.textContent = [
    '#chatbot-toggle{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:#000000;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.2);z-index:999998;display:flex;align-items:center;justify-content:center;transition:transform 0.2s;}',
    '#chatbot-toggle:hover{transform:scale(1.1);}',
    '#chatbot-iframe-container{position:fixed;bottom:96px;right:24px;width:380px;height:560px;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.2);z-index:999999;transition:opacity 0.3s,transform 0.3s;transform-origin:bottom right;}',
    '#chatbot-iframe-container.hidden{opacity:0;transform:scale(0.9);pointer-events:none;}',
    '#chatbot-iframe{width:100%;height:100%;border:none;}',
    '@media(max-width:480px){#chatbot-iframe-container{width:calc(100vw - 24px);height:calc(100vh - 120px);right:12px;bottom:88px;}}'
  ].join('');
  document.head.appendChild(style);
  
  // Create toggle button
  var btn = document.createElement('button');
  btn.id = 'chatbot-toggle';
  btn.setAttribute('aria-label', 'Open chat');
  btn.innerHTML = '<svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="white"/></svg>';
  document.body.appendChild(btn);
  
  // Create iframe container
  var container = document.createElement('div');
  container.id = 'chatbot-iframe-container';
  container.className = 'hidden';
  
  var iframe = document.createElement('iframe');
  iframe.id = 'chatbot-iframe';
  iframe.src = APP_URL + '/chat/' + BOT_ID;
  iframe.title = 'Customer Support Chat';
  container.appendChild(iframe);
  document.body.appendChild(container);
  
  // Toggle
  btn.addEventListener('click', function() {
    isOpen = !isOpen;
    if (isOpen) {
      container.classList.remove('hidden');
      btn.innerHTML = '<svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="white"/></svg>';
      btn.setAttribute('aria-label', 'Close chat');
    } else {
      container.classList.add('hidden');
      btn.innerHTML = '<svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="white"/></svg>';
      btn.setAttribute('aria-label', 'Open chat');
    }
  });
  
  // Allow closing from within iframe
  window.addEventListener('message', function(e) {
    if (e.data === 'chatbot:close') {
      isOpen = false;
      container.classList.add('hidden');
    }
  });
})();
`.trim();
}
