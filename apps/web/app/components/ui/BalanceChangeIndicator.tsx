import { useEffect, useState } from "react";
import { cn } from "~/lib/utils";

interface BalanceChangeIndicatorProps {
    amount: number; // 양수면 증가, 음수면 차감
    duration?: number; // 애니메이션 지속 시간 (ms)
    className?: string;
}

/**
 * 잔액 변동량을 표시하는 컴포넌트
 * 차감 시 빨간색, 증가 시 녹색으로 표시되며 페이드 아웃 애니메이션이 적용됩니다.
 */
export function BalanceChangeIndicator({
    amount,
    duration = 2000,
    className
}: BalanceChangeIndicatorProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [opacity, setOpacity] = useState(1);

    useEffect(() => {
        if (amount === 0) return;

        // 표시 시작
        setIsVisible(true);
        setOpacity(1);

        // 페이드 아웃 시작 (duration의 60% 후)
        const fadeStart = duration * 0.6;
        const fadeDuration = duration * 0.4;

        const fadeTimer = setTimeout(() => {
            const startTime = Date.now();
            const fade = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / fadeDuration, 1);
                setOpacity(1 - progress);

                if (progress < 1) {
                    requestAnimationFrame(fade);
                } else {
                    setIsVisible(false);
                }
            };
            requestAnimationFrame(fade);
        }, fadeStart);

        // 완전히 사라짐
        const hideTimer = setTimeout(() => {
            setIsVisible(false);
        }, duration);

        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(hideTimer);
        };
    }, [amount, duration]);

    if (!isVisible || amount === 0) return null;

    const isPositive = amount > 0;
    const displayAmount = Math.abs(amount);

    return (
        <span
            className={cn(
                "inline-block font-bold text-xs transition-opacity duration-300",
                isPositive ? "text-green-500" : "text-red-500",
                className
            )}
            style={{ opacity }}
        >
            {isPositive ? "+" : "-"}{displayAmount.toLocaleString()}
        </span>
    );
}
