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
    const userEmail = session.user.email?.toLowerCase();
    const userRole = (session.user as any).role;
    const adminEmails = (process.env.ADMIN_EMAILS || "shanmugapatelkani@gmail.com")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const isAdmin = userRole === "ADMIN" || (userEmail && adminEmails.includes(userEmail));

    const body = await req.json();
    const { status, clientFeedback, adminResponse, escalatedToAdmin } = body;

    // Verify ownership or platform admin
    const ticket = await prisma.feedbackTicket.findUnique({
      where: { id: params.id },
      include: { chatbot: { select: { userId: true } } },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const isOwner = ticket.chatbot.userId === userId;
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isMarkingResolved = status === "RESOLVED" || status === "RECTIFIED" || status === "CLOSED";

    const updateData: any = {};
    if (status) updateData.status = status;
    if (clientFeedback !== undefined) {
      updateData.clientFeedback = clientFeedback;
      updateData.clientReviewedAt = new Date();
    }
    if (escalatedToAdmin !== undefined) {
      updateData.escalatedToAdmin = Boolean(escalatedToAdmin);
      if (escalatedToAdmin && (!status || status === "OPEN")) {
        updateData.status = "ESCALATED_TO_ADMIN";
      }
    }
    if (adminResponse !== undefined) {
      updateData.adminResponse = adminResponse;
    }
    if (isMarkingResolved && !ticket.resolvedAt) {
      updateData.resolvedAt = new Date();
    }
    if (status === "OPEN") {
      updateData.resolvedAt = null;
    }

    const updated = await prisma.feedbackTicket.update({
      where: { id: params.id },
      data: updateData,
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
