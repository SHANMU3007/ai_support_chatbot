"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send, Sparkles, Mic, Square } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { motion } from "framer-motion";

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
  primaryColor: string;
  language?: string;
}

// Localized UI strings for supported languages
const LANG_UI: Record<string, { listening: string; speakNow: string; placeholder: string }> = {
  ta: { listening: "கேட்கிறேன்...", speakNow: "இப்போது பேசுங்கள்...", placeholder: "என்னிடம் கேளுங்கள்... ✨" },
  hi: { listening: "सुन रहा हूँ...", speakNow: "अभी बोलें...", placeholder: "मुझसे कुछ भी पूछें... ✨" },
  es: { listening: "Escuchando...", speakNow: "Habla ahora...", placeholder: "Pregúntame algo... ✨" },
  fr: { listening: "À l'écoute...", speakNow: "Parlez maintenant...", placeholder: "Posez votre question... ✨" },
  de: { listening: "Höre zu...", speakNow: "Jetzt sprechen...", placeholder: "Stellen Sie eine Frage... ✨" },
};
const DEFAULT_UI = { listening: "Listening...", speakNow: "Speak now...", placeholder: "Ask a question..." };

export function ChatInput({ onSend, disabled, primaryColor, language = "en" }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ui = LANG_UI[language] ?? DEFAULT_UI;

  const {
    isListening,
    isSupported: micSupported,
    interimTranscript,
    toggleListening,
    stopListening,
  } = useSpeechRecognition({
    language,
    onResult: (transcript) => {
      setValue((prev) => {
        const newValue = prev ? prev + " " + transcript : transcript;
        return newValue;
      });
    },
  });

  // Auto-resize textarea when value changes
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }, [value, interimTranscript]);

  const handleSend = () => {
    if (isListening) {
      stopListening();
    }
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

  // Display value with interim transcript hint
  const displayValue = interimTranscript
    ? value + (value ? " " : "") + interimTranscript
    : value;

  return (
    <div className="border-t border-slate-200/80 dark:border-slate-800 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
      {/* Voice recording indicator */}
      {isListening && (
        <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl animate-in fade-in duration-200 shadow-xs">
          <div className="voice-recording-pulse" />
          <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">{ui.listening}</span>
          <div className="flex items-center gap-0.5 ml-auto">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="voice-wave-bar bg-rose-500"
                style={{
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-end gap-1.5 bg-slate-100/80 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-1.5 transition-all focus-within:border-indigo-400 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-2 focus-within:ring-indigo-500/20">
        {/* Mic button */}
        {micSupported && (
          <button
            onClick={toggleListening}
            disabled={disabled}
            className={`w-8 h-8 flex items-center justify-center transition-all flex-shrink-0 rounded-xl ${
              isListening
                ? "bg-rose-500 text-white shadow-md shadow-rose-500/30 hover:bg-rose-600 voice-btn-pulse"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
            } disabled:opacity-30`}
            title={isListening ? "Stop recording" : "Voice input"}
            aria-label={isListening ? "Stop recording" : "Start voice input"}
          >
            {isListening ? (
              <Square className="h-3.5 w-3.5" fill="currentColor" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </button>
        )}

        <textarea
          ref={textareaRef}
          value={isListening ? displayValue : value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={isListening ? ui.speakNow : ui.placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent text-sm resize-none outline-none min-h-[30px] max-h-[120px] placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-slate-100 py-1.5 px-2"
        />

        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="w-8 h-8 flex items-center justify-center text-white transition-all disabled:opacity-30 disabled:scale-95 flex-shrink-0 shadow-sm rounded-xl"
          style={{ backgroundColor: primaryColor || "#4f46e5" }}
        >
          {disabled ? (
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
        </motion.button>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 px-1 mt-2 select-none">
        <span>Powered by <strong className="font-semibold text-slate-500 dark:text-slate-400">SupportIQ</strong></span>
        <span>Press <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-mono">Enter ↵</kbd></span>
      </div>
    </div>
  );
}
