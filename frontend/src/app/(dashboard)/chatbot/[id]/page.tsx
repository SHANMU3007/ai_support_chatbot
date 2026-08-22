import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Settings, BookOpen, Code, Play, MessageSquare, Shield } from "lucide-react";
import { KnowledgeBaseSummary } from "@/components/chatbot/KnowledgeBaseSummary";
import { Document } from "@/types/chatbot";

interface Props {
  params: { id: string };
}

export default async function ChatbotDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login");
  }
  const isAdmin = (session.user as any).role === "ADMIN";
  const userId = (session.user as any).id as string;
  if (!userId) {
    redirect("/login");
  }

  const chatbot = await prisma.chatbot.findFirst({
    where: isAdmin ? { id: params.id } : { id: params.id, userId },
    include: {
      user: { select: { email: true } },
      _count: { select: { sessions: true, documents: true } },
      documents: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!chatbot) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/chatbot">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
              style={{ backgroundColor: chatbot.primaryColor || "#0f172a" }}
            >
              {chatbot.name.charAt(0).toUpperCase()}
            </div>
            <h1 className="text-2xl font-bold">{chatbot.name}</h1>
            <Badge variant={chatbot.isActive ? "default" : "secondary"}>
              {chatbot.isActive ? "Active" : "Inactive"}
            </Badge>
            {isAdmin && (
              <span className="text-xs bg-slate-900 text-white font-medium px-2.5 py-0.5 rounded-full border border-slate-800 shadow-xs">
                Owner: {chatbot.user.email}
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-1">{chatbot.businessName}</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link href={`/chatbot/${params.id}/training`}>
          <Button variant="outline">
            <BookOpen className="mr-2 h-4 w-4" />
            Training
          </Button>
        </Link>
        <Link href={`/chatbot/${params.id}/embed`}>
          <Button variant="outline">
            <Code className="mr-2 h-4 w-4" />
            Embed Code
          </Button>
        </Link>
        <Link href={`/chatbot/${params.id}/preview`}>
          <Button variant="outline">
            <Play className="mr-2 h-4 w-4" />
            Preview
          </Button>
        </Link>
        <Link href={`/chatbot/${params.id}/settings`}>
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </Link>
        <Link href={`/chat/${params.id}`} target="_blank">
          <Button>
            <MessageSquare className="mr-2 h-4 w-4" />
            Open Chat
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Conversations", value: chatbot._count.sessions },
          { label: "Documents", value: chatbot._count.documents },
          { label: "Language", value: chatbot.language.toUpperCase() },
          { label: "Status", value: chatbot.isActive ? "Active" : "Inactive" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-2xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent documents */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Knowledge Base</h2>
          <Link href={`/chatbot/${params.id}/training`}>
            <Button size="sm" variant="outline">
              Manage
            </Button>
          </Link>
        </div>
        <KnowledgeBaseSummary
          chatbotId={params.id}
          initialDocuments={chatbot.documents as unknown as Document[]}
        />
      </div>
    </div>
  );
}
