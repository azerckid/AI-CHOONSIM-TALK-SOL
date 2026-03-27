/**
 * Phase 3-1: 선톡 Cron — 캐릭터가 먼저 DM
 * 선톡 티켓 보유 또는 BASIC+ 구독 유저에게 AI 선톡 메시지 전송 + Web Push.
 * BASIC+ 구독자는 주 1회 무료 선톡(쿼터), 초과 시 티켓 사용.
 *
 * Related: docs/04_Logic_Progress/03_BM_IMPLEMENTATION_PLAN.md Phase 3-1
 */
import type { LoaderFunctionArgs } from "react-router";
import { DateTime } from "luxon";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq, desc, and, gt, inArray, sql } from "drizzle-orm";
import { generateProactiveMessage, type PersonaMode } from "~/lib/ai.server";
import { sendWebPush } from "~/lib/push.server";
import { logger } from "~/lib/logger.server";
import { BioSchema } from "~/lib/schemas/bio";

const CRON_SECRET = process.env.CRON_SECRET;
const PRESEND_TICKET_ITEM_ID = "presend_ticket";
const SUBSCRIBER_TIERS = ["BASIC", "PREMIUM", "ULTIMATE"];

export async function loader({ request }: LoaderFunctionArgs) {
  const authHeader = request.headers.get("Authorization");
  const secret =
    authHeader?.replace(/^Bearer\s+/i, "") ?? request.headers.get("X-Cron-Secret") ?? "";

  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sent = await runPresend();
    return Response.json({ ok: true, sent });
  } catch (e) {
    logger.error({ category: "SYSTEM", message: "[Presend Cron] 실패", stackTrace: (e as Error).stack });
    return Response.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}

async function runPresend(): Promise<number> {
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
  if (targetUserIds.size === 0) return 0;

  const weekStartKst = DateTime.now().setZone("Asia/Seoul").startOf("week");

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
  for (const user of users) {
    const isSubscriber = user.subscriptionTier && SUBSCRIBER_TIERS.includes(user.subscriptionTier);
    const hasTicket = ticketUserIds.has(user.id);
    const usedFreeThisWeek =
      isSubscriber &&
      user.lastFreePresendAt &&
      DateTime.fromJSDate(user.lastFreePresendAt).setZone("Asia/Seoul") >= weekStartKst;
    const canUseFree = isSubscriber && !usedFreeThisWeek;
    const canUseTicket = hasTicket;
    if (!canUseFree && !canUseTicket) continue;

    try {
      const conversation = await db.query.conversation.findFirst({
        where: eq(schema.conversation.userId, user.id),
        orderBy: [desc(schema.conversation.updatedAt)],
      });

      const conv =
        conversation ??
        (
          await db
            .insert(schema.conversation)
            .values({
              id: crypto.randomUUID(),
              characterId: "choonsim",
              title: "춘심이와의 대화",
              userId: user.id,
              updatedAt: new Date(),
            })
            .returning()
        )[0];

      if (!conv) continue;

      let memory = "";
      let personaMode: PersonaMode = "hybrid";
      if (user.bio) {
        try {
          const bioData = BioSchema.parse(JSON.parse(user.bio));
          memory = bioData.memory;
          personaMode = bioData.personaMode ?? "hybrid";
        } catch (e) {
          logger.warn({
            category: "SYSTEM",
            message: `Failed to parse bio JSON for user ${user.id}`,
            metadata: { userId: user.id, error: String(e) },
          });
        }
      }

      const messageContent = await Promise.race([
        generateProactiveMessage(user.name || "친구", memory, personaMode),
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error("AI timeout")), 25000)
        ),
      ]);

      const trimmed = String(messageContent).trim().slice(0, 500);
      if (!trimmed) continue;

      await db.insert(schema.message).values({
        id: crypto.randomUUID(),
        role: "assistant",
        content: trimmed,
        conversationId: conv.id,
      });

      await sendWebPush(user.pushSubscription, {
        title: "춘심이의 메시지",
        body: trimmed.slice(0, 80) + (trimmed.length > 80 ? "…" : ""),
        url: `/chat/${conv.id}`,
      });

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

      sent++;
    } catch (err) {
      logger.error({ category: "SYSTEM", message: `[Presend] user ${user.id} 선톡 실패`, stackTrace: (err as Error).stack });
    }
  }

  return sent;
}
