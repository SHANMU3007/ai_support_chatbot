import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFastApiUrl } from "@/lib/api-config";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const chatbotId = formData.get("chatbotId") as string;

  if (!file || !chatbotId) {
    return NextResponse.json({ error: "file and chatbotId are required" }, { status: 400 });
  }

  const userId = session.user?.id as string;
  const userEmail = session.user?.email?.toLowerCase();
  const userRole = (session.user as any)?.role;
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = userRole === "ADMIN" || (userEmail && adminEmails.includes(userEmail));

  // Verify ownership (admin can upload to any chatbot)
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

  const docType = file.name.endsWith(".pdf")
    ? "PDF"
    : file.name.endsWith(".docx")
    ? "DOCX"
    : "TEXT";

  // Create document record
  const document = await prisma.document.create({
    data: {
      chatbotId,
      name: file.name,
      type: docType as any,
      content: "",
      status: "PENDING",
    },
  });

  // Fire-and-forget FastAPI call — do NOT await so the route returns immediately.
  // The frontend polls /api/knowledge/status every 3 s to detect DONE/FAILED.
  const backendUrl = getFastApiUrl("/ingest/document");
  const backendFormData = new FormData();
  backendFormData.append("file", file);
  backendFormData.append("chatbot_id", chatbotId);
  backendFormData.append("document_id", document.id);

  fetch(backendUrl, {
    method: "POST",
    body: backendFormData,
  }).catch(async (err) => {
    console.error("FastAPI connection error during document upload:", err);
    try {
      await prisma.document.update({
        where: { id: document.id },
        data: { status: "FAILED" },
      });
    } catch {}
  });

  // Return immediately with PENDING status — frontend polls for completion
  return NextResponse.json(document, { status: 201 });
}
