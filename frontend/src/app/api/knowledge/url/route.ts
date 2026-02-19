import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { chatbotId, url, maxPages = 50 } = await req.json();

  if (!chatbotId || !url) {
    return NextResponse.json({ error: "chatbotId and url are required" }, { status: 400 });
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  // Clamp max_pages between 1 and 500
  const clampedMaxPages = Math.min(Math.max(Number(maxPages) || 50, 1), 500);

  // Verify chatbot ownership
  const chatbot = await prisma.chatbot.findFirst({
    where: { id: chatbotId, userId: session.user?.id as string },
  });
  if (!chatbot) return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });

  // Create a document record
  const document = await prisma.document.create({
    data: {
      chatbotId,
      name: `${url} (${clampedMaxPages} pages)`,
      type: "URL",
      content: "",
      status: "PENDING",
    },
  });

  // Forward to FastAPI for crawling + embedding
  const fastapiUrl = process.env.FASTAPI_URL || "http://localhost:8000";
  fetch(`${fastapiUrl}/ingest/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chatbot_id: chatbotId,
      document_id: document.id,
      url,
      max_pages: clampedMaxPages,
    }),
  }).catch(console.error);

  return NextResponse.json({ ...document, maxPages: clampedMaxPages }, { status: 201 });
}
