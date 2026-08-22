"use client";

import { useChat } from "@/hooks/useChat";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { FeedbackModal, TicketItem } from "./FeedbackModal";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, RotateCcw, Sparkles, Zap, LifeBuoy, CheckCircle2 } from "lucide-react";

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
  const { messages, isLoading, sendMessage, clearChat, visitorId } = useChat({
    botId: chatbotId,
    language,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [resolvedTicketsCount, setResolvedTicketsCount] = useState(0);

  // Text-to-Speech hook
  const {
    isSpeaking,
    currentMessageId,
    isSupported: ttsSupported,
    speak,
    stop: stopSpeaking,
  } = useTextToSpeech({ language });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Initial check for visitor's resolved tickets to show notification badge
  useEffect(() => {
    if (!chatbotId || !visitorId) return;
    fetch(`/api/feedback?botId=${chatbotId}&visitorId=${visitorId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.tickets) {
          const resolved = data.tickets.filter((t: TicketItem) => t.status === "RESOLVED");
          setResolvedTicketsCount(resolved.length);
        }
      })
      .catch(() => {});
  }, [chatbotId, visitorId]);

  // Stop TTS when chat is cleared
  const handleClearChat = () => {
    stopSpeaking();
    clearChat();
  };

  const handleTicketsUpdated = (tickets: TicketItem[]) => {
    const resolved = tickets.filter((t) => t.status === "RESOLVED");
    setResolvedTicketsCount(resolved.length);
  };

  // Show typing indicator when assistant message is empty and loading
  const lastMessage = messages[messages.length - 1];
  const showTyping =
    isLoading && lastMessage?.role === "assistant" && lastMessage.content === "";

  // Starter prompt suggestions
  const starterPrompts = [
    "What services do you provide?",
    "How does pricing work?",
    "How can I contact a human agent?",
  ];

  return (
    <div className="flex flex-col h-full rounded-none sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 sm:border-slate-700/60 bg-white dark:bg-slate-900 transition-all relative">
      {/* Header */}
      <div
        className="px-5 py-4 text-white flex items-center justify-between relative shadow-md transition-colors duration-300 z-10"
        style={{ backgroundColor: primaryColor || "#4f46e5" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 shadow-sm flex items-center justify-center flex-shrink-0 text-white">
            <Bot className="h-5 w-5" />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900 shadow-xs" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-sm leading-none truncate">{chatbotName}</p>
              <Sparkles className="h-3 w-3 opacity-80 flex-shrink-0" />
            </div>
            <p className="text-[11px] opacity-80 mt-1 truncate font-medium">{businessName}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Feedback & Complaint Button */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsFeedbackOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 transition-all text-white border border-white/10 text-xs font-semibold relative shadow-xs"
            title="Submit feedback or report issue"
          >
            <LifeBuoy className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Feedback</span>
            {resolvedTicketsCount > 0 && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
            )}
          </motion.button>

          {messages.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleClearChat}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 transition-all text-white border border-white/10"
              title="Reset conversation"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 bg-gradient-to-b from-slate-50/90 via-slate-50/40 to-white dark:from-slate-900 dark:to-slate-950">
        {/* Welcome message */}
        <MessageBubble
          message={{
            id: "welcome",
            role: "assistant",
            content: welcomeMessage,
            timestamp: new Date(),
          }}
          primaryColor={primaryColor}
          isSpeaking={isSpeaking}
          isCurrentSpeaking={currentMessageId === "welcome"}
          onSpeak={speak}
          onStopSpeak={stopSpeaking}
          ttsSupported={ttsSupported}
        />

        {/* Quick starter prompt chips (shown when no messages yet) */}
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="pt-2 pb-1 space-y-2"
          >
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1 flex items-center gap-1">
              <Zap className="h-3 w-3 text-amber-500" /> Suggested queries
            </p>
            <div className="flex flex-wrap gap-1.5">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-xs text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Message stream */}
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              primaryColor={primaryColor}
              isSpeaking={isSpeaking}
              isCurrentSpeaking={currentMessageId === msg.id}
              onSpeak={speak}
              onStopSpeak={stopSpeaking}
              ttsSupported={ttsSupported}
            />
          ))}
        </AnimatePresence>

        {showTyping && <TypingIndicator primaryColor={primaryColor} />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <ChatInput
        onSend={sendMessage}
        disabled={isLoading}
        primaryColor={primaryColor}
        language={language}
      />

      {/* Feedback & Rectification Modal */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        chatbotId={chatbotId}
        chatbotName={chatbotName}
        primaryColor={primaryColor}
        visitorId={visitorId}
        recentMessages={messages.map((m) => ({ role: m.role, content: m.content }))}
        onTicketsUpdated={handleTicketsUpdated}
      />
    </div>
  );
}
