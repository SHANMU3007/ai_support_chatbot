import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = session.user?.role === "ADMIN";
  const userId = session.user?.id as string;
  const thirtyDaysAgo = subDays(new Date(), 30);

  const sessionWhere = isAdmin ? {} : { chatbot: { userId } };
  const messageWhere = isAdmin ? {} : { session: { chatbot: { userId } } };
  const chatbotWhere = isAdmin ? {} : { userId };

  const [totalSessions, totalMessages, totalChatbots, recentSessions] = await Promise.all([
    prisma.chatSession.count({ where: sessionWhere }),
    prisma.message.count({ where: messageWhere }),
    prisma.chatbot.count({ where: chatbotWhere }),
    prisma.chatSession.count({
      where: { ...sessionWhere, createdAt: { gte: thirtyDaysAgo } },
    }),
  ]);

  return NextResponse.json({
    totalSessions,
    totalMessages,
    totalChatbots,
    recentSessions,
    scope: isAdmin ? "GLOBAL_PLATFORM" : "WORKSPACE",
  });
}
