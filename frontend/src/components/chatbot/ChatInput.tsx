"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Send } from "lucide-react";

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
  primaryColor: string;
}

export function ChatInput({ onSend, disabled, primaryColor }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  };

  return (
    <div className="border-t p-3 bg-white">
      <div className="flex items-end gap-2 bg-gray-50 rounded-xl border p-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Type a message... (Enter to send)"
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent text-sm resize-none outline-none min-h-[28px] max-h-[120px] placeholder:text-gray-400"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition-opacity disabled:opacity-40 flex-shrink-0"
          style={{ backgroundColor: primaryColor }}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      <p className="text-center text-xs text-gray-400 mt-2">
        Powered by Claude AI
      </p>
    </div>
  );
}
