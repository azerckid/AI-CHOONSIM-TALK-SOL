import { useState, useEffect } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import type { OnApproveData, OnApproveActions } from "@paypal/paypal-js";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { toast } from "sonner";
import { useFetcher, useRevalidator } from "react-router";
import { CREDIT_PACKAGES } from "~/lib/subscription-plans";
import { cn } from "~/lib/utils";

interface TokenTopUpModalProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
    paypalClientId?: string;
    tossClientKey?: string;
}

export function TokenTopUpModal({
    open,
    onOpenChange,
    trigger,
    paypalClientId,
    tossClientKey,
}: TokenTopUpModalProps) {
    const [selectedPackageId, setSelectedPackageId] = useState<string>(
        CREDIT_PACKAGES[1].id
    ); // Default to Medium pack
    const [paymentMethod, setPaymentMethod] = useState<"PAYPAL" | "TOSS">("TOSS");
    const fetcher = useFetcher<{ success: boolean; newCredits?: number; error?: string }>();
    const revalidator = useRevalidator();
    const [isProcessing, setIsProcessing] = useState(false);

    const selectedPackage = CREDIT_PACKAGES.find(p => p.id === selectedPackageId) || CREDIT_PACKAGES[1];

    // 지역 기반 자동 결제 수단 선택 (Phase 8)
    useEffect(() => {
        if (typeof window !== "undefined" && window.navigator) {
            const isKorean = window.navigator.language.startsWith("ko");
            setPaymentMethod(isKorean ? "TOSS" : "PAYPAL");
        }
    }, []);

    // fetcher 결과 모니터링 및 처리
    useEffect(() => {
        if (fetcher.data?.success) {
            toast.success("충전이 완료되었습니다!");
            if (onOpenChange) onOpenChange(false);
            revalidator.revalidate();
        } else if (fetcher.data?.error) {
            toast.error(fetcher.data.error);
        }
    }, [fetcher.data, onOpenChange, revalidator]);

    const handleApprove = async (data: OnApproveData, _actions: OnApproveActions) => {
        const formData = new FormData();
        formData.append("orderId", data.orderID);
        formData.append("packageId", selectedPackageId);

        fetcher.submit(formData, {
            method: "post",
            action: "/api/payment/capture-order",
        });
    };

    const handleTossPayment = async () => {
        if (!tossClientKey || isProcessing) {
            if (!tossClientKey) toast.error("토스페이먼츠 설정 오류");
            return;
        }

        setIsProcessing(true);

        try {
            const { loadTossPayments } = await import("@tosspayments/payment-sdk");
            const tossPayments = await loadTossPayments(tossClientKey);

            // 유니크한 orderId 생성을 위해 타임스탬프 활용
            const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

            // 태블릿/모바일 여부 확인 (스마트 타운 목표 설정)
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

            // 결제 요청
            await tossPayments.requestPayment("카드", {
                amount: selectedPackage.priceKRW,
                orderId: orderId,
                orderName: selectedPackage.name,
                successUrl: `${window.location.origin}/payment/toss/success?creditsGranted=${selectedPackage.credits + selectedPackage.bonus}&packageId=${selectedPackage.id}&amount=${selectedPackage.priceKRW}`,
                failUrl: `${window.location.origin}/payment/toss/fail?from=topup`,
                windowTarget: isMobile ? "self" : undefined,
            });
        } catch (error) {
            console.error("Toss Payment Error:", error);
            toast.error("결제 준비 중 오류가 발생했습니다.");
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[500px] bg-background-dark border-white/10 text-white p-0 gap-0 overflow-hidden shadow-2xl rounded-3xl">
                <DialogHeader className="p-6 bg-surface-dark/50 backdrop-blur-md border-b border-white/5">
                    <DialogTitle className="text-xl font-bold tracking-tight text-white">CHOCO Top Up</DialogTitle>
                    <DialogDescription className="text-white/50 text-sm">
                        AI 캐릭터와 더 즐겁게 대화하기 위해 CHOCO를 충전하세요.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
                    <div className="grid grid-cols-1 gap-3">
                        {CREDIT_PACKAGES.map((pkg) => (
                            <div
                                key={pkg.id}
                                className={cn(
                                    "relative flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group",
                                    selectedPackageId === pkg.id
                                        ? "bg-primary/10 border-primary shadow-[0_0_20px_rgba(238,43,140,0.15)]"
                                        : "bg-surface-dark border-white/5 hover:border-white/10 hover:bg-white/5"
                                )}
                                onClick={() => setSelectedPackageId(pkg.id)}
                            >
                                {pkg.isPopular && (
                                    <div className="absolute -top-3 left-6 px-3 py-1 bg-primary text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-lg">
                                        Popular
                                    </div>
                                )}
                                <div className="flex flex-col gap-1">
                                    <span className={cn(
                                        "text-base font-bold transition-colors",
                                        selectedPackageId === pkg.id ? "text-primary" : "text-white"
                                    )}>
                                        {pkg.name}
                                    </span>
                                    {pkg.bonus > 0 && (
                                        <span className="text-xs font-medium text-green-400 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[12px]">verified</span>
                                            +{pkg.bonus.toLocaleString()} Bonus
                                        </span>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="flex items-baseline justify-end gap-1">
                                        <span className="text-xl font-bold text-white tracking-tight">
                                            {(pkg.credits + pkg.bonus).toLocaleString()}
                                        </span>
                                        <span className="text-[10px] text-white/50 font-bold">CHOCO</span>
                                    </div>
                                    <div className="text-sm font-semibold text-white/70">
                                        ₩{pkg.priceKRW.toLocaleString()} / ${pkg.price}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-4">
                        <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10 overflow-x-auto scrollbar-hide">
                            <button
                                onClick={() => setPaymentMethod("TOSS")}
                                className={cn(
                                    "flex-1 min-w-[100px] py-2 text-[11px] font-bold rounded-lg transition-all",
                                    paymentMethod === "TOSS" ? "bg-white text-black shadow-lg" : "text-white/50 hover:text-white"
                                )}
                            >
                                국내 (카드)
                            </button>
                            <button
                                onClick={() => setPaymentMethod("PAYPAL")}
                                className={cn(
                                    "flex-1 min-w-[100px] py-2 text-[11px] font-bold rounded-lg transition-all",
                                    paymentMethod === "PAYPAL" ? "bg-[#ffc439] text-[#003087] shadow-lg" : "text-white/50 hover:text-white"
                                )}
                            >
                                해외 (PayPal)
                            </button>
                        </div>

                        <div className="bg-white rounded-2xl p-4 shadow-sm min-h-[100px] flex flex-col justify-center">
                            {paymentMethod === "PAYPAL" ? (
                                paypalClientId ? (
                                    <PayPalScriptProvider options={{
                                        clientId: paypalClientId,
                                        currency: "USD",
                                        intent: "capture",
                                    }}>
                                        <PayPalButtons
                                            style={{
                                                layout: "vertical",
                                                shape: "rect",
                                                borderRadius: 12,
                                                height: 48,
                                                color: "gold",
                                                label: "pay"
                                            }}
                                            forceReRender={[selectedPackageId]}
                                            createOrder={async (data, actions) => {
                                                const response = await fetch("/api/payment/create-order", {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                                                    body: new URLSearchParams({ packageId: selectedPackageId })
                                                });
                                                const result = await response.json();
                                                if (result.error) throw new Error(result.error);
                                                return result.orderId;
                                            }}
                                            onApprove={handleApprove}
                                            onCancel={() => {
                                                toast.info("결제가 취소되었습니다.");
                                            }}
                                            onError={(err) => {
                                                console.error("PayPal Error:", err);
                                                toast.error("결제 처리 중 오류가 발생했습니다.");
                                            }}
                                        />
                                    </PayPalScriptProvider>
                                ) : (
                                    <div className="text-center text-red-500 py-4 text-xs font-bold">PayPal Client ID 없음</div>
                                )
                            ) : paymentMethod === "TOSS" ? (
                                <Button
                                    onClick={handleTossPayment}
                                    disabled={isProcessing}
                                    className={cn(
                                        "w-full h-12 bg-[#3182f6] hover:bg-[#1b64da] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all",
                                        isProcessing && "opacity-70 cursor-not-allowed"
                                    )}
                                >
                                    {isProcessing ? (
                                        <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-[20px]">payments</span>
                                            토스로 결제하기
                                        </>
                                    )}
                                </Button>
                            ) : null}
                            <p className="text-center text-[10px] text-slate-400 mt-3 px-1">
                                결제 시 이용약관에 동의하게 됩니다.
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
