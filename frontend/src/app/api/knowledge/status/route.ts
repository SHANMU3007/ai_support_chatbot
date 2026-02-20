import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/knowledge/status?chatbotId=xxx  — returns live document list for polling */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const chatbotId = req.nextUrl.searchParams.get("chatbotId");
  if (!chatbotId) return NextResponse.json({ error: "chatbotId required" }, { status: 400 });

  const documents = await prisma.document.findMany({
    where: {
      chatbotId,
      chatbot: { userId: session.user?.id as string },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(documents);
}
