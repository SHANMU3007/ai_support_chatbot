"use client";

import { useEffect, useState } from "react";
import { Activity, CheckCircle2, XCircle, RefreshCw, Server, Database, Cpu, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ServiceHealth {
  status: "online" | "offline";
  latencyMs?: number;
  detail?: string;
}

interface HealthData {
  timestamp: string;
  services: {
    postgres?: ServiceHealth;
    fastapi?: ServiceHealth;
    chromadb?: ServiceHealth;
    n8n?: ServiceHealth;
  };
}

export default function AdminHealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/health");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error("Failed to fetch service health:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const serviceIcons: Record<string, any> = {
    postgres: Database,
    fastapi: Server,
    chromadb: Cpu,
    n8n: Zap,
  };

  const serviceNames: Record<string, string> = {
    postgres: "PostgreSQL Database",
    fastapi: "FastAPI AI Engine",
    chromadb: "ChromaDB Vector Store",
    n8n: "n8n Automation Engine",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-emerald-600 font-bold">System Diagnostics</p>
          <h1 className="text-2xl font-bold mt-1 text-gray-900">Infrastructure Health</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time status probes for core backend microservices and databases.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchHealth} disabled={loading} className="gap-2 self-start sm:self-auto">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Re-probe Services
        </Button>
      </div>

      {loading && !data ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-500 text-sm">
          Probing backend infrastructure services...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(data?.services || {}).map(([key, service]) => {
            const Icon = serviceIcons[key] || Activity;
            const isOnline = service.status === "online";

            return (
              <div key={key} className="bg-white rounded-xl border p-6 flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${isOnline ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">{serviceNames[key] || key}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {isOnline ? `Online (Latency: ${service.latencyMs}ms)` : `Offline: ${service.detail || "Connection failed"}`}
                    </p>
                  </div>
                </div>

                {isOnline ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Healthy
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2.5 py-1 rounded-full">
                    <XCircle className="h-3.5 w-3.5" /> Down
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
