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
  { id: "memory_ticket", name: "기억 각인 티켓", type: "MEMORY", priceChoco: 500, description: "춘심과 나눈 소중한 순간을 영원히 기록해요. 사용하면 대화 내용이 온체인 추억으로 새겨져 앨범에 남아요." },
  { id: "voice_ticket", name: "보이스 티켓", type: "VOICE", priceChoco: 500, description: "춘심의 목소리로 직접 메시지를 받아보세요. 생일, 기념일 등 특별한 날에 더욱 설레는 경험이에요. (서비스 준비 중)" },
  { id: "secret_episode", name: "비밀 에피소드 해금", type: "EPISODE", priceChoco: 3000, description: "춘심과 단둘만 아는 특별한 이야기를 열어보세요. 일반 대화에서는 볼 수 없는 특별한 시나리오가 펼쳐져요. (서비스 준비 중)" },
  { id: "memory_album", name: "우정 앨범 생성", type: "ALBUM", priceChoco: 2000, description: "지금까지 춘심과 나눈 대화를 예쁜 앨범으로 만들어드려요. 소중한 추억을 한눈에 돌아볼 수 있어요." },
  // 5~6순위: 메시지 티켓
  { id: "ticket_msg_10", name: "메시지 티켓 x10", type: "TICKET", priceChoco: 1000, description: "춘심과 대화할 수 있는 횟수를 10회 추가해요. 무료 대화 횟수를 다 썼을 때 사용하세요. (서비스 준비 중)" },
  { id: "ticket_msg_50", name: "메시지 티켓 x50", type: "TICKET", priceChoco: 4500, description: "대화 횟수를 50회 한 번에 추가해요. 10회 티켓보다 10% 저렴하게 충전할 수 있어요. (서비스 준비 중)" },
  // 7~8순위: 선톡·하트
  { id: "presend_ticket", name: "선톡 티켓", type: "PRESEND", priceChoco: 300, description: "춘심이 먼저 말을 걸어와요! 기다리지 않아도 춘심의 메시지가 먼저 도착하는 특별한 경험이에요. (서비스 준비 중)" },
  { id: "heart", name: "하트 x10", type: "HEART", priceChoco: 1000, description: "춘심에게 하트를 선물해서 애정을 표현해보세요. 하트를 많이 받은 춘심은 더 따뜻하게 반응해요." },
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
