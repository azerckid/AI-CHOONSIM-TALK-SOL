import { useState, useEffect } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import type { OnApproveData, OnApproveActions } from "@paypal/paypal-js";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";
import { useRevalidator } from "react-router";
import { HEART_PACKAGES, type ItemPackage } from "~/lib/items";
import { cn } from "~/lib/utils";

interface ItemStoreModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    itemId?: string; // Currently "heart" only as per user request
    paypalClientId?: string;
    tossClientKey?: string;
}

export function ItemStoreModal({
    open,
    onOpenChange,
    itemId = "heart",
    paypalClientId,
    tossClientKey,
}: ItemStoreModalProps) {
    const [selectedPackageId, setSelectedPackageId] = useState<string>(
        HEART_PACKAGES[1].id
    );
    const [paymentMethod, setPaymentMethod] = useState<"PAYPAL" | "TOSS">("TOSS");
    const [isProcessing, setIsProcessing] = useState(false);
    const revalidator = useRevalidator();

    const packages = HEART_PACKAGES; // Can filter by itemId in future
    const selectedPackage = packages.find(p => p.id === selectedPackageId) || packages[1];

    useEffect(() => {
        if (typeof window !== "undefined" && window.navigator) {
            const isKorean = window.navigator.language.startsWith("ko");
            setPaymentMethod(isKorean ? "TOSS" : "PAYPAL");
        }
    }, []);

    const handleTossPayment = async () => {
        if (!tossClientKey || isProcessing) {
            if (!tossClientKey) toast.error("결제 시스템 설정 오류");
            return;
        }

        setIsProcessing(true);

        try {
            const { loadTossPayments } = await import("@tosspayments/payment-sdk");
            const tossPayments = await loadTossPayments(tossClientKey);

            const orderId = `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

            await tossPayments.requestPayment("카드", {
                amount: selectedPackage.priceKRW,
                orderId: orderId,
                orderName: `${selectedPackage.name} (${selectedPackage.quantity}개)`,
                successUrl: `${window.location.origin}/payment/toss/success?type=ITEM&itemId=${selectedPackage.itemId}&quantity=${selectedPackage.quantity}&packageId=${selectedPackage.id}&amount=${selectedPackage.priceKRW}`,
                failUrl: `${window.location.origin}/payment/toss/fail?from=store`,
                windowTarget: isMobile ? "self" : undefined,
            });
        } catch (error) {
            console.error("Toss Payment Error:", error);
            toast.error("결제 준비 중 오류가 발생했습니다.");
            setIsProcessing(false);
        }
    };

    const handlePayPalApprove = async (data: OnApproveData, _actions: OnApproveActions) => {
        setIsProcessing(true);
        try {
            const response = await fetch("/api/payment/item/capture-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orderId: data.orderID,
                    packageId: selectedPackageId,
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success(`${result.quantityAdded}개의 하트가 인벤토리에 추가되었습니다!`);
                onOpenChange(false);
                revalidator.revalidate();
            } else {
                toast.error(result.error || "결제 처리 중 오류가 발생했습니다.");
            }
        } catch (error) {
            console.error("PayPal Capture Error:", error);
            toast.error("결제 승인 처리 중 오류가 발생했습니다.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-[#1A1018] border-white/10 text-white p-0 gap-0 overflow-hidden shadow-[0_0_50px_rgba(238,43,140,0.2)] rounded-[32px]">
                <DialogHeader className="p-8 bg-gradient-to-b from-[#2d1622]/80 to-transparent backdrop-blur-xl border-b border-white/5 relative overflow-hidden">
                    {/* Decorative Blur */}
                    <div className="absolute top-[-50px] left-[-50px] w-32 h-32 bg-primary/20 rounded-full blur-[60px]" />

                    <DialogTitle className="text-2xl font-black italic tracking-tighter text-white uppercase flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[32px] filled">favorite</span>
                        Heart <span className="text-primary">Store</span>
                    </DialogTitle>
                    <DialogDescription className="text-white/50 text-sm font-medium mt-1">
                        아이돌에게 보낼 소중한 마음을 충전하세요.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] no-scrollbar">
                    {/* Package Grid */}
                    <div className="grid grid-cols-1 gap-4">
                        {packages.map((pkg) => (
                            <div
                                key={pkg.id}
                                className={cn(
                                    "relative flex items-center gap-5 p-5 rounded-[24px] border transition-all cursor-pointer group hover:scale-[1.02]",
                                    selectedPackageId === pkg.id
                                        ? "bg-primary/10 border-primary/50 shadow-[0_0_30px_rgba(238,43,140,0.2)]"
                                        : "bg-white/2 border-white/5 hover:border-white/20 hover:bg-white/5"
                                )}
                                onClick={() => setSelectedPackageId(pkg.id)}
                            >
                                {pkg.isPopular && (
                                    <div className="absolute -top-3 right-6 px-3 py-1 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-[0_0_15px_rgba(238,43,140,0.5)] z-10">
                                        Best Choice
                                    </div>
                                )}

                                {/* Item Image/Icon with Glow */}
                                <div className="relative shrink-0 w-16 h-16 rounded-2xl bg-[#2d1622] flex items-center justify-center p-2 border border-white/5 overflow-hidden group-hover:border-primary/30 transition-colors">
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <img src={pkg.image} alt={pkg.name} className="w-10 h-10 object-contain relative z-10 group-hover:scale-110 transition-transform duration-500" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h4 className={cn(
                                        "text-lg font-bold tracking-tight mb-0.5 transition-colors",
                                        selectedPackageId === pkg.id ? "text-primary" : "text-white"
                                    )}>
                                        {pkg.name}
                                    </h4>
                                    <p className="text-xs text-white/40 font-medium truncate">{pkg.description}</p>
                                    <div className="mt-2 flex items-center gap-1.5">
                                        <Badge className="bg-primary/20 text-primary border-none text-[10px] px-2 py-0.5 font-black uppercase tracking-tighter">
                                            {pkg.quantity} Hearts
                                        </Badge>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none mb-1">Price</div>
                                    <div className="text-lg font-black text-white italic tracking-tighter leading-none">
                                        ₩{pkg.priceKRW.toLocaleString()}
                                    </div>
                                    <div className="text-[10px] text-white/20 font-bold mt-1">${pkg.priceUSD.toFixed(1)}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Payment Method Selector */}
                    <div className="space-y-4">
                        <div className="flex gap-2 p-1.5 bg-white/3 rounded-[20px] border border-white/5">
                            <button
                                onClick={() => setPaymentMethod("TOSS")}
                                className={cn(
                                    "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-[14px] transition-all",
                                    paymentMethod === "TOSS" ? "bg-white text-black shadow-xl" : "text-white/30 hover:text-white"
                                )}
                            >
                                Toss Pay
                            </button>
                            <button
                                onClick={() => setPaymentMethod("PAYPAL")}
                                className={cn(
                                    "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-[14px] transition-all",
                                    paymentMethod === "PAYPAL" ? "bg-[#ffc439] text-[#003087] shadow-xl" : "text-white/30 hover:text-white"
                                )}
                            >
                                PayPal
                            </button>
                        </div>

                        {/* Payment Button Container */}
                        <div className="bg-white/2 rounded-[28px] p-2 border border-white/5 backdrop-blur-xl">
                            {paymentMethod === "TOSS" ? (
                                <Button
                                    onClick={handleTossPayment}
                                    disabled={isProcessing}
                                    className={cn(
                                        "w-full h-16 bg-primary hover:bg-primary-dark text-black rounded-[22px] font-black italic text-lg tracking-tighter transition-all shadow-[0_10px_30px_rgba(238,43,140,0.3)] hover:shadow-[0_15px_40px_rgba(238,43,140,0.5)] active:scale-95",
                                        isProcessing && "opacity-70 cursor-not-allowed"
                                    )}
                                >
                                    {isProcessing ? (
                                        <div className="size-6 border-3 border-black/30 border-t-black rounded-full animate-spin" />
                                    ) : (
                                        "PURCHASE NOW"
                                    )}
                                </Button>
                            ) : (
                                <div className="p-2 bg-white rounded-[22px]">
                                    {paypalClientId ? (
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
                                                    height: 55,
                                                    color: "gold",
                                                    label: "pay"
                                                }}
                                                forceReRender={[selectedPackageId]}
                                                createOrder={async () => {
                                                    try {
                                                        const response = await fetch("/api/payment/item/create-order", {
                                                            method: "POST",
                                                            headers: { "Content-Type": "application/json" },
                                                            body: JSON.stringify({ packageId: selectedPackageId }),
                                                        });
                                                        const result = await response.json();
                                                        if (result.orderId) return result.orderId;
                                                        throw new Error(result.error || "Failed to create order");
                                                    } catch (error) {
                                                        console.error("PayPal Create Order Error:", error);
                                                        toast.error("결제 주문 생성에 실패했습니다.");
                                                        throw error;
                                                    }
                                                }}
                                                onApprove={handlePayPalApprove}
                                            />
                                        </PayPalScriptProvider>
                                    ) : (
                                        <div className="text-center text-black/40 py-4 text-xs font-bold">PayPal Unavailable</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer/Safe Area */}
                <div className="p-6 bg-white/2 border-t border-white/5 text-center">
                    <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">
                        Your purchase supports the creators. <br />
                        Secure transaction powered by global gateways.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}

const Badge = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={cn("px-2 py-1 rounded inline-flex", className)}>
        {children}
    </span>
);
