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
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          // Keep the last partial line in the buffer
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;

            const payload = trimmed.slice(6);

            // Skip the [DONE] marker from FastAPI backend
            if (payload === "[DONE]") continue;

            try {
              const data = JSON.parse(payload);

              // Handle both FastAPI format {"content": "..."} and
              // Next.js fallback format {"text": "..."}
              const chunk = data.content || data.text || "";
              if (chunk) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, content: m.content + chunk }
                      : m
                  )
                );
              }

              // Handle done signal from Next.js fallback
              if (data.done && data.sessionId && !sessionId) {
                setSessionId(data.sessionId);
              }

              // Handle session ID from SSE data
              if (data.sessionId && !sessionId) {
                setSessionId(data.sessionId);
              }

              // Handle error from backend
              if (data.error) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          content:
                            "I'm sorry, I encountered an issue. Could you please try again? 😊",
                        }
                      : m
                  )
                );
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }

        // If assistant message is still empty after stream ends, show fallback
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId && m.content === ""
              ? {
                  ...m,
                  content:
                    "Hmm, I didn't get a response. Could you try asking again? 🤔",
                }
              : m
          )
        );
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content:
                      "Oops! Something went wrong on my end. Please try again in a moment. 😅",
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
