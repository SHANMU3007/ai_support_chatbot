import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageSquare, Zap, Shield, BarChart3, Upload, Globe } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-indigo-600" />
            <span className="font-bold text-xl">ChatBot AI</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm text-gray-600 hover:text-gray-900">
              Features
            </Link>
            <Link href="#pricing" className="text-sm text-gray-600 hover:text-gray-900">
              Pricing
            </Link>
            <Link href="/docs" className="text-sm text-gray-600 hover:text-gray-900">
              Docs
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get Started Free</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center py-24 px-4 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Zap className="h-4 w-4" />
            Powered by Claude claude-sonnet-4-6
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            AI Support Chatbot for{" "}
            <span className="text-indigo-600">Your Business</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Upload your FAQs and business docs. Get an embeddable AI chatbot that answers customer
            questions 24/7. No coding required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="text-base px-8">
                Start for Free
              </Button>
            </Link>
            <Link href="/chat/demo-chatbot-id">
              <Button size="lg" variant="outline" className="text-base px-8">
                See Live Demo
              </Button>
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            No credit card required · Free forever plan available
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything you need to support your customers
            </h2>
            <p className="text-lg text-gray-600">Set up in minutes, not months</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Upload,
                title: "Upload Your Knowledge",
                desc: "Add PDFs, docs, FAQs, or paste a URL. We chunk and index everything automatically.",
              },
              {
                icon: MessageSquare,
                title: "AI-Powered Answers",
                desc: "Claude finds the most relevant info from your docs and generates accurate, natural responses.",
              },
              {
                icon: Globe,
                title: "Embed Anywhere",
                desc: "One script tag. Drop it into any website — Shopify, WordPress, custom HTML — and you're live.",
              },
              {
                icon: BarChart3,
                title: "Analytics Dashboard",
                desc: "See top questions, chat volumes, and satisfaction. Ask questions in plain English with NL2SQL.",
              },
              {
                icon: Zap,
                title: "n8n Automations",
                desc: "Auto-escalate to humans, send daily reports, push leads to your CRM — all automated.",
              },
              {
                icon: Shield,
                title: "Secure & Private",
                desc: "Your data is isolated per account. Conversations are encrypted and never shared.",
              },
            ].map((feature) => (
              <div key={feature.title} className="p-6 rounded-xl border bg-gray-50 hover:bg-indigo-50 transition-colors">
                <feature.icon className="h-10 w-10 text-indigo-600 mb-4" />
                <h3 className="font-semibold text-lg text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple Pricing</h2>
            <p className="text-lg text-gray-600">Start free, scale as you grow</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Free",
                price: "$0",
                features: ["1 chatbot", "500 messages/mo", "2 documents", "Email support"],
                cta: "Get Started",
                highlighted: false,
              },
              {
                name: "Starter",
                price: "$29",
                features: ["5 chatbots", "10,000 messages/mo", "50 documents", "Analytics", "Priority support"],
                cta: "Start Trial",
                highlighted: true,
              },
              {
                name: "Pro",
                price: "$99",
                features: ["Unlimited chatbots", "100,000 messages/mo", "Unlimited docs", "NL2SQL", "n8n automations", "Custom domain"],
                cta: "Start Trial",
                highlighted: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`p-8 rounded-xl border-2 ${
                  plan.highlighted
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-gray-200 bg-white"
                }`}
              >
                <h3 className="font-bold text-xl mb-2">{plan.name}</h3>
                <div className="text-4xl font-bold mb-1">
                  {plan.price}
                  <span className="text-base font-normal opacity-70">/mo</span>
                </div>
                <ul className="space-y-2 my-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <span className="opacity-70">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <Button
                    className="w-full"
                    variant={plan.highlighted ? "secondary" : "default"}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-8 px-4">
        <div className="container mx-auto text-center text-sm text-gray-500">
          © 2026 ChatBot AI. Built with Next.js + Claude.
        </div>
      </footer>
    </div>
  );
}
