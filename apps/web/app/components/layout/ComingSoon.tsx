import { useNavigate } from "react-router";

interface ComingSoonProps {
  title: string;
  subtitle?: string;
  icon?: string;
  iconBgColor?: string;
}

export function ComingSoon({ title, subtitle, icon = "construction", iconBgColor = "bg-primary/20" }: ComingSoonProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white min-h-screen selection:bg-primary selection:text-white">
      <div className="relative flex h-full w-full flex-col max-w-md mx-auto overflow-x-hidden min-h-screen pb-10 md:max-w-lg lg:max-w-xl">
        <header className="sticky top-0 z-50 flex items-center bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md p-4 justify-between border-b border-black/5 dark:border-white/5 transition-colors duration-300">
          <button
            onClick={() => navigate(-1)}
            className="text-slate-900 dark:text-white flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">
              arrow_back_ios_new
            </span>
          </button>
          <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">
            {title}
          </h2>
        </header>

        <div className="flex-1 flex items-center justify-center px-4">
          <div className="flex flex-col items-center justify-center text-center max-w-sm w-full">
            {/* Icon */}
            <div className={`mb-6 size-24 rounded-3xl ${iconBgColor} flex items-center justify-center`}>
              <span className="material-symbols-outlined text-5xl text-primary">
                {icon}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
              준비 중이에요!
            </h3>

            {/* Subtitle */}
            {subtitle ? (
              <p className="text-base text-slate-500 dark:text-slate-400 mb-8">
                {subtitle}
              </p>
            ) : (
              <p className="text-base text-slate-500 dark:text-slate-400 mb-8">
                곧 만나볼 수 있을 거예요. 조금만 기다려주세요!
              </p>
            )}

            {/* Decorative Elements */}
            <div className="flex gap-2 opacity-50">
              <div className="size-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0s" }}></div>
              <div className="size-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.2s" }}></div>
              <div className="size-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.4s" }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
