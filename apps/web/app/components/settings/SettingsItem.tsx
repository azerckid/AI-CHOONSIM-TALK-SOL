import { Link } from "react-router";
import { cn } from "~/lib/utils";

interface SettingsItemProps {
  icon: string;
  iconBgColor: string;
  label: string;
  onClick?: () => void;
  href?: string;
  rightElement?: React.ReactNode;
  className?: string;
}

export function SettingsItem({
  icon,
  iconBgColor,
  label,
  onClick,
  href,
  rightElement,
  className,
}: SettingsItemProps) {
  const content = (
    <div
      className={cn(
        "flex items-center gap-4 p-4 min-h-14 justify-between border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors",
        href || onClick ? "cursor-pointer group" : "",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "text-white flex items-center justify-center rounded-full shrink-0 size-8",
            iconBgColor
          )}
        >
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </div>
        <p className="text-slate-900 dark:text-white text-base font-medium flex-1 truncate">
          {label}
        </p>
      </div>
      {rightElement || (href || onClick ? (
        <div className="shrink-0 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
        </div>
      ) : null)}
    </div>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }

  return content;
}

