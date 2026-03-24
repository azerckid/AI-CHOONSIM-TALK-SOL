/**
 * DB 전체 리셋 스크립트
 *
 * - FK 비활성화 후 모든 테이블 데이터 DELETE
 * - 시드(캐릭터, 미션) 재적재
 *
 * 주의: TURSO 원격 DB 사용 시 DB_RESET_CONFIRM=1 필수
 *
 * Created: 2026-02-22
 * Last Updated: 2026-02-22
 */

import { createClient } from "@libsql/client";
import path from "path";
import fs from "fs";

function loadEnv(): Record<string, string> {
    const candidates = [
        path.resolve(process.cwd(), ".env"),
        path.resolve(process.cwd(), ".env.development"),
        path.resolve(process.cwd(), ".env.local"),
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) {
            const content = fs.readFileSync(p, "utf-8");
            const env: Record<string, string> = {};
            content.split("\n").forEach((line) => {
                const t = line.trim();
                if (!t || t.startsWith("#")) return;
                const eq = t.indexOf("=");
                if (eq > 0) {
                    let v = t.slice(eq + 1).trim();
                    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
                        v = v.slice(1, -1);
                    env[t.slice(0, eq).trim()] = v;
                }
            });
            return env;
        }
    }
    return {};
}

const env = loadEnv();
const url = env.TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL || "file:./dev.db";
const authToken = env.TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

const client = createClient({
    url,
    authToken: authToken || undefined,
});

// app/db/schema.ts 기준 테이블 목록 (의존성 역순 - 자식 먼저)
const TABLES = [
    "MessageLike",
    "AgentExecution",
    "Message",
    "Conversation",
    "UserContext",
    "UserMemoryItem",
    "UserInventory",
    "GiftLog",
    "DMParticipant",
    "DirectMessage",
    "TravelPlanItem",
    "TravelPlan",
    "TweetEmbedding",
    "TweetTravelTag",
    "Bookmark",
    "Like",
    "Retweet",
    "Media",
    "Tweet",
    "BookmarkCollection",
    "Follow",
    "FanPost",
    "UserMission",
    "Payment",
    "TokenTransfer",
    "X402Invoice",
    "RelayerLog",
    "MultichainAddress",
    "ExchangeLog",
    "Notification",
    "account",
    "session",
    "verification",
    "User",
    "CharacterStat",
    "CharacterMedia",
    "Character",
    "Item",
    "DMConversation",
    "TravelTag",
    "Notice",
    "SystemLog",
    "TokenConfig",
    "Mission",
    "SystemSettings",
    "ExchangeRate",
];

async function main() {
    const isRemote = url.startsWith("libsql://") && !url.includes("localhost");
    if (isRemote && process.env.DB_RESET_CONFIRM !== "1") {
        console.error(
            "[DB Reset] TURSO 원격 DB 대상입니다. 리셋하려면 DB_RESET_CONFIRM=1을 설정하고 다시 실행하세요."
        );
        console.error("  예: DB_RESET_CONFIRM=1 npx tsx scripts/db-reset.ts");
        process.exit(1);
    }

    console.log("[DB Reset] 대상:", url.replace(/:[^:@]+@/, ":****@"));
    if (isRemote) {
        console.log("[DB Reset] 백업 권장: turso db shell <db-name> .dump > backup.sql");
    } else if (url.startsWith("file:")) {
        const dbPath = path.resolve(process.cwd(), url.replace("file:", ""));
        if (fs.existsSync(dbPath)) {
            const backupPath = `${dbPath}.backup.${Date.now()}`;
            fs.copyFileSync(dbPath, backupPath);
            console.log("[DB Reset] 로컬 백업 생성:", backupPath);
        }
    }

    console.log("[DB Reset] 모든 테이블 데이터 삭제 중...");
    await client.execute("PRAGMA foreign_keys = OFF");

    for (const table of TABLES) {
        try {
            const quoted = `"${table}"`;
            await client.execute({ sql: `DELETE FROM ${quoted}`, args: [] });
            console.log(`  - ${table}`);
        } catch (e) {
            console.warn(`  - ${table} (skip: ${e instanceof Error ? e.message : e})`);
        }
    }

    await client.execute("PRAGMA foreign_keys = ON");
    console.log("[DB Reset] 삭제 완료.");

    console.log("[DB Reset] 시드 실행: characters, missions...");
    const { execSync } = await import("child_process");
    try {
        execSync("npx tsx scripts/seed-remote-chars.ts", {
            cwd: process.cwd(),
            stdio: "inherit",
            env: { ...process.env, TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: authToken || "" },
        });
    } catch (e) {
        console.warn("[DB Reset] seed-remote-chars 실패 (수동 실행 권장):", e);
    }
    try {
        execSync("npx tsx scripts/seed-remote-missions.ts", {
            cwd: process.cwd(),
            stdio: "inherit",
            env: { ...process.env, TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: authToken || "" },
        });
    } catch (e) {
        console.warn("[DB Reset] seed-remote-missions 실패 (수동 실행 권장):", e);
    }

    console.log("[DB Reset] 완료. Admin 계정은 재가입 후 role을 업데이트하세요.");
}

main().catch((e) => {
    console.error("[DB Reset] 오류:", e);
    process.exit(1);
});
