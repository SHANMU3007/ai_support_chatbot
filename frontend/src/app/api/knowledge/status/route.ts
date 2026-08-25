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

  const userId = session.user?.id as string;
  const userEmail = session.user?.email?.toLowerCase();
  const userRole = (session.user as any)?.role;

  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const isAdmin =
    userRole === "ADMIN" || (userEmail && adminEmails.includes(userEmail));

  // Admins can query any chatbot's documents; workspace users only their own
  const whereClause = isAdmin
    ? { chatbotId }
    : {
        chatbotId,
        chatbot: {
          OR: [
            ...(userId ? [{ userId }] : []),
            ...(userEmail ? [{ user: { email: userEmail } }] : []),
          ],
        },
      };

  const documents = await prisma.document.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(documents);
}
