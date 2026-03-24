import { db } from "../db.server";
import * as schema from "../../db/schema";
import { sum, sql } from "drizzle-orm";
import { BigNumber } from "bignumber.js";

// Phase 0-3: 레거시 온체인 서비스 지갑 연결 제거. CTC EVM 지갑 통계는 Phase 0-4에서 추가 예정.
export async function getServiceWalletStats() {
    return {
        serviceBalance: "N/A",
        chocoBalance: "N/A",
        chocoBalanceRaw: "0",
        totalSupply: "N/A",
        totalSupplyRaw: "0",
        address: "CTC EVM (Phase 0-4)",
    };
}

export async function getEconomyStats() {
    // 1. 사용자 총 보유량 (DB chocoBalance 합계)
    // SQLite에서 text 필드를 숫자로 더하기 위해 CAST 사용
    const userBalanceRes = await db.select({
        total: sql<string>`sum(cast(chocoBalance as decimal))`
    }).from(schema.user);

    const totalUserBalance = new BigNumber(userBalanceRes[0]?.total || "0").toFormat(0);

    // 2. 누적 판매 내역 (TOPUP 결제 성공 건 합계)
    // Payment.amount는 real(USD)이므로, CHOCO 환산이 필요할 수 있으나 
    // 여기서는 Payment.description이나 metadata 혹은 creditsGranted(deprecated이나 현재 사용 중)를 참고
    const topupRes = await db.select({
        total: sum(schema.payment.creditsGranted)
    }).from(schema.payment).where(sql`type = 'TOPUP' AND status = 'COMPLETED'`);

    // 3. 누적 지급 내역 (ADMIN_MEMBERSHIP_GRANT 합계)
    const grantRes = await db.select({
        total: sum(schema.payment.creditsGranted)
    }).from(schema.payment).where(sql`type = 'ADMIN_MEMBERSHIP_GRANT' AND status = 'COMPLETED'`);

    return {
        totalUserChoco: totalUserBalance,
        totalUserChocoRaw: userBalanceRes[0]?.total || "0",
        totalPurchasedChoco: (topupRes[0]?.total || 0).toLocaleString(),
        totalGrantedChoco: (grantRes[0]?.total || 0).toLocaleString(),
    };
}
