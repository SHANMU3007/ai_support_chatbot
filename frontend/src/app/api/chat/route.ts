import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { scoreSessionSentiment } from "@/lib/sentiment";
import { getFastApiUrl } from "@/lib/api-config";
import { sanitizePII } from "@/lib/privacy";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, sessionId, botId, language = "en", history: clientHistory = [] } = body;

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

    const privacyLevel = chatbot.privacyLevel || "PII_MASKED";
    const isZeroRetention = privacyLevel === "ZERO_RETENTION";
    const isPiiMasked = privacyLevel === "PII_MASKED";

    // Get or create session
    let session = sessionId
      ? await prisma.chatSession.findFirst({
          where: { id: sessionId, chatbotId: botId },
        })
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

    // Process user message storage according to Enterprise Privacy Policy
    if (!isZeroRetention) {
      const messageToSave = isPiiMasked ? sanitizePII(message) : message;
      await prisma.message.create({
        data: {
          sessionId: session.id,
          role: "USER",
          content: messageToSave,
        },
      });
    }

    // Get conversation history for backend
    let historyForBackend: Array<{ role: string; content: string }> = [];

    if (!isZeroRetention) {
      const history = await prisma.message.findMany({
        where: { sessionId: session.id },
        orderBy: { createdAt: "desc" },
        take: 6,
      });

      historyForBackend = history
        .reverse()
        .filter((m) => m.content !== message)
        .map((m) => ({
          role: m.role === "USER" ? "user" : "assistant",
          content: m.content,
        }));
    } else if (Array.isArray(clientHistory) && clientHistory.length > 0) {
      // In Zero-Retention mode, use client-provided ephemeral in-memory history
      historyForBackend = clientHistory.slice(-5).map((h: any) => ({
        role: h.role === "user" || h.role === "USER" ? "user" : "assistant",
        content: isPiiMasked ? sanitizePII(h.content) : h.content,
      }));
    }

    // Forward to FastAPI RAG backend and stream back
    const backendUrl = getFastApiUrl("/chat/message");

    let backendResponse: Response | null = null;
    try {
      backendResponse = await fetch(backendUrl, {
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
          "X-Privacy-Mode": privacyLevel,
        },
      });
    }

    // Transform the FastAPI SSE stream to normalize the format
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
        // Only persist assistant response to DB if NOT in Zero-Retention Enterprise Mode
        if (fullResponse && !isZeroRetention) {
          try {
            const responseToSave = isPiiMasked ? sanitizePII(fullResponse) : fullResponse;
            await prisma.message.create({
              data: {
                sessionId: sessionIdForHeader,
                role: "ASSISTANT",
                content: responseToSave,
              },
            });
            await scoreSessionSentiment(sessionIdForHeader);
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
        "X-Privacy-Mode": privacyLevel,
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
