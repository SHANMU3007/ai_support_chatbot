import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { MessageSquare, Bot, FileText, TrendingUp, Sparkles, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login");
  }

  if ((session.user as any).role === "ADMIN") {
    redirect("/admin");
  }

  const userId = (session.user as any).id as string;
  if (!userId) {
    redirect("/login");
  }

  let chatbotCount = 0;
  let totalMessages = 0;
  let totalDocuments = 0;
  let recentSessions: any[] = [];
  let followUpCount = 0;

  const userEmail = session.user?.email;
  const userFilter = userEmail
    ? { OR: [{ userId }, { user: { email: userEmail } }] }
    : { userId };

  try {
    const [cCount, mCount, dCount, rSessions, fCount] = await Promise.all([
      prisma.chatbot.count({ where: userFilter }),
      prisma.message.count({
        where: { session: { chatbot: userFilter } },
      }),
      prisma.document.count({ where: { chatbot: userFilter } }),
      prisma.chatSession.findMany({
        where: { chatbot: userFilter },
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          chatbot: { select: { name: true } },
          messages: { take: 1, orderBy: { createdAt: "desc" } },
        },
      }),
      prisma.chatSession.count({ where: { chatbot: userFilter, needsFollowUp: true } }),
    ]);

    chatbotCount = cCount;
    totalMessages = mCount;
    totalDocuments = dCount;
    recentSessions = rSessions;
    followUpCount = fCount;
  } catch (err) {
    console.error("Dashboard database query error:", err);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Workspace Overview
            </h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Welcome back, <span className="font-semibold text-slate-700 dark:text-slate-300">{session?.user?.name || session?.user?.email}</span>
          </p>
        </div>
        <Link href="/chatbot/create">
          <Button className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm">
            <Plus className="mr-2 h-4 w-4" />
            New Chatbot
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Total Chatbots"
          value={chatbotCount}
          icon={Bot}
          description="Active AI assistants"
        />
        <StatsCard
          title="Total Messages"
          value={totalMessages}
          icon={MessageSquare}
          description="Lifetime interactions"
        />
        <StatsCard
          title="Documents"
          value={totalDocuments}
          icon={FileText}
          description="Knowledge chunks"
        />
        <StatsCard
          title="Recent Chats"
          value={recentSessions.length}
          icon={TrendingUp}
          description="Conversations"
        />
        <Link href="/conversations" className="block">
          <StatsCard
            title="Follow-ups"
            value={followUpCount}
            icon={TrendingUp}
            description="Flagged sentiment"
          />
        </Link>
      </div>

      {/* Recent activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ActivityFeed sessions={recentSessions} />

        {chatbotCount === 0 && (
          <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border-2 border-dashed border-indigo-200 dark:border-indigo-800/60 rounded-3xl p-8 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400">
              <Bot className="h-7 w-7" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-1">Create your first chatbot</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 max-w-sm">
              Upload your company FAQs, docs, or website URL and get an embeddable AI chatbot in minutes.
            </p>
            <Link href="/chatbot/create">
              <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                Get Started Free
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
