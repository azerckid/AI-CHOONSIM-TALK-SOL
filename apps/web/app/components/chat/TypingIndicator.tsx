export function TypingIndicator() {
  return (
    <div className="flex h-7 items-center gap-1.5 mt-1 ml-1" aria-label="Assistant is typing">
      <style>
        {`
          @keyframes choonsimTypingDot {
            0%, 80%, 100% { transform: translateY(0); opacity: 0.7; }
            40% { transform: translateY(-9px); opacity: 1; }
          }
        `}
      </style>
      <span
        className="h-2 w-2 rounded-full bg-[#ff00dc] shadow-[0_0_10px_rgba(255,0,220,0.7)]"
        style={{ animation: "choonsimTypingDot 0.9s ease-in-out infinite", animationDelay: "0ms" }}
      />
      <span
        className="h-2 w-2 rounded-full bg-[#ff4ee8] shadow-[0_0_10px_rgba(255,78,232,0.7)]"
        style={{ animation: "choonsimTypingDot 0.9s ease-in-out infinite", animationDelay: "140ms" }}
      />
      <span
        className="h-2 w-2 rounded-full bg-[#ff8af0] shadow-[0_0_10px_rgba(255,138,240,0.7)]"
        style={{ animation: "choonsimTypingDot 0.9s ease-in-out infinite", animationDelay: "280ms" }}
      />
    </div>
  );
}
