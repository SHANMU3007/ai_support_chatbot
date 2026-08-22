import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ChatWindow } from "@/components/chatbot/ChatWindow";
import { Bot, Moon } from "lucide-react";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";

interface Props {
  params: { botId: string };
  searchParams?: { preview?: string };
}

export async function generateMetadata({ params, searchParams }: Props) {
  try {
    const isPreview = searchParams?.preview === "true";
    const botId = params?.botId;
    if (!botId) return { title: "SupportIQ Chat" };

    const chatbot = await prisma.chatbot.findFirst({
      where: isPreview ? { id: botId } : { id: botId, isActive: true },
    });
    return {
      title: chatbot ? `${chatbot.name} | SupportIQ Assistant` : "SupportIQ Chat",
      description: chatbot
        ? `Chat with ${chatbot.name} - AI-powered customer assistant for ${chatbot.businessName}`
        : "AI Support Chat",
    };
  } catch {
    return { title: "SupportIQ Chat" };
  }
}

export default async function PublicChatPage({ params, searchParams }: Props) {
  const isPreview = searchParams?.preview === "true";
  const botId = params?.botId;

  if (!botId) notFound();

  let chatbot = null;
  try {
    chatbot = await prisma.chatbot.findUnique({
      where: { id: botId },
    });
  } catch (err) {
    console.error("Failed to load chatbot:", err);
  }

  if (!chatbot) notFound();

  // If inactive and not previewing, show clean offline message with glass card
  if (!chatbot.isActive && !isPreview) {
    return (
      <div className="relative min-h-screen bg-slate-950 flex items-center justify-center p-4 overflow-hidden">
        <AnimatedBackground pattern="dots" showOrbs={true} />
        
        <div className="w-full max-w-[420px] rounded-3xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl p-8 text-center space-y-5 shadow-2xl">
          <div
            className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg relative group"
            style={{ backgroundColor: chatbot.primaryColor || "#4f46e5" }}
          >
            <Bot className="h-8 w-8" />
            <div className="absolute -inset-1 rounded-2xl bg-white/20 blur-sm pointer-events-none opacity-50" />
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">{chatbot.name}</h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">{chatbot.businessName}</p>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <Moon className="h-3.5 w-3.5" />
            <span>Assistant Currently Offline</span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
            This chatbot is currently paused by the workspace owner. Please try again later or reach out directly to support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden">
      {/* Aurora glowing orbs for ambient depth */}
      <AnimatedBackground pattern="dots" showOrbs={true} />

      <div className="w-full sm:max-w-[440px] md:max-w-[460px] h-full sm:h-[92vh] sm:max-h-[760px] relative z-10 animate-in fade-in slide-in-from-bottom-2 duration-300 shadow-2xl">
        <ChatWindow
          chatbotId={chatbot.id}
          chatbotName={chatbot.name}
          businessName={chatbot.businessName}
          welcomeMessage={chatbot.welcomeMessage || "Hello! How can I help you today?"}
          primaryColor={chatbot.primaryColor || "#4f46e5"}
          language={chatbot.language || "en"}
        />
      </div>
    </div>
  );
}
