/**
 * 레거시 `user.bio` JSON 필드 스키마
 *
 * @deprecated bio 컬럼은 Phase 9에서 5계층(UserContext/UserMemoryItem)으로 이전.
 *             읽기 fallback에만 사용. 이 스키마도 이전 완료 시 삭제 예정.
 */
import { z } from "zod";

export const BioSchema = z.object({
    memory: z.string().optional().default(""),
    personaMode: z
        .enum(["idol", "lover", "hybrid", "roleplay", "concierge"])
        .optional()
        .default("hybrid"),
    lastMemoryUpdate: z.string().optional(),
}).passthrough();

export type Bio = z.infer<typeof BioSchema>;
