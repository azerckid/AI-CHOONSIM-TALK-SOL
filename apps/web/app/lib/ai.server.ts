/**
 * AI 서버 모듈 — 하위 모듈의 barrel re-export
 *
 * 실제 구현은 lib/ai/ 디렉토리의 각 파일에 있습니다:
 *   - prompts.ts   — 페르소나 프롬프트, Guardrail 상수
 *   - markers.ts   — [PHOTO:n], [EMOTION:CODE] 마커 파싱
 *   - model.ts     — Gemini 모델 인스턴스
 *   - graph.ts     — LangGraph 워크플로우, generateAIResponse
 *   - stream.ts    — buildStreamSystemInstruction, streamAIResponse
 *   - memory.ts    — extractMemoryCandidates, generateSummary, generateProactiveMessage
 */
export type { SubscriptionTier, PersonaMode } from "./ai/prompts";
export {
    CORE_CHUNSIM_PERSONA,
    GUARDRAIL_BY_TIER,
    PERSONA_PROMPTS,
    applyCharacterName,
    removeEmojis,
} from "./ai/prompts";

export { extractPhotoMarker, extractEmotionMarker } from "./ai/markers";

export { model, urlToBase64 } from "./ai/model";

export type { HistoryMessage } from "./ai/graph";
export { createChatGraph, generateAIResponse } from "./ai/graph";

export type { TokenUsage, StreamSystemInstructionParams } from "./ai/stream";
export { buildStreamSystemInstruction, streamAIResponse } from "./ai/stream";

export { extractMemoryCandidates, generateSummary, generateProactiveMessage } from "./ai/memory";
