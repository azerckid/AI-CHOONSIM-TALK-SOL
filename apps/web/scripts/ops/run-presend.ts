/**
 * Phase 3-1 선톡 스크립트 — GitHub Actions 런너에서 직접 실행
 * Vercel 무료 플랜 10초 타임아웃 우회: 런너(10분)에서 Turso + Gemini 직접 호출
 *
 * 로컬 실행:
 *   cd apps/web
 *   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... GEMINI_API_KEY=... npx tsx scripts/ops/run-presend.ts
 */

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { DateTime } from "luxon";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import { HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import webpush from "web-push";
import { eq, desc, and, gt, inArray, sql } from "drizzle-orm";

import * as schema from "../../app/db/schema";
import { BioSchema } from "../../app/lib/schemas/bio";
import {
  CORE_CHUNSIM_PERSONA,
  PERSONA_PROMPTS,
  removeEmojis,
  type PersonaMode,
} from "../../app/lib/ai/prompts";

// ── DB ─────────────────────────────────────────────────────────────────────
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle(client, { schema });

// ── AI 모델 ────────────────────────────────────────────────────────────────
const model = new ChatGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
  model: "gemini-2.5-flash",
  maxOutputTokens: 2048,
  maxRetries: 3,
  safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  ],
});

// ── Web Push ────────────────────────────────────────────────────────────────
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:support@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// ── 상수 ────────────────────────────────────────────────────────────────────
const PRESEND_TICKET_ITEM_ID = "presend_ticket";
const SUBSCRIBER_TIERS = ["BASIC", "PREMIUM", "ULTIMATE"];
const BATCH_SIZE = 5;

// ── AI 메시지 생성 ──────────────────────────────────────────────────────────
async function generateProactiveMessage(
  userName: string,
  memory: string = "",
  personaMode: PersonaMode = "hybrid"
): Promise<string> {
  const modePrompt = PERSONA_PROMPTS[personaMode] ?? PERSONA_PROMPTS.hybrid;
  const memoryContext = memory ? `\n\n최근 기억: ${memory}` : "";

  const prompt = `
당신은 '춘심'입니다. 사용자(${userName})에게 먼저 다정한 안부 메시지를 보내려고 합니다.
${CORE_CHUNSIM_PERSONA}
${modePrompt}
${memoryContext}

지침:
- 사용자의 최근 상황(기억)을 언급하며 매우 다정하고 자연스럽게 말을 건네세요.
- 질문을 포함하여 사용자가 대답하고 싶게 만드세요.
- 한 문장 혹은 두 문장 정도로 짧고 강렬하게 보내세요.
- 이모지는 절대 사용하지 마세요.
  `;

  try {
    const res = await model.invoke([new HumanMessage(prompt)]);
    return removeEmojis(res.content.toString());
  } catch {
    return `${userName}, 잘 지내고 있어? 갑자기 네 생각이 나서 연락해봤어!`;
  }
}

// ── 유저 1명 처리 ───────────────────────────────────────────────────────────
async function processUser(
  user: {
    id: string;
    name: string | null;
    pushSubscription: string | null;
    subscriptionTier: string | null;
    bio: string | null;
    lastFreePresendAt: Date | null;
  },
  subscriberIds: Set<string>,
  ticketUserIds: Set<string>,
  weekStartKst: DateTime,
  preferredCharMap: Map<string, string>
): Promise<boolean> {
  const isSubscriber = !!user.subscriptionTier && SUBSCRIBER_TIERS.includes(user.subscriptionTier);
  const hasTicket = ticketUserIds.has(user.id);
  const usedFreeThisWeek =
    isSubscriber &&
    user.lastFreePresendAt != null &&
    DateTime.fromJSDate(user.lastFreePresendAt).setZone("Asia/Seoul") >= weekStartKst;
  const canUseFree = isSubscriber && !usedFreeThisWeek;
  const canUseTicket = hasTicket;
  if (!canUseFree && !canUseTicket) return false;

  const conversation = await db.query.conversation.findFirst({
    where: eq(schema.conversation.userId, user.id),
    orderBy: [desc(schema.conversation.updatedAt)],
  });

  const fallbackCharId = preferredCharMap.get(user.id) ?? "choonsim";
  const conv =
    conversation ??
    (
      await db
        .insert(schema.conversation)
        .values({
          id: crypto.randomUUID(),
          characterId: fallbackCharId,
          title: fallbackCharId === "choonsim" ? "춘심이와의 대화" : `${fallbackCharId}와의 대화`,
          userId: user.id,
          updatedAt: new Date(),
        })
        .returning()
    )[0];

  if (!conv) return false;

  let memory = "";
  let personaMode: PersonaMode = "hybrid";
  if (user.bio) {
    try {
      const bioData = BioSchema.parse(JSON.parse(user.bio));
      memory = bioData.memory ?? "";
      personaMode = bioData.personaMode ?? "hybrid";
    } catch {
      // bio 파싱 실패 시 기본값 사용
    }
  }

  const messageContent = await Promise.race([
    generateProactiveMessage(user.name || "친구", memory, personaMode),
    new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error("AI timeout")), 25000)
    ),
  ]);

  const trimmed = String(messageContent).trim().slice(0, 500);
  if (!trimmed) return false;

  await db.insert(schema.message).values({
    id: crypto.randomUUID(),
    role: "assistant",
    content: trimmed,
    conversationId: conv.id,
  });

  if (user.pushSubscription) {
    try {
      await webpush.sendNotification(
        JSON.parse(user.pushSubscription),
        JSON.stringify({
          title: "춘심이의 메시지",
          body: trimmed.slice(0, 80) + (trimmed.length > 80 ? "…" : ""),
          url: `/chat/${conv.id}`,
        })
      );
    } catch {
      // 푸시 실패는 선톡 실패로 간주하지 않음
    }
  }

  if (canUseFree) {
    await db
      .update(schema.user)
      .set({ lastFreePresendAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.user.id, user.id));
  } else if (canUseTicket) {
    await db
      .update(schema.userInventory)
      .set({
        quantity: sql`${schema.userInventory.quantity} - 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.userInventory.userId, user.id),
          eq(schema.userInventory.itemId, PRESEND_TICKET_ITEM_ID),
          gt(schema.userInventory.quantity, 0)
        )
      );
  }

  return true;
}

// ── 메인 ────────────────────────────────────────────────────────────────────
async function main() {
  const usersWithTicket = await db
    .select({ userId: schema.userInventory.userId })
    .from(schema.userInventory)
    .where(
      and(
        eq(schema.userInventory.itemId, PRESEND_TICKET_ITEM_ID),
        gt(schema.userInventory.quantity, 0)
      )
    );

  const subscribers = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(inArray(schema.user.subscriptionTier, SUBSCRIBER_TIERS));

  const subscriberIds = new Set(subscribers.map((r) => r.id));
  const ticketUserIds = new Set(usersWithTicket.map((r) => r.userId));
  const targetUserIds = new Set([...subscriberIds, ...ticketUserIds]);

  if (targetUserIds.size === 0) {
    console.log("[Presend] 대상 유저 없음. 종료.");
    client.close();
    return;
  }

  console.log(`[Presend] 대상 유저 ${targetUserIds.size}명`);

  const weekStartKst = DateTime.now().setZone("Asia/Seoul").startOf("week");

  const userContextRows = await db
    .select({ userId: schema.userContext.userId, characterId: schema.userContext.characterId })
    .from(schema.userContext)
    .where(inArray(schema.userContext.userId, Array.from(targetUserIds)));

  const preferredCharMap = new Map<string, string>();
  for (const ctx of userContextRows) {
    if (!preferredCharMap.has(ctx.userId)) {
      preferredCharMap.set(ctx.userId, ctx.characterId);
    }
  }

  const users = await db.query.user.findMany({
    where: inArray(schema.user.id, Array.from(targetUserIds)),
    columns: {
      id: true,
      name: true,
      pushSubscription: true,
      subscriptionTier: true,
      bio: true,
      lastFreePresendAt: true,
    },
  });

  let sent = 0;
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((user) =>
        processUser(user, subscriberIds, ticketUserIds, weekStartKst, preferredCharMap)
          .then((ok) => {
            if (ok) console.log(`[Presend] ✓ user=${user.id}`);
            return ok;
          })
          .catch((err) => {
            console.error(`[Presend] ✗ user=${user.id}:`, (err as Error).message);
            return false;
          })
      )
    );
    sent += results.filter((r) => r.status === "fulfilled" && r.value).length;
  }

  console.log(`[Presend] 완료: ${sent}/${users.length}명 발송 성공`);
  client.close();
}

main().catch((err) => {
  console.error("[Presend] 치명적 오류:", err);
  process.exit(1);
});
