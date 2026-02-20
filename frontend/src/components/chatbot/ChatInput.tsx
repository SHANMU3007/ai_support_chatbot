"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Send, Sparkles } from "lucide-react";

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
    <div className="border-t border-gray-100 p-3 bg-white/90 backdrop-blur-sm">
      <div className="flex items-end gap-2 bg-gray-50/80 rounded-2xl border border-gray-200 p-2 transition-all focus-within:border-gray-300 focus-within:shadow-sm focus-within:bg-white">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Ask me anything... ✨"
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent text-sm resize-none outline-none min-h-[28px] max-h-[120px] placeholder:text-gray-400 py-1 px-2"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="w-9 h-9 flex items-center justify-center text-white transition-all disabled:opacity-30 disabled:scale-95 flex-shrink-0 hover:scale-105 active:scale-95 shadow-sm rounded-sm bg-black"
        >
          {disabled ? (
            <Sparkles className="h-4 w-4 animate-pulse" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
      <p className="text-center text-[10px] text-gray-400 mt-2 select-none">
        Powered by <span className="font-medium">SupportIQ</span> · Smart Answers, Instantly
      </p>
    </div>
  );
}
