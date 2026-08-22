import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MessageChart } from "@/components/analytics/MessageChart";
import { TopQuestionsTable } from "@/components/analytics/TopQuestionsTable";
import { NLQueryBox } from "@/components/analytics/NLQueryBox";
import { subDays, format } from "date-fns";
import { Shield } from "lucide-react";

import { redirect } from "next/navigation";

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login");
  }
  const userId = (session.user as any).id as string;
  if (!userId) {
    redirect("/login");
  }

  // Failsafe DB role resolution for Admin access
  const adminEmails = (process.env.ADMIN_EMAILS || "shanmugapatelkani@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  const userRole = (session?.user as any)?.role || dbUser?.role;
  const userEmail = session?.user?.email?.toLowerCase();
  const isAdmin =
    userRole === "ADMIN" ||
    (userEmail && adminEmails.includes(userEmail));

  // Admins see platform-wide aggregated analytics across all customer workspaces.
  // Workspace users see analytics scoped strictly to their own chatbots.
  const sessionWhere = isAdmin ? {} : { chatbot: { userId } };

  // Get message counts per day (last 14 days)
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = subDays(new Date(), 13 - i);
    return { date, label: format(date, "MMM d") };
  });

  const dailyMessages = await Promise.all(
    days.map(async ({ date, label }) => {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      const count = await prisma.message.count({
        where: {
          ...(isAdmin ? {} : { session: { chatbot: { userId } } }),
          createdAt: { gte: start, lte: end },
        },
      });

      return { date: label, messages: count };
    })
  );

  // Top conversations
  const topSessions = await prisma.chatSession.findMany({
    where: sessionWhere,
    include: {
      chatbot: { select: { name: true } },
      _count: { select: { messages: true } },
    },
    orderBy: { messages: { _count: "desc" } },
    take: 10,
  });

  // Total stats
  const [totalSessions, totalMessages, avgMessages, negativeSessions, positiveSessions] = await Promise.all([
    prisma.chatSession.count({ where: sessionWhere }),
    prisma.message.count({ where: isAdmin ? {} : { session: { chatbot: { userId } } } }),
    prisma.chatSession
      .findMany({
        where: sessionWhere,
        include: { _count: { select: { messages: true } } },
      })
      .then((sessions) => {
        if (sessions.length === 0) return 0;
        const total = sessions.reduce((sum, s) => sum + s._count.messages, 0);
        return Math.round(total / sessions.length);
      }),
    prisma.chatSession.count({ where: { ...sessionWhere, sentiment: "NEGATIVE" } }),
    prisma.chatSession.count({ where: { ...sessionWhere, sentiment: "POSITIVE" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">
            {isAdmin
              ? "Platform-wide aggregated insights across all customer workspaces."
              : "Insights and metrics about your chatbot conversations."}
          </p>
        </div>

        {isAdmin && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-900 text-white border border-slate-800 shadow-xs self-start sm:self-auto">
            <Shield className="h-4 w-4 text-indigo-400" /> Global Platform View
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Conversations", value: totalSessions },
          { label: "Total Messages", value: totalMessages },
          { label: "Avg Messages/Session", value: avgMessages },
          { label: "Positive Sessions", value: positiveSessions },
          { label: "Follow-up Needed", value: negativeSessions },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border p-5">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-3xl font-bold mt-2">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Message chart */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold mb-4">
          {isAdmin ? "Platform Daily Volume (All Customer Bots)" : "Messages per Day (Last 14 Days)"}
        </h2>
        <MessageChart data={dailyMessages} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top conversations */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">
            {isAdmin ? "Most Active Conversations (Across All Workspaces)" : "Most Active Conversations"}
          </h2>
          <TopQuestionsTable sessions={topSessions} />
        </div>

        {/* NL2SQL query box */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-1">Ask Your Data</h2>
          <p className="text-sm text-gray-500 mb-4">
            Type a question in plain English and get instant data.
          </p>
          <NLQueryBox />
        </div>
      </div>
    </div>
  );
}
