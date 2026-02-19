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
    <div className={`flex items-end gap-2 ${isAssistant ? "justify-start" : "justify-end"}`}>
      {isAssistant && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0"
          style={{ backgroundColor: primaryColor }}
        >
          <Bot className="h-3.5 w-3.5" />
        </div>
      )}

      <div className={`max-w-[80%] ${isAssistant ? "" : "items-end flex flex-col"}`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isAssistant
              ? "bg-gray-100 text-gray-900 rounded-bl-none"
              : "text-white rounded-br-none"
          }`}
          style={!isAssistant ? { backgroundColor: primaryColor } : {}}
        >
          {message.content || (
            <span className="opacity-50 italic text-xs">typing...</span>
          )}
        </div>
        <span className="text-xs text-gray-400 mt-1 px-1">
          {formatRelativeTime(message.timestamp)}
        </span>
      </div>

      {!isAssistant && (
        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <User className="h-3.5 w-3.5 text-gray-500" />
        </div>
      )}
    </div>
  );
}
