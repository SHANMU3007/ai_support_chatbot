"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Trash2, Send, Unplug, CheckCircle, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

interface Props {
  params: { id: string };
}

export default function ChatbotSettingsPage({ params }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
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
    primaryColor: "#6366f1",
    welcomeMessage: "",
    language: "en",
    isActive: true,
  });

  useEffect(() => {
    fetch(`/api/chatbot/${params.id}`)
      .then((r) => r.json())
      .then((data) => setForm(data));

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
        toast({ title: "Settings saved!", description: "Your chatbot has been updated." });
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
        toast({ title: "✅ Telegram Connected!", description: "Your bot is live. Search for it in Telegram and start chatting!" });
        setTelegramToken("");
        // Refresh status
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

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href={`/chatbot/${params.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Chatbot Name</Label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Business Name</Label>
            <Input value={form.businessName} onChange={(e) => update("businessName", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={2} />
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={form.isActive}
              onCheckedChange={(val) => update("isActive", val)}
            />
            <Label>Active (accepting conversations)</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Personality</CardTitle>
          <CardDescription>How your chatbot responds to users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>System Prompt</Label>
            <Textarea
              value={form.systemPrompt}
              onChange={(e) => update("systemPrompt", e.target.value)}
              rows={6}
            />
          </div>
          <div className="space-y-2">
            <Label>Welcome Message</Label>
            <Textarea
              value={form.welcomeMessage}
              onChange={(e) => update("welcomeMessage", e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Brand Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.primaryColor}
                onChange={(e) => update("primaryColor", e.target.value)}
                className="h-10 w-20 rounded cursor-pointer border"
              />
              <Input
                value={form.primaryColor}
                onChange={(e) => update("primaryColor", e.target.value)}
                className="w-32"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Language</Label>
            <select
              value={form.language}
              onChange={(e) => update("language", e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="pt">Portuguese</option>
              <option value="zh">Chinese</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* ── Telegram Integration ── */}
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
              <Send className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>Telegram Integration</CardTitle>
              <CardDescription>Connect your chatbot to a Telegram bot</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Indicator */}
          {telegramStatus && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${
              telegramStatus.isRunning 
                ? "bg-green-50 border border-green-200" 
                : "bg-gray-50 border border-gray-200"
            }`}>
              {telegramStatus.isRunning ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700">
                    Connected &amp; Running — Token: {telegramStatus.tokenPreview}
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600">Not connected</span>
                </>
              )}
            </div>
          )}

          {/* Connect Form */}
          {!telegramStatus?.isRunning && (
            <>
              <div className="space-y-2">
                <Label>Bot Token</Label>
                <Input
                  type="password"
                  placeholder="Paste your Telegram Bot Token here..."
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Get a token from{" "}
                  <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                    @BotFather
                  </a>{" "}
                  on Telegram → send <code>/newbot</code> → copy the token.
                </p>
              </div>
              <Button
                onClick={handleTelegramConnect}
                disabled={telegramLoading || !telegramToken.trim()}
                className="w-full bg-black hover:bg-gray-800 text-white"
              >
                {telegramLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Connecting...</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" />Connect Telegram Bot</>
                )}
              </Button>
            </>
          )}

          {/* Disconnect Button */}
          {telegramStatus?.isRunning && (
            <Button
              onClick={handleTelegramDisconnect}
              disabled={telegramLoading}
              variant="outline"
              className="w-full border-red-200 text-red-600 hover:bg-red-50"
            >
              {telegramLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Disconnecting...</>
              ) : (
                <><Unplug className="mr-2 h-4 w-4" />Disconnect Telegram Bot</>
              )}
            </Button>
          )}

          {/* Instructions */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm text-gray-600">
            <p className="font-semibold text-gray-900">How to set up:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Open Telegram and search for <strong>@BotFather</strong></li>
              <li>Send <code>/newbot</code> and follow the prompts</li>
              <li>Copy the <strong>Bot Token</strong> and paste it above</li>
              <li>Click &quot;Connect Telegram Bot&quot;</li>
              <li>Search for your bot in Telegram and start chatting!</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={loading} className="flex-1">
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Saving..." : "Save Settings"}
        </Button>
        <Button onClick={handleDelete} variant="destructive" disabled={deleteLoading}>
          <Trash2 className="mr-2 h-4 w-4" />
          {deleteLoading ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </div>
  );
}
