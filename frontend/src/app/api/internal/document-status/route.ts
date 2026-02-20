import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DocStatus } from "@prisma/client";

/** Retry a Prisma update up to `attempts` times with a delay between tries. */
async function updateWithRetry(
  documentId: string,
  status: DocStatus,
  chunkCount: number,
  attempts = 5,
  delayMs = 1500
) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await prisma.document.update({
        where: { id: documentId },
        data: {
          status,
          ...(chunkCount > 0 ? { chunkCount } : {}),
        },
      });
    } catch (err: any) {
      if (err?.code === "P2025" && i < attempts - 1) {
        // Record not yet committed — wait and retry
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      throw err;
    }
  }
  throw new Error("updateWithRetry exhausted all attempts");
}

/**
 * Internal endpoint called by FastAPI background tasks to update
 * document ingestion status (PROCESSING → DONE | FAILED).
 * Protected by a shared secret header.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (secret !== "supportiq-internal") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { documentId, status, chunkCount = 0 } = await req.json();

  if (!documentId || !status) {
    return NextResponse.json({ error: "documentId and status are required" }, { status: 400 });
  }

  const validStatuses: DocStatus[] = ["PROCESSING", "DONE", "FAILED"];
  if (!validStatuses.includes(status as DocStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const document = await updateWithRetry(documentId, status as DocStatus, chunkCount);
    return NextResponse.json({ ok: true, id: document.id, status: document.status });
  } catch (err: any) {
    if (err?.code === "P2025") {
      // Record genuinely doesn't exist — ignore silently (stale callback)
      return NextResponse.json({ ok: true, skipped: true });
    }
    throw err;
  }
}
