"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  File,
  CheckCircle,
  XCircle,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react";

interface Props {
  chatbotId: string;
}

interface UploadState {
  name: string;
  progress: number;
  status: "uploading" | "processing" | "done" | "error";
  documentId?: string;
  chunkCount?: number;
  errorMsg?: string;
}

export function DocumentUploader({ chatbotId }: Props) {
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Poll for processing status
  useEffect(() => {
    const processingDocs = uploads.filter(
      (u) => u.status === "processing" && u.documentId
    );
    if (processingDocs.length === 0) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    const check = async () => {
      try {
        const res = await fetch(
          `/api/knowledge/status?chatbotId=${chatbotId}`
        );
        if (!res.ok) return;
        const docs = await res.json();

        setUploads((prev) =>
          prev.map((u) => {
            if (u.status !== "processing" || !u.documentId) return u;
            const doc = docs.find((d: any) => d.id === u.documentId);
            if (!doc) return u;
            if (doc.status === "DONE") {
              return {
                ...u,
                status: "done" as const,
                progress: 100,
                chunkCount: doc.chunkCount,
              };
            }
            if (doc.status === "FAILED") {
              return {
                ...u,
                status: "error" as const,
                errorMsg: "Processing failed. Please try uploading again.",
              };
            }
            return u;
          })
        );
      } catch {
        /* ignore */
      }
    };

    pollRef.current = setInterval(check, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [uploads, chatbotId]);

  const uploadFile = async (file: File) => {
    const id = `${file.name}-${Date.now()}`;
    setUploads((prev) => [
      { name: file.name, progress: 0, status: "uploading" },
      ...prev,
    ]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("chatbotId", chatbotId);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploads((prev) =>
          prev.map((u) =>
            u.name === file.name && u.status === "uploading"
              ? { ...u, progress: Math.min(u.progress + 15, 90) }
              : u
          )
        );
      }, 200);

      const res = await fetch("/api/knowledge/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Upload failed");
      }

      const data = await res.json();

      setUploads((prev) =>
        prev.map((u) =>
          u.name === file.name && u.status === "uploading"
            ? {
                ...u,
                progress: 100,
                status: "processing" as const,
                documentId: data.id,
              }
            : u
        )
      );
    } catch (err) {
      setUploads((prev) =>
        prev.map((u) =>
          u.name === file.name && u.status === "uploading"
            ? {
                ...u,
                status: "error" as const,
                errorMsg:
                  err instanceof Error ? err.message : "Upload failed",
              }
            : u
        )
      );
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach(uploadFile);
    },
    [chatbotId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
    },
    maxSize: 20 * 1024 * 1024,
  });

  const removeUpload = (name: string) => {
    setUploads((prev) => prev.filter((u) => u.name !== name));
  };

  const statusInfo = (upload: UploadState) => {
    switch (upload.status) {
      case "uploading":
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />,
          text: `Uploading... ${upload.progress}%`,
          color: "text-indigo-600",
        };
      case "processing":
        return {
          icon: <Sparkles className="h-4 w-4 animate-pulse text-amber-500" />,
          text: "Processing & embedding content...",
          color: "text-amber-600",
        };
      case "done":
        return {
          icon: <CheckCircle className="h-4 w-4 text-green-500" />,
          text: `Done! ${upload.chunkCount || 0} knowledge chunks created`,
          color: "text-green-600",
        };
      case "error":
        return {
          icon: <XCircle className="h-4 w-4 text-red-500" />,
          text: upload.errorMsg || "Upload failed",
          color: "text-red-500",
        };
    }
  };

  return (
    <div className="space-y-5">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? "border-indigo-400 bg-indigo-50/80 scale-[1.01] shadow-lg shadow-indigo-500/10"
            : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50/80 hover:shadow-md"
        }`}
      >
        <input {...getInputProps()} />
        <div
          className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-colors ${
            isDragActive
              ? "bg-indigo-100 text-indigo-600"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          <Upload className="h-7 w-7" />
        </div>
        <p className="font-semibold text-gray-700 mb-1 text-base">
          {isDragActive ? "Drop files here!" : "Drag & drop files here"}
        </p>
        <p className="text-sm text-gray-400">
          PDF, TXT, DOCX up to 20MB each
        </p>
        <button className="mt-4 text-sm text-indigo-600 hover:text-indigo-800 font-semibold transition-colors">
          Or click to browse files
        </button>
      </div>

      {uploads.length > 0 && (
        <div className="space-y-3">
          {uploads.map((upload, i) => {
            const info = statusInfo(upload);
            return (
              <div
                key={`${upload.name}-${i}`}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      upload.status === "done"
                        ? "bg-green-50"
                        : upload.status === "error"
                        ? "bg-red-50"
                        : "bg-gray-50"
                    }`}
                  >
                    <FileText
                      className={`h-5 w-5 ${
                        upload.status === "done"
                          ? "text-green-500"
                          : upload.status === "error"
                          ? "text-red-400"
                          : "text-gray-400"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {upload.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {info.icon}
                      <span className={`text-xs ${info.color}`}>
                        {info.text}
                      </span>
                    </div>
                    {(upload.status === "uploading" ||
                      upload.status === "processing") && (
                      <Progress
                        value={
                          upload.status === "processing" ? 100 : upload.progress
                        }
                        className={`mt-2 h-1.5 ${
                          upload.status === "processing"
                            ? "[&>div]:animate-pulse"
                            : ""
                        }`}
                      />
                    )}
                  </div>
                  {(upload.status === "done" || upload.status === "error") && (
                    <button
                      onClick={() => removeUpload(upload.name)}
                      className="text-xs text-gray-400 hover:text-gray-600 p-1"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
