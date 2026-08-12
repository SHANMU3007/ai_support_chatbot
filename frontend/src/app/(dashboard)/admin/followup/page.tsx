"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, MessageSquare, RefreshCw, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SessionItem {
  id: string;
  visitorId: string;
  sentiment: string | null;
  sentimentReason: string | null;
  needsFollowUp: boolean;
  updatedAt: string;
  chatbot: {
    id: string;
    name: string;
    businessName: string;
    user: {
      email: string;
      name: string | null;
    };
  };
  messages: Array<{
    id: string;
    role: string;
    content: string;
  }>;
}

export default function AdminFollowupPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFollowups = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/followup");
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (error) {
      console.error("Failed to fetch followups:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowups();
  }, []);

  const toggleStatus = async (sessionId: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/admin/followup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, needsFollowUp: !currentStatus }),
      });
      if (res.ok) {
        await fetchFollowups();
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const openCount = sessions.filter((s) => s.needsFollowUp).length;
  const resolvedCount = sessions.filter((s) => !s.needsFollowUp).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-red-600 font-bold">Platform Audit</p>
          <h1 className="text-2xl font-bold mt-1 text-gray-900">Sentiment Follow-up Queue</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review unhappy customer sessions flagged by Groq AI sentiment analysis across all customer workspaces.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchFollowups} disabled={loading} className="gap-2 self-start sm:self-auto">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Queue
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Needs Attention</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{openCount}</p>
          </div>
          <AlertCircle className="h-8 w-8 text-red-500 opacity-80" />
        </div>
        <div className="bg-white rounded-xl border p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Resolved Sessions</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{resolvedCount}</p>
          </div>
          <CheckCircle2 className="h-8 w-8 text-green-500 opacity-80" />
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 font-semibold text-sm text-gray-900">
          Flagged Customer Sessions ({sessions.length})
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">Loading audit queue...</div>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">
            No negative sentiment sessions reported across workspaces.
          </div>
        ) : (
          <div className="divide-y">
            {sessions.map((session) => (
              <div key={session.id} className="p-6 space-y-3 hover:bg-gray-50/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{session.chatbot.name}</span>
                    <span className="text-xs text-gray-400">({session.chatbot.businessName})</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      Owner: {session.chatbot.user.email}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {session.needsFollowUp ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                        Open Ticket
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        Resolved
                      </span>
                    )}

                    <Button
                      variant={session.needsFollowUp ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleStatus(session.id, session.needsFollowUp)}
                      className="text-xs"
                    >
                      {session.needsFollowUp ? "Mark as Resolved" : "Re-open Ticket"}
                    </Button>
                  </div>
                </div>

                {session.sentimentReason && (
                  <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg">
                    <strong>Groq Sentiment Analysis:</strong> {session.sentimentReason}
                  </p>
                )}

                {session.messages.length > 0 && (
                  <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1.5 border border-gray-100">
                    <p className="font-semibold text-gray-500">Recent Messages Snippet:</p>
                    {session.messages.map((m) => (
                      <div key={m.id} className="flex gap-2">
                        <span className="font-bold text-gray-700">{m.role}:</span>
                        <span className="text-gray-600">{m.content}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
