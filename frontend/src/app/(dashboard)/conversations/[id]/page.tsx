import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Props {
  params: { id: string };
}

export default async function ConversationDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id as string;

  const chatSession = await prisma.chatSession.findFirst({
    where: {
      id: params.id,
      chatbot: { userId },
    },
    include: {
      chatbot: { select: { name: true, primaryColor: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!chatSession) notFound();

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/conversations">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            Conversation — {chatSession.chatbot.name}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Visitor: {chatSession.visitorId} ·{" "}
            {format(new Date(chatSession.createdAt), "PPpp")}
          </p>
        </div>
        <Badge variant="outline">{chatSession.language.toUpperCase()}</Badge>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-4">
        {chatSession.messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "USER" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${
                msg.role === "USER"
                  ? "bg-gray-100 text-gray-900"
                  : "text-white"
              }`}
              style={
                msg.role === "ASSISTANT"
                  ? { backgroundColor: chatSession.chatbot.primaryColor }
                  : {}
              }
            >
              <p>{msg.content}</p>
              <div className="flex items-center gap-2 mt-1 opacity-60 text-xs">
                <span>{format(new Date(msg.createdAt), "HH:mm")}</span>
                {msg.tokens && <span>· {msg.tokens} tokens</span>}
                {msg.confidence && (
                  <span>· {Math.round(msg.confidence * 100)}% confidence</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
