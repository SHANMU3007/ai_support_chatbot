import React, { useState } from "react";

interface Props {
  botId: string;
  baseUrl: string;
  primaryColor: string;
}

const ChatIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="white"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="white"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function ChatWidget({ botId, baseUrl, primaryColor }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Chat iframe */}
      <div className={`cbai-frame${open ? "" : " hidden"}`}>
        {open && (
          <iframe
            src={`${baseUrl}/chat/${botId}`}
            title="Customer Support Chat"
            allow="microphone"
          />
        )}
      </div>

      {/* Toggle button */}
      <button
        className="cbai-btn"
        style={{ background: primaryColor }}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open chat"}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>
    </>
  );
}
