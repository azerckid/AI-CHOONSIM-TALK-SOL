/**
 * Shop 아이템 시드 — 08_SHOP_ITEMS_IMPLEMENTATION_PRIORITY 기준
 * 1~4순위: 페이월 필수 4종
 * 5~6순위: 메시지 티켓 2종
 * 7~8순위: 선톡·하트 2종
 *
 * 사용: cd apps/web && npx tsx scripts/seed-shop-items.ts
 */
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.development" });

const items = [
  // 1~4순위: 페이월 필수 (ID 고정)
  { id: "memory_ticket", name: "기억 각인 티켓", type: "MEMORY", priceChoco: 500, description: "대화 영구 각인 1회. \"이 기억, 영원히 간직할까?\" 트리거." },
  { id: "voice_ticket", name: "보이스 티켓", type: "VOICE", priceChoco: 500, description: "음성 메시지 1회. 생일 보이스 등 페이월 트리거." },
  { id: "secret_episode", name: "비밀 에피소드 해금", type: "EPISODE", priceChoco: 3000, description: "특별 시나리오 1회. \"우리만의 비밀 이야기\" 트리거." },
  { id: "memory_album", name: "우정 앨범 생성", type: "ALBUM", priceChoco: 2000, description: "월간 대화 앨범 생성. \"우리 추억을 앨범으로\" 트리거." },
  // 5~6순위: 메시지 티켓
  { id: "ticket_msg_10", name: "메시지 티켓 x10", type: "TICKET", priceChoco: 1000, description: "대화 10회 추가." },
  { id: "ticket_msg_50", name: "메시지 티켓 x50", type: "TICKET", priceChoco: 4500, description: "대화 50회. 10% 할인 번들." },
  // 7~8순위: 선톡·하트
  { id: "presend_ticket", name: "선톡 티켓", type: "PRESEND", priceChoco: 300, description: "캐릭터가 먼저 DM 1회." },
  { id: "heart", name: "하트 x10", type: "HEART", priceChoco: 1000, description: "캐릭터에게 선물." },
];

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const now = new Date().toISOString();

  for (const it of items) {
    await client.execute({
      sql: `INSERT INTO Item (id, name, type, priceChoco, description, isActive, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, 1, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name=excluded.name, type=excluded.type, priceChoco=excluded.priceChoco,
              description=excluded.description, isActive=excluded.isActive, updatedAt=excluded.updatedAt`,
      args: [it.id, it.name, it.type, it.priceChoco, it.description ?? "", now, now],
    });
    console.log(`[OK] ${it.id} — ${it.name} (${it.type}, ${it.priceChoco} CHOCO)`);
  }

  console.log("Seed done. 8 items upserted.");
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
