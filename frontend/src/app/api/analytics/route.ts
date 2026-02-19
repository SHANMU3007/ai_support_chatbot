import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user?.id as string;
  const thirtyDaysAgo = subDays(new Date(), 30);

  const [totalSessions, totalMessages, totalChatbots, recentSessions] = await Promise.all([
    prisma.chatSession.count({ where: { chatbot: { userId } } }),
    prisma.message.count({ where: { session: { chatbot: { userId } } } }),
    prisma.chatbot.count({ where: { userId } }),
    prisma.chatSession.count({
      where: { chatbot: { userId }, createdAt: { gte: thirtyDaysAgo } },
    }),
  ]);

  return NextResponse.json({
    totalSessions,
    totalMessages,
    totalChatbots,
    recentSessions,
  });
}
