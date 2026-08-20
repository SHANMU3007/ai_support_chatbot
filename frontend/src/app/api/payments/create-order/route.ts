import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { razorpay, getRazorpayKeyId, getRazorpayKeySecret, PLAN_PRICING } from "@/lib/razorpay";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const keyId = getRazorpayKeyId();
    const keySecret = getRazorpayKeySecret();

    if (!keyId || !keySecret) {
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

    const userId = (session.user as any).id || session.user.email;
    const cleanId = userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 10);
    const receipt = `rcpt_${Date.now().toString().slice(-8)}_${cleanId}`;

    const options = {
      amount: planConfig.amount,
      currency: "INR",
      receipt: receipt.slice(0, 40),
      notes: {
        userId: userId,
        userEmail: session.user.email,
        plan: plan,
      },
    };

    const order = await razorpay.orders.create(options);

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
