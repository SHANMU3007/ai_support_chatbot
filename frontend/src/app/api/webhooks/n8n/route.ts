import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, sessionId, chatbotId, message } = body;

    console.log("[n8n webhook received]", { event, sessionId, chatbotId });

    // Handle different event types
    switch (event) {
      case "new_conversation": {
        // Log the new conversation trigger
        await prisma.chatSession.findUnique({ where: { id: sessionId } });
        break;
      }
      case "escalation": {
        // Human escalation triggered
        console.log(`Escalation requested for session ${sessionId}: ${message}`);
        break;
      }
      case "daily_report": {
        // Trigger daily report generation
        break;
      }
      default:
        console.log("Unknown webhook event:", event);
    }

    return NextResponse.json({ received: true, event });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
