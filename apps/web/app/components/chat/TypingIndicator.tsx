export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 mt-1 ml-1">
      <span
        className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 animate-bounce"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 animate-bounce"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 animate-bounce"
        style={{ animationDelay: "300ms" }}
      />
    </div>
  );
}

