import React, { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { CheckCircle, Loader2, QrCode, ExternalLink } from "lucide-react";

interface SolanaPayButtonProps {
    amount: number;
    credits: number;
    description?: string;
    onSuccess?: () => void;
}

export const SolanaPayButton: React.FC<SolanaPayButtonProps> = ({
    amount,
    credits,
    description,
    onSuccess,
}) => {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"IDLE" | "PENDING" | "COMPLETED" | "ERROR">("IDLE");
    const [paymentData, setPaymentData] = useState<{
        url: string;
        reference: string;
        paymentId: string;
        solAmount: string;
    } | null>(null);

    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const initiatePayment = async () => {
        setLoading(true);
        setStatus("IDLE");
        try {
            const response = await fetch("/api/payment/solana/create-request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount, credits, description }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to initiate Solana payment");

            setPaymentData(data);
            setStatus("PENDING");
            startPolling(data.reference, data.paymentId);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error("Solana Pay Error:", error);
            toast.error(errorMessage);
            setStatus("ERROR");
        } finally {
            setLoading(false);
        }
    };

    const startPolling = (reference: string, paymentId: string) => {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

        pollingIntervalRef.current = setInterval(async () => {
            try {
                const response = await fetch("/api/payment/solana/verify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ reference, paymentId }),
                });

                const data = await response.json();
                if (data.status === "COMPLETED") {
                    stopPolling();
                    setStatus("COMPLETED");
                    toast.success(`${credits} CHOCO가 충전되었습니다!`);
                    if (onSuccess) onSuccess();
                }
            } catch (error) {
                console.error("Polling error:", error);
            }
        }, 3000); // 3초마다 확인
    };

    const stopPolling = () => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    };

    useEffect(() => {
        return () => stopPolling();
    }, []);

    if (status === "COMPLETED") {
        return (
            <div className="flex flex-col items-center justify-center p-6 bg-green-500/10 rounded-2xl border border-green-500/20 text-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-green-500/30">
                    <CheckCircle className="text-white w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">결제 완료!</h3>
                <p className="text-green-200/80">CHOCO 충전이 성공적으로 완료되었습니다.</p>
            </div>
        );
    }

    if (status === "PENDING" && paymentData) {
        return (
            <div className="flex flex-col items-center space-y-6 p-4">
                <div className="bg-white p-4 rounded-2xl shadow-2xl">
                    <QRCodeSVG value={paymentData.url} size={200} />
                </div>

                <div className="text-center space-y-2">
                    <div className="flex items-center justify-center space-x-2 text-blue-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm font-medium">입금 확인 중...</span>
                    </div>
                    <p className="text-white font-bold text-lg">
                        {paymentData.solAmount} SOL
                    </p>
                    <p className="text-slate-400 text-xs max-w-[240px]">
                        지갑 앱(Phantom 등)으로 QR 코드를 스캔하여 결제해 주세요.
                    </p>
                </div>

                <a
                    href={paymentData.url}
                    className="flex items-center space-x-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                    <span>모바일 지갑으로 직접 결제하기</span>
                    <ExternalLink className="w-3 h-3" />
                </a>

                <button
                    onClick={() => setStatus("IDLE")}
                    className="text-slate-500 text-xs hover:text-slate-400 transition-colors"
                >
                    취소하고 다시 시작
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={initiatePayment}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-[#14F195] to-[#9945FF] hover:opacity-90 disabled:opacity-50 text-black font-bold py-4 px-6 rounded-2xl shadow-xl transition-all active:scale-[0.98]"
        >
            {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
                <>
                    <QrCode className="w-6 h-6" />
                    <span>Solana Pay로 결제</span>
                </>
            )}
        </button>
    );
};
