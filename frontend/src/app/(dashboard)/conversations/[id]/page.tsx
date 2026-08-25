import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Props {
  params: { id: string };
}

export default async function ConversationDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login");
  }
  const userId = (session.user as any).id as string;
  if (!userId) {
    redirect("/login");
  }

  const chatSession = await prisma.chatSession.findFirst({
    where: {
      id: params.id,
      chatbot: { userId },
    },
    include: {
      chatbot: { select: { name: true, primaryColor: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!chatSession) notFound();

  const metadata = (chatSession.metadata as any) || {};
  const contactName = metadata.name || metadata.fullname || metadata.user_name || metadata.userName;
  const contactEmail = metadata.email || metadata.user_email || metadata.userEmail;
  const contactPhone = metadata.phone || metadata.mobile || metadata.phoneNumber || metadata.userPhone;
  const hasDetails = contactName || contactEmail || contactPhone;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/conversations">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            Conversation — {chatSession.chatbot.name}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Visitor ID: {chatSession.visitorId} ·{" "}
            {format(new Date(chatSession.createdAt), "PPpp")}
          </p>
        </div>
        <Badge variant="outline">{chatSession.language.toUpperCase()}</Badge>
      </div>

      {/* Visitor Lead Contact Details Card */}
      {hasDetails && (
        <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
              Collected Visitor Details
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-slate-800 dark:text-slate-200">
              {contactName && (
                <span>
                  👤 <strong>Name:</strong> {contactName}
                </span>
              )}
              {contactEmail && (
                <span>
                  ✉ <strong>Email:</strong> {contactEmail}
                </span>
              )}
              {contactPhone && (
                <span>
                  📞 <strong>Phone:</strong> {contactPhone}
                </span>
              )}
            </div>
          </div>
          <Badge className="bg-indigo-600 text-white self-start sm:self-auto">Pre-Chat Lead</Badge>
        </div>
      )}


      <div className="bg-white rounded-xl border p-6 space-y-4">
        {chatSession.messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "USER" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === "USER"
                  ? "text-white rounded-br-xs shadow-sm"
                  : "bg-gray-100 text-gray-900 border border-gray-200 rounded-bl-xs"
              }`}
              style={msg.role === "USER" ? { backgroundColor: chatSession.chatbot.primaryColor || "#0f172a" } : undefined}
            >
              <p>{msg.content}</p>
              <div className="flex items-center gap-2 mt-1 opacity-60 text-xs">
                <span>{format(new Date(msg.createdAt), "HH:mm")}</span>
                {msg.tokens && <span>· {msg.tokens} tokens</span>}
                {msg.confidence && (
                  <span>· {Math.round(msg.confidence * 100)}% confidence</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
