import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Props {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      plan: true,
      createdAt: true,
      chatbots: {
        include: {
          documents: {
            select: {
              id: true,
              name: true,
              type: true,
              status: true,
              chunkCount: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
          sessions: {
            take: 10,
            orderBy: { createdAt: "desc" },
            include: {
              messages: {
                take: 5,
                orderBy: { createdAt: "asc" },
              },
            },
          },
          _count: {
            select: {
              sessions: true,
              documents: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Workspace user not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}
