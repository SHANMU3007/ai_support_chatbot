import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ChatWindow } from "@/components/chatbot/ChatWindow";

interface Props {
  params: { botId: string };
  searchParams: { preview?: string };
}

export async function generateMetadata({ params }: Props) {
  const chatbot = await prisma.chatbot.findFirst({
    where: { id: params.botId, isActive: true },
  });
  return {
    title: chatbot ? `${chatbot.name} - ${chatbot.businessName}` : "Chat",
  };
}

export default async function PublicChatPage({ params }: Props) {
  const chatbot = await prisma.chatbot.findFirst({
    where: { id: params.botId, isActive: true },
  });

  if (!chatbot) notFound();

  return (
    <div className="h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg h-full max-h-[700px]">
        <ChatWindow
          chatbotId={chatbot.id}
          chatbotName={chatbot.name}
          businessName={chatbot.businessName}
          welcomeMessage={chatbot.welcomeMessage}
          primaryColor={chatbot.primaryColor}
          language={chatbot.language}
        />
      </div>
    </div>
  );
}
