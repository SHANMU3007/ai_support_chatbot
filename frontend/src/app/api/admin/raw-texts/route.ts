import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isUserAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isUserAdmin(session.user.email, (session.user as any)?.role)) {
    return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const chatbotId = searchParams.get("chatbotId") || "";
  const sourceType = searchParams.get("sourceType") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "15", 10);
  const skip = (page - 1) * limit;

  const whereClause: any = {};

  if (chatbotId) {
    whereClause.chatbotId = chatbotId;
  }

  if (sourceType) {
    whereClause.sourceType = sourceType as any;
  }

  if (search) {
    whereClause.OR = [
      { rawText: { contains: search, mode: "insensitive" } },
      { document: { name: { contains: search, mode: "insensitive" } } },
      { chatbot: { name: { contains: search, mode: "insensitive" } } },
      { chatbot: { businessName: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [rawTexts, totalCount, aggregations, chatbots] = await Promise.all([
    prisma.rawExtractedText.findMany({
      where: whereClause,
      include: {
        document: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            chunkCount: true,
            createdAt: true,
          },
        },
        chatbot: {
          select: {
            id: true,
            name: true,
            businessName: true,
          },
        },
      },
      orderBy: { extractedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.rawExtractedText.count({ where: whereClause }),
    prisma.rawExtractedText.aggregate({
      where: whereClause,
      _sum: {
        charCount: true,
        wordCount: true,
      },
      _avg: {
        charCount: true,
      },
    }),
    prisma.chatbot.findMany({
      select: { id: true, name: true, businessName: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return NextResponse.json({
    data: rawTexts,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
    },
    metrics: {
      totalDocuments: totalCount,
      totalCharacters: aggregations._sum.charCount || 0,
      totalWords: aggregations._sum.wordCount || 0,
      avgCharCount: Math.round(aggregations._avg.charCount || 0),
    },
    chatbots,
  });
}
