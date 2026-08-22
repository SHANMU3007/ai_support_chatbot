"use client";

import { useState } from "react";
import Script from "next/script";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Zap, Shield, Crown, Sparkles, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PlanItem {
  id: "FREE" | "STARTER" | "PRO" | "ENTERPRISE";
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  popular?: boolean;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface PaymentRecord {
  id: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  amount: number;
  currency: string;
  plan: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  createdAt: string | Date;
}

const PLANS: PlanItem[] = [
  {
    id: "FREE",
    name: "Free",
    price: "₹0",
    period: "forever",
    tagline: "Standard automated support for hobbyists",
    features: [
      "1 AI Chatbot",
      "500 messages / month",
      "Website Embed widget",
      "Standard LLM responses",
      "Community support",
    ],
    color: "gray",
    icon: Sparkles,
  },
  {
    id: "STARTER",
    name: "Starter",
    price: "₹499",
    period: "month",
    tagline: "Essential tools for growing teams & shops",
    features: [
      "5 AI Chatbots",
      "10,000 messages / month",
      "Telegram Bot integration",
      "PDF, DOCX & Web crawl ingestion",
      "Sentiment & Follow-up tracking",
      "Standard email support",
    ],
    color: "blue",
    icon: Zap,
  },
  {
    id: "PRO",
    name: "Pro",
    price: "₹999",
    period: "month",
    tagline: "Full AI analytics, NL2SQL & integrations",
    popular: true,
    features: [
      "Unlimited AI Chatbots",
      "50,000 messages / month",
      "Natural Language SQL Analytics",
      "n8n webhook automations",
      "High-speed Groq LLaMA 3.3",
      "White-label branding options",
      "Priority 24/7 support",
    ],
    color: "purple",
    icon: Crown,
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    price: "₹4,999",
    period: "month",
    tagline: "Tailored power and customized SLA guarantees",
    features: [
      "Unlimited everything",
      "Dedicated server isolated ChromaDB",
      "Custom domain embeddings",
      "Custom AI model fine-tuning",
      "Dedicated account manager",
      "99.9% uptime SLA",
    ],
    color: "emerald",
    icon: Shield,
  },
];

export function BillingSection({
  currentPlan = "FREE",
  payments = [],
}: {
  currentPlan?: string;
  payments?: PaymentRecord[];
}) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleUpgrade = async (planId: "STARTER" | "PRO" | "ENTERPRISE") => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (planId === currentPlan) return;

    if (!session?.user) {
      router.push("/login");
      return;
    }

    try {
      setLoadingPlan(planId);

      // 1. Create order on the server
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || "Failed to initialize payment.");
      }

      if (typeof window === "undefined" || !window.Razorpay) {
        throw new Error("Razorpay SDK failed to load. Please check your internet connection or ad blocker.");
      }

      // 2. Configure Razorpay modal options
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "Conciergo AI Platform",
        description: `Upgrade to ${orderData.planName || planId} Plan`,
        order_id: orderData.orderId,
        prefill: {
          name: session.user.name || "",
          email: session.user.email || "",
        },
        theme: {
          color: "#4f46e5",
        },
        handler: async function (response: any) {
          try {
            setLoadingPlan(planId);
            // 3. Verify payment signature on backend
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: planId,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || "Payment verification failed.");
            }

            setSuccessMessage(`🎉 Success! Your workspace has been upgraded to ${orderData.planName || planId}.`);
            await update();
            router.refresh();
          } catch (err: any) {
            setErrorMessage(err.message || "Payment verification failed.");
          } finally {
            setLoadingPlan(null);
          }
        },
        modal: {
          ondismiss: function () {
            setLoadingPlan(null);
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on("payment.failed", function (failResponse: any) {
        setErrorMessage(
          failResponse.error?.description || "Payment failed. Please check your payment method and try again."
        );
        setLoadingPlan(null);
      });

      razorpayInstance.open();
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong during checkout.");
      setLoadingPlan(null);
    }
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="space-y-6">
        {/* Messages */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-500 hover:text-red-800 font-bold ml-3"
            >
              ✕
            </button>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm flex items-center justify-between">
            <span>{successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-500 hover:text-green-800 font-bold ml-3"
            >
              ✕
            </button>
          </div>
        )}

        {/* Current Plan Summary Card */}
        <div className="bg-gradient-to-r from-gray-900 to-black text-white rounded-2xl p-6 border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Active Plan</span>
              <Badge className="bg-indigo-600 text-white font-bold text-xs">{currentPlan}</Badge>
            </div>
            <p className="text-sm text-gray-300 mt-2">
              Manage your subscription, feature tiers, and payment processing securely via Razorpay.
            </p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Active Subscription
            </span>
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const Icon = plan.icon;
            const isLoading = loadingPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between p-6 rounded-2xl border transition-all duration-200 ${
                  plan.popular
                    ? "border-purple-500/50 bg-purple-950/10 shadow-md ring-1 ring-purple-500/20"
                    : "border-gray-200 bg-white"
                } ${isCurrent ? "ring-2 ring-indigo-600 bg-indigo-50/20" : ""}`}
              >
                {plan.popular && (
                  <span className="absolute -top-2.5 right-6 bg-purple-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-full tracking-wide uppercase">
                    Most Popular
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-gray-100 text-gray-800">
                        <Icon className="h-4 w-4" />
                      </div>
                      <h3 className="font-bold text-base text-gray-900">{plan.name}</h3>
                    </div>
                    {isCurrent && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                        Current
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mb-4">{plan.tagline}</p>

                  <div className="flex items-baseline gap-1 mb-5">
                    <span className="text-3xl font-black text-gray-900">{plan.price}</span>
                    <span className="text-xs text-gray-500">/{plan.period}</span>
                  </div>

                  <ul className="space-y-2.5 mb-6">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                        <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-gray-100 text-gray-500 cursor-default"
                    >
                      Current Plan
                    </button>
                  ) : plan.id === "FREE" ? (
                    <button
                      disabled
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-gray-100 text-gray-400 cursor-not-allowed"
                    >
                      Default Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.id as "STARTER" | "PRO" | "ENTERPRISE")}
                      disabled={loadingPlan !== null}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-sm ${
                        plan.popular
                          ? "bg-purple-600 hover:bg-purple-700 text-white"
                          : "bg-gray-900 hover:bg-black text-white"
                      } disabled:opacity-50`}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        `Upgrade to ${plan.name}`
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Payment History / Transactions Table */}
        {payments && payments.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-sm mt-8">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-gray-700" />
              <h3 className="font-bold text-gray-900 text-base">Payment History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Date</th>
                    <th className="pb-3 font-semibold">Plan</th>
                    <th className="pb-3 font-semibold">Amount</th>
                    <th className="pb-3 font-semibold">Order ID</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-700">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition">
                      <td className="py-3">
                        {new Date(p.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 font-medium text-gray-900">{p.plan}</td>
                      <td className="py-3 font-semibold">₹{(p.amount / 100).toFixed(2)}</td>
                      <td className="py-3 text-gray-500 font-mono">{p.razorpayPaymentId || p.razorpayOrderId}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            p.status === "SUCCESS"
                              ? "bg-green-100 text-green-700"
                              : p.status === "FAILED"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
