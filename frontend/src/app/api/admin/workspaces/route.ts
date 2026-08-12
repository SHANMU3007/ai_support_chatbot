import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      plan: true,
      createdAt: true,
      chatbots: {
        select: {
          id: true,
          name: true,
          businessName: true,
          isActive: true,
          language: true,
          createdAt: true,
          telegramToken: true,
          _count: {
            select: {
              sessions: true,
              documents: true,
            },
          },
        },
      },
      _count: {
        select: {
          chatbots: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate detailed analytics per user workspace
  const usersWithAnalytics = await Promise.all(
    users.map(async (user) => {
      const userChatbotIds = user.chatbots.map((cb) => cb.id);

      const [totalDocuments, totalSessions, totalMessages, negativeSessions] = await Promise.all([
        prisma.document.count({
          where: { chatbotId: { in: userChatbotIds } },
        }),
        prisma.chatSession.count({
          where: { chatbotId: { in: userChatbotIds } },
        }),
        prisma.message.count({
          where: { session: { chatbotId: { in: userChatbotIds } } },
        }),
        prisma.chatSession.count({
          where: { chatbotId: { in: userChatbotIds }, needsFollowUp: true },
        }),
      ]);

      return {
        ...user,
        stats: {
          totalChatbots: user.chatbots.length,
          totalDocuments,
          totalSessions,
          totalMessages,
          negativeSessions,
        },
      };
    })
  );

  return NextResponse.json(usersWithAnalytics);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { userId, plan, role } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(plan ? { plan } : {}),
        ...(role ? { role } : {}),
      },
      select: {
        id: true,
        email: true,
        plan: true,
        role: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update user" }, { status: 500 });
  }
}
