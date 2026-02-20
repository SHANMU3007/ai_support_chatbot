"use client";

import { useState, useEffect, useCallback } from "react";
import { Document } from "@/types/chatbot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trash2,
  RefreshCw,
  FileText,
  Globe,
  HelpCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface Props {
  documents: Document[];
  chatbotId: string;
}

const typeConfig = (type: Document["type"]) => {
  switch (type) {
    case "URL":
      return {
        icon: Globe,
        color: "text-blue-500",
        bg: "bg-blue-50",
        label: "URL",
      };
    case "FAQ":
      return {
        icon: HelpCircle,
        color: "text-purple-500",
        bg: "bg-purple-50",
        label: "FAQ",
      };
    case "PDF":
      return {
        icon: FileText,
        color: "text-red-500",
        bg: "bg-red-50",
        label: "PDF",
      };
    default:
      return {
        icon: FileText,
        color: "text-gray-500",
        bg: "bg-gray-50",
        label: type,
      };
  }
};

const statusConfig = (status: Document["status"]) => {
  switch (status) {
    case "DONE":
      return {
        variant: "default" as const,
        label: "Ready",
        icon: CheckCircle2,
        color: "text-green-600",
        bg: "bg-green-50 border-green-200",
        spin: false,
      };
    case "FAILED":
      return {
        variant: "destructive" as const,
        label: "Failed",
        icon: XCircle,
        color: "text-red-600",
        bg: "bg-red-50 border-red-200",
        spin: false,
      };
    case "PROCESSING":
      return {
        variant: "secondary" as const,
        label: "Processing",
        icon: Loader2,
        color: "text-amber-600",
        bg: "bg-amber-50 border-amber-200",
        spin: true,
      };
    default:
      return {
        variant: "secondary" as const,
        label: "Pending",
        icon: Clock,
        color: "text-gray-500",
        bg: "bg-gray-50 border-gray-200",
        spin: true,
      };
  }
};

const isActive = (doc: Document) =>
  doc.status === "PENDING" || doc.status === "PROCESSING";

export function DocumentList({
  documents: initialDocs,
  chatbotId,
}: Props) {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>(initialDocs);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    setDocuments(initialDocs);
  }, [initialDocs]);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/knowledge/status?chatbotId=${chatbotId}`
      );
      if (res.ok) {
        const fresh: Document[] = await res.json();
        setDocuments(fresh);
      }
    } catch {
      /* ignore */
    }
  }, [chatbotId]);

  useEffect(() => {
    if (!documents.some(isActive)) return;
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [documents, poll]);

  const handleDelete = async (docId: string) => {
    if (
      !confirm(
        "Delete this document? This will also remove it from the knowledge base."
      )
    )
      return;
    setDeleting(docId);
    try {
      await fetch(`/api/knowledge/${docId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeleting(null);
    }
  };

  // Summary stats
  const totalChunks = documents.reduce(
    (sum, doc) => sum + (doc.chunkCount || 0),
    0
  );
  const doneCount = documents.filter((d) => d.status === "DONE").length;
  const processingCount = documents.filter(isActive).length;

  if (documents.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
        <Layers className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No documents yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Upload files, add FAQ pairs, or scrape URLs to train your chatbot.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-gray-500">Total:</span>{" "}
            <span className="font-semibold text-gray-800">
              {documents.length} document{documents.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Chunks:</span>{" "}
            <span className="font-semibold text-gray-800">{totalChunks}</span>
          </div>
          <div>
            <span className="text-gray-500">Ready:</span>{" "}
            <span className="font-semibold text-green-600">{doneCount}</span>
          </div>
          {processingCount > 0 && (
            <div className="flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 text-amber-500 animate-spin" />
              <span className="text-amber-600 font-medium">
                {processingCount} processing
              </span>
            </div>
          )}
        </div>
        <div className="ml-auto">
          <Button
            size="sm"
            variant="ghost"
            onClick={poll}
            className="text-gray-400 hover:text-gray-600"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Document Cards */}
      <div className="space-y-3">
        {documents.map((doc) => {
          const type = typeConfig(doc.type);
          const status = statusConfig(doc.status);
          const Icon = type.icon;
          const StatusIcon = status.icon;

          return (
            <div
              key={doc.id}
              className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all group"
            >
              <div
                className={`w-11 h-11 rounded-xl ${type.bg} flex items-center justify-center flex-shrink-0`}
              >
                <Icon className={`h-5 w-5 ${type.color}`} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-800 truncate">
                  {doc.name}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge
                    variant="outline"
                    className="text-[10px] px-2 py-0 rounded-md"
                  >
                    {type.label}
                  </Badge>
                  <div
                    className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border ${status.bg}`}
                  >
                    <StatusIcon
                      className={`h-3 w-3 ${status.color} ${
                        status.spin ? "animate-spin" : ""
                      }`}
                    />
                    <span className={`font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  {doc.chunkCount > 0 && (
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      {doc.chunkCount} chunks
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-gray-400 hidden sm:block">
                  {formatRelativeTime(doc.createdAt)}
                </span>
                {doc.status === "FAILED" && (
                  <Button size="sm" variant="ghost" title="Retry" onClick={poll}>
                    <RefreshCw className="h-4 w-4 text-amber-500" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-gray-400 hover:text-red-500 hover:bg-red-50"
                  disabled={deleting === doc.id}
                  onClick={() => handleDelete(doc.id)}
                >
                  {deleting === doc.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
