"use client";

import { useState } from "react";
import { Code, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  code: string;
  language: string;
}

export function EmbedCodeBlock({ code, language }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between bg-gray-800 text-gray-400 text-xs px-4 py-2 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Code className="h-3 w-3" />
          <span>{language}</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          className="h-6 px-2 text-gray-400 hover:text-white"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>
      <pre className="bg-gray-900 text-green-400 text-sm p-4 rounded-b-lg overflow-x-auto whitespace-pre-wrap break-all">
        <code>{code}</code>
      </pre>
    </div>
  );
}
