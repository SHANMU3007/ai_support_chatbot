import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isUserAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFastApiUrl } from "@/lib/api-config";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isUserAdmin(session.user.email, session.user.role)) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const results: Record<string, { status: "online" | "offline"; latencyMs?: number; detail?: string }> = {};

  // 1. PostgreSQL Database
  const pgStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    results.postgres = { status: "online", latencyMs: Date.now() - pgStart };
  } catch (err: any) {
    results.postgres = { status: "offline", detail: err.message };
  }

  // 2. FastAPI Backend
  const backendUrl = getFastApiUrl("/health");
  const fastStart = Date.now();
  try {
    const res = await fetch(backendUrl, { cache: "no-store" });
    if (res.ok) {
      results.fastapi = { status: "online", latencyMs: Date.now() - fastStart };
    } else {
      results.fastapi = { status: "offline", detail: `HTTP ${res.status}` };
    }
  } catch (err: any) {
    results.fastapi = { status: "offline", detail: err.message };
  }

  // 3. ChromaDB
  const chromaHost = process.env.CHROMA_HOST || "localhost";
  const chromaPort = process.env.CHROMA_PORT || "8001";
  const chromaUrl = `http://${chromaHost}:${chromaPort}/api/v1/heartbeat`;
  const chromaStart = Date.now();
  try {
    const res = await fetch(chromaUrl, { cache: "no-store" });
    if (res.ok) {
      results.chromadb = { status: "online", latencyMs: Date.now() - chromaStart };
    } else {
      results.chromadb = { status: "offline", detail: `HTTP ${res.status}` };
    }
  } catch (err: any) {
    results.chromadb = { status: "offline", detail: err.message };
  }

  // 4. n8n Automation Engine
  const n8nUrl = process.env.N8N_WEBHOOK_URL || "http://localhost:5678";
  const n8nStart = Date.now();
  try {
    const res = await fetch(`${n8nUrl}/healthz`, { cache: "no-store" });
    if (res.ok) {
      results.n8n = { status: "online", latencyMs: Date.now() - n8nStart };
    } else {
      results.n8n = { status: "offline", detail: `HTTP ${res.status}` };
    }
  } catch (err: any) {
    results.n8n = { status: "offline", detail: err.message };
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    services: results,
  });
}
