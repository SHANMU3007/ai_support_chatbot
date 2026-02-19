import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Props {
  params: { id: string };
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const document = await prisma.document.findFirst({
    where: {
      id: params.id,
      chatbot: { userId: session.user?.id as string },
    },
  });

  if (!document) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.document.delete({ where: { id: params.id } });

  // Also delete from ChromaDB via backend
  const fastapiUrl = process.env.FASTAPI_URL || "http://localhost:8000";
  fetch(`${fastapiUrl}/ingest/document/${params.id}`, { method: "DELETE" }).catch(console.error);

  return NextResponse.json({ success: true });
}
