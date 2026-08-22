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
  const openCount = tickets.filter((t) => t.status === "OPEN" || t.status === "REVIEWED_BY_CLIENT").length;
  const escalatedCount = tickets.filter((t) => t.status === "ESCALATED_TO_ADMIN" || t.escalatedToAdmin).length;
  const inProgressCount = tickets.filter((t) => t.status === "IN_PROGRESS").length;
  const resolvedCount = tickets.filter((t) => t.status === "RESOLVED" || t.status === "RECTIFIED" || t.status === "CLOSED").length;
  const resolutionRate = totalTickets > 0 ? Math.round((resolvedCount / totalTickets) * 100) : 100;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-950 text-white shadow-md shadow-indigo-950/20">
              <LifeBuoy className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Feedback &amp; Resolution Hub
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAdmin
                  ? "Platform Admin view: Review customer visitor feedback, client escalation notes, and broadcast prompt/system fixes."
                  : "Review user complaints, append your client notes/feedback, and escalate to Platform Admins for prompt rectification."}
              </p>
            </div>
          </div>
        </div>

        {isAdmin ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white font-medium text-xs border border-slate-800 shadow-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
            Platform Admin Mode
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-medium text-xs border border-slate-200 shadow-xs">
            Workspace Client Mode
          </span>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total User Tickets</span>
            <LifeBuoy className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalTickets}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Open User Issues</span>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{openCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Escalated to Admin</span>
            <Clock className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{escalatedCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Rectified &amp; Resolved</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{resolvedCount}</p>
            <span className="text-xs font-semibold text-emerald-600">{resolutionRate}% rectified</span>
          </div>
        </div>
      </div>

      {/* Ticket Table and Resolution Workspace */}
      <TicketResolutionTable
        initialTickets={tickets as unknown as FeedbackTicket[]}
        isAdmin={Boolean(isAdmin)}
      />
    </div>
  );
}
