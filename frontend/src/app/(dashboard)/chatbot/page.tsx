import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Plus, Settings, ExternalLink, MessageSquare, Shield, Sparkles, FileText } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

import { redirect } from "next/navigation";

export default async function ChatbotsPage() {
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

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  const isAdmin =
    dbUser?.role === "ADMIN" ||
    (session?.user?.email && adminEmails.includes(session.user.email.toLowerCase()));

  // Admins see all chatbots across all customer workspaces; Workspace users see only their own.
  const chatbots = await prisma.chatbot.findMany({
    where: isAdmin ? {} : { userId },
    include: {
      user: { select: { email: true, name: true } },
      _count: { select: { sessions: true, documents: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">AI Chatbots</h1>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 text-xs font-bold bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full border border-purple-200">
                <Shield className="h-3 w-3" /> Platform Admin
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-1">
            {isAdmin
              ? "Platform Admin view: Manage and inspect all customer chatbots across workspaces."
              : "Create, customize, and deploy your intelligent customer service agents."}
          </p>
        </div>
        <Link href="/chatbot/create">
          <Button className="rounded-xl shadow-sm bg-slate-900 text-white hover:bg-slate-800">
            <Plus className="mr-2 h-4 w-4" />
            Create Chatbot
          </Button>
        </Link>
      </div>

      {chatbots.length === 0 ? (
        <div className="text-center py-20 bg-white/80 rounded-3xl border border-slate-200/80 shadow-xs max-w-xl mx-auto p-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4 border border-indigo-100">
            <Bot className="h-8 w-8 text-indigo-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">No chatbots deployed yet</h3>
          <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
            Upload your company FAQs, documentation, or website URL and launch your AI assistant in minutes.
          </p>
          <Link href="/chatbot/create">
            <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Chatbot
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {chatbots.map((bot) => (
            <SpotlightCard
              key={bot.id}
              className="p-6 border border-slate-200/80 bg-white/90 shadow-xs hover:shadow-lg flex flex-col justify-between"
              spotlightColor="rgba(99, 102, 241, 0.12)"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-sm border border-white/20"
                    style={{ backgroundColor: bot.primaryColor || "#4f46e5" }}
                  >
                    {bot.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        bot.isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          bot.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                        }`}
                      />
                      {bot.isActive ? "Active" : "Inactive"}
                    </span>
                    {isAdmin && (
                      <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-semibold border border-purple-100">
                        {bot.user.email}
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 text-base tracking-tight">{bot.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">{bot.businessName}</p>

                <div className="flex items-center gap-4 mt-5 text-xs font-medium text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />
                    {bot._count.sessions} conversations
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-purple-500" />
                    {bot._count.documents} indexed docs
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100">
                <Link href={`/chatbot/${bot.id}`} className="flex-1">
                  <Button size="sm" variant="outline" className="w-full rounded-xl text-xs font-semibold">
                    <Settings className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                    Configure
                  </Button>
                </Link>
                <Link href={`/chat/${bot.id}`} target="_blank">
                  <Button size="sm" variant="ghost" className="rounded-xl px-3" title="Open public chat window">
                    <ExternalLink className="h-3.5 w-3.5 text-slate-600" />
                  </Button>
                </Link>
              </div>
            </SpotlightCard>
          ))}
        </div>
      )}
    </div>
  );
}
