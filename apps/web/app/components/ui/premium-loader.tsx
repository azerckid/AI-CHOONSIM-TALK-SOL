import { cn } from "~/lib/utils";

interface PremiumLoaderProps {
  message?: string;
  className?: string;
}

export function PremiumLoader({ message, className }: PremiumLoaderProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-6", className)}>
      <div className="relative">
        {/* Outer Glowing Aura */}
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-aura-breathe shadow-[0_0_50px_rgba(238,43,140,0.3)]" />
        
        {/* Rotating Orbital Path */}
        <div className="relative w-20 h-20 rounded-full border-2 border-white/5 flex items-center justify-center">
          <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin duration-1000" />
          
          {/* Inner Pulsing Symbol */}
          <div className="relative z-10 flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-primary animate-intense-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>
              favorite
            </span>
          </div>
        </div>
      </div>
      
      {message && (
        <div className="flex flex-col items-center gap-1.5">
          <p className="text-sm font-black text-white/80 uppercase tracking-[0.2em] animate-pulse">
            {message}
          </p>
          <div className="flex gap-1">
            <div className="w-1 h-1 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.3s]" />
            <div className="w-1 h-1 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.15s]" />
            <div className="w-1 h-1 rounded-full bg-primary/40 animate-bounce" />
          </div>
        </div>
      )}
    </div>
  );
}
