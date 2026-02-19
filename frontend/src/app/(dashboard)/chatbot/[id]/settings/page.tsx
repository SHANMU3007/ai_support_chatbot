"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
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
