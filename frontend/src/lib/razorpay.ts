import Razorpay from "razorpay";

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

export const PLAN_PRICING: Record<
  string,
  { name: string; amount: number; description: string; features: string[] }
> = {
  FREE: {
    name: "Free",
    amount: 0,
    description: "Get started with basic support automation",
    features: ["1 Chatbot", "500 messages/month", "Standard response speed", "Community support"],
  },
  STARTER: {
    name: "Starter",
    amount: 49900, // ₹499 in paise
    description: "Ideal for small growing businesses",
    features: ["5 Chatbots", "10,000 messages/month", "Telegram integration", "Document ingestion", "Email support"],
  },
  PRO: {
    name: "Pro",
    amount: 99900, // ₹999 in paise
    description: "Full power with advanced AI workflows",
    features: [
      "Unlimited Chatbots",
      "50,000 messages/month",
      "NL2SQL database analytics",
      "n8n webhook automations",
      "Priority sentiment analysis",
      "Priority 24/7 support",
    ],
  },
  ENTERPRISE: {
    name: "Enterprise",
    amount: 499900, // ₹4,999 in paise
    description: "Maximum scale and customized SLA",
    features: [
      "Unlimited everything",
      "Custom domain embedding",
      "Dedicated account manager",
      "Custom AI model fine-tuning",
      "SLA guarantee",
    ],
  },
};
