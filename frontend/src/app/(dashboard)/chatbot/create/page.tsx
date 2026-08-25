"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  Plus,
  Trash2,
  EyeOff,
  User,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

const STEPS = ["Basic Info", "Personality", "Welcome", "White-Label & Form", "Review"];

const LANG_NAMES: Record<string, string> = {
  en: "English", ta: "Tamil (தமிழ்)", hi: "Hindi (हिन्दी)",
  es: "Spanish", fr: "French", de: "German",
  pt: "Portuguese", zh: "Chinese", ja: "Japanese", ar: "Arabic",
};

interface UserDetailField {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "select" | "radio";
  required: boolean;
  options?: string[];
}

export default function CreateChatbotPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    businessName: "",
    description: "",
    systemPrompt: "",
    primaryColor: "#000000",
    welcomeMessage: "Hi! How can I help you today?",
    language: "en",
    // White-label
    whiteLabelEnabled: false,
    whiteLabelBrand: "",
    // Pre-chat form
    requireUserDetails: false,
    userDetailFields: [] as UserDetailField[],
  });

  const updateForm = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Default fields preset when user enables pre-chat form
  const enablePreChatForm = (enabled: boolean) => {
    updateForm("requireUserDetails", enabled);
    if (enabled && form.userDetailFields.length === 0) {
      setForm((prev) => ({
        ...prev,
        requireUserDetails: true,
        userDetailFields: [
          { id: "name", label: "Name", type: "text", required: true },
          { id: "mobile", label: "Mobile", type: "phone", required: true },
          { id: "email", label: "E-mail", type: "email", required: false },
        ],
      }));
    }
  };

  const addField = () => {
    const newField: UserDetailField = {
      id: `field_${Date.now()}`,
      label: "Custom Question",
      type: "text",
      required: false,
    };
    setForm((prev) => ({
      ...prev,
      userDetailFields: [...prev.userDetailFields, newField],
    }));
  };

  const updateField = (id: string, key: keyof UserDetailField, value: any) => {
    setForm((prev) => ({
      ...prev,
      userDetailFields: prev.userDetailFields.map((f) =>
        f.id === id ? { ...f, [key]: value } : f
      ),
    }));
  };

  const removeField = (id: string) => {
    setForm((prev) => ({
      ...prev,
      userDetailFields: prev.userDetailFields.filter((f) => f.id !== id),
    }));
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
      } else {
        alert("Failed to create chatbot: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error(error);
      alert("Network error: Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return form.name.trim() && form.businessName.trim();
    if (step === 1) return form.systemPrompt.trim();
    return true;
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
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1 shrink-0">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                i < step
                  ? "bg-green-500 text-white"
                  : i === step
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-xs ${i === step ? "text-gray-900 font-medium" : "text-gray-400"}`}>
              {s}
            </span>
            {i < STEPS.length - 1 && <div className="w-4 h-px bg-gray-200" />}
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
            {step === 3 && "White-label branding and pre-chat user details form"}
            {step === 4 && "Review and create your chatbot"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ─── STEP 0: Basic Info ─── */}
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

          {/* ─── STEP 1: Personality ─── */}
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="systemPrompt">System Prompt *</Label>
                <Textarea
                  id="systemPrompt"
                  placeholder={`You are a helpful support agent for ${form.businessName || "our business"}. You help customers with questions about products, orders, and services. Always be friendly and professional.`}
                  value={form.systemPrompt}
                  onChange={(e) => updateForm("systemPrompt", e.target.value)}
                  rows={8}
                />
                <p className="text-xs text-gray-500">
                  This defines how your chatbot behaves. Knowledge base content will be appended automatically.
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

          {/* ─── STEP 2: Welcome ─── */}
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
                  {Object.entries(LANG_NAMES).map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
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

          {/* ─── STEP 3: White-Label & Pre-chat Form ─── */}
          {step === 3 && (
            <div className="space-y-6">
              {/* White-label card */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-slate-900 text-white mt-0.5">
                      <EyeOff className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">White-Label Mode</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Hide "Powered by Conciergo" — your clients see only your brand.
                        This is a <span className="font-semibold text-indigo-600">paid add-on</span> and
                        will add ₹499/mo to your plan.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={form.whiteLabelEnabled}
                    onCheckedChange={(val) => updateForm("whiteLabelEnabled", val)}
                  />
                </div>

                {form.whiteLabelEnabled && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <Label className="text-xs font-semibold text-slate-600">
                      Custom Brand Name (shown to end-users)
                    </Label>
                    <Input
                      placeholder={form.businessName || "Your Brand Name"}
                      value={form.whiteLabelBrand}
                      onChange={(e) => updateForm("whiteLabelBrand", e.target.value)}
                    />
                    <p className="text-xs text-slate-500">
                      Leave blank to use your Business Name: <strong>{form.businessName}</strong>
                    </p>
                  </div>
                )}
              </div>

              {/* Pre-chat form card */}
              <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-indigo-600 text-white mt-0.5">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">Pre-chat User Details Form</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Collect visitor details (Name, Mobile, Email, etc.) before the chat starts —
                        like LiveChat. Helps identify your leads.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={form.requireUserDetails}
                    onCheckedChange={enablePreChatForm}
                  />
                </div>

                {form.requireUserDetails && (
                  <div className="space-y-3 pt-2 border-t border-indigo-100">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Form Fields
                    </p>

                    {form.userDetailFields.map((field) => (
                      <div
                        key={field.id}
                        className="bg-white rounded-xl border border-indigo-100 p-3 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <Input
                            value={field.label}
                            onChange={(e) => updateField(field.id, "label", e.target.value)}
                            placeholder="Field label"
                            className="flex-1 h-8 text-xs"
                          />
                          <select
                            value={field.type}
                            onChange={(e) => updateField(field.id, "type", e.target.value)}
                            className="text-xs border rounded-lg px-2 py-1.5 bg-white"
                          >
                            <option value="text">Text</option>
                            <option value="email">Email</option>
                            <option value="phone">Phone</option>
                            <option value="select">Dropdown</option>
                            <option value="radio">Radio</option>
                          </select>
                          <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => updateField(field.id, "required", e.target.checked)}
                              className="rounded"
                            />
                            Required
                          </label>
                          <button
                            onClick={() => removeField(field.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {(field.type === "select" || field.type === "radio") && (
                          <div className="space-y-1">
                            <p className="text-[10px] text-slate-500 font-medium">Options (comma-separated)</p>
                            <Input
                              value={(field.options || []).join(", ")}
                              onChange={(e) =>
                                updateField(
                                  field.id,
                                  "options",
                                  e.target.value.split(",").map((o) => o.trim()).filter(Boolean)
                                )
                              }
                              placeholder="Yes, No, Maybe"
                              className="h-7 text-xs"
                            />
                          </div>
                        )}
                      </div>
                    ))}

                    <button
                      onClick={addField}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 text-xs font-semibold transition-all"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Field
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── STEP 4: Review ─── */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-4 space-y-2">
                {[
                  ["Chatbot Name", form.name],
                  ["Business", form.businessName],
                  ["Language", LANG_NAMES[form.language] ?? form.language],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium">{val}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Brand Color</span>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full" style={{ backgroundColor: form.primaryColor }} />
                    <span className="font-medium">{form.primaryColor}</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">White-Label</span>
                  <span className={`font-semibold ${form.whiteLabelEnabled ? "text-indigo-600" : "text-gray-400"}`}>
                    {form.whiteLabelEnabled ? `Enabled (${form.whiteLabelBrand || form.businessName})` : "Disabled"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Pre-chat Form</span>
                  <span className={`font-semibold ${form.requireUserDetails ? "text-indigo-600" : "text-gray-400"}`}>
                    {form.requireUserDetails
                      ? `${form.userDetailFields.length} field(s)`
                      : "Disabled"}
                  </span>
                </div>
              </div>

              {form.whiteLabelEnabled && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                  <p>
                    <strong>White-label add-on:</strong> ₹499/mo will be added to your subscription. You will be billed at your next cycle or prompted to upgrade.
                  </p>
                </div>
              )}

              <p className="text-sm text-gray-600">
                After creating, you&apos;ll be taken to the training page to upload your knowledge base.
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
                disabled={!canProceed()}
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
