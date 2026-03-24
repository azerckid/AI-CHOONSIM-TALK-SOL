import { useEffect, useState } from "react";
import { cn } from "~/lib/utils";

interface RollingCounterProps {
    value: number;
    duration?: number; // ms
    className?: string;
    prefix?: string;
    suffix?: string;
}

export function RollingCounter({
    value,
    duration = 500,
    className,
    prefix = "",
    suffix = ""
}: RollingCounterProps) {
    const [displayValue, setDisplayValue] = useState(value);
    const [isAnimating, setIsAnimating] = useState(false);

    // 변화 감지 및 애니메이션 효과를 위한 상태
    const [changeType, setChangeType] = useState<"increase" | "decrease" | "none">("none");

    useEffect(() => {
        if (value === displayValue) return;

        setChangeType(value > displayValue ? "increase" : "decrease");

        if (duration === 0) {
            setDisplayValue(value);
            // 짧은 시간 뒤에 색상 복귀
            const timer = setTimeout(() => setChangeType("none"), 300);
            return () => clearTimeout(timer);
        }

        setIsAnimating(true);
        const startValue = displayValue;
        const endValue = value;
        const startTime = Date.now();

        const animate = () => {
            const now = Date.now();
            const progress = Math.min((now - startTime) / duration, 1);

            // Easing function (easeOutExpo)
            const easeOut = (x: number): number => {
                return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
            };

            const currentProgress = easeOut(progress);
            const current = Math.floor(startValue + (endValue - startValue) * currentProgress);

            setDisplayValue(current);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setDisplayValue(endValue);
                setIsAnimating(false);
                // 애니메이션 끝나면 300ms 뒤에 색상 복귀
                setTimeout(() => setChangeType("none"), 300);
            }
        };

        const animationId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationId);
    }, [value, duration]);

    return (
        <span
            className={cn(
                "transition-colors duration-300",
                changeType === "decrease" && "text-red-500 font-bold",
                changeType === "increase" && "text-green-500 font-bold",
                className
            )}
        >
            {prefix}{displayValue.toLocaleString()}{suffix}
        </span>
    );
}
