import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userEmail = session.user?.email?.toLowerCase();
  const userId = session.user?.id as string;
  const where = {
    OR: [
      ...(userId ? [{ userId }] : []),
      ...(userEmail ? [{ user: { email: userEmail } }] : []),
    ],
  };

  const chatbots = await prisma.chatbot.findMany({
    where,
    include: { _count: { select: { sessions: true, documents: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(chatbots);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, businessName, description, systemPrompt, primaryColor, welcomeMessage, language } =
    body;

  if (!name || !businessName || !systemPrompt) {
    return NextResponse.json(
      { error: "name, businessName, and systemPrompt are required" },
      { status: 400 }
    );
  }

  let userId = session.user?.id as string;
  if (session.user?.email) {
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true },
    });
    if (dbUser) userId = dbUser.id;
  }

  if (!userId) {
    return NextResponse.json({ error: "User not found in database" }, { status: 400 });
  }

  const chatbot = await prisma.chatbot.create({
    data: {
      userId,
      name,
      businessName,
      description,
      systemPrompt,
      primaryColor: primaryColor || "#6366f1",
      welcomeMessage: welcomeMessage || "Hi! How can I help you today?",
      language: language || "en",
    },
  });

  return NextResponse.json(chatbot, { status: 201 });
}
