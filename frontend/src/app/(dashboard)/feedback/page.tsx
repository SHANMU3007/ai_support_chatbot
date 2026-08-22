import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TicketResolutionTable, FeedbackTicket } from "@/components/dashboard/TicketResolutionTable";
import { LifeBuoy, CheckCircle2, Clock, AlertCircle, ShieldCheck } from "lucide-react";

export default async function FeedbackResolutionPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login");
  }

  const userId = (session.user as any).id as string;
  if (!userId) {
    redirect("/login");
  }

  const adminEmails = (process.env.ADMIN_EMAILS || "shanmugapatelkani@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  const userRole = (session?.user as any)?.role || dbUser?.role;
  const userEmail = session?.user?.email?.toLowerCase();
  const isAdmin = userRole === "ADMIN" || (userEmail && adminEmails.includes(userEmail));

  // Fetch tickets
  const tickets = await prisma.feedbackTicket.findMany({
    where: isAdmin ? {} : { chatbot: { userId } },
    include: {
      chatbot: {
        select: {
          id: true,
          name: true,
          primaryColor: true,
          businessName: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 150,
  });

  const totalTickets = tickets.length;
  const openCount = tickets.filter((t) => t.status === "OPEN").length;
  const inProgressCount = tickets.filter((t) => t.status === "IN_PROGRESS").length;
  const resolvedCount = tickets.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED").length;
  const resolutionRate = totalTickets > 0 ? Math.round((resolvedCount / totalTickets) * 100) : 100;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Feedback &amp; Resolution Center
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Review visitor complaints, rectify inaccuracies, and broadcast resolutions back to users.
              </p>
            </div>
          </div>
        </div>

        {isAdmin && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-bold text-xs border border-purple-200 dark:border-purple-800">
            <ShieldCheck className="h-3.5 w-3.5" />
            Platform Admin Oversight
          </span>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Submissions</span>
            <LifeBuoy className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalTickets}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Open Complaints</span>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{openCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">In Progress</span>
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{inProgressCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Rectified / Resolved</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{resolvedCount}</p>
            <span className="text-xs font-semibold text-emerald-600">{resolutionRate}% resolved</span>
          </div>
        </div>
      </div>

      {/* Ticket Table and Resolution Workspace */}
      <TicketResolutionTable initialTickets={tickets as unknown as FeedbackTicket[]} />
    </div>
  );
}
