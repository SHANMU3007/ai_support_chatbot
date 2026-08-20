import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_PRICING, getRazorpayKeySecret } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan,
    } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan) {
      return NextResponse.json({ error: "Missing required payment fields" }, { status: 400 });
    }

    const secret = getRazorpayKeySecret();
    if (!secret) {
      return NextResponse.json(
        { error: "Server missing Razorpay secret key configuration." },
        { status: 500 }
      );
    }

    // Verify HMAC-SHA256 signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.error("[Razorpay Verify] Signature mismatch!");
      // Mark payment as failed if record exists
      try {
        await prisma.payment.updateMany({
          where: { razorpayOrderId: razorpay_order_id },
          data: {
            razorpayPaymentId: razorpay_payment_id,
            status: "FAILED",
          },
        });
      } catch {}
      return NextResponse.json({ error: "Invalid payment signature verification" }, { status: 400 });
    }

    // Valid plan enum check
    if (!PLAN_PRICING[plan]) {
      return NextResponse.json({ error: "Invalid plan specified" }, { status: 400 });
    }

    // Update user's plan in Prisma Database
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        plan: plan as any,
      },
      select: {
        id: true,
        email: true,
        plan: true,
        role: true,
      },
    });

    // Update payment record to SUCCESS
    try {
      await prisma.payment.updateMany({
        where: { razorpayOrderId: razorpay_order_id },
        data: {
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          status: "SUCCESS",
          plan: plan as any,
        },
      });
    } catch (paymentErr) {
      console.error("[Razorpay Payment Update Error]:", paymentErr);
    }

    return NextResponse.json({
      success: true,
      message: `Your account has been upgraded to ${PLAN_PRICING[plan].name}!`,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("[Razorpay Verify Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to verify payment" },
      { status: 500 }
    );
  }
}
