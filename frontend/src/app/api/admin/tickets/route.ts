import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/admin/tickets — Retrieve tickets for current workspace or platform admin
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const userRole = (session.user as any).role;
    const userEmail = session.user.email?.toLowerCase();

    const adminEmails = (process.env.ADMIN_EMAILS || "shanmugapatelkani@gmail.com")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const isAdmin = userRole === "ADMIN" || (userEmail && adminEmails.includes(userEmail));

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const chatbotId = searchParams.get("chatbotId");

    const whereClause: any = {};

    if (!isAdmin) {
      whereClause.chatbot = { userId };
    }

    if (chatbotId) {
      whereClause.chatbotId = chatbotId;
    }

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    const tickets = await prisma.feedbackTicket.findMany({
      where: whereClause,
      include: {
        chatbot: {
          select: {
            id: true,
            name: true,
            primaryColor: true,
            businessName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Failed to list tickets:", error);
    return NextResponse.json(
      { error: "Failed to retrieve tickets" },
      { status: 500 }
    );
  }
}
