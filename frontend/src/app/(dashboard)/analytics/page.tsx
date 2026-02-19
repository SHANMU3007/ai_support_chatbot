import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MessageChart } from "@/components/analytics/MessageChart";
import { TopQuestionsTable } from "@/components/analytics/TopQuestionsTable";
import { NLQueryBox } from "@/components/analytics/NLQueryBox";
import { subDays, format } from "date-fns";

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id as string;

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
          session: { chatbot: { userId } },
          createdAt: { gte: start, lte: end },
        },
      });

      return { date: label, messages: count };
    })
  );

  // Top conversations
  const topSessions = await prisma.chatSession.findMany({
    where: { chatbot: { userId } },
    include: {
      chatbot: { select: { name: true } },
      _count: { select: { messages: true } },
    },
    orderBy: { messages: { _count: "desc" } },
    take: 10,
  });

  // Total stats
  const [totalSessions, totalMessages, avgMessages] = await Promise.all([
    prisma.chatSession.count({ where: { chatbot: { userId } } }),
    prisma.message.count({ where: { session: { chatbot: { userId } } } }),
    prisma.chatSession
      .findMany({
        where: { chatbot: { userId } },
        include: { _count: { select: { messages: true } } },
      })
      .then((sessions) => {
        if (sessions.length === 0) return 0;
        const total = sessions.reduce((sum, s) => sum + s._count.messages, 0);
        return Math.round(total / sessions.length);
      }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Insights about your chatbot conversations</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Conversations", value: totalSessions },
          { label: "Total Messages", value: totalMessages },
          { label: "Avg Messages/Session", value: avgMessages },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border p-5">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-3xl font-bold mt-2">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Message chart */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold mb-4">Messages per Day (Last 14 Days)</h2>
        <MessageChart data={dailyMessages} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top conversations */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">Most Active Conversations</h2>
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
