"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Trash2,
  Send,
  CheckCircle,
  Loader2,
  Sparkles,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

interface Props {
  chatbotId: string;
}

type SaveStatus = "idle" | "saving" | "processing" | "saved" | "error";

export function FAQEditor({ chatbotId }: Props) {
  const [faqs, setFaqs] = useState<FAQ[]>([
    { id: "1", question: "", answer: "" },
  ]);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [chunkCount, setChunkCount] = useState(0);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Poll for processing status
  useEffect(() => {
    if (!documentId || status !== "processing") {
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
        const doc = docs.find((d: any) => d.id === documentId);
        if (doc) {
          if (doc.status === "DONE") {
            setStatus("saved");
            setChunkCount(doc.chunkCount || 0);
          } else if (doc.status === "FAILED") {
            setStatus("error");
            setErrorMsg("FAQ processing failed. Please try again.");
          }
        }
      } catch {
        /* ignore */
      }
    };

    pollRef.current = setInterval(check, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [documentId, chatbotId, status]);

  const addFAQ = () => {
    setFaqs((prev) => [
      ...prev,
      { id: Date.now().toString(), question: "", answer: "" },
    ]);
  };

  const removeFAQ = (id: string) => {
    setFaqs((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFAQ = (
    id: string,
    field: "question" | "answer",
    value: string
  ) => {
    setFaqs((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  const validFaqCount = faqs.filter(
    (f) => f.question.trim() && f.answer.trim()
  ).length;

  const handleSave = async () => {
    const valid = faqs.filter((f) => f.question.trim() && f.answer.trim());
    if (!valid.length) return;

    setStatus("saving");
    setErrorMsg("");
    setDocumentId(null);

    try {
      const res = await fetch("/api/knowledge/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatbotId, faqs: valid }),
      });

      if (res.ok) {
        const data = await res.json();
        setDocumentId(data.id);
        setStatus("processing");
        setFaqs([{ id: "1", question: "", answer: "" }]);
      } else {
        const errData = await res.json().catch(() => ({}));
        setStatus("error");
        setErrorMsg(errData.error || "Failed to save FAQs.");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Is the server running?");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-xl p-4">
        <HelpCircle className="h-5 w-5 text-indigo-400 flex-shrink-0" />
        <p>
          Add question-answer pairs below. Your chatbot will use these to answer
          customer questions accurately. The more FAQs you add, the smarter your
          bot becomes!
        </p>
      </div>

      {faqs.map((faq, index) => (
        <div
          key={faq.id}
          className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-sm hover:shadow-md transition-all animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                {index + 1}
              </div>
              <span className="text-sm font-semibold text-gray-600">
                FAQ #{index + 1}
              </span>
            </div>
            {faqs.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFAQ(faq.id)}
                className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Question
            </Label>
            <Input
              placeholder="e.g., What are your business hours?"
              value={faq.question}
              onChange={(e) => updateFAQ(faq.id, "question", e.target.value)}
              className="rounded-xl border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Answer</Label>
            <Textarea
              placeholder="e.g., We're open Monday to Friday, 9am to 5pm EST."
              value={faq.answer}
              onChange={(e) => updateFAQ(faq.id, "answer", e.target.value)}
              rows={3}
              className="rounded-xl border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all resize-none"
            />
          </div>
        </div>
      ))}

      {/* Status Messages */}
      {status === "processing" && (
        <div className="flex items-center gap-3 text-amber-700 text-sm bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <Sparkles className="h-4 w-4 animate-pulse flex-shrink-0" />
          <p>
            Processing FAQs into knowledge base... This happens in the
            background.
          </p>
        </div>
      )}

      {status === "saved" && (
        <div className="flex items-center gap-3 text-green-700 text-sm bg-green-50 border border-green-200 px-4 py-3 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">FAQs Saved & Trained!</p>
            <p className="text-green-600 text-xs mt-0.5">
              {chunkCount} knowledge chunks created. Your chatbot can now answer
              these questions.
            </p>
          </div>
          <button
            onClick={() => setStatus("idle")}
            className="ml-auto text-xs text-green-400 hover:text-green-600 underline flex-shrink-0"
          >
            Done
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center gap-3 text-red-600 text-sm bg-red-50 border border-red-200 px-4 py-3 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p>{errorMsg}</p>
          <button
            onClick={() => {
              setStatus("idle");
              setErrorMsg("");
            }}
            className="ml-auto text-xs text-red-400 hover:text-red-600 underline flex-shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-1">
        <Button
          variant="outline"
          onClick={addFAQ}
          className="rounded-xl border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Another FAQ
        </Button>
        <div className="flex-1" />
        {validFaqCount > 0 && (
          <span className="text-xs text-gray-400">
            {validFaqCount} valid FAQ{validFaqCount !== 1 ? "s" : ""}
          </span>
        )}
        <Button
          onClick={handleSave}
          disabled={
            status === "saving" || status === "processing" || validFaqCount === 0
          }
          className="rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 shadow-md shadow-indigo-500/25 transition-all"
        >
          {status === "saving" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : status === "processing" ? (
            <>
              <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
              Processing...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Save & Train
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
