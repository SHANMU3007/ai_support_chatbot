import Link from "next/link";
import { Button } from "@/components/ui/button";
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
  Blocks
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-black flex items-center justify-center">
              <Blocks className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">
              SupportIQ
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="#features"
              className="text-sm font-medium text-gray-500 hover:text-black transition-colors"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-medium text-gray-500 hover:text-black transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/docs"
              className="text-sm font-medium text-gray-500 hover:text-black transition-colors"
            >
              Documentation
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="font-semibold text-gray-600 hover:text-black hover:bg-gray-100 rounded-none">
                Sign in
              </Button>
            </Link>
            <Link href="/register">
              <Button
                size="sm"
                className="bg-black text-white hover:bg-gray-800 rounded-none font-semibold px-5"
              >
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center py-32 px-4 bg-white">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-6xl md:text-8xl font-black text-black mb-8 tracking-tighter leading-none">
            ENTERPRISE AI
            <br />
            SUPPORT.
          </h1>
          <p className="text-xl md:text-2xl text-gray-500 mb-12 max-w-2xl mx-auto font-light">
            Upload documents. Scrape your site. Deploy an intelligent chatbot that answers customer questions accurately, 24/7.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button
                size="lg"
                className="text-base px-10 h-14 bg-black text-white hover:bg-gray-800 rounded-none transition-all hover:-translate-y-1 font-semibold"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="text-base px-10 h-14 border-2 border-black text-black hover:bg-gray-50 rounded-none font-semibold"
              >
                View Demo
              </Button>
            </Link>
          </div>
          <div className="mt-12 flex items-center justify-center gap-6 text-sm font-medium text-gray-400">
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-black" /> Free forever plan
            </span>
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-black" /> Setup in 5 minutes
            </span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 bg-gray-50 border-t border-b border-gray-200">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-black tracking-tight mb-4">
              Powerful Infrastructure.
            </h2>
            <p className="text-xl text-gray-500 font-light">
              Everything required to scale support operations.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Upload,
                title: "Knowledge Base",
                desc: "Ingest PDFs, documents, or URLs. Automated chunking and vector indexing.",
              },
              {
                icon: MessageSquare,
                title: "Contextual AI",
                desc: "Retrieval-Augmented Generation ensures accurate, non-hallucinated responses.",
              },
              {
                icon: Globe,
                title: "Universal Embed",
                desc: "Deploy via a single script tag to any web application or CMS platform.",
              },
              {
                icon: BarChart3,
                title: "NL2SQL Analytics",
                desc: "Query your conversation data using natural language to uncover insights.",
              },
              {
                icon: Zap,
                title: "Workflow Automation",
                desc: "Route complex queries to human agents via n8n integration.",
              },
              {
                icon: Shield,
                title: "Enterprise Grade",
                desc: "Isolated data silos per tenant. Full encryption at rest and in transit.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="p-8 bg-white border border-gray-200 hover:border-black transition-colors duration-300"
              >
                <div className="w-12 h-12 bg-black flex items-center justify-center mb-6">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-xl text-black mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-500 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32 px-4 bg-white">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-black tracking-tight mb-4">
              Transparent Pricing.
            </h2>
            <p className="text-xl text-gray-500 font-light">
              Scale without surprises.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-0 border-t border-l border-gray-200">
            {[
              {
                name: "Developer",
                price: "$0",
                desc: "For testing & small projects",
                features: [
                  "1 active chatbot",
                  "500 messages/mo",
                  "10 documents",
                  "Community support",
                ],
                cta: "Start Free",
                highlighted: false,
              },
              {
                name: "Business",
                price: "$49",
                desc: "For growing companies",
                features: [
                  "5 active chatbots",
                  "10,000 messages/mo",
                  "Unlimited documents",
                  "Advanced analytics",
                  "Priority support",
                ],
                cta: "Start Trial",
                highlighted: true,
              },
              {
                name: "Enterprise",
                price: "$199",
                desc: "For scale & compliance",
                features: [
                  "Unlimited chatbots",
                  "100,000 messages/mo",
                  "NL2SQL querying",
                  "API access & webhooks",
                  "Custom domain",
                  "SLA",
                ],
                cta: "Contact Sales",
                highlighted: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`p-10 border-r border-b border-gray-200 flex flex-col ${
                  plan.highlighted
                    ? "bg-black text-white relative shadow-2xl z-10 scale-[1.05]"
                    : "bg-white"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white text-black font-bold text-xs px-3 py-1 uppercase tracking-wider border border-black hidden md:block">
                    Recommended
                  </div>
                )}
                <h3 className="font-bold text-lg uppercase tracking-wide mb-2">{plan.name}</h3>
                <p className={`text-sm mb-6 ${plan.highlighted ? "text-gray-400" : "text-gray-500"}`}>{plan.desc}</p>
                <div className="text-5xl font-black mb-8">
                  {plan.price}
                  <span className={`text-lg font-normal ${plan.highlighted ? "text-gray-400" : "text-gray-500"}`}>
                    /mo
                  </span>
                </div>
                <ul className="space-y-4 mb-auto pb-8">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-3 text-sm font-medium"
                    >
                      <Check
                        className={`h-5 w-5 flex-shrink-0 ${
                          plan.highlighted
                            ? "text-white"
                            : "text-black"
                        }`}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="mt-auto">
                  <Button
                    className={`w-full h-12 rounded-none font-bold tracking-wide uppercase ${
                      plan.highlighted
                        ? "bg-white text-black hover:bg-gray-200"
                        : "bg-black text-white hover:bg-gray-800"
                    }`}
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
      <footer className="bg-black text-white py-16 px-6 border-t border-gray-800">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-6 h-6 bg-white flex items-center justify-center">
                <Blocks className="h-3 w-3 text-black" />
              </div>
              <span className="font-bold text-lg tracking-tight">
                SupportIQ
              </span>
            </div>
            <p className="text-sm text-gray-500 font-medium tracking-wide">
              © {new Date().getFullYear()} SupportIQ Platform. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
