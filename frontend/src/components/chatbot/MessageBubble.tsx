import { ChatMessage } from "@/hooks/useChat";
import { formatRelativeTime } from "@/lib/utils";
import { Bot, User, Volume2, VolumeX } from "lucide-react";

interface Props {
  message: ChatMessage;
  primaryColor: string;
  isSpeaking?: boolean;
  isCurrentSpeaking?: boolean;
  onSpeak?: (text: string, messageId: string) => void;
  onStopSpeak?: () => void;
  ttsSupported?: boolean;
}

export function MessageBubble({
  message,
  primaryColor,
  isSpeaking = false,
  isCurrentSpeaking = false,
  onSpeak,
  onStopSpeak,
  ttsSupported = false,
}: Props) {
  const isAssistant = message.role === "assistant";
  const hasContent = !!message.content && message.content !== "thinking...";

  const handleToggleTTS = () => {
    if (isCurrentSpeaking) {
      onStopSpeak?.();
    } else {
      onSpeak?.(message.content, message.id);
    }
  };

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

        {/* Footer with time and TTS button */}
        <div className="flex items-center gap-1.5 mt-1 px-1">
          <span className="text-[10px] text-gray-400 select-none">
            {formatRelativeTime(message.timestamp)}
          </span>

          {/* TTS button - only for assistant messages with content */}
          {isAssistant && hasContent && ttsSupported && (
            <button
              onClick={handleToggleTTS}
              className={`group relative p-1 rounded-md transition-all duration-200 ${
                isCurrentSpeaking
                  ? "text-blue-500 bg-blue-50 hover:bg-blue-100"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              }`}
              title={isCurrentSpeaking ? "Stop speaking" : "Listen to this message"}
              aria-label={isCurrentSpeaking ? "Stop speaking" : "Listen to this message"}
            >
              {isCurrentSpeaking ? (
                <div className="relative">
                  <VolumeX className="h-3.5 w-3.5" />
                  {/* Sound wave animation */}
                  <div className="absolute -right-1 top-0 flex items-center gap-[1px] h-full">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-[2px] bg-blue-400 rounded-full tts-wave-bar"
                        style={{
                          animationDelay: `${i * 0.15}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {!isAssistant && (
        <div className="w-8 h-8 bg-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm border border-gray-300">
          <User className="h-4 w-4 text-gray-600" />
        </div>
      )}
    </div>
  );
}
