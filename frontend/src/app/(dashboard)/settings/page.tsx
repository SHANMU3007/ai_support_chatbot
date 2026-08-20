import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { BillingSection, PaymentRecord } from "@/components/pricing/BillingSection";

export default async function AccountSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id as string },
  });

  if (!user) return null;

  // Retrieve user payments if any exist
  let payments: PaymentRecord[] = [];
  try {
    const rawPayments = await prisma.payment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    payments = rawPayments.map((p) => ({
      id: p.id,
      razorpayOrderId: p.razorpayOrderId,
      razorpayPaymentId: p.razorpayPaymentId,
      amount: p.amount,
      currency: p.currency,
      plan: p.plan,
      status: p.status as "PENDING" | "SUCCESS" | "FAILED",
      createdAt: p.createdAt.toISOString(),
    }));
  } catch (err) {
    console.error("Error fetching user payments:", err);
  }

  return (
    <div className="space-y-8 max-w-4xl pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account profile and subscription billing</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-sm">
        <h2 className="font-bold text-gray-900 text-base">Profile Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-xs text-gray-500 block">Name</span>
            <span className="text-sm font-semibold text-gray-900">{user.name || "Not set"}</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-xs text-gray-500 block">Email</span>
            <span className="text-sm font-semibold text-gray-900">{user.email}</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-xs text-gray-500 block">Current Plan</span>
            <div className="mt-1">
              <Badge className="bg-indigo-600 text-white font-bold">{user.plan}</Badge>
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-xs text-gray-500 block">Member Since</span>
            <span className="text-sm font-semibold text-gray-900">
              {new Date(user.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Subscription & Billing</h2>
          <p className="text-sm text-gray-500">Choose the plan that fits your business needs.</p>
        </div>
        <BillingSection currentPlan={user.plan} payments={payments} />
      </div>
    </div>
  );
}
