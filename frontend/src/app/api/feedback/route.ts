import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizePII } from "@/lib/privacy";

export const runtime = "nodejs";

// POST /api/feedback — User submits an issue, complaint, or feedback
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      chatbotId,
      visitorId,
      userEmail,
      category = "GENERAL_FEEDBACK",
      subject,
      description,
      attachedContext,
    } = body;

    if (!chatbotId || !visitorId || !description?.trim()) {
      return NextResponse.json(
        { error: "chatbotId, visitorId, and description are required" },
        { status: 400 }
      );
    }

    // Verify chatbot exists
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      select: { id: true, privacyLevel: true },
    });

    if (!chatbot) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }

    // Apply PII sanitization to submitted feedback if bot is PII_MASKED or ZERO_RETENTION
    const isPiiMasked = chatbot.privacyLevel === "PII_MASKED" || chatbot.privacyLevel === "ZERO_RETENTION";

    const cleanSubject = (subject?.trim() || "User Issue / Complaint").slice(0, 150);
    const cleanDescription = isPiiMasked ? sanitizePII(description.trim()) : description.trim();
    const cleanContext = attachedContext
      ? isPiiMasked
        ? sanitizePII(attachedContext.trim())
        : attachedContext.trim()
      : null;

    const ticket = await prisma.feedbackTicket.create({
      data: {
        chatbotId,
        visitorId,
        userEmail: userEmail?.trim() || null,
        category: category as any,
        subject: cleanSubject,
        description: cleanDescription,
        attachedContext: cleanContext,
        status: "OPEN",
      },
    });

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        status: ticket.status,
        createdAt: ticket.createdAt,
      },
    });
  } catch (error) {
    console.error("Failed to submit feedback ticket:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback ticket" },
      { status: 500 }
    );
  }
}

// GET /api/feedback?botId=...&visitorId=... — User queries their active and past tickets
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const botId = searchParams.get("botId");
    const visitorId = searchParams.get("visitorId");

    if (!botId || !visitorId) {
      return NextResponse.json(
        { error: "botId and visitorId are required" },
        { status: 400 }
      );
    }

    const tickets = await prisma.feedbackTicket.findMany({
      where: {
        chatbotId: botId,
        visitorId: visitorId,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        category: true,
        subject: true,
        description: true,
        status: true,
        clientFeedback: true,
        escalatedToAdmin: true,
        adminResponse: true,
        resolvedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Failed to retrieve visitor tickets:", error);
    return NextResponse.json(
      { error: "Failed to retrieve tickets" },
      { status: 500 }
    );
  }
}
