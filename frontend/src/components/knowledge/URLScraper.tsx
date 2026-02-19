"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe, Loader2, CheckCircle } from "lucide-react";

interface Props {
  chatbotId: string;
}

const PAGE_OPTIONS = [
  { label: "1 page (single URL)",   value: 1   },
  { label: "10 pages",              value: 10  },
  { label: "25 pages",              value: 25  },
  { label: "50 pages (recommended)", value: 50 },
  { label: "100 pages",             value: 100 },
  { label: "200 pages (large site)", value: 200 },
];

export function URLScraper({ chatbotId }: Props) {
  const [url, setUrl]           = useState("");
  const [maxPages, setMaxPages] = useState(50);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [pagesInfo, setPagesInfo] = useState("");
  const [error, setError]       = useState("");

  const handleScrape = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setDone(false);

    try {
      const res = await fetch("/api/knowledge/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatbotId, url, maxPages }),
      });

      if (res.ok) {
        setDone(true);
        setPagesInfo(`Crawling up to ${maxPages} page${maxPages === 1 ? "" : "s"} — this may take a few minutes.`);
        setUrl("");
        setTimeout(() => setDone(false), 8000);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to start crawl. Please check the URL and try again.");
      }
    } catch {
      setError("Failed to start crawl. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border rounded-xl p-6 space-y-4">
      <div className="space-y-2">
        <Label>Website URL</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="url"
              placeholder="https://yourwebsite.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="pl-9"
              onKeyDown={(e) => e.key === "Enter" && handleScrape()}
            />
          </div>
          <Button onClick={handleScrape} disabled={loading || !url.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crawl"}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Pages to crawl</Label>
        <div className="grid grid-cols-3 gap-2">
          {PAGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMaxPages(opt.value)}
              className={`text-xs px-3 py-2 rounded-lg border transition-colors ${
                maxPages === opt.value
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400">
          {maxPages === 1
            ? "Only the exact URL will be scraped."
            : `The crawler will follow internal links and scrape up to ${maxPages} pages across the whole site.`}
        </p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {done && (
        <div className="flex items-start gap-2 text-green-600 text-sm bg-green-50 px-3 py-2 rounded-lg">
          <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{pagesInfo}</span>
        </div>
      )}

      <div className="text-xs text-gray-500 space-y-1">
        <p>• Follows all internal links automatically — no need to enter every page</p>
        <p>• Skips images, PDFs, CSS, JS and other non-content files</p>
        <p>• JavaScript-rendered pages (React/Vue SPAs) may not scrape completely</p>
        <p>• Estimated time: ~{Math.ceil(maxPages / 5)}–{Math.ceil(maxPages / 3)} seconds for {maxPages} pages</p>
      </div>
    </div>
  );
}
