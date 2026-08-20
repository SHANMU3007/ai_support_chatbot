import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { PLAN_PRICING } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();

    if (!signature) {
      return NextResponse.json({ error: "Missing signature header" }, { status: 400 });
    }

    if (!webhookSecret) {
      console.warn("[Razorpay Webhook] RAZORPAY_WEBHOOK_SECRET is not configured.");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("[Razorpay Webhook] Invalid signature verification.");
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    // Handle payment capture / order paid events
    if (event === "payment.captured" || event === "order.paid") {
      const paymentEntity = payload.payload?.payment?.entity;
      const notes = paymentEntity?.notes || {};
      const userEmail = notes.userEmail;
      const rawPlan = notes.plan || "PRO";
      const plan = String(rawPlan).trim().toUpperCase();
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;
      const amount = paymentEntity?.amount || PLAN_PRICING[plan]?.amount || 0;

      if (userEmail) {
        const user = await prisma.user.update({
          where: { email: userEmail },
          data: { plan: plan as any },
          select: { id: true, email: true },
        });

        if (orderId) {
          const updateResult = await prisma.payment.updateMany({
            where: { razorpayOrderId: orderId },
            data: {
              razorpayPaymentId: paymentId,
              status: "SUCCESS",
              plan: plan as any,
            },
          });

          if (updateResult.count === 0 && user) {
            await prisma.payment.create({
              data: {
                userId: user.id,
                razorpayOrderId: orderId,
                razorpayPaymentId: paymentId,
                amount: amount,
                currency: "INR",
                plan: plan as any,
                status: "SUCCESS",
              },
            }).catch(() => {});
          }
        }
        console.log(`[Razorpay Webhook] User ${userEmail} upgraded to plan ${plan} via webhook.`);
      }
    } else if (event === "payment.failed") {
      const paymentEntity = payload.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        await prisma.payment.updateMany({
          where: { razorpayOrderId: orderId },
          data: {
            razorpayPaymentId: paymentId,
            status: "FAILED",
          },
        });
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    console.error("[Razorpay Webhook Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Webhook processing error" },
      { status: 500 }
    );
  }
}
