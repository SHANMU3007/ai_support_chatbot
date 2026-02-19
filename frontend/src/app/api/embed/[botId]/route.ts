import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateEmbedScript } from "@/lib/embed-script";

interface Props {
  params: { botId: string };
}

export async function GET(_req: NextRequest, { params }: Props) {
  const chatbot = await prisma.chatbot.findFirst({
    where: { id: params.botId, isActive: true },
  });

  if (!chatbot) {
    return new NextResponse("// Chatbot not found", {
      status: 404,
      headers: { "Content-Type": "application/javascript" },
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const script = generateEmbedScript(chatbot.id, chatbot.primaryColor, appUrl);

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
