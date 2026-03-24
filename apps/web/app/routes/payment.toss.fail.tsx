import { useNavigate, useSearchParams } from "react-router";

export default function TossFailPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const code = searchParams.get("code");
    const message = searchParams.get("message");
    const from = searchParams.get("from"); // 'topup' or 'subscription'

    const returnUrl = from === "subscription" ? "/pricing" : "/profile/subscription";

    // 토스 에러 코드별 사용자 친화적 메시지 매핑
    const getFriendlyMessage = (code: string | null) => {
        switch (code) {
            case "PAY_PROCESS_CANCELED":
                return "결제가 중단되었습니다. 다시 시도해 주세요.";
            case "REJECT_CARD_COMPANY":
                return "카드사에서 결제를 거절했습니다. 다른 카드를 사용해 주세요.";
            case "EXCEED_MAX_DAILY_PAYMENT_COUNT":
                return "일일 결제 횟수 제한을 초과했습니다.";
            case "NOT_ENOUGH_BALANCE":
                return "계좌 잔액이 부족합니다.";
            case "INVALID_CARD_NUMBER":
                return "카드 번호가 유효하지 않습니다.";
            default:
                return message || "결제 중 알 수 없는 오류가 발생했습니다.";
        }
    };

    return (
        <div className="min-h-screen bg-[#0B0A10] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#1A1821] border border-white/10 rounded-[32px] p-8 shadow-2xl text-center space-y-6 relative overflow-hidden">
                {/* Glow Effect */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-red-500/20 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 space-y-6">
                    <div className="size-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                        <span className="material-symbols-outlined text-red-500 text-4xl">error</span>
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-2xl font-black text-white italic uppercase tracking-tight">결제 실패</h1>
                        <p className="text-white/60 text-sm font-medium leading-relaxed">
                            {getFriendlyMessage(code)}
                        </p>
                        {code && (
                            <p className="text-[10px] text-white/20 font-mono pt-2 uppercase">
                                Error Code: {code}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 pt-4">
                        <button
                            onClick={() => navigate(returnUrl, { replace: true })}
                            className="w-full py-4 bg-primary text-[#0B0A10] rounded-2xl font-black uppercase text-sm shadow-[0_4px_20px_rgba(255,0,255,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            다시 시도하기
                        </button>
                        <button
                            onClick={() => navigate("/profile/subscription", { replace: true })}
                            className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/80 rounded-2xl font-bold text-sm transition-all"
                        >
                            구독 관리로 돌아가기
                        </button>
                    </div>

                    <p className="text-[11px] text-white/30 pt-4 font-medium">
                        지속적으로 문제가 발생할 경우 고객센터로 문의해 주세요.
                    </p>
                </div>
            </div>
        </div>
    );
}
