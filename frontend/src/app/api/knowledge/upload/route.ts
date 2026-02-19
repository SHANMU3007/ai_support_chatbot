import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  // Verify ownership
  const chatbot = await prisma.chatbot.findFirst({
    where: { id: chatbotId, userId: session.user?.id as string },
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

  // Forward to FastAPI for processing
  const fastapiUrl = process.env.FASTAPI_URL || "http://localhost:8000";
  const backendFormData = new FormData();
  backendFormData.append("file", file);
  backendFormData.append("chatbot_id", chatbotId);
  backendFormData.append("document_id", document.id);

  // Fire-and-forget ingestion (don't block response)
  fetch(`${fastapiUrl}/ingest/document`, {
    method: "POST",
    body: backendFormData,
  }).catch(console.error);

  return NextResponse.json(document, { status: 201 });
}
