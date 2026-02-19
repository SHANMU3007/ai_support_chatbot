import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Props {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const chatbot = await prisma.chatbot.findFirst({
    where: { id: params.id, userId: session.user?.id as string },
  });

  if (!chatbot) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(chatbot);
}

export async function PUT(req: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const chatbot = await prisma.chatbot.updateMany({
    where: { id: params.id, userId: session.user?.id as string },
    data: {
      name: body.name,
      businessName: body.businessName,
      description: body.description,
      systemPrompt: body.systemPrompt,
      primaryColor: body.primaryColor,
      welcomeMessage: body.welcomeMessage,
      language: body.language,
      isActive: body.isActive,
    },
  });

  if (chatbot.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.chatbot.deleteMany({
    where: { id: params.id, userId: session.user?.id as string },
  });

  return NextResponse.json({ success: true });
}
