"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Progress } from "@/components/ui/progress";
import { Upload, File, CheckCircle, XCircle } from "lucide-react";

interface Props {
  chatbotId: string;
}

interface UploadState {
  name: string;
  progress: number;
  status: "uploading" | "done" | "error";
}

export function DocumentUploader({ chatbotId }: Props) {
  const [uploads, setUploads] = useState<UploadState[]>([]);

  const uploadFile = async (file: File) => {
    setUploads((prev) => [
      ...prev,
      { name: file.name, progress: 0, status: "uploading" },
    ]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("chatbotId", chatbotId);

      const res = await fetch("/api/knowledge/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      setUploads((prev) =>
        prev.map((u) =>
          u.name === file.name ? { ...u, progress: 100, status: "done" } : u
        )
      );
    } catch {
      setUploads((prev) =>
        prev.map((u) =>
          u.name === file.name ? { ...u, status: "error" } : u
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
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxSize: 20 * 1024 * 1024, // 20MB
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-indigo-400 bg-indigo-50"
            : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
        <p className="font-medium text-gray-700 mb-1">
          {isDragActive ? "Drop files here" : "Drag & drop files here"}
        </p>
        <p className="text-sm text-gray-400">
          PDF, TXT, DOCX up to 20MB each
        </p>
        <button className="mt-4 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
          Or click to browse
        </button>
      </div>

      {uploads.length > 0 && (
        <div className="space-y-3">
          {uploads.map((upload, i) => (
            <div key={i} className="bg-white border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <File className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{upload.name}</p>
                  {upload.status === "uploading" && (
                    <Progress value={upload.progress} className="mt-2 h-1.5" />
                  )}
                  {upload.status === "done" && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Uploaded — processing in background
                    </p>
                  )}
                  {upload.status === "error" && (
                    <p className="text-xs text-red-500 mt-1">Upload failed</p>
                  )}
                </div>
                {upload.status === "done" && (
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                )}
                {upload.status === "error" && (
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
