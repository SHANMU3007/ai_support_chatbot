import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isUserAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isUserAdmin(session.user.email, session.user.role)) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const sessions = await prisma.chatSession.findMany({
    where: {
      OR: [
        { needsFollowUp: true },
        { sentiment: "NEGATIVE" },
      ],
    },
    include: {
      chatbot: {
        select: {
          id: true,
          name: true,
          businessName: true,
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      },
      messages: {
        take: 3,
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(sessions);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { sessionId, needsFollowUp } = body;

    if (!sessionId || typeof needsFollowUp !== "boolean") {
      return NextResponse.json({ error: "sessionId and needsFollowUp (boolean) are required" }, { status: 400 });
    }

    const updatedSession = await prisma.chatSession.update({
      where: { id: sessionId },
      data: { needsFollowUp },
    });

    return NextResponse.json(updatedSession);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update session" }, { status: 500 });
  }
}
