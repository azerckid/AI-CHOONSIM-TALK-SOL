interface DateSeparatorProps {
  date: string;
  className?: string;
}

export function DateSeparator({ date, className }: DateSeparatorProps) {
  return (
    <div className={`flex justify-center py-2 ${className || ""}`}>
      <span className="px-4 py-1.5 bg-gray-200/50 dark:bg-white/5 rounded-full text-xs font-medium text-gray-500 dark:text-white/40">
        {date}
      </span>
    </div>
  );
}

