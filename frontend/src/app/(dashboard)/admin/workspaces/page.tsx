"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Search,
  Shield,
  Bot,
  FileText,
  MessageSquare,
  AlertCircle,
  RefreshCw,
  Eye,
  X,
  Calendar,
  Zap,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatbotDetail {
  id: string;
  name: string;
  businessName: string;
  isActive: boolean;
  language: string;
  createdAt: string;
  telegramToken: string | null;
  _count: {
    sessions: number;
    documents: number;
  };
}

interface UserItem {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "WORKSPACE";
  plan: "FREE" | "STARTER" | "PRO" | "ENTERPRISE";
  createdAt: string;
  chatbots: ChatbotDetail[];
  _count: {
    chatbots: number;
  };
  stats: {
    totalChatbots: number;
    totalDocuments: number;
    totalSessions: number;
    totalMessages: number;
    negativeSessions: number;
  };
}

interface DetailedWorkspace {
  id: string;
  name: string | null;
  email: string;
  role: string;
  plan: string;
  createdAt: string;
  chatbots: Array<{
    id: string;
    name: string;
    businessName: string;
    systemPrompt: string;
    welcomeMessage: string;
    language: string;
    isActive: boolean;
    telegramToken: string | null;
    documents: Array<{
      id: string;
      name: string;
      type: string;
      status: string;
      chunkCount: number;
      createdAt: string;
    }>;
    sessions: Array<{
      id: string;
      visitorId: string;
      needsFollowUp: boolean;
      sentimentReason: string | null;
      messages: Array<{
        id: string;
        role: string;
        content: string;
      }>;
    }>;
  }>;
}

export default function AdminWorkspacesPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Inspector Modal State
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [inspectorData, setInspectorData] = useState<DetailedWorkspace | null>(null);
  const [inspectorLoading, setInspectorLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/workspaces");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Failed to fetch workspaces:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateUser = async (userId: string, updates: { plan?: string; role?: string }) => {
    setUpdatingId(userId);
    try {
      const res = await fetch("/api/admin/workspaces", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...updates }),
      });
      if (res.ok) {
        await fetchUsers();
      }
    } catch (error) {
      console.error("Failed to update user:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  const inspectWorkspace = async (userId: string) => {
    setSelectedWorkspaceId(userId);
    setInspectorLoading(true);
    setInspectorData(null);
    try {
      const res = await fetch(`/api/admin/workspaces/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setInspectorData(data);
      }
    } catch (error) {
      console.error("Failed to fetch workspace inspection details:", error);
    } finally {
      setInspectorLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-indigo-600 font-bold">Platform Control Center</p>
          <h1 className="text-2xl font-bold mt-1 text-gray-900">Workspaces & Customer Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Complete platform oversight: inspect customer chatbots, uploaded documents, conversation volume, and subscription plans.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading} className="gap-2 self-start sm:self-auto">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Analytics
        </Button>
      </div>

      {/* Search Input */}
      <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
        <Search className="h-4 w-4 text-gray-400 ml-2" />
        <Input
          placeholder="Search by customer name, email, or chatbot details..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-none shadow-none focus-visible:ring-0 text-sm"
        />
      </div>

      {/* Workspaces Analytics Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <span className="font-semibold text-sm text-gray-900">Customer Workspaces ({filteredUsers.length})</span>
          <span className="text-xs text-gray-500">Live multi-tenant data sync</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">Loading workspace analytics...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">No matching workspaces found.</div>
        ) : (
          <div className="divide-y">
            {filteredUsers.map((user) => (
              <div key={user.id} className="p-6 space-y-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* User Profile */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 text-base">{user.name || user.email}</span>
                      {user.role === "ADMIN" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">
                          <Shield className="h-3 w-3" /> ADMIN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                          WORKSPACE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{user.email}</p>
                    <p className="text-[11px] text-gray-400">
                      Joined {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Usage Summary Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                    <div className="px-2">
                      <p className="text-[11px] text-gray-500 font-medium">Chatbots</p>
                      <p className="text-lg font-bold text-indigo-600 mt-0.5">{user.stats.totalChatbots}</p>
                    </div>
                    <div className="px-2">
                      <p className="text-[11px] text-gray-500 font-medium">Documents</p>
                      <p className="text-lg font-bold text-emerald-600 mt-0.5">{user.stats.totalDocuments}</p>
                    </div>
                    <div className="px-2">
                      <p className="text-[11px] text-gray-500 font-medium">Messages</p>
                      <p className="text-lg font-bold text-blue-600 mt-0.5">{user.stats.totalMessages}</p>
                    </div>
                    <div className="px-2">
                      <p className="text-[11px] text-gray-500 font-medium font-medium">Unhappy Sessions</p>
                      <p className={`text-lg font-bold mt-0.5 ${user.stats.negativeSessions > 0 ? "text-red-600" : "text-gray-700"}`}>
                        {user.stats.negativeSessions}
                      </p>
                    </div>
                  </div>

                  {/* Admin Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Plan Modifier */}
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                      {(["FREE", "STARTER", "PRO", "ENTERPRISE"] as const).map((p) => (
                        <button
                          key={p}
                          disabled={updatingId === user.id}
                          onClick={() => updateUser(user.id, { plan: p })}
                          className={`px-2 py-1 text-[11px] font-medium rounded-md transition-all ${
                            user.plan === p
                              ? "bg-white text-indigo-600 shadow-sm font-bold"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>

                    {/* Role Modifier */}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updatingId === user.id}
                      onClick={() => updateUser(user.id, { role: user.role === "ADMIN" ? "WORKSPACE" : "ADMIN" })}
                      className="text-xs"
                    >
                      {user.role === "ADMIN" ? "Demote Role" : "Promote Role"}
                    </Button>

                    {/* Inspect Workspace Modal Trigger */}
                    <Button
                      size="sm"
                      onClick={() => inspectWorkspace(user.id)}
                      className="text-xs gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      <Eye className="h-3.5 w-3.5" /> Inspect Workspace
                    </Button>
                  </div>
                </div>

                {/* List of Chatbots for this Customer Workspace */}
                {user.chatbots.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Created Chatbots ({user.chatbots.length}):
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {user.chatbots.map((cb) => (
                        <div key={cb.id} className="bg-white rounded-lg p-2.5 border text-xs flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">{cb.name}</p>
                            <p className="text-[10px] text-gray-500">{cb.businessName} • Lang: {cb.language.toUpperCase()}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cb.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                            {cb.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detailed Workspace Inspector Modal / Slide-over */}
      {selectedWorkspaceId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b bg-gray-50 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Admin Deep Inspection</p>
                <h2 className="text-xl font-bold text-gray-900 mt-0.5">
                  {inspectorData ? inspectorData.name || inspectorData.email : "Loading Workspace..."}
                </h2>
                {inspectorData && <p className="text-xs text-gray-500">{inspectorData.email} • Plan: {inspectorData.plan}</p>}
              </div>
              <button
                onClick={() => setSelectedWorkspaceId(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {inspectorLoading ? (
                <div className="p-12 text-center text-sm text-gray-500">
                  Fetching full workspace chatbots, knowledge documents, and session records...
                </div>
              ) : inspectorData ? (
                <>
                  {inspectorData.chatbots.length === 0 ? (
                    <div className="p-8 text-center text-sm text-gray-400">
                      This user has not created any chatbots yet.
                    </div>
                  ) : (
                    inspectorData.chatbots.map((cb) => (
                      <div key={cb.id} className="border rounded-xl p-5 space-y-4 bg-white">
                        <div className="flex items-center justify-between border-b pb-3">
                          <div>
                            <h3 className="font-bold text-base text-gray-900">{cb.name}</h3>
                            <p className="text-xs text-gray-500">Business: {cb.businessName} • Language: {cb.language.toUpperCase()}</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${cb.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                            {cb.isActive ? "Active Chatbot" : "Disabled"}
                          </span>
                        </div>

                        {/* System Prompt Snippet */}
                        <div className="bg-gray-50 p-3 rounded-lg border text-xs">
                          <p className="font-bold text-gray-700 mb-1">System Prompt Configuration:</p>
                          <p className="text-gray-600 italic whitespace-pre-wrap">{cb.systemPrompt}</p>
                        </div>

                        {/* Knowledge Documents List */}
                        <div>
                          <p className="font-bold text-xs text-gray-700 mb-2 flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5 text-emerald-600" />
                            Ingested Knowledge Documents ({cb.documents.length}):
                          </p>
                          {cb.documents.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">No documents uploaded.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {cb.documents.map((doc) => (
                                <div key={doc.id} className="bg-gray-50 border p-2.5 rounded-lg text-xs flex justify-between items-center">
                                  <div>
                                    <p className="font-semibold text-gray-900">{doc.name}</p>
                                    <p className="text-[10px] text-gray-500">{doc.type} • {doc.chunkCount} vector chunks</p>
                                  </div>
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                    {doc.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Chat Session Logs */}
                        <div>
                          <p className="font-bold text-xs text-gray-700 mb-2 flex items-center gap-1">
                            <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                            Recent Visitor Conversations ({cb.sessions.length}):
                          </p>
                          {cb.sessions.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">No visitor sessions yet.</p>
                          ) : (
                            <div className="space-y-2">
                              {cb.sessions.map((session) => (
                                <div key={session.id} className="border p-3 rounded-lg text-xs bg-gray-50 space-y-1.5">
                                  <div className="flex justify-between items-center">
                                    <span className="font-semibold text-gray-800">Visitor: {session.visitorId}</span>
                                    {session.needsFollowUp && (
                                      <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                        Unhappy Session
                                      </span>
                                    )}
                                  </div>
                                  {session.sentimentReason && (
                                    <p className="text-red-600 text-[11px] font-medium">
                                      Flag: {session.sentimentReason}
                                    </p>
                                  )}
                                  {session.messages.length > 0 && (
                                    <div className="space-y-1 pt-1 border-t">
                                      {session.messages.map((m) => (
                                        <p key={m.id} className="text-gray-600 text-[11px]">
                                          <strong className="text-gray-900">{m.role}:</strong> {m.content}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-gray-50 text-right">
              <Button onClick={() => setSelectedWorkspaceId(null)} variant="outline" size="sm">
                Close Inspection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
