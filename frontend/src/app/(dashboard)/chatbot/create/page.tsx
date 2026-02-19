"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Bot, Check } from "lucide-react";

const STEPS = ["Basic Info", "Personality", "Welcome", "Review"];

export default function CreateChatbotPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    businessName: "",
    description: "",
    systemPrompt: "",
    primaryColor: "#6366f1",
    welcomeMessage: "Hi! How can I help you today?",
    language: "en",
  });

  const updateForm = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/chatbot/${data.id}/training`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Create New Chatbot</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i < step
                  ? "bg-green-500 text-white"
                  : i === step
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-sm ${i === step ? "text-gray-900 font-medium" : "text-gray-500"}`}>
              {s}
            </span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-indigo-600" />
            {STEPS[step]}
          </CardTitle>
          <CardDescription>
            {step === 0 && "Tell us about your business"}
            {step === 1 && "Define your chatbot's personality and behavior"}
            {step === 2 && "Customize the welcome experience"}
            {step === 3 && "Review and create your chatbot"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Chatbot Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Support Bot"
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  placeholder="e.g., Acme Store"
                  value={form.businessName}
                  onChange={(e) => updateForm("businessName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Briefly describe what this chatbot handles..."
                  value={form.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  rows={3}
                />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="systemPrompt">System Prompt *</Label>
                <Textarea
                  id="systemPrompt"
                  placeholder={`You are a helpful support agent for ${form.businessName || "our business"}. You help customers with questions about products, orders, and services. Always be friendly and professional. If you don't know the answer, say so politely.`}
                  value={form.systemPrompt}
                  onChange={(e) => updateForm("systemPrompt", e.target.value)}
                  rows={8}
                />
                <p className="text-xs text-gray-500">
                  This defines how your chatbot behaves. The knowledge base content will be
                  appended automatically.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Brand Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="primaryColor"
                    value={form.primaryColor}
                    onChange={(e) => updateForm("primaryColor", e.target.value)}
                    className="h-10 w-20 rounded cursor-pointer border"
                  />
                  <Input
                    value={form.primaryColor}
                    onChange={(e) => updateForm("primaryColor", e.target.value)}
                    className="w-32"
                  />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="welcomeMessage">Welcome Message</Label>
                <Textarea
                  id="welcomeMessage"
                  value={form.welcomeMessage}
                  onChange={(e) => updateForm("welcomeMessage", e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Default Language</Label>
                <select
                  id="language"
                  value={form.language}
                  onChange={(e) => updateForm("language", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="pt">Portuguese</option>
                  <option value="zh">Chinese</option>
                  <option value="ja">Japanese</option>
                  <option value="ar">Arabic</option>
                </select>
              </div>

              {/* Live preview */}
              <div className="mt-4 p-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-500 mb-3 font-medium">PREVIEW</p>
                <div className="flex flex-col gap-2">
                  <div
                    className="self-start px-4 py-2 rounded-2xl text-white text-sm max-w-xs"
                    style={{ backgroundColor: form.primaryColor }}
                  >
                    {form.welcomeMessage || "Hi! How can I help you today?"}
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Chatbot Name</span>
                  <span className="font-medium">{form.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Business</span>
                  <span className="font-medium">{form.businessName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Language</span>
                  <span className="font-medium">{form.language}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Brand Color</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full"
                      style={{ backgroundColor: form.primaryColor }}
                    />
                    <span className="font-medium">{form.primaryColor}</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                After creating, you&apos;ll be taken to the training page to upload your knowledge
                base.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 pt-4">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button
                className="ml-auto"
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 0 && (!form.name || !form.businessName)) ||
                  (step === 1 && !form.systemPrompt)
                }
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button className="ml-auto" onClick={handleCreate} disabled={loading}>
                {loading ? "Creating..." : "Create Chatbot"}
                <Bot className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
