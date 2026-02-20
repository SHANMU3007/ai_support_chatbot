"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Globe,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
} from "lucide-react";

interface Props {
  chatbotId: string;
}

const PAGE_OPTIONS = [
  { label: "1 page",   value: 1,   desc: "Single URL only" },
  { label: "10 pages", value: 10,  desc: "Small site" },
  { label: "25 pages", value: 25,  desc: "Medium site" },
  { label: "50 pages", value: 50,  desc: "Recommended" },
  { label: "100 pages", value: 100, desc: "Large site" },
  { label: "200 pages", value: 200, desc: "Full crawl" },
];

type CrawlStatus = "idle" | "starting" | "crawling" | "done" | "error";

export function URLScraper({ chatbotId }: Props) {
  const [url, setUrl] = useState("");
  const [maxPages, setMaxPages] = useState(50);
  const [status, setStatus] = useState<CrawlStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Timer for elapsed time
  useEffect(() => {
    if (status === "crawling" || status === "starting") {
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  // Poll for document status
  useEffect(() => {
    if (!documentId || status === "done" || status === "error") {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/knowledge/status?chatbotId=${chatbotId}`);
        if (res.ok) {
          const docs = await res.json();
          const doc = docs.find((d: any) => d.id === documentId);
          if (doc) {
            if (doc.status === "DONE") {
              setStatus("done");
              setStatusMessage(
                `✅ Successfully crawled and processed! ${doc.chunkCount} knowledge chunks created.`
              );
            } else if (doc.status === "FAILED") {
              setStatus("error");
              setError("Crawling failed. The site may be blocking bots or is unreachable.");
            } else if (doc.status === "PROCESSING") {
              setStatus("crawling");
              setStatusMessage("Crawling pages and extracting content...");
            }
          }
        }
      } catch {
        // Ignore polling errors
      }
    };

    pollRef.current = setInterval(checkStatus, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [documentId, chatbotId, status]);

  const handleScrape = async () => {
    if (!url.trim()) return;

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setError("Please enter a valid URL (e.g., https://example.com)");
      return;
    }

    setStatus("starting");
    setError("");
    setStatusMessage("Sending crawl request...");
    setDocumentId(null);

    try {
      const res = await fetch("/api/knowledge/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatbotId, url, maxPages }),
      });

      if (res.ok) {
        const data = await res.json();
        setDocumentId(data.id);
        setStatus("crawling");
        setStatusMessage(
          `Crawling up to ${maxPages} page${maxPages === 1 ? "" : "s"} from ${url}...`
        );
        setUrl("");
      } else {
        const data = await res.json().catch(() => ({}));
        setStatus("error");
        setError(
          data.error || "Failed to start crawl. Please check the URL and try again."
        );
      }
    } catch {
      setStatus("error");
      setError("Network error. Is the server running?");
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const resetState = () => {
    setStatus("idle");
    setStatusMessage("");
    setError("");
    setDocumentId(null);
    setElapsed(0);
  };

  return (
    <div className="space-y-5">
      {/* URL Input */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5 shadow-sm">
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-700">Website URL</Label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="url"
                placeholder="https://yourwebsite.com"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) setError("");
                }}
                className="pl-10 h-11 rounded-xl border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                onKeyDown={(e) => e.key === "Enter" && handleScrape()}
                disabled={status === "crawling" || status === "starting"}
              />
            </div>
            <Button
              onClick={handleScrape}
              disabled={
                status === "crawling" ||
                status === "starting" ||
                !url.trim()
              }
              className="h-11 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 shadow-md shadow-indigo-500/25 transition-all"
            >
              {status === "crawling" || status === "starting" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Crawl
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Page Options */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-gray-700">
            Pages to crawl
          </Label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {PAGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setMaxPages(opt.value)}
                disabled={status === "crawling" || status === "starting"}
                className={`text-xs px-3 py-2.5 rounded-xl border-2 transition-all font-medium ${
                  maxPages === opt.value
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/25 scale-[1.02]"
                    : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            {maxPages === 1
              ? "Only the exact URL will be scraped."
              : `The crawler follows internal links and scrapes up to ${maxPages} pages across the whole site.`}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 text-red-600 text-sm bg-red-50 border border-red-200 px-4 py-3 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Crawl Failed</p>
            <p className="text-red-500 mt-0.5">{error}</p>
          </div>
          <button
            onClick={resetState}
            className="ml-auto text-xs text-red-400 hover:text-red-600 underline flex-shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Progress */}
      {(status === "crawling" || status === "starting") && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Crawling in Progress</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-indigo-500">
              <Clock className="h-3.5 w-3.5" />
              {formatTime(elapsed)}
            </div>
          </div>
          <p className="text-sm text-indigo-600">{statusMessage}</p>
          <div className="w-full bg-indigo-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-1000"
              style={{
                width: "100%",
                animation: "pulse 2s ease-in-out infinite",
              }}
            />
          </div>
          <p className="text-xs text-indigo-400">
            This may take a few minutes depending on the site size. You can navigate
            away — processing continues in the background.
          </p>
        </div>
      )}

      {/* Success */}
      {status === "done" && (
        <div className="flex items-start gap-3 text-green-700 text-sm bg-green-50 border border-green-200 px-4 py-3 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Crawl Complete!</p>
            <p className="text-green-600 mt-0.5">{statusMessage}</p>
            <p className="text-green-500 text-xs mt-1">
              Completed in {formatTime(elapsed)}. Your chatbot can now answer
              questions from this website.
            </p>
          </div>
          <button
            onClick={resetState}
            className="ml-auto text-xs text-green-400 hover:text-green-600 underline flex-shrink-0"
          >
            Done
          </button>
        </div>
      )}

      {/* Tips */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          How it works
        </p>
        <div className="text-xs text-gray-500 space-y-1.5">
          <p className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
            Follows all internal links automatically — no need to enter every page
          </p>
          <p className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
            Skips images, PDFs, CSS, JS and other non-content files
          </p>
          <p className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
            Content is chunked and embedded for AI-powered Q&A
          </p>
          <p className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
            JavaScript-rendered pages (React/Vue SPAs) may not scrape completely
          </p>
        </div>
      </div>
    </div>
  );
}
