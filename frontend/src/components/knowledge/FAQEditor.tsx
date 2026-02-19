"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Send, CheckCircle } from "lucide-react";

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

interface Props {
  chatbotId: string;
}

export function FAQEditor({ chatbotId }: Props) {
  const [faqs, setFaqs] = useState<FAQ[]>([{ id: "1", question: "", answer: "" }]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const addFAQ = () => {
    setFaqs((prev) => [...prev, { id: Date.now().toString(), question: "", answer: "" }]);
  };

  const removeFAQ = (id: string) => {
    setFaqs((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFAQ = (id: string, field: "question" | "answer", value: string) => {
    setFaqs((prev) => prev.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  };

  const handleSave = async () => {
    const valid = faqs.filter((f) => f.question.trim() && f.answer.trim());
    if (!valid.length) return;

    setSaving(true);
    try {
      const res = await fetch("/api/knowledge/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatbotId, faqs: valid }),
      });

      if (res.ok) {
        setSaved(true);
        setFaqs([{ id: "1", question: "", answer: "" }]);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Add question-answer pairs. Your chatbot will use these to answer customer questions.
      </p>

      {faqs.map((faq, index) => (
        <div key={faq.id} className="bg-white border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">FAQ #{index + 1}</span>
            {faqs.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFAQ(faq.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="space-y-2">
            <Label>Question</Label>
            <Input
              placeholder="e.g., What are your business hours?"
              value={faq.question}
              onChange={(e) => updateFAQ(faq.id, "question", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Answer</Label>
            <Textarea
              placeholder="e.g., We're open Monday to Friday, 9am to 5pm EST."
              value={faq.answer}
              onChange={(e) => updateFAQ(faq.id, "answer", e.target.value)}
              rows={3}
            />
          </div>
        </div>
      ))}

      <div className="flex gap-3">
        <Button variant="outline" onClick={addFAQ}>
          <Plus className="mr-2 h-4 w-4" />
          Add Another FAQ
        </Button>
        <Button onClick={handleSave} disabled={saving} className="ml-auto">
          {saved ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Saved!
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save & Train"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
