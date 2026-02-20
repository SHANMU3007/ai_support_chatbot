import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Plus, Settings, ExternalLink, MessageSquare } from "lucide-react";

export default async function ChatbotsPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id as string;

  const chatbots = await prisma.chatbot.findMany({
    where: { userId },
    include: {
      _count: { select: { sessions: true, documents: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chatbots</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your AI chatbots</p>
        </div>
        <Link href="/chatbot/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Chatbot
          </Button>
        </Link>
      </div>

      {chatbots.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <Bot className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No chatbots yet</h3>
          <p className="text-gray-500 mb-6">Create your first AI chatbot and embed it on your website.</p>
          <Link href="/chatbot/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Chatbot
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {chatbots.map((bot) => (
            <div key={bot.id} className="bg-white rounded-xl border p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-black shadow-sm">
                  {bot.name.charAt(0).toUpperCase()}
                </div>
                <Badge variant={bot.isActive ? "default" : "secondary"}>
                  {bot.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <h3 className="font-semibold text-gray-900">{bot.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{bot.businessName}</p>
              <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {bot._count.sessions} chats
                </span>
                <span className="flex items-center gap-1">
                  📄 {bot._count.documents} docs
                </span>
              </div>
              <div className="flex gap-2 mt-4">
                <Link href={`/chatbot/${bot.id}`} className="flex-1">
                  <Button size="sm" variant="outline" className="w-full">
                    <Settings className="mr-1 h-3 w-3" />
                    Manage
                  </Button>
                </Link>
                <Link href={`/chat/${bot.id}`} target="_blank">
                  <Button size="sm" variant="ghost">
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
