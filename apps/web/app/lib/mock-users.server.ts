/**
 * Mock 유저 시뮬레이션 서버 로직 — Cron API에서 호출
 * Related: 21_MOCK_USER_SIMULATION_PLAN, 10_MOCK_USER_IMPLEMENTATION_PLAN
 */
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq, like } from "drizzle-orm";

const MOCK_EMAIL_PATTERN = "mock-%@test.local";
const MOCK_TARGET_COUNT = 50;
const INITIAL_CHOCO_MIN = 5000;
const INITIAL_CHOCO_MAX = 10000;
const CHARACTERS = ["choonsim", "rina"] as const;
const TOKENS_MIN = 500;
const TOKENS_MAX = 2000;
const DEFAULT_CHOCO_PER_USER = 3000;

function randomChoco(): string {
  const n = INITIAL_CHOCO_MIN + Math.floor(Math.random() * (INITIAL_CHOCO_MAX - INITIAL_CHOCO_MIN + 1));
  return String(n);
}

function randomInt(a: number, b: number): number {
  return a + Math.floor(Math.random() * (b - a + 1));
}

function chocoFromTokens(tokens: number): string {
  return String(Math.floor(tokens / 100));
}

/**
 * 배포 DB에 Mock 유저 50명이 없을 때 1회 호출. 이미 50명 이상이면 추가하지 않음.
 */
export async function seedMockUsers(): Promise<{ created: number; total: number }> {
  const existing = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(like(schema.user.email, MOCK_EMAIL_PATTERN));

  if (existing.length >= MOCK_TARGET_COUNT) {
    return { created: 0, total: existing.length };
  }

  const toCreate = MOCK_TARGET_COUNT - existing.length;
  const now = new Date();

  for (let i = 0; i < toCreate; i++) {
    const id = crypto.randomUUID();
    const email = `mock-${id.slice(0, 8)}@test.local`;
    const chocoBalance = randomChoco();

    await db.insert(schema.user).values({
      id,
      email,
      provider: "local",
      chocoBalance,
      createdAt: now,
      updatedAt: now,
      emailVerified: false,
    });
  }

  return { created: toCreate, total: existing.length + toCreate };
}

export async function grantMockUsersChoco(chocoPerUser = DEFAULT_CHOCO_PER_USER): Promise<{ updated: number }> {
  const users = await db
    .select({ id: schema.user.id, chocoBalance: schema.user.chocoBalance })
    .from(schema.user)
    .where(like(schema.user.email, MOCK_EMAIL_PATTERN));

  if (users.length === 0) return { updated: 0 };

  const now = new Date();
  for (const u of users) {
    const current = parseFloat(u.chocoBalance || "0");
    const next = current + chocoPerUser;
    await db
      .update(schema.user)
      .set({ chocoBalance: String(next), updatedAt: now })
      .where(eq(schema.user.id, u.id));
  }

  return { updated: users.length };
}

export async function runMockActivity(rounds = 1): Promise<{ logs: number; deducted: number; users: number }> {
  const users = await db
    .select({ id: schema.user.id, chocoBalance: schema.user.chocoBalance })
    .from(schema.user)
    .where(like(schema.user.email, MOCK_EMAIL_PATTERN));

  if (users.length === 0) return { logs: 0, deducted: 0, users: 0 };

  const now = new Date();
  let totalDeducted = 0;
  let totalLogs = 0;
  const balances = new Map<string, number>(users.map((u) => [u.id, parseFloat(u.chocoBalance || "0")]));

  for (let r = 0; r < rounds; r++) {
    for (const u of users) {
      const current = balances.get(u.id) ?? 0;
      const tokens = randomInt(TOKENS_MIN, TOKENS_MAX);
      const chocoToDeduct = chocoFromTokens(tokens);
      const deduct = parseInt(chocoToDeduct, 10);
      if (current < deduct) continue;

      const characterId = CHARACTERS[randomInt(0, CHARACTERS.length - 1)];
      const newBalance = current - deduct;
      balances.set(u.id, newBalance);

      await db
        .update(schema.user)
        .set({ chocoBalance: String(newBalance), updatedAt: now })
        .where(eq(schema.user.id, u.id));

      totalDeducted += deduct;
      totalLogs++;
    }
  }

  return { logs: totalLogs, deducted: totalDeducted, users: users.length };
}
