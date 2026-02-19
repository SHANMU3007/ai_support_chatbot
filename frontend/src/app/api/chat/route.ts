import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, sessionId, botId, language = "en" } = body;

    if (!message || !botId) {
      return NextResponse.json({ error: "message and botId are required" }, { status: 400 });
    }

    // Verify chatbot exists and is active
    const chatbot = await prisma.chatbot.findFirst({
      where: { id: botId, isActive: true },
    });

    if (!chatbot) {
      return NextResponse.json({ error: "Chatbot not found or inactive" }, { status: 404 });
    }

    // Get or create session
    let session = sessionId
      ? await prisma.chatSession.findUnique({ where: { id: sessionId } })
      : null;

    const visitorId = uuidv4().slice(0, 8);

    if (!session) {
      session = await prisma.chatSession.create({
        data: {
          chatbotId: botId,
          visitorId: sessionId ? sessionId.split(":")[0] : visitorId,
          language,
        },
      });
    }

    // Save user message
    await prisma.message.create({
      data: {
        sessionId: session.id,
        role: "USER",
        content: message,
      },
    });

    // Forward to FastAPI RAG backend and stream back
    const fastapiUrl = process.env.FASTAPI_URL || "http://localhost:8000";

    const backendResponse = await fetch(`${fastapiUrl}/chat/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        chatbot_id: botId,
        session_id: session.id,
        language,
        system_prompt: chatbot.systemPrompt,
      }),
    });

    if (!backendResponse.ok) {
      // Fallback: use Claude directly from Next.js if backend unavailable
      const { streamClaudeResponse } = await import("@/lib/claude");
      const stream = await streamClaudeResponse({
        message,
        chatbotId: botId,
        sessionId: session.id,
        systemPrompt: chatbot.systemPrompt,
        language,
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Session-Id": session.id,
        },
      });
    }

    // Proxy the streaming response
    const { readable, writable } = new TransformStream();
    backendResponse.body!.pipeTo(writable);

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Session-Id": session.id,
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
