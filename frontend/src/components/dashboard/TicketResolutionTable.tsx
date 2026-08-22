"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Bug,
  ThumbsDown,
  Lightbulb,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Send,
  Loader2,
  Trash2,
  ShieldCheck,
  Search,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export interface FeedbackTicket {
  id: string;
  chatbotId: string;
  chatbot: {
    id: string;
    name: string;
    primaryColor: string;
    businessName: string;
  };
  visitorId: string;
  userEmail?: string | null;
  category: "INACCURATE_ANSWER" | "BUG_REPORT" | "COMPLAINT" | "FEATURE_REQUEST" | "GENERAL_FEEDBACK";
  subject: string;
  description: string;
  attachedContext?: string | null;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  adminResponse?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  initialTickets: FeedbackTicket[];
}

const CATEGORY_MAP = {
  INACCURATE_ANSWER: { label: "Inaccurate Answer", icon: ThumbsDown, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200" },
  COMPLAINT: { label: "Complaint", icon: AlertCircle, color: "text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200" },
  BUG_REPORT: { label: "Bug Report", icon: Bug, color: "text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200" },
  FEATURE_REQUEST: { label: "Suggestion", icon: Lightbulb, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200" },
  GENERAL_FEEDBACK: { label: "Feedback", icon: MessageSquare, color: "text-slate-600 bg-slate-50 dark:bg-slate-900 border-slate-200" },
};

export function TicketResolutionTable({ initialTickets }: Props) {
  const [tickets, setTickets] = useState<FeedbackTicket[]>(initialTickets);
  const [selectedTicket, setSelectedTicket] = useState<FeedbackTicket | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [adminResponseText, setAdminResponseText] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const { toast } = useToast();

  const handleSelectTicket = (t: FeedbackTicket) => {
    setSelectedTicket(t);
    setAdminResponseText(t.adminResponse || "");
  };

  const handleUpdateStatus = async (newStatus: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED") => {
    if (!selectedTicket) return;
    setIsUpdating(true);

    try {
      const res = await fetch(`/api/feedback/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          adminResponse: adminResponseText.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedTicket = {
          ...selectedTicket,
          ...data.ticket,
          adminResponse: adminResponseText.trim() || selectedTicket.adminResponse,
        };

        setTickets((prev) =>
          prev.map((t) => (t.id === selectedTicket.id ? updatedTicket : t))
        );
        setSelectedTicket(updatedTicket);

        toast({
          title: newStatus === "RESOLVED" ? "✅ Issue Rectified & Resolved!" : `Status updated to ${newStatus}`,
          description: newStatus === "RESOLVED"
            ? "The user will see your resolution response and the green rectified badge in their widget."
            : "Ticket status has been updated.",
        });
      } else {
        toast({ title: "Error", description: "Failed to update ticket.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update ticket.", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTicket = async (id: string) => {
    if (!confirm("Are you sure you want to delete this ticket?")) return;
    try {
      const res = await fetch(`/api/feedback/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTickets((prev) => prev.filter((t) => t.id !== id));
        if (selectedTicket?.id === id) setSelectedTicket(null);
        toast({ title: "Deleted", description: "Ticket removed." });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete ticket.", variant: "destructive" });
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchSub = t.subject.toLowerCase().includes(query);
      const matchDesc = t.description.toLowerCase().includes(query);
      const matchBot = t.chatbot.name.toLowerCase().includes(query);
      const matchEmail = t.userEmail?.toLowerCase().includes(query);
      return matchSub || matchDesc || matchBot || matchEmail;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === status
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {status === "ALL" ? "All Issues" : status.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search complaints, bot, or email..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
      </div>

      {/* Main Grid: Table on Left, Details on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Tickets Table */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          {filteredTickets.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm space-y-2">
              <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500/50" />
              <p className="font-medium">No feedback or issues found</p>
              <p className="text-xs text-slate-500">All customer issues in this view are resolved or none have been submitted.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTickets.map((ticket) => {
                const cat = CATEGORY_MAP[ticket.category] || CATEGORY_MAP.GENERAL_FEEDBACK;
                const Icon = cat.icon;
                const isSelected = selectedTicket?.id === ticket.id;
                const isResolved = ticket.status === "RESOLVED";
                const isInProgress = ticket.status === "IN_PROGRESS";

                return (
                  <div
                    key={ticket.id}
                    onClick={() => handleSelectTicket(ticket)}
                    className={`p-4 transition-all cursor-pointer flex items-start gap-3.5 ${
                      isSelected
                        ? "bg-slate-50 dark:bg-slate-800/80 border-l-4 border-slate-900 dark:border-white"
                        : "hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs font-bold text-xs"
                      style={{ backgroundColor: ticket.chatbot.primaryColor || "#0f172a" }}
                    >
                      {ticket.chatbot.name.charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {ticket.subject}
                          </span>
                          <span className="text-[10px] text-slate-400">· {ticket.chatbot.name}</span>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 flex items-center gap-1 ${
                            isResolved
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                              : isInProgress
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {isResolved ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              <span>Rectified</span>
                            </>
                          ) : isInProgress ? (
                            <>
                              <Clock className="h-3 w-3 text-blue-600" />
                              <span>In Progress</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-3 w-3 text-amber-600" />
                              <span>Open</span>
                            </>
                          )}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {ticket.description}
                      </p>

                      <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-400">
                        <span className={`px-2 py-0.2 rounded-md font-semibold border ${cat.color}`}>
                          {cat.label}
                        </span>
                        {ticket.userEmail && <span>User: {ticket.userEmail}</span>}
                        <span>{formatRelativeTime(ticket.createdAt)}</span>
                      </div>
                    </div>

                    <ChevronRight className={`h-4 w-4 text-slate-400 shrink-0 mt-2 ${isSelected ? "translate-x-0.5 text-slate-900 dark:text-white" : ""}`} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Active Ticket Resolution Drawer */}
        <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
          {selectedTicket ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-lg space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-2xs"
                    style={{ backgroundColor: selectedTicket.chatbot.primaryColor || "#0f172a" }}
                  >
                    {selectedTicket.chatbot.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Resolution Actions
                    </h3>
                    <p className="text-[11px] text-slate-400">{selectedTicket.chatbot.name}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteTicket(selectedTicket.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all"
                  title="Delete ticket"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Issue Details */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    User Complaint / Subject
                  </span>
                  <span className="text-[11px] text-slate-400">
                    ID: {selectedTicket.id.slice(0, 8)}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {selectedTicket.subject}
                </p>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedTicket.description}
                </div>
              </div>

              {/* User-Consented Anonymized Chat Context */}
              {selectedTicket.attachedContext && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>User-Consented Chat Context (Anonymized)</span>
                  </div>
                  <pre className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans max-h-36 overflow-y-auto leading-relaxed">
                    {selectedTicket.attachedContext}
                  </pre>
                </div>
              )}

              {/* Admin Resolution & Reply Form */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                  Admin Resolution Note (Visible to User)
                </label>
                <textarea
                  rows={3}
                  value={adminResponseText}
                  onChange={(e) => setAdminResponseText(e.target.value)}
                  placeholder="Explain how this issue was rectified (e.g. 'Updated knowledge base with revised pricing policy and refreshed AI index.')..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                />
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  When you resolve this, the user&apos;s widget will display a notification badge with your resolution note.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleUpdateStatus("RESOLVED")}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Mark Rectified &amp; Notify User</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleUpdateStatus("IN_PROGRESS")}
                    className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs transition-all"
                  >
                    Set In Progress
                  </button>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleUpdateStatus("OPEN")}
                    className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs transition-all"
                  >
                    Reopen
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center space-y-3">
              <MessageSquare className="h-8 w-8 mx-auto text-slate-400 opacity-60" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Select a ticket on the left
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                Inspect customer complaints, diagnose issues with consented chat logs, and reply with live resolution notes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
