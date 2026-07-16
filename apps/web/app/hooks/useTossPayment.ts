import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";

export type PaymentMethod = "PAYPAL" | "TOSS";

/**
 * 브라우저 언어를 기준으로 기본 결제 수단(국내 Toss / 해외 PayPal)을 고른다.
 * useState와 동일한 튜플을 반환해 사용자가 탭을 눌러 직접 바꿀 수도 있다.
 */
export function useRegionDefaultPaymentMethod(): [PaymentMethod, Dispatch<SetStateAction<PaymentMethod>>] {
    const [method, setMethod] = useState<PaymentMethod>("TOSS");

    useEffect(() => {
        if (typeof window !== "undefined" && window.navigator) {
            const isKorean = window.navigator.language.startsWith("ko");
            setMethod(isKorean ? "TOSS" : "PAYPAL");
        }
    }, []);

    return [method, setMethod];
}

interface TossPaymentParams {
    amount: number;
    orderName: string;
    successUrl: string;
    failUrl: string;
}

/** Toss Payments SDK 로드 + 결제 요청을 공용으로 처리한다. */
export function useTossPayment(tossClientKey?: string) {
    const [isProcessing, setIsProcessing] = useState(false);

    async function payWithToss({ amount, orderName, successUrl, failUrl }: TossPaymentParams) {
        if (!tossClientKey || isProcessing) {
            if (!tossClientKey) toast.error("결제 시스템 설정 오류");
            return;
        }

        setIsProcessing(true);

        try {
            const { loadTossPayments } = await import("@tosspayments/payment-sdk");
            const tossPayments = await loadTossPayments(tossClientKey);

            const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

            await tossPayments.requestPayment("카드", {
                amount,
                orderId,
                orderName,
                successUrl,
                failUrl,
                windowTarget: isMobile ? "self" : undefined,
            });
        } catch {
            toast.error("결제 준비 중 오류가 발생했습니다.");
            setIsProcessing(false);
        }
    }

    return { isProcessing, payWithToss };
}
