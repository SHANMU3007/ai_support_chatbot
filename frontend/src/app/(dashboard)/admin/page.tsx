import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, isUserAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Users, AlertTriangle, Activity, ArrowRight, ShieldCheck, MessageSquare, Bot, LifeBuoy, FileText } from "lucide-react";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!isUserAdmin(session?.user?.email, session?.user?.role)) {
    redirect("/dashboard");
  }

  const [workspaces, chatbotsCount, documentsCount, sessions, negative, recentWorkspaces] = await Promise.all([
    prisma.user.count({ where: { role: "WORKSPACE" } }),
    prisma.chatbot.count(),
    prisma.document.count(),
    prisma.chatSession.count(),
    prisma.chatSession.count({ where: { needsFollowUp: true } }),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        createdAt: true,
        _count: { select: { chatbots: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-indigo-600 font-bold">Platform Control Center</p>
        <h1 className="text-2xl font-bold mt-1 text-gray-900">Admin Executive Overview</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor multi-tenant workspaces, chatbot counts, knowledge base volume, and platform health.
        </p>
      </div>

      {/* Metrics Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-sm font-medium">Customer Workspaces</span>
            <Users className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{workspaces}</p>
        </div>

        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-sm font-medium">Active Chatbots</span>
            <Bot className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{chatbotsCount}</p>
        </div>

        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-sm font-medium">Knowledge Docs</span>
            <ShieldCheck className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{documentsCount}</p>
        </div>

        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-sm font-medium">Total Chat Sessions</span>
            <MessageSquare className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{sessions}</p>
        </div>

        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-sm font-medium">Follow-up Queue</span>
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-600 mt-2">{negative}</p>
        </div>
      </div>

      {/* Quick Action Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Link href="/admin/raw-texts" className="bg-white rounded-xl border p-6 hover:shadow-md hover:border-indigo-300 transition-all group">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
            <FileText className="h-5 w-5" />
          </div>
          <h2 className="font-bold text-gray-900 flex items-center justify-between">
            Raw Text Inspector
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Audit full un-chunked raw extracted text from PDFs, URLs, and FAQs stored in PostgreSQL.
          </p>
        </Link>

        <Link href="/feedback" className="bg-white rounded-xl border p-6 hover:shadow-md hover:border-indigo-300 transition-all group">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <h2 className="font-bold text-gray-900 flex items-center justify-between">
            Resolution Center
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Review complaints, rectify inaccuracies, and broadcast resolutions back to users.
          </p>
        </Link>

        <Link href="/admin/workspaces" className="bg-white rounded-xl border p-6 hover:shadow-md hover:border-indigo-300 transition-all group">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
            <Users className="h-5 w-5" />
          </div>
          <h2 className="font-bold text-gray-900 flex items-center justify-between">
            Customer Workspaces
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Manage customer accounts, assign starter/pro/enterprise plans, and adjust user roles.
          </p>
        </Link>

        <Link href="/admin/followup" className="bg-white rounded-xl border p-6 hover:shadow-md hover:border-red-300 transition-all group">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h2 className="font-bold text-gray-900 flex items-center justify-between">
            Sentiment Audit Queue
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Review unhappy customer sessions analyzed by Groq AI and mark issues resolved.
          </p>
        </Link>

        <Link href="/admin/health" className="bg-white rounded-xl border p-6 hover:shadow-md hover:border-emerald-300 transition-all group">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
            <Activity className="h-5 w-5" />
          </div>
          <h2 className="font-bold text-gray-900 flex items-center justify-between">
            Infrastructure Health
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Probe live status and latency for PostgreSQL, Redis, ChromaDB, FastAPI, and n8n.
          </p>
        </Link>
      </div>

      {/* Recent Workspaces Table */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-gray-900">Recent Customer Workspaces</h2>
            <p className="text-xs text-gray-500">Newly registered workspace users across the platform.</p>
          </div>
          <Link href="/admin/workspaces" className="text-xs font-semibold text-indigo-600 hover:underline">
            View all workspaces →
          </Link>
        </div>

        <div className="divide-y">
          {recentWorkspaces.map((ws) => (
            <div key={ws.id} className="py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{ws.name || ws.email}</p>
                <p className="text-xs text-gray-500">{ws.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-gray-100 text-gray-700">
                  {ws.plan} Plan
                </span>
                <span className="text-xs text-gray-400">
                  {ws._count.chatbots} bot{ws._count.chatbots === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
