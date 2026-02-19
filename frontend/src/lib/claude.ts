import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface StreamOptions {
  message: string;
  chatbotId: string;
  sessionId: string;
  systemPrompt: string;
  language: string;
  context?: string;
}

export async function streamClaudeResponse({
  message,
  chatbotId,
  sessionId,
  systemPrompt,
  language,
  context = "",
}: StreamOptions): Promise<ReadableStream> {
  // Get last 6 messages from the session
  const history = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  const conversationHistory = history
    .reverse()
    .filter((m) => m.content !== message) // exclude just-saved user message
    .map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

  const fullSystemPrompt = `${systemPrompt}

${context ? `RELEVANT KNOWLEDGE BASE CONTEXT:\n${context}\n` : ""}

LANGUAGE: Respond in ${language === "en" ? "English" : language}. 
If the user's message is in a different language, respond in that language.

GUIDELINES:
- Be concise and helpful
- Based your answers on the knowledge base context when provided
- If you don't know the answer, say so honestly and offer to connect them with a human
- Never make up information not in the context`;

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      let fullResponse = "";
      let tokenCount = 0;

      try {
        const stream = await anthropic.messages
          .stream({
            model: "claude-sonnet-4-6",
            max_tokens: 1024,
            system: fullSystemPrompt,
            messages: [
              ...conversationHistory,
              { role: "user", content: message },
            ],
          })
          .on("text", (text) => {
            fullResponse += text;
            const data = `data: ${JSON.stringify({ text })}\n\n`;
            controller.enqueue(encoder.encode(data));
          });

        const finalMessage = await stream.finalMessage();
        tokenCount = finalMessage.usage.output_tokens;

        // Save assistant message to DB
        await prisma.message.create({
          data: {
            sessionId,
            role: "ASSISTANT",
            content: fullResponse,
            tokens: tokenCount,
          },
        });

        // Check if escalation needed
        const needsEscalation =
          fullResponse.toLowerCase().includes("speak to a human") ||
          fullResponse.toLowerCase().includes("connect you with") ||
          message.toLowerCase().includes("speak to human");

        if (needsEscalation) {
          triggerEscalation(sessionId, chatbotId, message);
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, sessionId })}\n\n`));
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: "Failed to generate response" })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });
}

async function triggerEscalation(sessionId: string, chatbotId: string, message: string) {
  const n8nUrl = process.env.N8N_WEBHOOK_URL;
  if (!n8nUrl) return;

  try {
    await fetch(`${n8nUrl}/webhook/escalation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, chatbotId, message, type: "escalation" }),
    });
  } catch {
    // Silently fail if n8n is not available
  }
}
