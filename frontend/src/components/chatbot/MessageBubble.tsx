"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChatMessage } from "@/hooks/useChat";
import { formatRelativeTime } from "@/lib/utils";
import { Bot, User, Volume2, VolumeX, Copy, Check } from "lucide-react";

interface Props {
  message: ChatMessage;
  primaryColor: string;
  isSpeaking?: boolean;
  isCurrentSpeaking?: boolean;
  onSpeak?: (text: string, messageId: string) => void;
  onStopSpeak?: () => void;
  ttsSupported?: boolean;
}

export function MessageBubble({
  message,
  primaryColor,
  isSpeaking = false,
  isCurrentSpeaking = false,
  onSpeak,
  onStopSpeak,
  ttsSupported = false,
}: Props) {
  const isAssistant = message.role === "assistant";
  const hasContent = !!message.content && message.content !== "thinking...";
  const [copied, setCopied] = useState(false);

  const handleToggleTTS = () => {
    if (isCurrentSpeaking) {
      onStopSpeak?.();
    } else {
      onSpeak?.(message.content, message.id);
    }
  };

  const handleCopy = () => {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`flex items-end gap-2.5 group ${
        isAssistant ? "justify-start" : "justify-end"
      }`}
    >
      {isAssistant && (
        <div
          className="w-7 h-7 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm border border-white/20"
          style={{ backgroundColor: primaryColor || "#4f46e5" }}
        >
          <Bot className="h-4 w-4" />
        </div>
      )}

      <div className={`max-w-[82%] ${isAssistant ? "" : "items-end flex flex-col"}`}>
        <div
          className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words rounded-2xl transition-all shadow-xs ${
            isAssistant
              ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-700/80 rounded-bl-xs"
              : "text-white rounded-br-xs shadow-md"
          }`}
          style={!isAssistant ? { backgroundColor: primaryColor || "#4f46e5" } : undefined}
        >
          {message.content || (
            <span className="opacity-50 italic text-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
              generating response...
            </span>
          )}
        </div>

        {/* Footer with timestamp, TTS & Copy actions */}
        <div className="flex items-center gap-2 mt-1 px-1">
          <span className="text-[10px] text-slate-400 font-medium select-none">
            {formatRelativeTime(message.timestamp)}
          </span>

          {/* Copy Button */}
          {hasContent && (
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 rounded transition-opacity"
              title="Copy message"
            >
              {copied ? (
                <Check className="h-3 w-3 text-emerald-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          )}

          {/* TTS button - only for assistant messages with content */}
          {isAssistant && hasContent && ttsSupported && (
            <button
              onClick={handleToggleTTS}
              className={`p-1 rounded-md transition-all duration-200 flex items-center gap-1 text-xs ${
                isCurrentSpeaking
                  ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              title={isCurrentSpeaking ? "Stop voice playback" : "Listen to message"}
            >
              {isCurrentSpeaking ? (
                <div className="flex items-center gap-1">
                  <VolumeX className="h-3.5 w-3.5 text-indigo-600" />
                  <div className="flex items-center gap-[2px] h-3">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="w-[2px] bg-indigo-600 rounded-full tts-wave-bar"
                        style={{
                          animationDelay: `${i * 0.15}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {!isAssistant && (
        <div className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 shadow-xs border border-slate-300 dark:border-slate-600">
          <User className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
        </div>
      )}
    </motion.div>
  );
}
