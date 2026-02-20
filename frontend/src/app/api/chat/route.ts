import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, sessionId, botId, language = "en" } = body;

    if (!message || !botId) {
      return NextResponse.json(
        { error: "message and botId are required" },
        { status: 400 }
      );
    }

    // Verify chatbot exists and is active
    const chatbot = await prisma.chatbot.findFirst({
      where: { id: botId, isActive: true },
    });

    if (!chatbot) {
      return NextResponse.json(
        { error: "Chatbot not found or inactive" },
        { status: 404 }
      );
    }

    // Get or create session
    let session = sessionId
      ? await prisma.chatSession.findUnique({ where: { id: sessionId } })
      : null;

    const visitorId = crypto.randomUUID().slice(0, 8);

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

    // Get conversation history for backend
    const history = await prisma.message.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "desc" },
      take: 6,
    });

    const historyForBackend = history
      .reverse()
      .filter((m) => m.content !== message)
      .map((m) => ({
        role: m.role === "USER" ? "user" : "assistant",
        content: m.content,
      }));

    // Forward to FastAPI RAG backend and stream back
    const fastapiUrl = process.env.FASTAPI_URL || "http://localhost:8000";

    let backendResponse: Response | null = null;
    try {
      backendResponse = await fetch(`${fastapiUrl}/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          chatbot_id: botId,
          session_id: session.id,
          visitor_id: visitorId,
          history: historyForBackend,
          language,
          system_prompt: chatbot.systemPrompt,
        }),
      });
    } catch (err) {
      console.error("FastAPI connection error:", err);
      backendResponse = null;
    }

    if (!backendResponse || !backendResponse.ok) {
      // Fallback: stream AI response directly from Next.js if backend unavailable
      console.log("FastAPI unavailable, using Next.js fallback AI...");
      const { streamAIResponse } = await import("@/lib/ai");
      const stream = await streamAIResponse({
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

    // Transform the FastAPI SSE stream to normalize the format
    // FastAPI sends {"content": "..."}, we need to also add {"text": "..."} for useChat compatibility
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const sessionIdForHeader = session.id;
    let fullResponse = "";

    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = decoder.decode(chunk, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            controller.enqueue(encoder.encode("\n"));
            continue;
          }

          if (trimmed.startsWith("data: ")) {
            const payload = trimmed.slice(6);

            // Pass [DONE] through as-is
            if (payload === "[DONE]") {
              controller.enqueue(encoder.encode(`data: [DONE]\n`));
              continue;
            }

            try {
              const data = JSON.parse(payload);
              // Normalize: ensure both content and text fields exist
              const normalized: Record<string, any> = { ...data };
              if (data.content && !data.text) {
                normalized.text = data.content;
              }
              if (data.text && !data.content) {
                normalized.content = data.text;
              }

              // Accumulate response for saving
              if (data.content) {
                fullResponse += data.content;
              }

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(normalized)}\n`)
              );
            } catch {
              // Pass through unparseable lines
              controller.enqueue(encoder.encode(line + "\n"));
            }
          } else {
            controller.enqueue(encoder.encode(line + "\n"));
          }
        }
      },
      async flush() {
        // Save the complete assistant response to the database
        if (fullResponse) {
          try {
            await prisma.message.create({
              data: {
                sessionId: sessionIdForHeader,
                role: "ASSISTANT",
                content: fullResponse,
              },
            });
          } catch (err) {
            console.error("Failed to save assistant message:", err);
          }
        }
      },
    });

    backendResponse.body!.pipeTo(transformStream.writable);

    return new Response(transformStream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Session-Id": session.id,
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
