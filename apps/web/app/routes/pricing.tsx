import { useState, useEffect } from "react";
import { type LoaderFunctionArgs, useLoaderData, useNavigate, useFetcher } from "react-router";
import { auth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from "~/lib/subscription-plans";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import type { OnApproveData, OnApproveActions } from "@paypal/paypal-js";
import { Button } from "~/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "~/components/ui/dialog";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";

export async function loader({ request }: LoaderFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        throw new Response(null, { status: 302, headers: { Location: "/login" } });
    }

    const user = await db.query.user.findFirst({
        where: eq(schema.user.id, session.user.id),
        columns: { subscriptionTier: true, subscriptionStatus: true, email: true }
    });

    const paypalClientId = process.env.PAYPAL_CLIENT_ID;
    const tossClientKey = process.env.TOSS_CLIENT_KEY;

    return Response.json({ user, paypalClientId, tossClientKey });
}

type PricingLoaderData = {
    user: {
        subscriptionTier: string | null;
        subscriptionStatus: string | null;
        email: string | null;
    } | null;
    paypalClientId?: string;
    tossClientKey?: string;
};

export default function PricingPage() {
    const { user, paypalClientId, tossClientKey } = useLoaderData<typeof loader>() as unknown as PricingLoaderData;
    const navigate = useNavigate();
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<"PAYPAL" | "TOSS">("TOSS");
    const fetcher = useFetcher<{ success: boolean; error?: string }>();
    const [isProcessing, setIsProcessing] = useState(false);

    // 지역 기반 자동 결제 수단 선택 (Phase 8)
    useEffect(() => {
        if (typeof window !== "undefined" && window.navigator) {
            const isKorean = window.navigator.language.startsWith("ko");
            setPaymentMethod(isKorean ? "TOSS" : "PAYPAL");
        }
    }, []);

    const plans = Object.values(SUBSCRIPTION_PLANS);

    const getPlanIcon = (tier: string) => {
        switch (tier) {
            case "FREE": return "egg";
            case "BASIC": return "bolt";
            case "PREMIUM": return "diamond";
            case "ULTIMATE": return "crown";
            default: return "star";
        }
    };

    const handlePlanClick = (plan: SubscriptionPlan) => {
        if (user?.subscriptionTier === plan.tier || plan.tier === "FREE") {
            if (plan.tier === "FREE" && user?.subscriptionTier !== "FREE") {
                toast.info("The free plan will be applied automatically after your subscription expires.");
            }
            return;
        }
        setSelectedPlan(plan);
        setIsModalOpen(true);
    };

    const handleApproveSubscription = async (data: OnApproveData, _actions: OnApproveActions) => {
        if (!selectedPlan || !selectedPlan.paypalPlanId) return;

        const formData = new FormData();
        formData.append("subscriptionId", data.subscriptionID ?? "");
        formData.append("planId", selectedPlan.paypalPlanId);

        fetcher.submit(formData, {
            method: "post",
            action: "/api/payment/activate-subscription",
        });
    };

    const handleTossSubscription = async () => {
        if (!tossClientKey || !selectedPlan || isProcessing) {
            if (!tossClientKey) toast.error("Toss Payments configuration error");
            return;
        }

        setIsProcessing(true);

        try {
            const { loadTossPayments } = await import("@tosspayments/payment-sdk");
            const tossPayments = await loadTossPayments(tossClientKey);

            // 유니크한 orderId 생성을 위해 타임스탬프 활용
            const orderId = `sub_${selectedPlan.tier.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

            // 태블릿/모바일 여부 확인
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

            // 정기결제를 위한 빌링키 발급 또는 첫 달 결제 요청
            await tossPayments.requestPayment("카드", {
                amount: selectedPlan.monthlyPriceKRW,
                orderId: orderId,
                orderName: `${selectedPlan.name} Membership (1 Month)`,
                successUrl: `${window.location.origin}/payment/toss/success?type=SUBSCRIPTION&tier=${selectedPlan.tier}&amount=${selectedPlan.monthlyPriceKRW}`,
                failUrl: `${window.location.origin}/payment/toss/fail?from=subscription`,
                windowTarget: isMobile ? "self" : undefined,
            });
        } catch (error) {
            console.error("Toss Subscription Error:", error);
            toast.error("An error occurred while preparing payment.");
            setIsProcessing(false);
        }
    };

    if (fetcher.data?.success && isModalOpen) {
        setIsModalOpen(false);
        toast.success("Subscription activated! Welcome!");
        navigate("/profile");
    } else if (fetcher.data?.error && isModalOpen) {
        toast.error(fetcher.data.error);
    }

    return (
        <div className="min-h-screen bg-[#0B0A10] text-foreground flex flex-col relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />

            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0B0A10]/80 backdrop-blur-md border-b border-white/5 px-4 h-16 flex items-center justify-between max-w-md mx-auto w-full">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center justify-center text-white/80 hover:text-primary transition-colors size-10 rounded-full hover:bg-white/5"
                >
                    <span className="material-symbols-outlined text-[24px]">arrow_back_ios_new</span>
                </button>
                <h1 className="text-lg font-bold tracking-tight text-white uppercase">Membership</h1>
                <div className="w-10" />
            </header>

            <main className="flex-1 max-w-md mx-auto w-full p-6 pb-32 space-y-8 relative z-10">
                <div className="text-center space-y-3 mb-8">
                    <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase">
                        Level Up<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">
                            Your Experience
                        </span>
                    </h2>
                    <p className="text-sm text-white/60 font-medium">
                        Unlock exclusive features & unlimited chats.
                    </p>
                </div>

                <div className="space-y-5">
                    {plans.map((plan) => {
                        const isCurrent = user?.subscriptionTier === plan.tier;
                        const isPopular = plan.tier === "PREMIUM";
                        const isUltimate = plan.tier === "ULTIMATE";

                        return (
                            <div
                                key={plan.tier}
                                onClick={() => handlePlanClick(plan)}
                                className={cn(
                                    "relative p-6 rounded-3xl border backdrop-blur-sm transition-all duration-300 group cursor-pointer overflow-hidden",
                                    isCurrent
                                        ? "bg-white/5 border-primary shadow-[0_0_30px_rgba(255,0,255,0.15)] ring-1 ring-primary"
                                        : "bg-[#1A1821]/60 border-white/5 hover:bg-[#1A1821] hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
                                )}
                            >
                                {/* Active/Popular Badges */}
                                {isPopular && !isCurrent && (
                                    <div className="absolute top-0 right-0 px-4 py-1.5 bg-primary text-[#0B0A10] text-[11px] font-black uppercase tracking-wider rounded-bl-2xl shadow-[0_4px_20px_rgba(255,0,255,0.4)] z-20">
                                        Most Popular
                                    </div>
                                )}
                                {isCurrent && (
                                    <div className="absolute top-0 right-0 px-4 py-1.5 bg-white/10 text-primary text-[11px] font-black uppercase tracking-wider rounded-bl-2xl border-l border-b border-primary/20 z-20">
                                        Current Plan
                                    </div>
                                )}

                                {/* Glow Effects */}
                                {isUltimate && (
                                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-500/20 rounded-full blur-3xl group-hover:bg-yellow-500/30 transition-colors" />
                                )}
                                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

                                <div className="space-y-4 relative z-10">
                                    {/* Header & Price */}
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "material-symbols-outlined text-[20px]",
                                                    isUltimate ? "text-yellow-400" : (isPopular ? "text-primary" : (plan.tier === "FREE" ? "text-slate-400" : "text-blue-400"))
                                                )}>
                                                    {getPlanIcon(plan.tier)}
                                                </span>
                                                <h3 className="text-lg font-bold tracking-tight text-white uppercase italic">
                                                    {plan.name}
                                                </h3>
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-3xl font-black text-white tracking-tighter">${plan.monthlyPrice}</span>
                                                <span className="text-xs text-white/50 font-bold uppercase tracking-wider">/ MO</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                                    {/* Features */}
                                    <ul className="space-y-2.5">
                                        {plan.features.slice(0, 4).map((feature, i) => (
                                            <li key={i} className="flex items-center gap-3 text-sm text-white/80 font-medium">
                                                <span className="material-symbols-outlined text-[16px] text-primary shrink-0">check_circle</span>
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Safe Area Spacer */}
                <div className="h-4" />
            </main>

            {/* Subscription Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[400px] bg-[#151419] border-white/10 text-white p-0 overflow-hidden rounded-[32px] shadow-2xl">
                    <DialogHeader className="p-8 bg-[#1A1821] border-b border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
                        <div className="relative z-10 text-center space-y-2">
                            <div className="mx-auto w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                                <span className="material-symbols-outlined text-primary text-2xl">
                                    {getPlanIcon(selectedPlan?.tier || "BASIC")}
                                </span>
                            </div>
                            <DialogTitle className="text-2xl font-black italic tracking-tight uppercase">
                                {selectedPlan?.name}
                            </DialogTitle>
                            <DialogDescription className="text-white/60 font-medium pt-2">
                                {paymentMethod === "TOSS" ? (
                                    <><span className="text-primary text-lg font-bold">₩{selectedPlan?.monthlyPriceKRW.toLocaleString()}</span> / mo</>
                                ) : (
                                    <><span className="text-primary text-lg font-bold">${selectedPlan?.monthlyPrice}</span> / month</>
                                )}
                            </DialogDescription>
                        </div>
                    </DialogHeader>

                    <div className="p-6 space-y-4">
                        <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                            <button
                                onClick={() => setPaymentMethod("TOSS")}
                                className={cn(
                                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                                    paymentMethod === "TOSS" ? "bg-white text-black shadow-lg" : "text-white/50 hover:text-white"
                                )}
                            >
                                Domestic (Toss)
                            </button>
                            <button
                                onClick={() => setPaymentMethod("PAYPAL")}
                                className={cn(
                                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                                    paymentMethod === "PAYPAL" ? "bg-[#ffc439] text-[#003087] shadow-lg" : "text-white/50 hover:text-white"
                                )}
                            >
                                Global (PayPal)
                            </button>
                        </div>

                        <div className="bg-white rounded-2xl p-4 shadow-sm min-h-[100px] flex flex-col justify-center">
                            {paymentMethod === "PAYPAL" ? (
                                paypalClientId && selectedPlan?.paypalPlanId ? (
                                    <PayPalScriptProvider options={{
                                        clientId: paypalClientId,
                                        vault: true,
                                        intent: "subscription"
                                    }}>
                                        <PayPalButtons
                                            style={{
                                                layout: "vertical",
                                                color: "black",
                                                shape: "rect",
                                                label: "subscribe",
                                                height: 48
                                            }}
                                            forceReRender={[selectedPlan?.tier]}
                                            createSubscription={(data, actions) => {
                                                return actions.subscription.create({
                                                    plan_id: selectedPlan!.paypalPlanId!,
                                                });
                                            }}
                                            onApprove={handleApproveSubscription}
                                            onCancel={() => {
                                                toast.info("Payment was canceled.");
                                            }}
                                            onError={(err) => {
                                                console.error("PayPal Error:", err);
                                                toast.error("An error occurred while processing payment.");
                                            }}
                                        />
                                    </PayPalScriptProvider>
                                ) : (
                                    <div className="text-red-500 text-center text-xs font-bold py-4 italic">
                                        PayPal Config Error
                                    </div>
                                )
                            ) : (
                                <Button
                                    onClick={handleTossSubscription}
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
                                            Start Membership
                                        </>
                                    )}
                                </Button>
                            )}
                            <p className="text-[10px] text-slate-400 text-center mt-3 px-1 leading-tight">
                                By completing payment you agree to our Terms of Service.
                                <br />You can cancel anytime.
                            </p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
