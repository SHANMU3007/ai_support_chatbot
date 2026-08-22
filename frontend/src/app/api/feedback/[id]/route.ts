import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

interface Props {
  params: { id: string };
}

// PATCH /api/feedback/[id] — Workspace owner / Admin updates status & writes resolution reply
export async function PATCH(req: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const userRole = (session.user as any).role;
    const isAdmin = userRole === "ADMIN";

    const body = await req.json();
    const { status, adminResponse } = body;

    // Verify ownership or platform admin
    const ticket = await prisma.feedbackTicket.findUnique({
      where: { id: params.id },
      include: { chatbot: { select: { userId: true } } },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (!isAdmin && ticket.chatbot.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isMarkingResolved = status === "RESOLVED" || status === "CLOSED";

    const updated = await prisma.feedbackTicket.update({
      where: { id: params.id },
      data: {
        ...(status ? { status } : {}),
        ...(adminResponse !== undefined ? { adminResponse } : {}),
        ...(isMarkingResolved && !ticket.resolvedAt ? { resolvedAt: new Date() } : {}),
        ...(status === "OPEN" ? { resolvedAt: null } : {}),
      },
    });

    return NextResponse.json({ success: true, ticket: updated });
  } catch (error) {
    console.error("Failed to update ticket:", error);
    return NextResponse.json(
      { error: "Failed to update ticket" },
      { status: 500 }
    );
  }
}

// DELETE /api/feedback/[id] — Admin or workspace owner deletes ticket
export async function DELETE(_req: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const userRole = (session.user as any).role;
    const isAdmin = userRole === "ADMIN";

    const ticket = await prisma.feedbackTicket.findUnique({
      where: { id: params.id },
      include: { chatbot: { select: { userId: true } } },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (!isAdmin && ticket.chatbot.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.feedbackTicket.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete ticket:", error);
    return NextResponse.json(
      { error: "Failed to delete ticket" },
      { status: 500 }
    );
  }
}
