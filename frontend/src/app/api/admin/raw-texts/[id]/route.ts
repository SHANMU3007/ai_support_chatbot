import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isUserAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isUserAdmin(session.user.email, (session.user as any)?.role)) {
    return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 401 });
  }

  const { id } = params;

  const rawTextRecord = await prisma.rawExtractedText.findFirst({
    where: {
      OR: [{ id }, { documentId: id }],
    },
    include: {
      document: {
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          chunkCount: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      chatbot: {
        select: {
          id: true,
          name: true,
          businessName: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!rawTextRecord) {
    return NextResponse.json({ error: "Raw extracted text record not found." }, { status: 404 });
  }

  return NextResponse.json(rawTextRecord);
}
