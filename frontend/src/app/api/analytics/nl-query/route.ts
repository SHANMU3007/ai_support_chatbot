import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { question } = await req.json();
  if (!question) return NextResponse.json({ error: "question is required" }, { status: 400 });

  const fastapiUrl = process.env.FASTAPI_URL || "http://localhost:8000";

  try {
    const res = await fetch(`${fastapiUrl}/analytics/nl-query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        user_id: session.user?.id,
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to execute query" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
}
