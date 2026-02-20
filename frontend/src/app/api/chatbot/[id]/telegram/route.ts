import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Props {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { token } = body;

  // Verify the chatbot belongs to the user
  const chatbot = await prisma.chatbot.findFirst({
    where: { id: params.id, userId: session.user?.id as string },
  });

  if (!chatbot) {
    return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
  }

  // Save the token to the database
  await prisma.chatbot.update({
    where: { id: params.id },
    data: { telegramToken: token || null },
  });

  // If token is provided, connect the Telegram bot via backend
  if (token) {
    try {
      const backendUrl = process.env.FASTAPI_URL || "http://localhost:8000";
      const res = await fetch(`${backendUrl}/telegram/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatbot_id: params.id,
          token: token,
          business_name: chatbot.businessName || chatbot.name,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        return NextResponse.json(
          { error: error.detail || "Failed to connect Telegram bot" },
          { status: 400 }
        );
      }

      return NextResponse.json({
        status: "connected",
        message: "Telegram bot connected successfully!",
      });
    } catch {
      return NextResponse.json(
        { error: "Failed to reach the backend server" },
        { status: 500 }
      );
    }
  } else {
    // Disconnect the bot
    try {
      const backendUrl = process.env.FASTAPI_URL || "http://localhost:8000";
      await fetch(`${backendUrl}/telegram/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatbot_id: params.id }),
      });
    } catch {
      // Silently fail if backend is unreachable
    }

    return NextResponse.json({
      status: "disconnected",
      message: "Telegram bot disconnected.",
    });
  }
}

export async function GET(_req: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const chatbot = await prisma.chatbot.findFirst({
    where: { id: params.id, userId: session.user?.id as string },
    select: { telegramToken: true },
  });

  if (!chatbot) {
    return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
  }

  // Check if the bot is running
  let isRunning = false;
  try {
    const backendUrl = process.env.FASTAPI_URL || "http://localhost:8000";
    const res = await fetch(`${backendUrl}/telegram/status/${params.id}`);
    if (res.ok) {
      const data = await res.json();
      isRunning = data.is_running;
    }
  } catch {
    // Backend unreachable
  }

  return NextResponse.json({
    hasToken: !!chatbot.telegramToken,
    tokenPreview: chatbot.telegramToken
      ? chatbot.telegramToken.substring(0, 10) + "..."
      : null,
    isRunning,
  });
}
