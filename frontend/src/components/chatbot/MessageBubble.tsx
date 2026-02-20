import { ChatMessage } from "@/hooks/useChat";
import { formatRelativeTime } from "@/lib/utils";
import { Bot, User } from "lucide-react";

interface Props {
  message: ChatMessage;
  primaryColor: string;
}

export function MessageBubble({ message, primaryColor }: Props) {
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={`flex items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
        isAssistant ? "justify-start" : "justify-end"
      }`}
    >
      {isAssistant && (
        <div className="w-8 h-8 flex items-center justify-center text-white flex-shrink-0 shadow-sm bg-black">
          <Bot className="h-4 w-4" />
        </div>
      )}

      <div className={`max-w-[80%] ${isAssistant ? "" : "items-end flex flex-col"}`}>
        <div
          className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
            isAssistant
              ? "bg-gray-100 text-gray-900 border border-gray-200"
              : "text-white shadow-sm bg-black"
          }`}
        >
          {message.content || (
            <span className="opacity-50 italic text-xs">thinking...</span>
          )}
        </div>
        <span className="text-[10px] text-gray-400 mt-1 px-1 select-none">
          {formatRelativeTime(message.timestamp)}
        </span>
      </div>

      {!isAssistant && (
        <div className="w-8 h-8 bg-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm border border-gray-300">
          <User className="h-4 w-4 text-gray-600" />
        </div>
      )}
    </div>
  );
}
