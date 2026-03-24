import { cn } from "~/lib/utils";

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  full: "max-w-full",
};

export function ResponsiveContainer({
  children,
  className,
  maxWidth = "md",
}: ResponsiveContainerProps) {
  return (
    <div
      className={cn(
        "w-full mx-auto px-4 sm:px-6",
        maxWidthClasses[maxWidth],
        "md:max-w-lg lg:max-w-xl",
        className
      )}
    >
      {children}
    </div>
  );
}

