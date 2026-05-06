interface TypingIndicatorProps {
  message?: string;
}

export function TypingIndicator({ message = "생각 중..." }: TypingIndicatorProps) {
  return (
    <div className="flex flex-col gap-1.5" aria-label="Assistant is typing">
      <style>
        {`
          @keyframes choonsimTypingDot {
            0%, 80%, 100% { transform: translateY(0); opacity: 0.7; }
            40% { transform: translateY(-9px); opacity: 1; }
          }
        `}
      </style>
      <div className="flex items-center gap-2 h-7">
        <span
          className="h-2.5 w-2.5 rounded-full bg-[#ff00dc] shadow-[0_0_10px_rgba(255,0,220,0.7)]"
          style={{ animation: "choonsimTypingDot 0.9s ease-in-out infinite", animationDelay: "0ms" }}
        />
        <span
          className="h-2.5 w-2.5 rounded-full bg-[#ff4ee8] shadow-[0_0_10px_rgba(255,78,232,0.7)]"
          style={{ animation: "choonsimTypingDot 0.9s ease-in-out infinite", animationDelay: "140ms" }}
        />
        <span
          className="h-2.5 w-2.5 rounded-full bg-[#ff8af0] shadow-[0_0_10px_rgba(255,138,240,0.7)]"
          style={{ animation: "choonsimTypingDot 0.9s ease-in-out infinite", animationDelay: "280ms" }}
        />
      </div>
      <span className="text-[11px] text-white/40 tracking-wide">{message}</span>
    </div>
  );
}
