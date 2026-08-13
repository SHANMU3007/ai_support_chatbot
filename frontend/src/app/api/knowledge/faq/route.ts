import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFastApiUrl } from "@/lib/api-config";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { chatbotId, faqs } = await req.json();
  // faqs: Array<{ question: string; answer: string }>

  if (!chatbotId || !faqs?.length) {
    return NextResponse.json({ error: "chatbotId and faqs array required" }, { status: 400 });
  }

  const chatbot = await prisma.chatbot.findFirst({
    where: { id: chatbotId, userId: session.user?.id as string },
  });
  if (!chatbot) return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });

  const content = faqs
    .map((faq: { question: string; answer: string }) => `Q: ${faq.question}\nA: ${faq.answer}`)
    .join("\n\n");

  const document = await prisma.document.create({
    data: {
      chatbotId,
      name: `FAQ (${new Date().toLocaleDateString()})`,
      type: "FAQ",
      content,
      status: "PENDING",
    },
  });

  // Forward to FastAPI for embedding (await fetch to prevent Vercel lambda termination)
  const backendUrl = getFastApiUrl("/ingest/faq");
  try {
    const res = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatbot_id: chatbotId, document_id: document.id, pairs: faqs }),
    });

    if (!res.ok) {
      console.error(`FastAPI ingest/faq returned HTTP ${res.status}`);
      await prisma.document.update({
        where: { id: document.id },
        data: { status: "FAILED" },
      });
      return NextResponse.json({ error: "Backend FAQ processing failed" }, { status: 502 });
    }
  } catch (err) {
    console.error("FastAPI connection error during FAQ ingestion:", err);
    await prisma.document.update({
      where: { id: document.id },
      data: { status: "FAILED" },
    });
    return NextResponse.json({ error: "Backend server is unreachable" }, { status: 502 });
  }

  return NextResponse.json(document, { status: 201 });
}
