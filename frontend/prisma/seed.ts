import { PrismaClient, DocType, DocStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding demo data...");

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "Demo Business Owner",
      plan: "FREE",
    },
  });

  console.log("✅ Created user:", user.email);

  // Create demo chatbot
  const chatbot = await prisma.chatbot.upsert({
    where: { id: "demo-chatbot-id" },
    update: {},
    create: {
      id: "demo-chatbot-id",
      userId: user.id,
      name: "Support Bot",
      businessName: "Acme Store",
      description: "Customer support chatbot for Acme Store",
      systemPrompt: `You are a helpful customer support agent for Acme Store. 
You help customers with questions about our products, orders, shipping, and returns.
Always be friendly, professional, and concise. 
If you don't know the answer, say so and offer to escalate to a human agent.`,
      primaryColor: "#6366f1",
      welcomeMessage: "Hi! Welcome to Acme Store support. How can I help you today?",
      language: "en",
      isActive: true,
    },
  });

  console.log("✅ Created chatbot:", chatbot.name);

  // Create demo FAQ document
  const faqDoc = await prisma.document.create({
    data: {
      chatbotId: chatbot.id,
      name: "Acme Store FAQ",
      type: DocType.FAQ,
      content: `Q: What are your shipping times?
A: Standard shipping takes 5-7 business days. Express shipping takes 2-3 business days.

Q: Do you offer free shipping?
A: Yes! Orders over $50 qualify for free standard shipping within the US.

Q: What is your return policy?
A: We accept returns within 30 days of purchase. Items must be in original condition with tags attached.

Q: How do I track my order?
A: Once your order ships, you'll receive a tracking email with a link to track your package.

Q: Do you ship internationally?
A: Yes, we ship to over 50 countries. International shipping typically takes 10-14 business days.

Q: What payment methods do you accept?
A: We accept Visa, Mastercard, American Express, PayPal, and Apple Pay.

Q: How do I contact customer support?
A: You can reach us via this chatbot, email at support@acmestore.com, or phone at 1-800-ACME-123.`,
      status: DocStatus.DONE,
      chunkCount: 7,
    },
  });

  console.log("✅ Created FAQ document:", faqDoc.name);

  // Create demo chat sessions
  const session1 = await prisma.chatSession.create({
    data: {
      chatbotId: chatbot.id,
      visitorId: "visitor-demo-1",
      language: "en",
    },
  });

  await prisma.message.createMany({
    data: [
      {
        sessionId: session1.id,
        role: "USER",
        content: "What is your return policy?",
        tokens: 8,
      },
      {
        sessionId: session1.id,
        role: "ASSISTANT",
        content:
          "We accept returns within 30 days of purchase. Items must be in original condition with tags attached. To start a return, please visit our returns portal or contact us at support@acmestore.com.",
        tokens: 42,
        confidence: 0.95,
      },
    ],
  });

  const session2 = await prisma.chatSession.create({
    data: {
      chatbotId: chatbot.id,
      visitorId: "visitor-demo-2",
      language: "en",
    },
  });

  await prisma.message.createMany({
    data: [
      {
        sessionId: session2.id,
        role: "USER",
        content: "How long does shipping take?",
        tokens: 6,
      },
      {
        sessionId: session2.id,
        role: "ASSISTANT",
        content:
          "Standard shipping takes 5-7 business days. If you need it faster, express shipping is available and takes 2-3 business days. Orders over $50 qualify for free standard shipping!",
        tokens: 40,
        confidence: 0.98,
      },
      {
        sessionId: session2.id,
        role: "USER",
        content: "Do you ship internationally?",
        tokens: 5,
      },
      {
        sessionId: session2.id,
        role: "ASSISTANT",
        content:
          "Yes, we ship to over 50 countries! International shipping typically takes 10-14 business days. Rates vary by destination.",
        tokens: 28,
        confidence: 0.92,
      },
    ],
  });

  console.log("✅ Created demo chat sessions with messages");
  console.log("");
  console.log("🎉 Seed complete!");
  console.log("   Email: demo@example.com");
  console.log("   Bot ID: demo-chatbot-id");
  console.log("   Visit: http://localhost:3000");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
