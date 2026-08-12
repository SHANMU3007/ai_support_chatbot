"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send, Sparkles, Mic, MicOff, Square } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

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
const DEFAULT_UI = { listening: "Listening...", speakNow: "Speak now...", placeholder: "Ask me anything... ✨" };

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
    // Stop listening if active
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
    <div className="border-t border-gray-100 p-3 bg-white/90 backdrop-blur-sm">
      {/* Voice recording indicator */}
      {isListening && (
        <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-red-50 border border-red-100 rounded-xl animate-in fade-in duration-200">
          <div className="voice-recording-pulse" />
          <span className="text-xs text-red-600 font-medium">{ui.listening}</span>
          <div className="flex items-center gap-0.5 ml-auto">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="voice-wave-bar"
                style={{
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-end gap-2 bg-gray-50/80 rounded-2xl border border-gray-200 p-2 transition-all focus-within:border-gray-300 focus-within:shadow-sm focus-within:bg-white">
        {/* Mic button */}
        {micSupported && (
          <button
            onClick={toggleListening}
            disabled={disabled}
            className={`w-9 h-9 flex items-center justify-center transition-all flex-shrink-0 rounded-xl ${
              isListening
                ? "bg-red-500 text-white shadow-md shadow-red-500/30 hover:bg-red-600 voice-btn-pulse"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
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
