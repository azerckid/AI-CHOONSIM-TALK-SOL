/**
 * AI 응답 마커 파싱 유틸리티
 * - [PHOTO:n] — 캐릭터 사진 전송 마커
 * - [EMOTION:CODE] — 감정 상태 마커
 */
import { db } from "../db.server";
import * as schema from "../../db/schema";
import { eq } from "drizzle-orm";

/**
 * AI 응답에서 [PHOTO:index] 마커를 감지하고 이미지 URL을 추출
 */
export async function extractPhotoMarker(content: string, characterId: string = "chunsim"): Promise<{ content: string; photoUrl: string | null }> {
    // [PHOTO:0], [PHOTO:O], [PHOTO:o] 모두 인식 (O/o는 0으로 처리)
    const photoMarkerRegex = /\[PHOTO:([0-9Oo]+)\]/gi;
    const matches = Array.from(content.matchAll(photoMarkerRegex));

    if (matches.length === 0) {
        return { content, photoUrl: null };
    }

    const firstMatch = matches[0];
    let photoIndexStr = firstMatch[1].toUpperCase();
    if (photoIndexStr === 'O') {
        photoIndexStr = '0';
    }
    const photoIndex = parseInt(photoIndexStr, 10);

    const character = await db.query.character.findFirst({
        where: eq(schema.character.id, characterId),
        with: { media: { where: eq(schema.characterMedia.type, "NORMAL") } }
    });

    if (!character || !character.media || photoIndex >= character.media.length) {
        return { content: content.replace(photoMarkerRegex, "").trim(), photoUrl: null };
    }

    const photoUrl = character.media[photoIndex].url;
    const cleanedContent = content.replace(photoMarkerRegex, "").trim();

    return { content: cleanedContent, photoUrl };
}

/**
 * AI 응답에서 [EMOTION:CODE] 마커를 감지하고 감정 코드를 추출
 */
export function extractEmotionMarker(content: string): { content: string; emotion: string | null } {
    const emotionMarkerRegex = /\[EMOTION:([A-Z]+)\]/gi;
    const match = /\[EMOTION:([A-Z]+)\]/gi.exec(content);

    if (!match) {
        return { content, emotion: null };
    }

    const emotion = match[1].toUpperCase();
    const cleanedContent = content.replace(emotionMarkerRegex, "").trim();

    return { content: cleanedContent, emotion };
}
