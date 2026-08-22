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
  ArrowUpRight,
  User,
  Building2,
  Check,
  Layers,
  HelpCircle,
  FileText
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
  status: "OPEN" | "REVIEWED_BY_CLIENT" | "ESCALATED_TO_ADMIN" | "IN_PROGRESS" | "RECTIFIED" | "RESOLVED" | "CLOSED";
  clientFeedback?: string | null;
  escalatedToAdmin?: boolean;
  clientReviewedAt?: string | null;
  adminResponse?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  initialTickets: FeedbackTicket[];
  isAdmin?: boolean;
}

const CATEGORY_MAP = {
  INACCURATE_ANSWER: { label: "Inaccurate Answer", icon: ThumbsDown, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200" },
  COMPLAINT: { label: "Complaint", icon: AlertCircle, color: "text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200" },
  BUG_REPORT: { label: "Bug Report", icon: Bug, color: "text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200" },
  FEATURE_REQUEST: { label: "Suggestion", icon: Lightbulb, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200" },
  GENERAL_FEEDBACK: { label: "Feedback", icon: MessageSquare, color: "text-slate-600 bg-slate-50 dark:bg-slate-900 border-slate-200" },
};

export function TicketResolutionTable({ initialTickets, isAdmin = false }: Props) {
  const [tickets, setTickets] = useState<FeedbackTicket[]>(initialTickets);
  const [selectedTicket, setSelectedTicket] = useState<FeedbackTicket | null>(initialTickets[0] || null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [clientFeedbackText, setClientFeedbackText] = useState<string>(initialTickets[0]?.clientFeedback || "");
  const [adminResponseText, setAdminResponseText] = useState<string>(initialTickets[0]?.adminResponse || "");
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const { toast } = useToast();

  const handleSelectTicket = (t: FeedbackTicket) => {
    setSelectedTicket(t);
    setClientFeedbackText(t.clientFeedback || "");
    setAdminResponseText(t.adminResponse || "");
  };

  const handleUpdateTicket = async (options: {
    newStatus?: FeedbackTicket["status"];
    escalate?: boolean;
  }) => {
    if (!selectedTicket) return;
    setIsUpdating(true);

    try {
      const payload: any = {};
      if (options.newStatus) payload.status = options.newStatus;
      if (options.escalate !== undefined) payload.escalatedToAdmin = options.escalate;
      if (clientFeedbackText.trim() !== (selectedTicket.clientFeedback || "")) {
        payload.clientFeedback = clientFeedbackText.trim();
      }
      if (adminResponseText.trim() !== (selectedTicket.adminResponse || "")) {
        payload.adminResponse = adminResponseText.trim();
      }

      const res = await fetch(`/api/feedback/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedTicket: FeedbackTicket = {
          ...selectedTicket,
          ...data.ticket,
          clientFeedback: payload.clientFeedback !== undefined ? payload.clientFeedback : selectedTicket.clientFeedback,
          adminResponse: payload.adminResponse !== undefined ? payload.adminResponse : selectedTicket.adminResponse,
        };

        setTickets((prev) =>
          prev.map((t) => (t.id === selectedTicket.id ? updatedTicket : t))
        );
        setSelectedTicket(updatedTicket);

        let successTitle = "Ticket Updated";
        let successDesc = "Changes have been saved successfully.";

        if (options.escalate) {
          successTitle = "🚀 Escalated to Platform Admin!";
          successDesc = "The Platform Admin has received your escalation notes and user feedback.";
        } else if (options.newStatus === "RECTIFIED") {
          successTitle = "✨ Issue Rectified by Admin!";
          successDesc = "Rectification notes and resolution badge broadcasted to client & visitor.";
        } else if (options.newStatus === "RESOLVED") {
          successTitle = "✅ Ticket Marked as Resolved!";
          successDesc = "Resolution response recorded.";
        }

        toast({
          title: successTitle,
          description: successDesc,
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
        toast({ title: "Ticket deleted" });
      }
    } catch {
      toast({ title: "Error deleting ticket", variant: "destructive" });
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter === "OPEN" && !(t.status === "OPEN" || t.status === "REVIEWED_BY_CLIENT")) return false;
    if (statusFilter === "ESCALATED" && !(t.status === "ESCALATED_TO_ADMIN" || t.escalatedToAdmin)) return false;
    if (statusFilter === "RECTIFIED" && !(t.status === "RECTIFIED")) return false;
    if (statusFilter === "RESOLVED" && !(t.status === "RESOLVED" || t.status === "CLOSED")) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSub = t.subject?.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchClient = t.clientFeedback?.toLowerCase().includes(q);
      const matchAdmin = t.adminResponse?.toLowerCase().includes(q);
      const matchEmail = t.userEmail?.toLowerCase().includes(q);
      const matchBot = t.chatbot?.name?.toLowerCase().includes(q);
      return matchSub || matchDesc || matchClient || matchAdmin || matchEmail || matchBot;
    }
    return true;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT COLUMN: Ticket List */}
      <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col h-[750px]">
        {/* Search and Filters */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user complaints, client notes, bot..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
            {[
              { id: "ALL", label: "All" },
              { id: "OPEN", label: "Open" },
              { id: "ESCALATED", label: "Escalated" },
              { id: "RECTIFIED", label: "Rectified" },
              { id: "RESOLVED", label: "Resolved" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 ${
                  statusFilter === f.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tickets List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredTickets.length === 0 ? (
            <div className="text-center py-16 space-y-2 text-slate-400 p-4">
              <HelpCircle className="h-8 w-8 mx-auto opacity-40" />
              <p className="text-xs font-semibold">No feedback tickets found</p>
              <p className="text-[11px] text-slate-500">
                Visitor feedback and complaints will show up here automatically.
              </p>
            </div>
          ) : (
            filteredTickets.map((ticket) => {
              const isSelected = selectedTicket?.id === ticket.id;
              const cat = CATEGORY_MAP[ticket.category] || CATEGORY_MAP.GENERAL_FEEDBACK;
              const isEscalated = ticket.status === "ESCALATED_TO_ADMIN" || ticket.escalatedToAdmin;
              const isRectified = ticket.status === "RECTIFIED";
              const isResolved = ticket.status === "RESOLVED" || ticket.status === "CLOSED";

              return (
                <div
                  key={ticket.id}
                  onClick={() => handleSelectTicket(ticket)}
                  className={`p-4 cursor-pointer transition-all space-y-2 ${
                    isSelected
                      ? "bg-indigo-50/50 dark:bg-indigo-950/30 border-l-4 border-indigo-600"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ticket.chatbot?.primaryColor || "#6366f1" }} />
                      <span className="text-[11px] font-semibold text-slate-500 truncate">
                        {ticket.chatbot?.name || "Chatbot"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isRectified ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          ✨ Rectified
                        </span>
                      ) : isResolved ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ✅ Resolved
                        </span>
                      ) : isEscalated ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                          🚀 Escalated
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          ⏳ Open
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                    {ticket.subject}
                  </p>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {ticket.description}
                  </p>

                  {ticket.clientFeedback && (
                    <div className="p-1.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-[10px] text-indigo-900 dark:text-indigo-300 line-clamp-1">
                      <span className="font-bold">Client Note:</span> {ticket.clientFeedback}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span className="inline-flex items-center gap-1">
                      <cat.icon className="h-3 w-3" />
                      {cat.label}
                    </span>
                    <span>{formatRelativeTime(new Date(ticket.createdAt))}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: 3-Tier Lifecycle Resolution Workspace */}
      <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col h-[750px]">
        {selectedTicket ? (
          <div className="flex flex-col h-full overflow-y-auto">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    Bot: {selectedTicket.chatbot?.name}
                  </span>
                  {selectedTicket.userEmail && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      User: {selectedTicket.userEmail}
                    </span>
                  )}
                  {selectedTicket.escalatedToAdmin && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                      🚀 Escalated to Platform Admin
                    </span>
                  )}
                </div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white pt-1">
                  {selectedTicket.subject}
                </h2>
                <p className="text-[11px] text-slate-400">
                  Submitted {new Date(selectedTicket.createdAt).toLocaleString()} • Visitor ID: {selectedTicket.visitorId.slice(0, 16)}...
                </p>
              </div>

              <button
                onClick={() => handleDeleteTicket(selectedTicket.id)}
                className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all shrink-0"
                title="Delete Ticket"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Workflow Container */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              
              {/* TIER 1: End-User (Visitor) Submission */}
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-xs">
                      <User className="h-3.5 w-3.5" />
                    </div>
                    <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                      Tier 1 • Chatbot Visitor Feedback
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Category: {CATEGORY_MAP[selectedTicket.category]?.label || selectedTicket.category}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {selectedTicket.description}
                </div>

                {selectedTicket.attachedContext && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <FileText className="h-3 w-3" /> Attached Sanitized Conversation Snippet:
                    </span>
                    <pre className="p-3 rounded-xl bg-slate-900 text-slate-200 text-[11px] leading-relaxed overflow-x-auto max-h-36 font-mono whitespace-pre-wrap">
                      {selectedTicket.attachedContext}
                    </pre>
                  </div>
                )}
              </div>

              {/* TIER 2: Client Review & Feedback (Chatbot / Workspace Owner) */}
              <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs">
                      <Building2 className="h-3.5 w-3.5" />
                    </div>
                    <h3 className="font-bold text-xs text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
                      Tier 2 • Client Review &amp; Escalation Notes
                    </h3>
                  </div>
                  {selectedTicket.clientReviewedAt && (
                    <span className="text-[10px] text-slate-400">
                      Reviewed on {new Date(selectedTicket.clientReviewedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {isAdmin
                    ? "Notes added by the client/workspace owner regarding what needs fixing or training adjustment."
                    : "Review the visitor's issue above. Add your own client feedback or explanation, then escalate to platform engineering or resolve directly."}
                </p>

                <textarea
                  rows={3}
                  value={clientFeedbackText}
                  onChange={(e) => setClientFeedbackText(e.target.value)}
                  placeholder={
                    isAdmin
                      ? "Client has not appended notes yet..."
                      : "Add your client feedback (e.g. 'Bot misquoted refund window from 14 days to 30 days. Please update prompt / custom rule')..."
                  }
                  className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
                />

                {/* Client Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={() =>
                      handleUpdateTicket({
                        newStatus: "REVIEWED_BY_CLIENT",
                        escalate: false,
                      })
                    }
                    disabled={isUpdating}
                    className="py-2 px-3 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    Save Client Notes
                  </button>

                  <button
                    onClick={() =>
                      handleUpdateTicket({
                        newStatus: "ESCALATED_TO_ADMIN",
                        escalate: true,
                      })
                    }
                    disabled={isUpdating}
                    className="py-2 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Escalate to Platform Admin</span>
                  </button>

                  <button
                    onClick={() =>
                      handleUpdateTicket({
                        newStatus: "RESOLVED",
                        escalate: false,
                      })
                    }
                    disabled={isUpdating}
                    className="py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    Directly Resolve (Client Fix)
                  </button>
                </div>
              </div>

              {/* TIER 3: Platform Admin Rectification */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-500 text-white font-bold text-xs">
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </div>
                    <h3 className="font-bold text-xs text-white uppercase tracking-wider">
                      Tier 3 • Platform Admin Rectification
                    </h3>
                  </div>
                  {selectedTicket.resolvedAt && (
                    <span className="text-[10px] text-emerald-400 font-medium">
                      Rectified &amp; Resolved
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400">
                  {isAdmin
                    ? "Enter system prompt adjustments, knowledge updates, or engineering fixes. This resolution note will be broadcasted to the client and the visitor."
                    : "Platform engineering resolution fix and response."}
                </p>

                <textarea
                  rows={3}
                  disabled={!isAdmin && !selectedTicket.adminResponse}
                  value={adminResponseText}
                  onChange={(e) => setAdminResponseText(e.target.value)}
                  placeholder={
                    isAdmin
                      ? "Explain what was rectified (e.g. 'Updated vector chunk weights and tuned refund policy prompt to enforce 14-day policy. Verified via live test.')..."
                      : "Awaiting Platform Admin rectification response..."
                  }
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500 disabled:opacity-60"
                />

                {/* Admin Actions */}
                {isAdmin && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      onClick={() =>
                        handleUpdateTicket({
                          newStatus: "RECTIFIED",
                        })
                      }
                      disabled={isUpdating || !adminResponseText.trim()}
                      className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      <span>Rectify &amp; Broadcast Fix</span>
                    </button>

                    <button
                      onClick={() =>
                        handleUpdateTicket({
                          newStatus: "RESOLVED",
                        })
                      }
                      disabled={isUpdating}
                      className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all disabled:opacity-50"
                    >
                      Mark Resolved
                    </button>

                    <button
                      onClick={() =>
                        handleUpdateTicket({
                          newStatus: "IN_PROGRESS",
                        })
                      }
                      disabled={isUpdating}
                      className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all disabled:opacity-50"
                    >
                      Set In Progress
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400 space-y-2">
            <HelpCircle className="h-10 w-10 opacity-30" />
            <p className="font-semibold text-sm">Select a ticket from the left column to review</p>
            <p className="text-xs text-slate-500 max-w-sm">
              You will be able to inspect user queries, append client notes, and track platform admin rectifications.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TicketResolutionTable;
