"use client";

import { useState, useCallback, useRef } from "react";
import { generateVisitorId } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface UseChatOptions {
  botId: string;
  language?: string;
}

export function useChat({ botId, language = "en" }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const visitorIdRef = useRef(generateVisitorId());

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      // Add user message
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      // Placeholder assistant message
      const assistantMsgId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
        },
      ]);

      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            botId,
            sessionId: sessionId || `${visitorIdRef.current}:${Date.now()}`,
            language,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) throw new Error("Request failed");

        // Store session ID from header
        const newSessionId = res.headers.get("X-Session-Id");
        if (newSessionId && !sessionId) {
          setSessionId(newSessionId);
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

          for (const line of lines) {
            const data = JSON.parse(line.slice(6));
            if (data.text) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: m.content + data.text }
                    : m
                )
              );
            }
            if (data.sessionId && !sessionId) {
              setSessionId(data.sessionId);
            }
          }
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content:
                      "Sorry, I encountered an error. Please try again.",
                  }
                : m
            )
          );
        }
      } finally {
        setIsLoading(false);
      }
    },
    [botId, isLoading, language, sessionId]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    abortRef.current?.abort();
  }, []);

  return { messages, isLoading, sendMessage, clearChat, sessionId };
}
