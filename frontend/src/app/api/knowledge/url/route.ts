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

  const userId = session.user?.id as string;
  const userEmail = session.user?.email?.toLowerCase();
  const userRole = (session.user as any)?.role;
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = userRole === "ADMIN" || (userEmail && adminEmails.includes(userEmail));

  // Verify chatbot ownership (admin can ingest for any chatbot)
  const chatbot = await prisma.chatbot.findFirst({
    where: isAdmin
      ? { id: chatbotId }
      : {
          id: chatbotId,
          OR: [
            ...(userId ? [{ userId }] : []),
            ...(userEmail ? [{ user: { email: userEmail } }] : []),
          ],
        },
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

  // Forward to FastAPI with a strict 5-second timeout to prevent Vercel 502 gateway timeouts
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
      signal: AbortSignal.timeout(5000),
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
  } catch (err: any) {
    // If request timed out on Vercel's end or dispatched asynchronously, assume request sent
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      console.log("FastAPI ingest/url dispatched asynchronously (exceeded 5s wait).");
    } else {
      console.error("FastAPI connection error during URL ingestion:", err);
      // Backend is unreachable — mark as FAILED so the user isn't left waiting
      try {
        await prisma.document.update({
          where: { id: document.id },
          data: { status: "FAILED" },
        });
      } catch (dbErr) {
        console.error("Failed to update document status to FAILED:", dbErr);
      }
      return NextResponse.json(
        { error: "Backend service unavailable. Please try again later.", id: document.id },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ ...document, maxPages: clampedMaxPages }, { status: 201 });
}
