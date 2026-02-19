import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Settings, BookOpen, Code, Play, MessageSquare } from "lucide-react";

interface Props {
  params: { id: string };
}

export default async function ChatbotDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id as string;

  const chatbot = await prisma.chatbot.findFirst({
    where: { id: params.id, userId },
    include: {
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
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: chatbot.primaryColor }}
            >
              {chatbot.name.charAt(0)}
            </div>
            <h1 className="text-2xl font-bold">{chatbot.name}</h1>
            <Badge variant={chatbot.isActive ? "default" : "secondary"}>
              {chatbot.isActive ? "Active" : "Inactive"}
            </Badge>
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
        {chatbot.documents.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No documents yet.{" "}
            <Link href={`/chatbot/${params.id}/training`} className="text-indigo-600 hover:underline">
              Add your first document
            </Link>
          </p>
        ) : (
          <ul className="space-y-2">
            {chatbot.documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">{doc.name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {doc.type}
                  </Badge>
                  <Badge
                    variant={doc.status === "DONE" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {doc.status}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
