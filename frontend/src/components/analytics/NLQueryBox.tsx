"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NLQueryResult } from "@/types/analytics";
import { Search, Loader2 } from "lucide-react";

const EXAMPLE_QUERIES = [
  "How many chats did I get this week?",
  "Which chatbot has the most conversations?",
  "What is the average messages per session?",
  "Show me stats for the last 30 days",
];

export function NLQueryBox() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<NLQueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleQuery = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/analytics/nl-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Query failed");
        return;
      }

      const data = await res.json();
      setResult(data);
    } catch {
      setError("Failed to connect to analytics service");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask your data anything..."
          rows={2}
          className="text-sm resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleQuery();
            }
          }}
        />
        <Button onClick={handleQuery} disabled={loading || !question.trim()} className="flex-shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {/* Example queries */}
      <div className="flex flex-wrap gap-1.5">
        {EXAMPLE_QUERIES.map((q) => (
          <button
            key={q}
            onClick={() => setQuestion(q)}
            className="text-xs bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-600 px-2.5 py-1 rounded-full transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
      )}

      {result && (
        <div className="border rounded-lg overflow-hidden">
          {result.sql && (
            <div className="bg-gray-800 text-green-400 text-xs px-3 py-2 font-mono">
              {result.sql}
            </div>
          )}
          {result.rows?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {result.columns.map((col) => (
                      <th key={col} className="px-3 py-2 text-left font-medium text-gray-500">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                      {result.columns.map((col) => (
                        <td key={col} className="px-3 py-2 text-gray-700">
                          {String(row[col] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No results found</p>
          )}
          <div className="bg-gray-50 px-3 py-1.5 text-xs text-gray-400 border-t">
            {result.rowCount} row{result.rowCount !== 1 ? "s" : ""} returned
          </div>
        </div>
      )}
    </div>
  );
}
