"use client";

import { useChat } from "@/hooks/useChat";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { useEffect, useRef } from "react";
import { Bot } from "lucide-react";

interface ChatWindowProps {
  chatbotId: string;
  chatbotName: string;
  businessName: string;
  welcomeMessage: string;
  primaryColor: string;
  language: string;
}

export function ChatWindow({
  chatbotId,
  chatbotName,
  businessName,
  welcomeMessage,
  primaryColor,
  language,
}: ChatWindowProps) {
  const { messages, isLoading, sendMessage } = useChat({ botId: chatbotId, language });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-xl overflow-hidden border">
      {/* Header */}
      <div
        className="px-4 py-3 text-white flex items-center gap-3"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <Bot className="h-4 w-4" />
        </div>
        <div>
          <p className="font-semibold text-sm leading-none">{chatbotName}</p>
          <p className="text-xs opacity-80 mt-0.5">{businessName}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-xs opacity-80">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Welcome message */}
        <MessageBubble
          message={{
            id: "welcome",
            role: "assistant",
            content: welcomeMessage,
            timestamp: new Date(),
          }}
          primaryColor={primaryColor}
        />

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} primaryColor={primaryColor} />
        ))}

        {isLoading && messages[messages.length - 1]?.content === "" && (
          <TypingIndicator primaryColor={primaryColor} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={isLoading} primaryColor={primaryColor} />
    </div>
  );
}
