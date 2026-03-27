/**
 * Phase 1-1: DB의 Shop 아이템 전체 상태 확인
 */
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "../../app/db/schema";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.development" });

const PAYWALL_IDS = ["memory_ticket", "voice_ticket", "secret_episode", "memory_album"];

async function main() {
    const client = createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const db = drizzle(client, { schema });

    const items = await db.query.item.findMany({
        orderBy: (i, { asc }) => [asc(i.createdAt)],
    });

    if (items.length === 0) {
        console.log("❌ 아이템 없음");
        return;
    }

    console.log(`총 ${items.length}개 아이템:\n`);
    let allOk = true;
    for (const item of items) {
        const isPaywall = PAYWALL_IDS.includes(item.id);
        const status = item.isActive ? "✅" : "❌ isActive=false";
        const paywallTag = isPaywall ? " [페이월 필수]" : "";
        console.log(`${status} ${item.id.padEnd(20)} ${item.name.padEnd(24)} ${item.type.padEnd(10)} ${item.priceChoco} CHOCO${paywallTag}`);
        if (!item.isActive) allOk = false;
    }

    console.log("\n--- 페이월 트리거 ID 검증 ---");
    for (const id of PAYWALL_IDS) {
        const found = items.find(i => i.id === id);
        if (found && found.isActive) {
            console.log(`✅ ${id}`);
        } else if (found && !found.isActive) {
            console.log(`⚠️  ${id} — isActive=false`);
            allOk = false;
        } else {
            console.log(`❌ ${id} — 없음`);
            allOk = false;
        }
    }

    console.log(`\n종합: ${allOk ? "✅ 모두 정상" : "❌ 일부 확인 필요"}`);
}

main().catch(console.error);
