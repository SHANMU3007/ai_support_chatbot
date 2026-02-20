import Groq from "groq-sdk";
import { prisma } from "@/lib/prisma";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

interface StreamOptions {
  message: string;
  chatbotId: string;
  sessionId: string;
  systemPrompt: string;
  language: string;
  context?: string;
}

export async function streamAIResponse({
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
    .filter((m) => m.content !== message)
    .map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

  const fullSystemPrompt = `${systemPrompt}

${context ? `RELEVANT KNOWLEDGE BASE CONTEXT:\n${context}\n` : "No context available."}

LANGUAGE: Respond in ${language === "en" ? "English" : language}. 
If the user's message is in a different language, respond in that language.

STRICT RULES:
- You must ONLY answer questions using the KNOWLEDGE BASE CONTEXT above.
- If the user asks something NOT related to the business or the context, politely say:
  "I'm sorry, I can only help with questions related to our business. Is there anything else I can assist you with regarding our services?"
- Do NOT answer general knowledge questions (science, history, geography, math, etc.)
- Do NOT make up information that is not in the context.
- Be warm, professional, and helpful for business-related queries.
- For complex answers, use bullet points or numbered lists.`;

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      let fullResponse = "";
      let tokenCount = 0;

      try {
        const stream = await groq.chat.completions.create({
          model: GROQ_MODEL,
          max_tokens: 1024,
          stream: true,
          messages: [
            { role: "system", content: fullSystemPrompt },
            ...conversationHistory,
            { role: "user", content: message },
          ],
        });

        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) {
            fullResponse += text;
            // Send in both formats for maximum compatibility
            const data = `data: ${JSON.stringify({ text, content: text })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
          if (chunk.x_groq?.usage) {
            tokenCount = chunk.x_groq.usage.completion_tokens ?? 0;
          }
        }

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
          fullResponse.toLowerCase().includes("connect with a human") ||
          message.toLowerCase().includes("speak to human") ||
          message.toLowerCase().includes("talk to a person");

        if (needsEscalation) {
          triggerEscalation(sessionId, chatbotId, message);
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ done: true, sessionId })}\n\n`
          )
        );
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              error: "Failed to generate response",
              content:
                "😅 Oops! I ran into a hiccup. Could you try asking that again?",
              text: "😅 Oops! I ran into a hiccup. Could you try asking that again?",
            })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });
}

async function triggerEscalation(
  sessionId: string,
  chatbotId: string,
  message: string
) {
  const n8nUrl = process.env.N8N_WEBHOOK_URL;
  if (!n8nUrl) return;

  try {
    await fetch(`${n8nUrl}/webhook/escalation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        chatbotId,
        message,
        type: "escalation",
      }),
    });
  } catch {
    // Silently fail if n8n is not available
  }
}
