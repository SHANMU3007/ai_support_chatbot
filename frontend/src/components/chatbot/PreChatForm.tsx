"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Phone, Mail, MessageSquare, ArrowRight, Loader2, CheckCircle } from "lucide-react";

export interface UserDetailField {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "select" | "radio";
  required: boolean;
  options?: string[]; // For select/radio types
}

export interface CollectedUserDetails {
  [fieldId: string]: string;
}

interface PreChatFormProps {
  chatbotName: string;
  businessName: string;
  primaryColor: string;
  welcomeMessage: string;
  fields: UserDetailField[];
  onSubmit: (details: CollectedUserDetails) => void;
}

const FIELD_ICON = {
  text: User,
  email: Mail,
  phone: Phone,
  select: MessageSquare,
  radio: MessageSquare,
};

export function PreChatForm({
  chatbotName,
  businessName,
  primaryColor,
  welcomeMessage,
  fields,
  onSubmit,
}: PreChatFormProps) {
  const [values, setValues] = useState<CollectedUserDetails>({});
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (id: string, value: string) => {
    setValues((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    const newErrors: Record<string, string> = {};
    fields.forEach((f) => {
      if (f.required && !values[f.id]?.trim()) {
        newErrors[f.id] = "This field is required";
      }
      if (f.type === "email" && values[f.id]) {
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRe.test(values[f.id])) {
          newErrors[f.id] = "Please enter a valid email address";
        }
      }
      if (f.type === "phone" && values[f.id]) {
        const phoneRe = /^[\d\s\+\-\(\)]{7,15}$/;
        if (!phoneRe.test(values[f.id])) {
          newErrors[f.id] = "Please enter a valid phone number";
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    // Brief delay for UX feel
    await new Promise((r) => setTimeout(r, 400));
    onSubmit(values);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full bg-white dark:bg-slate-900"
    >
      {/* Header — same as ChatWindow header style */}
      <div
        className="px-5 py-4 text-white shadow-md relative z-10"
        style={{ backgroundColor: primaryColor || "#4f46e5" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-sm leading-none">{chatbotName}</p>
            <p className="text-[11px] opacity-80 mt-1 font-medium">{businessName}</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5 bg-gradient-to-b from-slate-50/90 to-white dark:from-slate-900 dark:to-slate-950">
        {/* Welcome prompt */}
        <div className="text-center space-y-2 pb-2">
          <div
            className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-white shadow-lg"
            style={{ backgroundColor: primaryColor }}
          >
            <User className="h-7 w-7" />
          </div>
          <p className="font-bold text-slate-900 dark:text-white text-sm">
            {welcomeMessage || "Let's chat! Fill in a few details to get started."}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Your information helps us assist you better.
          </p>
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          {fields.map((field) => {
            const Icon = FIELD_ICON[field.type] || User;
            const hasError = !!errors[field.id];

            return (
              <div key={field.id} className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  {field.label}
                  {field.required && (
                    <span className="text-red-500 ml-0.5">*</span>
                  )}
                </label>

                {(field.type === "text" ||
                  field.type === "email" ||
                  field.type === "phone") && (
                  <div className="relative">
                    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type={field.type === "phone" ? "tel" : field.type}
                      value={values[field.id] || ""}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      placeholder={
                        field.type === "email"
                          ? "you@example.com"
                          : field.type === "phone"
                          ? "+91 98765 43210"
                          : `Enter ${field.label.toLowerCase()}`
                      }
                      className={`w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border transition-all focus:outline-none focus:ring-2 bg-white dark:bg-slate-800 dark:text-white ${
                        hasError
                          ? "border-red-400 focus:ring-red-400/30"
                          : "border-slate-200 dark:border-slate-700 focus:border-indigo-400 focus:ring-indigo-400/20"
                      }`}
                    />
                  </div>
                )}

                {field.type === "select" && field.options && (
                  <select
                    value={values[field.id] || ""}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    className={`w-full px-3 py-2.5 text-sm rounded-xl border transition-all focus:outline-none focus:ring-2 bg-white dark:bg-slate-800 dark:text-white appearance-none ${
                      hasError
                        ? "border-red-400 focus:ring-red-400/30"
                        : "border-slate-200 dark:border-slate-700 focus:border-indigo-400 focus:ring-indigo-400/20"
                    }`}
                  >
                    <option value="">Select an option</option>
                    {field.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}

                {field.type === "radio" && field.options && (
                  <div className="space-y-2">
                    {field.options.map((opt) => (
                      <label
                        key={opt}
                        className="flex items-center gap-2.5 cursor-pointer group"
                      >
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                            values[field.id] === opt
                              ? "border-indigo-600 bg-indigo-600"
                              : "border-slate-300 group-hover:border-indigo-400"
                          }`}
                          onClick={() => handleChange(field.id, opt)}
                        >
                          {values[field.id] === opt && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <span
                          className="text-sm text-slate-700 dark:text-slate-300"
                          onClick={() => handleChange(field.id, opt)}
                        >
                          {opt}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {hasError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <span>⚠</span> {errors[field.id]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Submit button */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-white font-bold text-sm transition-all shadow-md active:scale-[0.98] disabled:opacity-70"
          style={{ backgroundColor: primaryColor || "#4f46e5" }}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Starting chat...
            </>
          ) : (
            <>
              Start the chat
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
