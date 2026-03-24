import { cn } from "~/lib/utils";

interface SettingsToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export function SettingsToggle({
  checked,
  onChange,
  className,
}: SettingsToggleProps) {
  return (
    <label
      className={cn(
        "relative flex h-[30px] w-[50px] cursor-pointer items-center rounded-full border-none bg-slate-200 dark:bg-slate-700 p-1 transition-colors duration-200",
        checked && "justify-end bg-primary",
        className
      )}
    >
      <div className="h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-all duration-200" />
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="invisible absolute"
      />
    </label>
  );
}

