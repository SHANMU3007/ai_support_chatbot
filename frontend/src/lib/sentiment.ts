import Groq from "groq-sdk";
import { prisma } from "@/lib/prisma";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });
const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

type SentimentResult = {
  label: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  score: number;
  reason: string;
};

export async function scoreSessionSentiment(sessionId: string): Promise<void> {
  if (!process.env.GROQ_API_KEY) return;

  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 40 } },
  });
  if (!session || session.messages.length === 0) return;

  const transcript = session.messages
    .map((message) => `${message.role === "USER" ? "Customer" : "Assistant"}: ${message.content}`)
    .join("\n");

  try {
    const completion = await groq.chat.completions.create({
      model,
      temperature: 0,
      max_tokens: 180,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'Classify the customer\'s overall sentiment. Return JSON only: {"label":"POSITIVE|NEUTRAL|NEGATIVE","score":0-1,"reason":"short explanation"}. Score reflects confidence. Focus on the customer, not the assistant.',
        },
        { role: "user", content: transcript },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw) as Partial<SentimentResult>;
    const label = parsed.label && ["POSITIVE", "NEUTRAL", "NEGATIVE"].includes(parsed.label)
      ? parsed.label
      : "NEUTRAL";
    const score = Math.min(1, Math.max(0, Number(parsed.score) || 0));

    await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        sentiment: label,
        sentimentScore: score,
        sentimentReason: String(parsed.reason || "No explanation provided").slice(0, 500),
        needsFollowUp: label === "NEGATIVE",
        sentimentUpdatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Sentiment analysis failed:", error);
  }
}
