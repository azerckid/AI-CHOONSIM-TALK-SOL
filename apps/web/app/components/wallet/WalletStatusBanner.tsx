import { useEffect, useState } from "react";
import { useFetcher, useRevalidator } from "react-router";
import { toast } from "sonner";

interface WalletStatusBannerProps {
    initialStatus: string | null;
}

/**
 * 지갑 생성 상태를 폴링하여 배너로 표시합니다.
 * PENDING/CREATING: "지갑 준비 중" 배너 표시 (2초 폴링)
 * READY: toast 알림 + useRevalidator로 데이터 갱신 (page reload 없음)
 * FAILED: "지갑 생성 실패" 배너 + 재시도 안내
 */
export function WalletStatusBanner({ initialStatus }: WalletStatusBannerProps) {
    const fetcher = useFetcher();
    const revalidator = useRevalidator();
    const [status, setStatus] = useState(initialStatus);
    const [dismissed, setDismissed] = useState(false);

    // 2초마다 상태 폴링 (READY가 아닌 경우에만)
    useEffect(() => {
        if (status === "READY" || status === null || dismissed) return;

        const interval = setInterval(() => {
            fetcher.load("/api/wallet/status");
        }, 2000);

        return () => clearInterval(interval);
    }, [status, dismissed]);

    // 폴링 결과 반영
    useEffect(() => {
        if (!fetcher.data?.status) return;

        if (fetcher.data.isReady) {
            // 배너 즉시 숨김 → toast 표시 → 페이지 데이터 백그라운드 갱신
            setStatus("READY");
            toast.success(
                `지갑 준비 완료! ${fetcher.data.chocoBalance ?? 100} CHOCO가 지급되었습니다.`,
                { duration: 5000 }
            );
            revalidator.revalidate();
        } else {
            setStatus(fetcher.data.status);
        }
    }, [fetcher.data]);

    if (status === "READY" || status === null || dismissed) return null;

    return (
        <div className="mx-4 mt-2">
            <div className="flex items-center gap-3 rounded-xl bg-surface-dark border border-white/10 p-3">
                {(status === "PENDING" || status === "CREATING") && (
                    <>
                        <div className="h-8 w-8 shrink-0 rounded-full bg-primary/20 flex items-center justify-center">
                            <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-bold">
                                {status === "PENDING" ? "지갑 생성 준비 중..." : "블록체인에 지갑 등록 중..."}
                            </p>
                            <p className="text-white/40 text-xs">
                                {status === "PENDING"
                                    ? "자유롭게 앱을 탐색하세요! 지갑은 자동으로 완성됩니다."
                                    : "완료되면 100 CHOCO가 자동으로 지급됩니다"}
                            </p>
                        </div>
                    </>
                )}
                {status === "FAILED" && (
                    <>
                        <div className="h-8 w-8 shrink-0 rounded-full bg-red-500/20 flex items-center justify-center">
                            <span className="text-red-400 text-sm font-bold">!</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-bold">지갑 생성에 문제가 발생했습니다</p>
                            <p className="text-white/40 text-xs">자동으로 재시도 중입니다</p>
                        </div>
                        <button
                            onClick={() => setDismissed(true)}
                            className="text-white/30 hover:text-white/60 transition-colors"
                        >
                            <span className="text-lg leading-none">&times;</span>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
