"use client";

import { useChat } from "@/hooks/useChat";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { useEffect, useRef, useState } from "react";
import { Bot, RotateCcw, Sparkles } from "lucide-react";

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
  const { messages, isLoading, sendMessage, clearChat } = useChat({
    botId: chatbotId,
    language,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showHeader, setShowHeader] = useState(true);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Show typing indicator when assistant message is empty and loading
  const lastMessage = messages[messages.length - 1];
  const showTyping =
    isLoading && lastMessage?.role === "assistant" && lastMessage.content === "";

  return (
    <div className="flex flex-col h-full rounded-sm shadow-xl overflow-hidden border border-gray-200 bg-white">
      {/* Header */}
      <div className="px-5 py-4 text-white flex items-center gap-3 relative bg-black">
        <div className="relative w-10 h-10 bg-white shadow-sm flex items-center justify-center">
          <Bot className="h-5 w-5" />
        </div>
        <div className="relative flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm leading-none">{chatbotName}</p>
            <Sparkles className="h-3 w-3 opacity-70" />
          </div>
          <p className="text-xs opacity-80 mt-1">{businessName}</p>
        </div>
        <div className="relative flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-sm shadow-green-400/50" />
            <span className="text-xs opacity-80">Online</span>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="ml-2 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title="Clear chat"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gradient-to-b from-gray-50/80 to-white">
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

        {showTyping && <TypingIndicator primaryColor={primaryColor} />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={isLoading} primaryColor={primaryColor} />
    </div>
  );
}
