import { Bot } from "lucide-react";

interface Props {
  primaryColor: string;
}

export function TypingIndicator({ primaryColor }: Props) {
  return (
    <div className="flex items-end gap-2 justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="w-8 h-8 flex items-center justify-center text-white flex-shrink-0 shadow-sm bg-black">
        <Bot className="h-4 w-4" />
      </div>
      <div className="bg-white rounded-2xl rounded-bl-md px-5 py-3.5 flex items-center gap-1.5 border border-gray-100 shadow-sm">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full animate-bounce bg-black"
            style={{
              opacity: 0.6,
              animationDelay: `${i * 200}ms`,
              animationDuration: "1s",
            }}
          />
        ))}
      </div>
    </div>
  );
}
