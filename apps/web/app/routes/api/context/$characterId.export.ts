/**
 * GET /api/context/:characterId/export
 *
 * 5계층 전체 데이터를 마크다운 형식으로 다운로드 (명세 11.1)
 */

import type { LoaderFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { getFullContextData, getMemoryItems } from "~/lib/context/db";
import { CHARACTERS } from "~/lib/characters";
import { logger } from "~/lib/logger.server";
import {
    compressHeartbeatForPrompt,
    compressIdentityForPrompt,
    compressSoulForPrompt,
    compressToolsForPrompt
} from "~/lib/context";

export async function loader({ request, params }: LoaderFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const characterId = params.characterId;
    if (!characterId) return new Response("characterId is required", { status: 400 });
    if (!Object.prototype.hasOwnProperty.call(CHARACTERS, characterId)) {
        return new Response("Unsupported character", { status: 400 });
    }

    try {
        const [
            fullData,
            memories,
            heartbeatStr,
            identityStr,
            soulStr,
            toolsStr
        ] = await Promise.all([
            getFullContextData(session.user.id, characterId),
            getMemoryItems(session.user.id, characterId),
            compressHeartbeatForPrompt(session.user.id, characterId),
            compressIdentityForPrompt(session.user.id, characterId),
            compressSoulForPrompt(session.user.id, characterId, "ULTIMATE"), // Export all available data
            compressToolsForPrompt(session.user.id, characterId)
        ]);

        const date = new Date().toISOString().split('T')[0];

        let markdown = `# AI Character Context Export
- Character: ${CHARACTERS[characterId as keyof typeof CHARACTERS].name}
- User ID: ${session.user.id}
- Date: ${date}

---

## 1. Heartbeat (Status)
${heartbeatStr || "(No data)"}

---

## 2. Identity
${identityStr || "(No data)"}

---

## 3. Soul (Deep Mind)
${soulStr || "(No data)"}

---

## 4. Tools & Guidelines
${toolsStr || "(No data)"}

---

## 5. Memories (${memories.length} items)
`;

        if (memories.length > 0) {
            memories.forEach((mem, index) => {
                markdown += `\n### Memory #${index + 1}`;
                markdown += `\n- **Content**: ${mem.content}`;
                markdown += `\n- **Importance**: ${mem.importance}`;
                markdown += `\n- **Category**: ${mem.category || "N/A"}`;
                markdown += `\n- **Created**: ${new Date(mem.createdAt).toLocaleString()}`;
                markdown += `\n`;
            });
        } else {
            markdown += "\n(No memories stored)";
        }

        return new Response(markdown, {
            headers: {
                "Content-Type": "text/markdown; charset=utf-8",
                "Content-Disposition": `attachment; filename="context_${characterId}_${date}.md"`
            }
        });

    } catch (e) {
        logger.error({ category: "API", message: "Context export failed", stackTrace: (e as Error).stack });
        return new Response("Internal Server Error", { status: 500 });
    }
}
