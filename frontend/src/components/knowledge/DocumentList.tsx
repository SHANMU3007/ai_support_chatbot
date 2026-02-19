"use client";

import { useState } from "react";
import { Document } from "@/types/chatbot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, RefreshCw, FileText, Globe, FileQuestion } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface Props {
  documents: Document[];
  chatbotId: string;
}

const typeIcon = (type: Document["type"]) => {
  switch (type) {
    case "URL":
      return Globe;
    case "FAQ":
      return FileQuestion;
    default:
      return FileText;
  }
};

export function DocumentList({ documents, chatbotId }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (docId: string) => {
    if (!confirm("Delete this document? This will also remove it from the knowledge base.")) return;
    setDeleting(docId);
    try {
      await fetch(`/api/knowledge/${docId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeleting(null);
    }
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm border rounded-xl bg-gray-50">
        No documents yet. Upload files or add FAQ pairs.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => {
        const Icon = typeIcon(doc.type);
        return (
          <div
            key={doc.id}
            className="bg-white border rounded-xl p-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Icon className="h-5 w-5 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-800 truncate">{doc.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {doc.type}
                </Badge>
                <Badge
                  variant={doc.status === "DONE" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {doc.status}
                </Badge>
                {doc.chunkCount > 0 && (
                  <span className="text-xs text-gray-400">{doc.chunkCount} chunks</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 hidden sm:block">
                {formatRelativeTime(doc.createdAt)}
              </span>
              {doc.status === "FAILED" && (
                <Button size="sm" variant="ghost" title="Retry">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:text-red-700"
                disabled={deleting === doc.id}
                onClick={() => handleDelete(doc.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
