"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface UseTextToSpeechOptions {
  language?: string;
  rate?: number;
  pitch?: number;
}

export function useTextToSpeech({
  language = "en",
  rate = 1,
  pitch = 1,
}: UseTextToSpeechOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setIsSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  const speak = useCallback(
    (text: string, messageId: string) => {
      if (!("speechSynthesis" in window)) return;

      // If currently speaking the same message, stop it
      if (isSpeaking && currentMessageId === messageId) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        setCurrentMessageId(null);
        return;
      }

      // Stop any current speech
      window.speechSynthesis.cancel();

      // Clean the text - remove emojis and markdown for cleaner speech
      // eslint-disable-next-line no-control-regex
      const emojiRegex = /[\u2600-\u27BF\uD83C-\uDBFF\uDC00-\uDFFF\uFE0F\u200D]+/g;
      const cleanText = text
        .replace(emojiRegex, "")                  // remove emojis
        .replace(/[*_~`#]/g, "")                  // markdown chars
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // markdown links
        .replace(/\n{2,}/g, ". ")                 // multiple newlines
        .replace(/\n/g, " ")                      // single newlines
        .trim();

      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);

      // Map language codes
      const langMap: Record<string, string> = {
        en: "en-US",
        ta: "ta-IN",
        hi: "hi-IN",
        es: "es-ES",
        fr: "fr-FR",
        de: "de-DE",
        ja: "ja-JP",
        ko: "ko-KR",
        zh: "zh-CN",
        ar: "ar-SA",
        pt: "pt-BR",
        ru: "ru-RU",
        it: "it-IT",
      };

      utterance.lang = langMap[language] || language;
      utterance.rate = rate;
      utterance.pitch = pitch;

      // Try to find a good voice for the language
      const voices = window.speechSynthesis.getVoices();
      const targetLang = langMap[language] || language;
      const matchingVoice = voices.find(
        (v) => v.lang === targetLang || v.lang.startsWith(language)
      );
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        setCurrentMessageId(messageId);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setCurrentMessageId(null);
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setCurrentMessageId(null);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isSpeaking, currentMessageId, language, rate, pitch]
  );

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setCurrentMessageId(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return {
    isSpeaking,
    currentMessageId,
    isSupported,
    speak,
    stop,
  };
}
