import { db } from "~/lib/db.server";
import { auth } from "~/lib/auth.server";
import type { LoaderFunctionArgs } from "react-router";
import * as schema from "~/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { logger } from "~/lib/logger.server";

/**
 * 사용자별 토큰 사용량 통계 API
 * GET /api/stats/usage
 * 
 * 현재 인증된 사용자의 토큰 사용량을 집계하여 반환합니다.
 */
export async function loader({ request }: LoaderFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    try {
        // 사용자의 모든 대화방 ID 조회
        const userConversations = await db.query.conversation.findMany({
            where: eq(schema.conversation.userId, userId),
            columns: { id: true },
        });

        const conversationIds = userConversations.map((c) => c.id);

        if (conversationIds.length === 0) {
            return Response.json({
                total: {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0,
                    messageCount: 0,
                },
                daily: [],
                monthly: [],
            });
        }

        // 사용자의 모든 메시지 ID 조회
        const userMessages = await db.query.message.findMany({
            where: and(
                inArray(schema.message.conversationId, conversationIds),
                eq(schema.message.role, "assistant")
            ),
            columns: { id: true },
        });

        const messageIds = userMessages.map((m) => m.id);

        if (messageIds.length === 0) {
            return Response.json({
                total: {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0,
                    messageCount: 0,
                },
                daily: [],
                monthly: [],
            });
        }

        // AgentExecution에서 토큰 사용량 집계
        const executions = await db.query.agentExecution.findMany({
            where: inArray(schema.agentExecution.messageId, messageIds),
            columns: {
                promptTokens: true,
                completionTokens: true,
                totalTokens: true,
                createdAt: true,
            },
        });

        // 전체 집계
        const total = executions.reduce(
            (acc, exec) => ({
                promptTokens: acc.promptTokens + exec.promptTokens,
                completionTokens: acc.completionTokens + exec.completionTokens,
                totalTokens: acc.totalTokens + exec.totalTokens,
                messageCount: acc.messageCount + 1,
            }),
            {
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
                messageCount: 0,
            }
        );

        // 일별 집계 (최근 30일)
        const dailyMap = new Map<string, { promptTokens: number; completionTokens: number; totalTokens: number; messageCount: number }>();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        executions
            .filter((exec) => exec.createdAt >= thirtyDaysAgo)
            .forEach((exec) => {
                const dateKey = exec.createdAt.toISOString().split("T")[0]; // YYYY-MM-DD
                const existing = dailyMap.get(dateKey) || {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0,
                    messageCount: 0,
                };
                dailyMap.set(dateKey, {
                    promptTokens: existing.promptTokens + exec.promptTokens,
                    completionTokens: existing.completionTokens + exec.completionTokens,
                    totalTokens: existing.totalTokens + exec.totalTokens,
                    messageCount: existing.messageCount + 1,
                });
            });

        const daily = Array.from(dailyMap.entries())
            .map(([date, stats]) => ({ date, ...stats }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // 월별 집계 (최근 12개월)
        const monthlyMap = new Map<string, { promptTokens: number; completionTokens: number; totalTokens: number; messageCount: number }>();
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        executions
            .filter((exec) => exec.createdAt >= twelveMonthsAgo)
            .forEach((exec) => {
                const monthKey = exec.createdAt.toISOString().slice(0, 7); // YYYY-MM
                const existing = monthlyMap.get(monthKey) || {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0,
                    messageCount: 0,
                };
                monthlyMap.set(monthKey, {
                    promptTokens: existing.promptTokens + exec.promptTokens,
                    completionTokens: existing.completionTokens + exec.completionTokens,
                    totalTokens: existing.totalTokens + exec.totalTokens,
                    messageCount: existing.messageCount + 1,
                });
            });

        const monthly = Array.from(monthlyMap.entries())
            .map(([month, stats]) => ({ month, ...stats }))
            .sort((a, b) => a.month.localeCompare(b.month));

        return Response.json({
            total,
            daily,
            monthly,
        });
    } catch (error) {
        logger.error({ category: "API", message: "Error fetching token usage stats", stackTrace: (error as Error).stack });
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}

