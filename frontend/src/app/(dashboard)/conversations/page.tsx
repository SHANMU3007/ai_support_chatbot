import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ConversationTable } from "@/components/dashboard/ConversationTable";

export default async function ConversationsPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id as string;

  const sessions = await prisma.chatSession.findMany({
    where: { chatbot: { userId } },
    include: {
      chatbot: { select: { name: true, primaryColor: true } },
      _count: { select: { messages: true } },
      messages: { take: 1, orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Conversations</h1>
        <p className="text-gray-500 text-sm mt-1">
          All chat sessions across your chatbots
        </p>
      </div>
      <div className="bg-white rounded-xl border">
        <ConversationTable sessions={sessions} />
      </div>
    </div>
  );
}
