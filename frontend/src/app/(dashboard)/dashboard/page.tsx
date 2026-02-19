import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { MessageSquare, Bot, FileText, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id as string;

  const [chatbotCount, totalMessages, totalDocuments, recentSessions] = await Promise.all([
    prisma.chatbot.count({ where: { userId } }),
    prisma.message.count({
      where: { session: { chatbot: { userId } } },
    }),
    prisma.document.count({ where: { chatbot: { userId } } }),
    prisma.chatSession.findMany({
      where: { chatbot: { userId } },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        chatbot: { select: { name: true } },
        messages: { take: 1, orderBy: { createdAt: "desc" } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Welcome back, {session?.user?.name || session?.user?.email}
          </p>
        </div>
        <Link href="/chatbot/create">
          <Button>
            <Bot className="mr-2 h-4 w-4" />
            New Chatbot
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Chatbots"
          value={chatbotCount}
          icon={Bot}
          description="Active chatbots"
        />
        <StatsCard
          title="Total Messages"
          value={totalMessages}
          icon={MessageSquare}
          description="All time"
        />
        <StatsCard
          title="Documents"
          value={totalDocuments}
          icon={FileText}
          description="In knowledge base"
        />
        <StatsCard
          title="This Week"
          value={recentSessions.length}
          icon={TrendingUp}
          description="New conversations"
        />
      </div>

      {/* Recent activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ActivityFeed sessions={recentSessions} />

        {chatbotCount === 0 && (
          <div className="bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-xl p-8 text-center">
            <Bot className="h-12 w-12 text-indigo-400 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">Create your first chatbot</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload your FAQs, docs, or website URL and get an embeddable AI chatbot in minutes.
            </p>
            <Link href="/chatbot/create">
              <Button>Get Started</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
