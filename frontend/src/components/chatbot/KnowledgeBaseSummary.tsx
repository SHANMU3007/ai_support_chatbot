"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Document } from "@/types/chatbot";

interface Props {
  chatbotId: string;
  initialDocuments: Document[];
}

const statusBadge = (status: Document["status"]) => {
  switch (status) {
    case "DONE":       return { variant: "default" as const,      label: "DONE",       spin: false };
    case "FAILED":     return { variant: "destructive" as const,  label: "FAILED",     spin: false };
    case "PROCESSING": return { variant: "secondary" as const,    label: "PROCESSING", spin: true  };
    default:           return { variant: "secondary" as const,    label: "PENDING",    spin: true  };
  }
};

const isActive = (doc: Document) => doc.status === "PENDING" || doc.status === "PROCESSING";

export function KnowledgeBaseSummary({ chatbotId, initialDocuments }: Props) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/knowledge/status?chatbotId=${chatbotId}`);
      if (res.ok) setDocuments(await res.json());
    } catch { /* ignore */ }
  }, [chatbotId]);

  useEffect(() => {
    if (!documents.some(isActive)) return;
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [documents, poll]);

  if (documents.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        No documents yet.{" "}
        <Link href={`/chatbot/${chatbotId}/training`} className="text-indigo-600 hover:underline">
          Add your first document
        </Link>
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {documents.map((doc) => {
        const badge = statusBadge(doc.status);
        return (
          <li key={doc.id} className="flex items-center justify-between text-sm">
            <span className="font-medium truncate max-w-xs">{doc.name}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant="outline" className="text-xs">{doc.type}</Badge>
              <Badge variant={badge.variant} className="text-xs flex items-center gap-1">
                {badge.spin && <Loader2 className="h-3 w-3 animate-spin" />}
                {badge.label}
              </Badge>
              {doc.chunkCount > 0 && (
                <span className="text-xs text-gray-400">{doc.chunkCount} chunks</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
