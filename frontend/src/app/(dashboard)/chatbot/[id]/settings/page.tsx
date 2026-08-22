"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Save,
  Trash2,
  Send,
  Unplug,
  CheckCircle,
  XCircle,
  Loader2,
  Bot,
  Sparkles,
  ExternalLink,
  Check,
  Palette,
  MessageSquare,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

interface Props {
  params: { id: string };
}

const COLOR_PRESETS = [
  { name: "Obsidian", value: "#0f172a" },
  { name: "Indigo Glow", value: "#4f46e5" },
  { name: "Emerald Mint", value: "#059669" },
  { name: "Royal Blue", value: "#2563eb" },
  { name: "Sunset Orange", value: "#ea580c" },
  { name: "Ruby Rose", value: "#e11d48" },
  { name: "Violet", value: "#7c3aed" },
  { name: "Cyan", value: "#0891b2" },
  { name: "Charcoal", value: "#27272a" },
];

const PROMPT_TEMPLATES = [
  {
    name: "Customer Support",
    prompt:
      "You are a friendly, helpful customer support representative. Greet users warmly and answer their questions clearly using only the provided knowledge base context. If information is not in the knowledge base, politely state that and offer assistance with related topics.",
  },
  {
    name: "Sales & Leads",
    prompt:
      "You are an enthusiastic product specialist. Explain product benefits clearly, answer pricing and feature queries strictly based on the knowledge base, and guide interested users toward signing up or contacting our sales team.",
  },
  {
    name: "Strict FAQ Agent",
    prompt:
      "You are an official FAQ assistant. Provide direct, concise, and 100% factually accurate answers exclusively based on official company documentation. Never speculate or hallucinate outside the retrieved context.",
  },
];

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "ta", name: "Tamil (தமிழ்)" },
  { code: "hi", name: "Hindi (हिन्दी)" },
  { code: "es", name: "Spanish (Español)" },
  { code: "fr", name: "French (Français)" },
  { code: "de", name: "German (Deutsch)" },
  { code: "pt", name: "Portuguese (Português)" },
  { code: "zh", name: "Chinese (中文)" },
  { code: "ja", name: "Japanese (日本語)" },
  { code: "ko", name: "Korean (한국어)" },
  { code: "ar", name: "Arabic (العربية)" },
  { code: "ru", name: "Russian (Русский)" },
  { code: "it", name: "Italian (Italiano)" },
];

export default function ChatbotSettingsPage({ params }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramStatus, setTelegramStatus] = useState<{
    hasToken: boolean;
    tokenPreview: string | null;
    isRunning: boolean;
  } | null>(null);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    businessName: "",
    description: "",
    systemPrompt: "",
    primaryColor: "#0f172a",
    welcomeMessage: "",
    language: "en",
    isActive: true,
  });

  useEffect(() => {
    fetch(`/api/chatbot/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setForm({
            name: data.name || "",
            businessName: data.businessName || "",
            description: data.description || "",
            systemPrompt: data.systemPrompt || "",
            primaryColor: data.primaryColor || "#0f172a",
            welcomeMessage: data.welcomeMessage || "Hello! How can I help you today?",
            language: data.language || "en",
            isActive: data.isActive ?? true,
          });
        }
      })
      .catch((err) => console.error("Error loading chatbot:", err))
      .finally(() => setInitialLoading(false));

    // Fetch Telegram status
    fetch(`/api/chatbot/${params.id}/telegram`)
      .then((r) => r.json())
      .then((data) => setTelegramStatus(data))
      .catch(() => {});
  }, [params.id]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/chatbot/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast({
          title: "✅ Settings saved successfully!",
          description: "All changes (brand color, personality, welcome message) are live.",
        });
      } else {
        toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure? This will delete the chatbot and all its data permanently.")) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/chatbot/${params.id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Chatbot deleted", description: "The chatbot has been removed." });
        router.push("/chatbot");
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete chatbot.", variant: "destructive" });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleTelegramConnect = async () => {
    if (!telegramToken.trim()) {
      toast({ title: "Error", description: "Please enter a bot token.", variant: "destructive" });
      return;
    }
    setTelegramLoading(true);
    try {
      const res = await fetch(`/api/chatbot/${params.id}/telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: telegramToken.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: "✅ Telegram Connected!",
          description: "Your bot is live. Search for it in Telegram and start chatting!",
        });
        setTelegramToken("");
        const statusRes = await fetch(`/api/chatbot/${params.id}/telegram`);
        setTelegramStatus(await statusRes.json());
      } else {
        toast({ title: "Connection Failed", description: data.error || "Invalid bot token.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to connect Telegram bot.", variant: "destructive" });
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleTelegramDisconnect = async () => {
    setTelegramLoading(true);
    try {
      await fetch(`/api/chatbot/${params.id}/telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "" }),
      });
      toast({ title: "Telegram Disconnected", description: "The bot has been stopped." });
      setTelegramStatus({ hasToken: false, tokenPreview: null, isRunning: false });
    } catch {
      toast({ title: "Error", description: "Failed to disconnect.", variant: "destructive" });
    } finally {
      setTelegramLoading(false);
    }
  };

  const update = (key: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const activeColor = form.primaryColor || "#0f172a";

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/chatbot/${params.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Chatbot Settings</h1>
            <p className="text-sm text-gray-500 mt-0.5">Customize appearance, personality, and features</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href={`/chatbot/${params.id}/preview`} target="_blank">
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Open Live Preview
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={loading} className="bg-black text-white hover:bg-gray-800">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Settings
          </Button>
        </div>
      </div>

      {/* Main Grid: Settings on Left, Live Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Appearance & Branding */}
          <Card className="border-gray-200 shadow-xs">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-lg">Appearance & Brand Color</CardTitle>
              </div>
              <CardDescription>Choose the primary brand color for your chatbot theme</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Color Presets */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Preset Palettes</Label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                  {COLOR_PRESETS.map((preset) => {
                    const isSelected = form.primaryColor.toLowerCase() === preset.value.toLowerCase();
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => update("primaryColor", preset.value)}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all text-left ${
                          isSelected
                            ? "border-black ring-2 ring-black/10 bg-gray-50"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-lg shadow-xs flex items-center justify-center text-white"
                          style={{ backgroundColor: preset.value }}
                        >
                          {isSelected && <Check className="h-4 w-4" />}
                        </div>
                        <span className="text-[11px] font-medium text-gray-700 truncate w-full text-center">
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Color Input */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Custom Brand Color</Label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="color"
                      id="customColorPicker"
                      value={form.primaryColor}
                      onChange={(e) => update("primaryColor", e.target.value)}
                      className="h-11 w-20 rounded-xl cursor-pointer border border-gray-300 p-1 bg-white shadow-xs"
                    />
                  </div>
                  <div className="flex-1 max-w-[200px]">
                    <Input
                      value={form.primaryColor}
                      onChange={(e) => update("primaryColor", e.target.value)}
                      placeholder="#0f172a"
                      className="font-mono text-sm uppercase"
                    />
                  </div>
                  <div
                    className="h-11 px-4 rounded-xl flex items-center gap-2 text-white font-medium text-xs shadow-xs"
                    style={{ backgroundColor: activeColor }}
                  >
                    <span>Selected</span>
                  </div>
                </div>
              </div>

              {/* Language */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Primary Language</Label>
                <select
                  value={form.language}
                  onChange={(e) => update("language", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  Voice recognition, text-to-speech, and default answers will be tuned to this language.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 2. General Settings */}
          <Card className="border-gray-200 shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">General Settings</CardTitle>
              <CardDescription>Display names and active status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="botName">Chatbot Name</Label>
                <Input
                  id="botName"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Support Bot"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bizName">Business Name</Label>
                <Input
                  id="bizName"
                  value={form.businessName}
                  onChange={(e) => update("businessName", e.target.value)}
                  placeholder="Acme Corp"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="botDesc">Description (Internal)</Label>
                <Textarea
                  id="botDesc"
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  rows={2}
                  placeholder="Support assistant for website visitors..."
                />
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">Active Status</Label>
                  <p className="text-xs text-gray-500">When inactive, new chat queries will be paused.</p>
                </div>
                <Switch checked={form.isActive} onCheckedChange={(val) => update("isActive", val)} />
              </div>
            </CardContent>
          </Card>

          {/* 3. AI Personality & Welcome */}
          <Card className="border-gray-200 shadow-xs">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">AI Personality & Greeting</CardTitle>
                  <CardDescription>Define system behavior and greeting message</CardDescription>
                </div>
                <Wand2 className="h-5 w-5 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Welcome message */}
              <div className="space-y-2">
                <Label htmlFor="welcomeMsg">Welcome Greeting Message</Label>
                <Textarea
                  id="welcomeMsg"
                  value={form.welcomeMessage}
                  onChange={(e) => update("welcomeMessage", e.target.value)}
                  rows={2}
                  placeholder="Hello! How can I help you today?"
                />
                <p className="text-xs text-gray-500">The first greeting bubble customers see when opening the chat.</p>
              </div>

              {/* System Prompt Template buttons */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Quick Prompt Templates
                </Label>
                <div className="flex flex-wrap gap-2">
                  {PROMPT_TEMPLATES.map((tmpl) => (
                    <Button
                      key={tmpl.name}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => update("systemPrompt", tmpl.prompt)}
                      className="text-xs h-8 rounded-lg hover:bg-gray-100"
                    >
                      {tmpl.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* System Prompt Textarea */}
              <div className="space-y-2">
                <Label htmlFor="sysPrompt">System Instructions</Label>
                <Textarea
                  id="sysPrompt"
                  value={form.systemPrompt}
                  onChange={(e) => update("systemPrompt", e.target.value)}
                  rows={6}
                  placeholder="You are a helpful AI customer-support assistant..."
                />
                <p className="text-xs text-gray-500">
                  Grounding rules and retrieved knowledge base context are attached automatically by the RAG engine.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 4. Telegram Integration */}
          <Card className="border-gray-200 shadow-xs">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-black rounded-lg flex items-center justify-center">
                  <Send className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Telegram Integration</CardTitle>
                  <CardDescription>Deploy this chatbot as a 24/7 Telegram bot</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {telegramStatus && (
                <div
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${
                    telegramStatus.isRunning ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-gray-50 border-gray-200 text-gray-700"
                  }`}
                >
                  {telegramStatus.isRunning ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                      <span className="text-sm font-medium">
                        Connected &amp; Running — Token: {telegramStatus.tokenPreview}
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-gray-400 shrink-0" />
                      <span className="text-sm">Not connected</span>
                    </>
                  )}
                </div>
              )}

              {!telegramStatus?.isRunning ? (
                <>
                  <div className="space-y-2">
                    <Label>Bot Token</Label>
                    <Input
                      type="password"
                      placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz..."
                      value={telegramToken}
                      onChange={(e) => setTelegramToken(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Get a token from{" "}
                      <a
                        href="https://t.me/BotFather"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-medium text-black"
                      >
                        @BotFather
                      </a>{" "}
                      on Telegram.
                    </p>
                  </div>
                  <Button
                    onClick={handleTelegramConnect}
                    disabled={telegramLoading || !telegramToken.trim()}
                    className="w-full bg-black hover:bg-gray-800 text-white"
                  >
                    {telegramLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Connect Telegram Bot
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleTelegramDisconnect}
                  disabled={telegramLoading}
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                >
                  {telegramLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Disconnecting...
                    </>
                  ) : (
                    <>
                      <Unplug className="mr-2 h-4 w-4" />
                      Disconnect Telegram Bot
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Action buttons & Danger Zone */}
          <div className="flex items-center gap-3 pt-4">
            <Button onClick={handleSave} disabled={loading} className="flex-1 bg-black text-white hover:bg-gray-800 h-11">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save All Changes
            </Button>
            <Button
              onClick={handleDelete}
              variant="destructive"
              disabled={deleteLoading}
              className="h-11 px-5"
            >
              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Right Column: Sticky Live Interactive Preview */}
        <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-gray-600" />
              <h3 className="font-bold text-sm text-gray-800">Live Appearance Preview</h3>
            </div>
            <span className="text-[11px] font-medium bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              Real-time
            </span>
          </div>

          {/* Simulated Chat Window Widget */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 flex flex-col h-[540px]">
            {/* Header */}
            <div
              className="px-4 py-3.5 text-white flex items-center gap-3 relative shadow-sm transition-colors duration-300"
              style={{ backgroundColor: activeColor }}
            >
              <div
                className="w-9 h-9 rounded-xl bg-white shadow-xs flex items-center justify-center flex-shrink-0"
                style={{ color: activeColor }}
              >
                <Bot className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-sm leading-none truncate">{form.name || "My Chatbot"}</p>
                  <Sparkles className="h-3 w-3 opacity-80 shrink-0" />
                </div>
                <p className="text-[11px] opacity-85 mt-1 truncate">{form.businessName || "My Business"}</p>
              </div>
              <div className="flex items-center gap-1.5 bg-black/15 px-2 py-0.5 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-medium">Online</span>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-4 space-y-3.5 overflow-y-auto bg-gradient-to-b from-gray-50/80 to-white text-xs">
              {/* Bot Greeting Message */}
              <div className="flex items-end gap-2 justify-start">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                  style={{ backgroundColor: activeColor }}
                >
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="max-w-[85%] bg-gray-100 text-gray-900 border border-gray-200 rounded-2xl rounded-bl-xs px-3.5 py-2.5 leading-relaxed shadow-2xs">
                  {form.welcomeMessage || "Hello! How can I help you today?"}
                </div>
              </div>

              {/* Sample User Message */}
              <div className="flex items-end gap-2 justify-end">
                <div
                  className="max-w-[85%] text-white rounded-2xl rounded-br-xs px-3.5 py-2.5 leading-relaxed shadow-sm transition-colors duration-300"
                  style={{ backgroundColor: activeColor }}
                >
                  What services or products do you offer?
                </div>
              </div>

              {/* Sample Bot Response */}
              <div className="flex items-end gap-2 justify-start">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                  style={{ backgroundColor: activeColor }}
                >
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="max-w-[85%] bg-gray-100 text-gray-900 border border-gray-200 rounded-2xl rounded-bl-xs px-3.5 py-2.5 leading-relaxed shadow-2xs">
                  We offer 24/7 AI-powered customer support, instant document question answering, and seamless website integration! ✨
                </div>
              </div>
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-gray-100 bg-white">
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 p-1.5 px-3">
                <input
                  type="text"
                  readOnly
                  placeholder={`Ask a question in ${form.language.toUpperCase()}...`}
                  className="flex-1 bg-transparent text-xs outline-none text-gray-400"
                />
                <button
                  type="button"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-xs transition-colors duration-300"
                  style={{ backgroundColor: activeColor }}
                >
                  <Send className="h-3 w-3" />
                </button>
              </div>
              <p className="text-[10px] text-gray-400 text-center mt-2">
                Powered by <span className="font-medium">Conciergo</span> · Live Preview
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p>
              Changes to <strong>Brand Color</strong>, <strong>Chatbot Name</strong>, and <strong>Welcome Message</strong> apply immediately across the web widget, standalone chat, and embed snippet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
