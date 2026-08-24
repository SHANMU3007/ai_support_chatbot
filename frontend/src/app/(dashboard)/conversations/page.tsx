import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ConversationTable } from "@/components/dashboard/ConversationTable";
import { Shield } from "lucide-react";

import { redirect } from "next/navigation";

export default async function ConversationsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login");
  }
  const userId = (session.user as any).id as string;
  if (!userId) {
    redirect("/login");
  }

  // Failsafe DB role resolution for Admin access
  const adminEmails = (process.env.ADMIN_EMAILS || "shanmugapatelkani@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const userEmail = session?.user?.email?.toLowerCase();
  const dbUser = await prisma.user.findFirst({
    where: {
      OR: [
        { id: userId },
        ...(userEmail ? [{ email: userEmail }] : []),
      ],
    },
    select: { id: true, role: true },
  });

  const userRole = (session?.user as any)?.role || dbUser?.role;
  const isAdmin =
    userRole === "ADMIN" ||
    (userEmail && adminEmails.includes(userEmail));

  const resolvedUserId = dbUser?.id || userId;
  const chatbotFilter = isAdmin
    ? {}
    : {
        chatbot: {
          OR: [
            { userId: resolvedUserId },
            ...(userEmail ? [{ user: { email: userEmail } }] : []),
          ],
        },
      };

  // Admins see all chat sessions across all customer chatbots; Workspace users see only their own.
  const sessions = await prisma.chatSession.findMany({
    where: chatbotFilter,
    include: {
      chatbot: {
        select: {
          name: true,
          primaryColor: true,
          privacyLevel: true,
          user: { select: { email: true } },
        },
      },
      _count: { select: { messages: true } },
      messages: { take: 1, orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-slate-900 text-white px-2.5 py-0.5 rounded-full border border-slate-800 shadow-xs">
                <Shield className="h-3 w-3 text-indigo-400" /> Full Admin Access
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {isAdmin
              ? "Platform Admin view: Inspect all visitor conversation sessions across all customer chatbots."
              : "All chat sessions across your chatbots."}
          </p>
        </div>
      </div>
      <div className="bg-white rounded-xl border">
        <ConversationTable sessions={sessions} />
      </div>
    </div>
  );
}
