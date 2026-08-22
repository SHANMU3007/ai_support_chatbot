"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  LifeBuoy,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  MessageSquare,
  RefreshCw,
  FileCheck2,
  HelpCircle,
  Bug,
  ThumbsDown,
  Lightbulb,
} from "lucide-react";
import { sanitizeChatHistory } from "@/lib/privacy";

export interface TicketItem {
  id: string;
  category: string;
  subject: string;
  description: string;
  status: "OPEN" | "REVIEWED_BY_CLIENT" | "ESCALATED_TO_ADMIN" | "IN_PROGRESS" | "RECTIFIED" | "RESOLVED" | "CLOSED";
  clientFeedback?: string | null;
  escalatedToAdmin?: boolean;
  adminResponse?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatbotId: string;
  chatbotName: string;
  primaryColor: string;
  visitorId: string;
  recentMessages?: Array<{ role: string; content: string }>;
  onTicketsUpdated?: (tickets: TicketItem[]) => void;
}

const CATEGORIES = [
  { id: "INACCURATE_ANSWER", label: "Inaccurate Answer", icon: ThumbsDown, desc: "Bot gave wrong information" },
  { id: "COMPLAINT", label: "Complaint", icon: AlertCircle, desc: "Issue with service or response" },
  { id: "BUG_REPORT", label: "Bug Report", icon: Bug, desc: "Technical error or widget glitch" },
  { id: "FEATURE_REQUEST", label: "Suggestion", icon: Lightbulb, desc: "Idea for improvement" },
  { id: "GENERAL_FEEDBACK", label: "General Feedback", icon: MessageSquare, desc: "General thoughts or notes" },
];

export function FeedbackModal({
  isOpen,
  onClose,
  chatbotId,
  chatbotName,
  primaryColor,
  visitorId,
  recentMessages = [],
  onTicketsUpdated,
}: FeedbackModalProps) {
  const [activeTab, setActiveTab] = useState<"submit" | "tracking">("submit");
  const [category, setCategory] = useState("INACCURATE_ANSWER");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [attachContext, setAttachContext] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);

  // Fetch visitor's submitted tickets
  const fetchTickets = useCallback(async () => {
    if (!chatbotId || !visitorId) return;
    setIsLoadingTickets(true);
    try {
      const res = await fetch(`/api/feedback?botId=${chatbotId}&visitorId=${visitorId}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
        if (onTicketsUpdated) onTicketsUpdated(data.tickets || []);
      }
    } catch (err) {
      console.error("Error fetching tickets:", err);
    } finally {
      setIsLoadingTickets(false);
    }
  }, [chatbotId, visitorId, onTicketsUpdated]);

  useEffect(() => {
    if (isOpen) {
      fetchTickets();
    }
  }, [isOpen, fetchTickets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    try {
      const attachedSnippet = attachContext && recentMessages.length > 0
        ? sanitizeChatHistory(recentMessages)
        : null;

      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatbotId,
          visitorId,
          userEmail: userEmail.trim() || undefined,
          category,
          subject: subject.trim() || `${CATEGORIES.find(c => c.id === category)?.label || "Feedback"} - ${new Date().toLocaleDateString()}`,
          description: description.trim(),
          attachedContext: attachedSnippet,
        }),
      });

      if (res.ok) {
        setSubmittedSuccess(true);
        setDescription("");
        setSubject("");
        fetchTickets();
        setTimeout(() => {
          setSubmittedSuccess(false);
          setActiveTab("tracking");
        }, 1200);
      }
    } catch (err) {
      console.error("Failed to submit feedback:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const resolvedCount = tickets.filter((t) => t.status === "RESOLVED").length;
  const openCount = tickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div
            className="px-5 py-4 text-white flex items-center justify-between relative shadow-sm"
            style={{ backgroundColor: primaryColor || "#4f46e5" }}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/15 backdrop-blur-md">
                <LifeBuoy className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">Help & Feedback Center</h3>
                <p className="text-[11px] opacity-80 mt-0.5">Support for {chatbotName}</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 transition-all text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("submit")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "submit"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/60 dark:border-slate-700"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Send className="h-3.5 w-3.5" />
              Report Issue / Feedback
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tracking")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all relative ${
                activeTab === "tracking"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/60 dark:border-slate-700"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <FileCheck2 className="h-3.5 w-3.5" />
              Track Resolutions
              {resolvedCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {resolvedCount}
                </span>
              )}
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            {activeTab === "submit" ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Category Selection */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                    Issue Category
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2 ${
                            isSelected
                              ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 ring-1 ring-indigo-500/20"
                              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                          }`}
                        >
                          <Icon
                            className={`h-4 w-4 mt-0.5 shrink-0 ${
                              isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"
                            }`}
                          />
                          <div>
                            <p className="font-semibold text-xs leading-none">{cat.label}</p>
                            <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{cat.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Description Textarea */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                    Complaint or Details <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what was wrong, what went unexpected, or what we can fix..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white placeholder:text-slate-400"
                  />
                </div>

                {/* User Email (Optional) */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                    Email for updates <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white placeholder:text-slate-400"
                  />
                </div>

                {/* Enterprise Privacy Notice & Consent Toggle */}
                <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300 font-semibold text-[11px]">
                    <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Enterprise Privacy Protection</span>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Personal Identifiable Information (emails, cards, passwords) is automatically redacted. Admins only see issue details you choose to share.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={attachContext}
                      onChange={(e) => setAttachContext(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                    />
                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                      Attach recent sanitized chat snippet for diagnosis
                    </span>
                  </label>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !description.trim()}
                  className="w-full py-3 rounded-xl text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: primaryColor || "#4f46e5" }}
                >
                  {isSubmitting ? (
                    <span>Submitting...</span>
                  ) : submittedSuccess ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Submitted to Support!</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Send to Support & Admin</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Tracking Tab */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                    My Submissions & Fixes ({tickets.length})
                  </p>
                  <button
                    onClick={fetchTickets}
                    disabled={isLoadingTickets}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-all flex items-center gap-1 text-[11px]"
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoadingTickets ? "animate-spin" : ""}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {tickets.length === 0 ? (
                  <div className="text-center py-10 space-y-2 text-slate-400">
                    <HelpCircle className="h-8 w-8 mx-auto opacity-40" />
                    <p className="text-xs">No feedback or issues submitted yet.</p>
                    <p className="text-[11px] text-slate-500">
                      Use the &quot;Report Issue&quot; tab if you run into any troubles!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {tickets.map((t) => {
                      const isRectified = t.status === "RECTIFIED";
                      const isResolved = t.status === "RESOLVED" || t.status === "CLOSED";
                      const isEscalated = t.status === "ESCALATED_TO_ADMIN";
                      const isClientReviewed = t.status === "REVIEWED_BY_CLIENT";
                      const isInProgress = t.status === "IN_PROGRESS";

                      return (
                        <div
                          key={t.id}
                          className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                            isRectified || isResolved
                              ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60"
                              : isEscalated
                              ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/60"
                              : isInProgress || isClientReviewed
                              ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {t.subject}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 flex items-center gap-1 ${
                                isRectified || isResolved
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                                  : isEscalated
                                  ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200"
                                  : isClientReviewed || isInProgress
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300"
                              }`}
                            >
                              {isRectified || isResolved ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                  <span>Rectified &amp; Fixed</span>
                                </>
                              ) : isEscalated ? (
                                <>
                                  <Sparkles className="h-3 w-3 text-indigo-600" />
                                  <span>Escalated to Engineering</span>
                                </>
                              ) : isClientReviewed ? (
                                <>
                                  <Clock className="h-3 w-3 text-blue-600" />
                                  <span>Reviewed by Support</span>
                                </>
                              ) : isInProgress ? (
                                <>
                                  <Clock className="h-3 w-3 text-blue-600" />
                                  <span>Investigating</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3 w-3 text-amber-600" />
                                  <span>Sent to Support</span>
                                </>
                              )}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                            {t.description}
                          </p>

                          {/* Admin / Client Resolution Section */}
                          {t.adminResponse && (
                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-emerald-200 dark:border-emerald-900/80 space-y-1">
                              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold text-[10px]">
                                <Sparkles className="h-3 w-3" />
                                <span>Support &amp; Admin Rectification Note:</span>
                              </div>
                              <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                                {t.adminResponse}
                              </p>
                              {t.resolvedAt && (
                                <p className="text-[9px] text-slate-400">
                                  Rectified on {new Date(t.resolvedAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                            <span>Category: {t.category.replace("_", " ")}</span>
                            <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
