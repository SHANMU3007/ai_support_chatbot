"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { ShinyButton } from "@/components/ui/ShinyButton";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { BadgePill } from "@/components/ui/BadgePill";
import { SplitText } from "@/components/ui/SplitText";
import { DepthText } from "@/components/ui/DepthText";
import {
  MessageSquare,
  Zap,
  Shield,
  BarChart3,
  Upload,
  Globe,
  ArrowRight,
  Check,
  Star,
  Sparkles,
  Bot,
  Layers,
  ChevronDown,
  Lock,
  Headphones,
  CheckCircle2
} from "lucide-react";

export default function LandingPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <div className="relative min-h-screen bg-slate-50/50 text-slate-900 selection:bg-indigo-500 selection:text-white overflow-hidden">
      {/* Dynamic Aurora Ambient Background */}
      <AnimatedBackground pattern="dots" showOrbs={true} />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/75 border-b border-slate-200/80 transition-all">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between max-w-7xl">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-indigo-900 flex items-center justify-center shadow-md shadow-indigo-950/20 group-hover:scale-105 transition-transform">
              <Bot className="h-5 w-5 text-indigo-300" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Conciergo
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="#features"
              className="text-sm font-medium text-slate-600 hover:text-slate-950 transition-colors"
            >
              Features
            </Link>
            <Link
              href="#demo"
              className="text-sm font-medium text-slate-600 hover:text-slate-950 transition-colors"
            >
              Live Demo
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-medium text-slate-600 hover:text-slate-950 transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="#faq"
              className="text-sm font-medium text-slate-600 hover:text-slate-950 transition-colors"
            >
              FAQ
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button
                variant="ghost"
                size="sm"
                className="font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-xl"
              >
                Sign in
              </Button>
            </Link>
            <Link href="/register">
              <ShinyButton size="sm" variant="primary" className="rounded-xl">
                Get Started Free
                <ArrowRight className="h-3.5 w-3.5" />
              </ShinyButton>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 px-4 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="flex justify-center mb-6">
            <BadgePill variant="gradient">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>Conciergo 2.0 • Autonomous Support Concierge Platform</span>
            </BadgePill>
          </div>

          <div className="mb-8 flex flex-col items-center justify-center">
            <div className="my-2 select-none">
              <DepthText
                text="CONCIERGO"
                layers={32}
                depth={2.2}
                faceColor="#0f172a"
                depthColor="#6366f1"
                tilt={8.5}
                pointerTracking={true}
                smoothing={0.14}
                perspective={900}
                autoOrbit={true}
                orbitSpeed={0.35}
                fontSize="clamp(2.75rem, 8.5vw, 5.75rem)"
                fontWeight={900}
                shadow={true}
              />
            </div>
            <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.2]">
              <SplitText
                text="Turn Your Knowledge into a 24/7 AI Support Concierge."
                className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.2]"
                delay={28}
              />
            </h1>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-600 leading-relaxed font-normal mb-10 max-w-2xl mx-auto"
          >
            Upload company docs, ingest your help center, and deploy custom RAG-powered AI concierges that answer queries accurately with voice playback, real-time citations, and smart human escalation.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/register" className="w-full sm:w-auto">
              <ShinyButton size="lg" variant="glow" className="w-full sm:w-auto px-8 rounded-xl">
                Start Free Trial — No CC
                <ArrowRight className="h-4 w-4 ml-1" />
              </ShinyButton>
            </Link>
            <Link href="#demo" className="w-full sm:w-auto">
              <ShinyButton size="lg" variant="secondary" className="w-full sm:w-auto px-8 rounded-xl">
                Explore Live Demo
              </ShinyButton>
            </Link>
          </motion.div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm font-medium text-slate-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Free tier available
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> 5-minute easy setup
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Razorpay & Stripe ready
            </span>
          </div>
        </div>

        {/* Hero Interactive Preview Card */}
        <div id="demo" className="relative max-w-4xl mx-auto">
          <div className="absolute -inset-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur-xl opacity-30 animate-pulse" />
          
          <div className="relative rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-2xl overflow-hidden">
            {/* Mock Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-xs font-medium text-slate-400">
                  Live Preview: Conciergo Assistant
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-semibold text-emerald-400">Online & Trained</span>
              </div>
            </div>

            {/* Mock Chat Body */}
            <div className="p-6 md:p-8 space-y-4 bg-gradient-to-b from-slate-50/50 to-white">
              {/* User message */}
              <div className="flex justify-end">
                <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl rounded-tr-xs text-sm max-w-md shadow-sm">
                  How does Conciergo handle custom domain embedding and webhook routing?
                </div>
              </div>

              {/* Bot response */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white flex-shrink-0 shadow-sm shadow-indigo-600/30">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-white border border-slate-200/90 p-4 rounded-2xl rounded-tl-xs text-sm text-slate-800 max-w-lg shadow-sm space-y-2">
                  <p className="leading-relaxed">
                    Conciergo embeds directly into any website using a single lightweight script tag. For routing:
                  </p>
                  <ul className="space-y-1 text-xs text-slate-600 list-disc list-inside">
                    <li>Supports custom CNAME domain mappings</li>
                    <li>Dispatches real-time webhooks on negative user sentiment</li>
                    <li>Seamless n8n workflows for automated human agent handoff</li>
                  </ul>
                  <div className="pt-2 flex items-center gap-2 border-t border-slate-100 text-[11px] text-slate-400 font-medium">
                    <Sparkles className="h-3 w-3 text-indigo-500" />
                    <span>Source: Docs/Integrations.pdf (Page 4) • Verified</span>
                  </div>
                </div>
              </div>

              {/* Floating feature pills on the preview */}
              <div className="pt-4 flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-xs font-medium">
                  ⚡ 1.2s avg response
                </span>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-medium">
                  🛡️ 100% Vector RAG Accuracy
                </span>
                <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded-full text-xs font-medium">
                  🎙️ Voice & Text-to-Speech
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-12 border-y border-slate-200/80 bg-white/60 backdrop-blur-md">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-extrabold text-slate-900">99.4%</div>
              <p className="text-xs md:text-sm font-medium text-slate-500 mt-1">Resolution Accuracy</p>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-extrabold text-slate-900">&lt; 1.5s</div>
              <p className="text-xs md:text-sm font-medium text-slate-500 mt-1">Response Latency</p>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-extrabold text-slate-900">40+</div>
              <p className="text-xs md:text-sm font-medium text-slate-500 mt-1">Languages Supported</p>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-extrabold text-slate-900">10M+</div>
              <p className="text-xs md:text-sm font-medium text-slate-500 mt-1">Messages Processed</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <BadgePill variant="indigo" className="mb-4">
            <span>Core Capabilities</span>
          </BadgePill>
          <h2 className="text-3xl md:text-5xl font-extrabold text-slate-950 tracking-tight mb-4">
            Engineered for Modern Teams
          </h2>
          <p className="text-slate-600 text-base md:text-lg">
            Everything your support operation needs to automate tier-1 requests and delight customers.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Upload,
              title: "Smart Knowledge Ingestion",
              desc: "Drag and drop PDFs, Markdown, TXT, or crawl public URLs. Automated chunking and high-dimension vector indexing.",
              color: "text-indigo-600",
              bgColor: "bg-indigo-50 border-indigo-100",
            },
            {
              icon: MessageSquare,
              title: "Contextual RAG AI",
              desc: "Powered by Groq and Qdrant. Context-grounded generation ensures zero hallucinations and trustworthy answers.",
              color: "text-purple-600",
              bgColor: "bg-purple-50 border-purple-100",
            },
            {
              icon: Globe,
              title: "Universal Embed & Widget",
              desc: "Deploy to WordPress, Shopify, Next.js, or React with a single copy-paste script tag. Fully customizable theme.",
              color: "text-blue-600",
              bgColor: "bg-blue-50 border-blue-100",
            },
            {
              icon: BarChart3,
              title: "NL2SQL & Sentiment Analytics",
              desc: "Ask natural language questions to query conversation databases and discover user frustration before it escalates.",
              color: "text-emerald-600",
              bgColor: "bg-emerald-50 border-emerald-100",
            },
            {
              icon: Zap,
              title: "Workflow Automation",
              desc: "Trigger n8n webhooks, alert support agents in Slack/Discord, and automatically log support tickets.",
              color: "text-amber-600",
              bgColor: "bg-amber-50 border-amber-100",
            },
            {
              icon: Shield,
              title: "Enterprise Grade Silos",
              desc: "Strict workspace multi-tenancy, rate limiting, data encryption at rest, and complete privacy compliance.",
              color: "text-rose-600",
              bgColor: "bg-rose-50 border-rose-100",
            },
          ].map((feature) => (
            <SpotlightCard
              key={feature.title}
              className="p-8 border border-slate-200/80 bg-white/80 backdrop-blur-sm hover:border-slate-300"
              spotlightColor="rgba(99, 102, 241, 0.12)"
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 border ${feature.bgColor}`}
              >
                <feature.icon className={`h-6 w-6 ${feature.color}`} />
              </div>
              <h3 className="font-bold text-xl text-slate-950 mb-3 tracking-tight">
                {feature.title}
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {feature.desc}
              </p>
            </SpotlightCard>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 bg-gradient-to-b from-transparent via-slate-100/50 to-transparent">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <BadgePill variant="gradient" className="mb-4">
              <span>Predictable Pricing</span>
            </BadgePill>
            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-950 tracking-tight mb-4">
              Simple, Transparent Plans
            </h2>
            <p className="text-slate-600 text-base md:text-lg mb-8">
              Start free, scale as your customer volume grows.
            </p>

            {/* Monthly / Annual Switcher */}
            <div className="inline-flex items-center gap-3 p-1.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <button
                onClick={() => setIsAnnual(false)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  !isAnnual ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isAnnual ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Annual</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-700 px-1.5 py-0.5 rounded-md font-bold">
                  20% OFF
                </span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-stretch">
            {[
              {
                name: "Developer",
                price: "₹0",
                annualPrice: "₹0",
                desc: "Ideal for testing & side projects",
                features: [
                  "1 active chatbot",
                  "500 messages / month",
                  "10 knowledge documents",
                  "Standard latency",
                  "Community support",
                ],
                cta: "Start Free",
                highlighted: false,
              },
              {
                name: "Business",
                price: "₹499",
                annualPrice: "₹399",
                desc: "For startups & growing companies",
                features: [
                  "5 active chatbots",
                  "10,000 messages / month",
                  "Unlimited knowledge documents",
                  "Voice & Text-to-Speech support",
                  "Advanced analytics & sentiment",
                  "Priority support",
                ],
                cta: "Start 14-Day Free Trial",
                highlighted: true,
              },
              {
                name: "Enterprise",
                price: "₹999",
                annualPrice: "₹799",
                desc: "For high-traffic scale & compliance",
                features: [
                  "Unlimited chatbots",
                  "100,000 messages / month",
                  "NL2SQL analytics querying",
                  "Custom domain & full branding removal",
                  "Automated n8n agent routing",
                  "Dedicated SLA & 24/7 support",
                ],
                cta: "Upgrade to Enterprise",
                highlighted: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-3xl p-8 flex flex-col transition-all duration-300 relative ${
                  plan.highlighted
                    ? "bg-slate-950 text-white shadow-2xl border-2 border-indigo-500/50 md:-translate-y-2"
                    : "bg-white/90 border border-slate-200/90 text-slate-900 shadow-sm hover:shadow-lg"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-xs px-3.5 py-1 rounded-full shadow-md">
                    Most Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="font-bold text-xl tracking-tight mb-1">{plan.name}</h3>
                  <p className={`text-xs ${plan.highlighted ? "text-slate-400" : "text-slate-500"}`}>
                    {plan.desc}
                  </p>
                </div>

                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl md:text-5xl font-extrabold tracking-tight">
                    {isAnnual ? plan.annualPrice : plan.price}
                  </span>
                  <span className={`text-sm ${plan.highlighted ? "text-slate-400" : "text-slate-500"}`}>
                    / month
                  </span>
                </div>

                <div className="space-y-3.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2.5 text-xs font-medium">
                      <Check
                        className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                          plan.highlighted ? "text-indigo-400" : "text-indigo-600"
                        }`}
                      />
                      <span className={plan.highlighted ? "text-slate-300" : "text-slate-700"}>{f}</span>
                    </div>
                  ))}
                </div>

                <Link href="/register" className="mt-auto">
                  <ShinyButton
                    size="md"
                    variant={plan.highlighted ? "glow" : "primary"}
                    className="w-full rounded-xl py-3"
                  >
                    {plan.cta}
                  </ShinyButton>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-4 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <BadgePill variant="neutral" className="mb-3">
            <span>Got Questions?</span>
          </BadgePill>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-950 tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          {[
            {
              q: "How fast can I set up and deploy a chatbot?",
              a: "In under 5 minutes! Simply create an account, upload your knowledge documents (PDFs, docs, or web URLs), customize your bot's styling, and copy our one-line embed script tag into your website.",
            },
            {
              q: "Does Conciergo prevent hallucinations?",
              a: "Yes. Conciergo uses high-precision Vector Retrieval-Augmented Generation (RAG). The AI strictly grounds its answers in your verified documentation and can provide direct citations.",
            },
            {
              q: "Can I customize the colors, logos, and language?",
              a: "Absolutely. You have full control over the primary brand color, welcome greeting, bot avatar, support language, and voice/audio settings in your dashboard.",
            },
            {
              q: "How does human escalation work?",
              a: "When a customer requests human assistance or expresses negative sentiment, Conciergo triggers an automated webhook that notifies your support team via Slack, Discord, or n8n workflow.",
            },
          ].map((faq, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm overflow-hidden transition-all"
            >
              <button
                onClick={() => toggleFaq(index)}
                className="w-full px-6 py-5 text-left flex items-center justify-between font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                    activeFaq === index ? "rotate-180 text-indigo-600" : ""
                  }`}
                />
              </button>
              {activeFaq === index && (
                <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="py-20 px-4 max-w-6xl mx-auto mb-12">
        <div className="relative rounded-3xl bg-slate-950 text-white p-10 md:p-16 overflow-hidden shadow-2xl border border-slate-800">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 text-center max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              Ready to deploy your 24/7 AI support concierge?
            </h2>
            <p className="text-slate-400 text-sm md:text-base font-normal">
              Join forward-thinking companies deploying 24/7 intelligent chatbots and automated service with Conciergo.
            </p>
            <div className="pt-2 flex justify-center">
              <Link href="/register">
                <ShinyButton size="lg" variant="glow" className="px-8 rounded-xl">
                  Get Started Free Today
                  <ArrowRight className="h-4 w-4 ml-1" />
                </ShinyButton>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/70 backdrop-blur-md py-12 px-6">
        <div className="container mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-950 flex items-center justify-center shadow-xs">
              <Bot className="h-4 w-4 text-indigo-400" />
            </div>
            <span className="font-bold text-slate-900 text-sm">Conciergo Platform</span>
          </div>

          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Conciergo Platform. Built for Enterprise Reliability.
          </p>

          <div className="flex items-center gap-6 text-xs text-slate-500 font-medium">
            <Link href="/privacy" className="hover:text-slate-900 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-slate-900 transition-colors">
              Terms of Service
            </Link>
            <Link href="/docs" className="hover:text-slate-900 transition-colors">
              API Docs
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
