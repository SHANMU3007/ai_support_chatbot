interface Props {
  primaryColor: string;
}

export function TypingIndicator({ primaryColor }: Props) {
  return (
    <div className="flex items-end gap-2 justify-start">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0"
        style={{ backgroundColor: primaryColor }}
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
          <path
            d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"
            fill="currentColor"
          />
        </svg>
      </div>
      <div className="bg-gray-100 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
