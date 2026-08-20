import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRazorpayClient, getRazorpayKeyId, PLAN_PRICING } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const keyId = getRazorpayKeyId();
    if (!keyId) {
      return NextResponse.json(
        { error: "Razorpay credentials are not configured on the server." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { plan } = body;

    const planConfig = PLAN_PRICING[plan];
    if (!planConfig || planConfig.amount <= 0) {
      return NextResponse.json({ error: "Invalid plan or amount" }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User account not found" }, { status: 404 });
    }

    const cleanId = dbUser.id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 10);
    const receipt = `rcpt_${Date.now().toString().slice(-8)}_${cleanId}`;

    const options = {
      amount: planConfig.amount,
      currency: "INR",
      receipt: receipt.slice(0, 40),
      notes: {
        userId: dbUser.id,
        userEmail: dbUser.email,
        plan: plan,
      },
    };

    const razorpay = getRazorpayClient();
    const order = await razorpay.orders.create(options);

    // Save pending payment record in PostgreSQL
    try {
      await prisma.payment.create({
        data: {
          userId: dbUser.id,
          razorpayOrderId: order.id,
          amount: order.amount as number,
          currency: order.currency || "INR",
          plan: plan as any,
          status: "PENDING",
          receipt: receipt,
        },
      });
    } catch (dbErr) {
      console.error("[Razorpay DB Payment Init Error]:", dbErr);
    }

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: keyId,
      plan: plan,
      planName: planConfig.name,
    });
  } catch (error: any) {
    console.error("[Razorpay Create Order Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create Razorpay order" },
      { status: 500 }
    );
  }
}
