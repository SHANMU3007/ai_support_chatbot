
"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  FileText, 
  Search, 
  Filter, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  Bot, 
  Database, 
  AlignLeft, 
  Layers, 
  Calendar, 
  X, 
  RefreshCw,
  Eye,
  Globe,
  HelpCircle,
  FileCode
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface RawTextRecord {
  id: string;
  documentId: string;
  chatbotId: string;
  rawText: string;
  charCount: number;
  wordCount: number;
  sourceType: "PDF" | "DOCX" | "URL" | "FAQ" | "TEXT";
  extractedAt: string;
  updatedAt: string;
  document: {
    id: string;
    name: string;
    type: string;
    status: string;
    chunkCount: number;
    createdAt: string;
  };
  chatbot: {
    id: string;
    name: string;
    businessName: string;
  };
}

interface Metrics {
  totalDocuments: number;
  totalCharacters: number;
  totalWords: number;
  avgCharCount: number;
}

interface ChatbotOption {
  id: string;
  name: string;
  businessName: string;
}

export default function RawTextsAdminPage() {
  const [records, setRecords] = useState<RawTextRecord[]>([]);
  const [chatbots, setChatbots] = useState<ChatbotOption[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalDocuments: 0,
    totalCharacters: 0,
    totalWords: 0,
    avgCharCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedChatbot, setSelectedChatbot] = useState("");
  const [selectedSourceType, setSelectedSourceType] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal / Inspection state
  const [selectedRecord, setSelectedRecord] = useState<RawTextRecord | null>(null);
  const [copied, setCopied] = useState(false);
  const [modalSearch, setModalSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedChatbot) params.set("chatbotId", selectedChatbot);
      if (selectedSourceType) params.set("sourceType", selectedSourceType);
      params.set("page", page.toString());
      params.set("limit", "12");

      const res = await fetch(`/api/admin/raw-texts?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch raw text records");
      const data = await res.json();

      setRecords(data.data || []);
      setMetrics(data.metrics || { totalDocuments: 0, totalCharacters: 0, totalWords: 0, avgCharCount: 0 });
      setChatbots(data.chatbots || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error("Error loading raw text records:", err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedChatbot, selectedSourceType, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (record: RawTextRecord) => {
    const element = document.createElement("a");
    const file = new Blob([record.rawText], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${record.document?.name || "raw_extracted_text"}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const getSourceTypeIcon = (type: string) => {
    switch (type) {
      case "PDF":
        return <FileText className="h-4 w-4 text-red-500" />;
      case "DOCX":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "URL":
        return <Globe className="h-4 w-4 text-emerald-500" />;
      case "FAQ":
        return <HelpCircle className="h-4 w-4 text-amber-500" />;
      default:
        return <FileCode className="h-4 w-4 text-slate-500" />;
    }
  };

  const getSourceTypeBadge = (type: string) => {
    switch (type) {
      case "PDF":
        return <Badge className="bg-red-50 text-red-700 border-red-200">PDF</Badge>;
      case "DOCX":
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">DOCX</Badge>;
      case "URL":
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">URL Crawl</Badge>;
      case "FAQ":
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">FAQ Pairs</Badge>;
      default:
        return <Badge className="bg-slate-50 text-slate-700 border-slate-200">Text</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-indigo-600 font-bold">Knowledge Verification</span>
            <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
              Admin Exclusive
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Raw Extracted Text Inspector</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Audit full un-chunked raw text extracted from uploaded documents, web crawls, and FAQs stored in PostgreSQL.
          </p>
        </div>

        <Button onClick={fetchData} variant="outline" size="sm" className="gap-2 self-start sm:self-auto">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Records
        </Button>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Extracted Records
            </CardTitle>
            <Database className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{metrics.totalDocuments.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">Documents with raw text stored</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Stored Characters
            </CardTitle>
            <AlignLeft className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {(metrics.totalCharacters / 1000).toFixed(1)}k
            </div>
            <p className="text-xs text-slate-500 mt-1">{metrics.totalCharacters.toLocaleString()} exact characters</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Extracted Words
            </CardTitle>
            <FileText className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {(metrics.totalWords / 1000).toFixed(1)}k
            </div>
            <p className="text-xs text-slate-500 mt-1">{metrics.totalWords.toLocaleString()} parsed words</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Avg Document Length
            </CardTitle>
            <Layers className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {metrics.avgCharCount.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1">Chars per extracted document</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by document name, chatbot, or extracted raw text content..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 bg-white border-slate-200 text-sm"
              />
            </div>

            {/* Chatbot Selector */}
            <div className="w-full md:w-56">
              <select
                value={selectedChatbot}
                onChange={(e) => {
                  setSelectedChatbot(e.target.value);
                  setPage(1);
                }}
                className="w-full text-sm rounded-lg border border-slate-200 bg-white p-2 text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">All Chatbots</option>
                {chatbots.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.businessName})
                  </option>
                ))}
              </select>
            </div>

            {/* Document Type Selector */}
            <div className="w-full md:w-44">
              <select
                value={selectedSourceType}
                onChange={(e) => {
                  setSelectedSourceType(e.target.value);
                  setPage(1);
                }}
                className="w-full text-sm rounded-lg border border-slate-200 bg-white p-2 text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">All Source Types</option>
                <option value="PDF">PDF Documents</option>
                <option value="DOCX">Word (.docx)</option>
                <option value="URL">Web Crawls (URL)</option>
                <option value="FAQ">FAQ Pairs</option>
                <option value="TEXT">Plain Text</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Raw Extracted Texts Table */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Document / Source</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Chatbot</th>
                <th className="py-3.5 px-4">Size & Metrics</th>
                <th className="py-3.5 px-4">Vector Chunks</th>
                <th className="py-3.5 px-4">Extracted At</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading raw extracted text records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No raw text records found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Upload documents or ingest URLs to see extracted raw text stored here.
                    </p>
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 shrink-0">
                          {getSourceTypeIcon(record.sourceType)}
                        </div>
                        <div className="max-w-xs truncate">
                          <p className="font-semibold text-slate-900 truncate" title={record.document?.name || "Document"}>
                            {record.document?.name || "Untitled Document"}
                          </p>
                          <p className="text-xs text-slate-400 font-mono truncate">ID: {record.documentId}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">{getSourceTypeBadge(record.sourceType)}</td>

                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-medium text-slate-900">{record.chatbot?.name}</p>
                        <p className="text-xs text-slate-500">{record.chatbot?.businessName}</p>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {record.charCount.toLocaleString()} chars
                        </span>
                        <p className="text-xs text-slate-500">{record.wordCount.toLocaleString()} words</p>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <Layers className="h-3 w-3" />
                        {record.document?.chunkCount || 0} chunks
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {new Date(record.extractedAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs shadow-xs"
                        onClick={() => {
                          setSelectedRecord(record);
                          setModalSearch("");
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Inspect Raw Text
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Page <span className="font-bold text-slate-800">{page}</span> of{" "}
              <span className="font-bold text-slate-800">{totalPages}</span>
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="text-xs"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Raw Text Inspector Modal Drawer */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
                  {getSourceTypeIcon(selectedRecord.sourceType)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-slate-900 text-lg">{selectedRecord.document?.name || "Raw Text View"}</h2>
                    {getSourceTypeBadge(selectedRecord.sourceType)}
                  </div>
                  <p className="text-xs text-slate-500">
                    Chatbot: <span className="font-semibold text-slate-700">{selectedRecord.chatbot?.name}</span> • Extracted on{" "}
                    {new Date(selectedRecord.extractedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedRecord(null)}
                className="rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Metadata Stats Pill Bar */}
            <div className="px-6 py-3 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4 text-slate-600">
                <span>
                  <strong className="text-slate-900">{selectedRecord.charCount.toLocaleString()}</strong> Characters
                </span>
                <span>•</span>
                <span>
                  <strong className="text-slate-900">{selectedRecord.wordCount.toLocaleString()}</strong> Words
                </span>
                <span>•</span>
                <span className="text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {selectedRecord.document?.chunkCount || 0} Vector Chunks Created
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(selectedRecord.rawText)}
                  className="h-8 gap-1.5 text-xs bg-white"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-600" />}
                  {copied ? "Copied!" : "Copy Raw Text"}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(selectedRecord)}
                  className="h-8 gap-1.5 text-xs bg-white"
                >
                  <Download className="h-3.5 w-3.5 text-slate-600" />
                  Download .txt
                </Button>
              </div>
            </div>

            {/* Modal Body: Raw Text Viewer */}
            <div className="p-6 flex-1 overflow-y-auto bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400">
                <span>RAW EXTRACTED UN-CHUNKED TEXT</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500">UTF-8 Encoded</span>
              </div>

              <pre className="whitespace-pre-wrap font-mono text-xs text-slate-200 select-all leading-relaxed p-4 rounded-xl bg-slate-950/80 border border-slate-800 overflow-x-auto">
                {selectedRecord.rawText || "(Empty content)"}
              </pre>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <p>Document ID: <code className="font-mono text-slate-700 bg-slate-200/80 px-1.5 py-0.5 rounded">{selectedRecord.documentId}</code></p>
              <Button variant="outline" size="sm" onClick={() => setSelectedRecord(null)}>
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
