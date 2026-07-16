/**
 * CHOCO 환율 상수 — Toss/PayPal/Solana 결제 경로가 공유하는 단일 소스.
 * 클라이언트 컴포넌트에서도 임포트되므로 서버 전용 코드를 포함하지 않는다.
 */
export const USD_TO_KRW = 1300;
export const USD_TO_CHOCO = 1000; // 1 USD = 1,000 CHOCO
export const SOL_PER_CHOCO = 0.00001; // 1 CHOCO = 0.00001 SOL → 100 CHOCO = 0.001 SOL

export function krwToChoco(krwAmount: number): number {
    return Math.floor((krwAmount / USD_TO_KRW) * USD_TO_CHOCO);
}

export function usdToChoco(usdAmount: number): number {
    return Math.floor(usdAmount * USD_TO_CHOCO);
}

const CHOCO_SOL_PRESETS = [100, 500, 1000, 5000] as const;
const CHOCO_SOL_DISPLAY: Record<number, string> = {
    100: "0.001",
    500: "0.005",
    1000: "0.010",
    5000: "0.050",
};

/** 프리셋 CHOCO 금액에 대한 보기 좋은 SOL 표시값 (버튼/카드 UI용) */
export function getSolDisplay(choco: number): string {
    const nearest = CHOCO_SOL_PRESETS.reduce((p, c) =>
        Math.abs(c - choco) < Math.abs(p - choco) ? c : p
    );
    return CHOCO_SOL_DISPLAY[nearest] ?? (choco * SOL_PER_CHOCO).toFixed(6);
}
