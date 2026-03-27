/**
 * Phase 4-1: 대화 앨범 — 메시지 선별 로직
 * 최근 30일 대화에서 선별하여 앨범용 메시지 목록 반환
 */
import { DateTime } from "luxon";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq, and, inArray, gte, asc } from "drizzle-orm";

const DAYS_BACK = 30;
const MAX_MESSAGES = 80;

export interface AlbumMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  characterName: string;
}

/**
 * 사용자의 최근 30일 대화에서 앨범용 메시지를 선별한다.
 * - choonsim(춘심) 대화 우선, 없으면 가장 많은 대화 캐릭터
 * - 메시지 수 제한(MAX_MESSAGES)으로 PDF 크기 관리
 */
export async function selectAlbumMessages(userId: string): Promise<AlbumMessage[]> {
  const since = DateTime.now().setZone("Asia/Seoul").minus({ days: DAYS_BACK }).toJSDate();

  const conversations = await db.query.conversation.findMany({
    where: eq(schema.conversation.userId, userId),
    columns: { id: true, characterId: true },
  });

  if (conversations.length === 0) return [];

  const convIds = conversations.map((c) => c.id);
  const charIds = [...new Set(conversations.map((c) => c.characterId || "choonsim"))];

  const messages = await db.query.message.findMany({
    where: and(
      inArray(schema.message.conversationId, convIds),
      gte(schema.message.createdAt, since)
    ),
    orderBy: [asc(schema.message.createdAt)],
    columns: { id: true, role: true, content: true, createdAt: true, conversationId: true },
  });

  const convMap = new Map(conversations.map((c) => [c.id, c.characterId || "choonsim"]));
  const characters = await db.query.character.findMany({
    where: inArray(schema.character.id, charIds),
    columns: { id: true, name: true },
  });
  const charNameMap = new Map(characters.map((c) => [c.id, c.name]));

  const withChar: AlbumMessage[] = messages.slice(0, MAX_MESSAGES).map((m) => {
    const charId = convMap.get(m.conversationId) || "choonsim";
    return {
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      createdAt: m.createdAt,
      characterName: charNameMap.get(charId) || "춘심",
    };
  });

  return withChar;
}
