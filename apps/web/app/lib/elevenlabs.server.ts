/**
 * ElevenLabs TTS 연동 (Phase 3-2 보이스 메시지)
 * - 캐릭터별 Voice ID는 환경변수 또는 매핑으로 확장 가능
 */

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

function getApiKey(): string | null {
    return process.env.ELEVENLABS_API_KEY ?? null;
}

const CHARACTER_VOICE_MAP: Record<string, string | undefined> = {
    chunsim: process.env.ELEVENLABS_VOICE_ID_CHOONSIM ?? process.env.ELEVENLABS_VOICE_ID,
    rina: process.env.ELEVENLABS_VOICE_ID_RINA,
};

/**
 * 캐릭터 ID에 해당하는 Voice ID 반환. 미설정 시 null.
 */
export function getVoiceIdForCharacter(characterId?: string | null): string | null {
    const key = characterId ?? "chunsim";
    return CHARACTER_VOICE_MAP[key] ?? null;
}

/**
 * 텍스트를 음성(MP3)으로 변환.
 * @param text 변환할 텍스트
 * @param voiceId ElevenLabs Voice ID (미지정 시 ELEVENLABS_VOICE_ID_CHOONSIM 사용)
 * @returns MP3 바이너리 또는 실패 시 null
 */
export async function textToSpeech(text: string, voiceId?: string | null): Promise<Buffer | null> {
    const apiKey = getApiKey();
    const vid = voiceId ?? getVoiceIdForCharacter(null);
    if (!apiKey || !vid || !text.trim()) return null;

    const url = `${ELEVENLABS_BASE}/text-to-speech/${encodeURIComponent(vid)}`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
        },
        body: JSON.stringify({
            text: text.trim(),
            model_id: process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2",
        }),
    });

    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
}
