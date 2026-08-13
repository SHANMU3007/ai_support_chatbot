import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFastApiUrl, normalizeWebsiteUrl } from "@/lib/api-config";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { chatbotId, url: rawUrl, maxPages = 15 } = await req.json();

  if (!chatbotId || !rawUrl) {
    return NextResponse.json({ error: "chatbotId and url are required" }, { status: 400 });
  }

  // Validate and normalize URL format for all types of hosted websites
  let url: string;
  try {
    url = normalizeWebsiteUrl(rawUrl);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Invalid URL format" }, { status: 400 });
  }

  // Clamp max_pages between 1 and 500 (default 15 for fast completion)
  const clampedMaxPages = Math.min(Math.max(Number(maxPages) || 15, 1), 500);

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

  // Forward to FastAPI for crawling + embedding (await fetch to prevent Vercel lambda freezing)
  const backendUrl = getFastApiUrl("/ingest/url");
  try {
    const res = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatbot_id: chatbotId,
        document_id: document.id,
        url,
        max_pages: clampedMaxPages,
      }),
    });

    if (!res.ok) {
      let detail = `Backend returned HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        detail = errJson.detail || errJson.error || detail;
      } catch {
        const text = await res.text().catch(() => "");
        if (text) detail = text.slice(0, 300);
      }
      console.error(`FastAPI ingest/url error [HTTP ${res.status}]:`, detail);
      await prisma.document.update({
        where: { id: document.id },
        data: { status: "FAILED" },
      });
      return NextResponse.json(
        { error: detail },
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
      );
    }
  } catch (err) {
    console.error("FastAPI connection error during URL ingestion:", err);
    await prisma.document.update({
      where: { id: document.id },
      data: { status: "FAILED" },
    });
    return NextResponse.json(
      { error: "Backend server is unreachable" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ...document, maxPages: clampedMaxPages }, { status: 201 });
}
