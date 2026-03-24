import { useState } from "react";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";
import { cn } from "~/lib/utils";

interface CoinbaseCommerceButtonProps {
    amount: number;
    credits: number;
    packageName: string;
    onSuccess?: (hostedUrl: string) => void;
    onError?: (error: string) => void;
    className?: string;
}

export function CoinbaseCommerceButton({
    amount,
    credits,
    packageName,
    onSuccess,
    onError,
    className,
}: CoinbaseCommerceButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handlePayment = async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/payment/coinbase/create-charge", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    amount,
                    credits,
                    description: `${packageName} (${credits} CHOCO)`,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "결제 생성에 실패했습니다.");
            }

            if (data.hostedUrl) {
                // Coinbase Hosted Checkout 페이지로 이동
                window.location.href = data.hostedUrl;
                if (onSuccess) onSuccess(data.hostedUrl);
            } else {
                throw new Error("결제 URL을 받을 수 없습니다.");
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error("Coinbase Payment Error:", error);
            toast.error(errorMessage || "암호화폐 결제 준비 중 오류가 발생했습니다.");
            if (onError) onError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            onClick={handlePayment}
            disabled={isLoading}
            className={cn(
                "w-full h-12 bg-[#0052ff] hover:bg-[#0047db] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#0052ff]/20",
                isLoading && "opacity-70 cursor-not-allowed",
                className
            )}
        >
            {isLoading ? (
                <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
                <>
                    <span className="material-symbols-outlined text-[24px]">currency_bitcoin</span>
                    Coinbase로 암호화폐 결제
                </>
            )}
        </Button>
    );
}
