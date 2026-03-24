/**
 * 계정 탈퇴 시 사용자 연관 데이터 전체 삭제
 * FK 의존성을 고려한 삭제 순서 적용
 *
 * Created: 2026-02-22
 * Last Updated: 2026-02-22
 */

import { db } from "./db.server";
import * as schema from "../db/schema";
import { eq, inArray, or } from "drizzle-orm";
import { logger } from "./logger.server";

export async function deleteUserData(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await db.transaction(async (tx) => {
            // 1. Conversation 관련: messageLike -> agentExecution -> message -> conversation
            const userConversations = await tx
                .select({ id: schema.conversation.id })
                .from(schema.conversation)
                .where(eq(schema.conversation.userId, userId));

            const convIds = userConversations.map((c) => c.id);
            if (convIds.length > 0) {
                const messages = await tx
                    .select({ id: schema.message.id })
                    .from(schema.message)
                    .where(inArray(schema.message.conversationId, convIds));
                const msgIds = messages.map((m) => m.id);

                if (msgIds.length > 0) {
                    await tx.delete(schema.messageLike).where(inArray(schema.messageLike.messageId, msgIds));
                    await tx.delete(schema.agentExecution).where(inArray(schema.agentExecution.messageId, msgIds));
                }
                await tx.delete(schema.message).where(inArray(schema.message.conversationId, convIds));
                await tx.delete(schema.conversation).where(eq(schema.conversation.userId, userId));
            }

            // 2. MessageLike (다른 유저 대화의 메시지에 대한 좋아요)
            await tx.delete(schema.messageLike).where(eq(schema.messageLike.userId, userId));

            // 3. User Context & Memory
            await tx.delete(schema.userContext).where(eq(schema.userContext.userId, userId));
            await tx.delete(schema.userMemoryItem).where(eq(schema.userMemoryItem.userId, userId));

            // 4. 인벤토리, 선물 로그
            await tx.delete(schema.userInventory).where(eq(schema.userInventory.userId, userId));
            await tx.delete(schema.giftLog).where(eq(schema.giftLog.fromUserId, userId));

            // 5. DM: directMessage (보낸 메시지) -> DMParticipant
            await tx.delete(schema.directMessage).where(eq(schema.directMessage.senderId, userId));
            await tx.delete(schema.dMParticipant).where(eq(schema.dMParticipant.userId, userId));

            // 6. Travel: travelPlanItem -> travelPlan
            const plans = await tx.select({ id: schema.travelPlan.id }).from(schema.travelPlan).where(eq(schema.travelPlan.userId, userId));
            const planIds = plans.map((p) => p.id);
            if (planIds.length > 0) {
                await tx.delete(schema.travelPlanItem).where(inArray(schema.travelPlanItem.travelPlanId, planIds));
            }
            await tx.delete(schema.travelPlan).where(eq(schema.travelPlan.userId, userId));

            // 7. Tweet 관련: tweetEmbedding, tweetTravelTag, bookmark, like, retweet, media -> tweet
            const userTweets = await tx.select({ id: schema.tweet.id }).from(schema.tweet).where(eq(schema.tweet.userId, userId));
            const tweetIds = userTweets.map((t) => t.id);
            if (tweetIds.length > 0) {
                await tx.delete(schema.tweetEmbedding).where(inArray(schema.tweetEmbedding.tweetId, tweetIds));
                await tx.delete(schema.tweetTravelTag).where(inArray(schema.tweetTravelTag.tweetId, tweetIds));
                await tx.delete(schema.bookmark).where(inArray(schema.bookmark.tweetId, tweetIds));
                await tx.delete(schema.like).where(inArray(schema.like.tweetId, tweetIds));
                await tx.delete(schema.retweet).where(inArray(schema.retweet.tweetId, tweetIds));
                await tx.delete(schema.media).where(inArray(schema.media.tweetId, tweetIds));
            }
            await tx.delete(schema.tweet).where(eq(schema.tweet.userId, userId));
            await tx.delete(schema.bookmark).where(eq(schema.bookmark.userId, userId));
            await tx.delete(schema.bookmarkCollection).where(eq(schema.bookmarkCollection.userId, userId));
            await tx.delete(schema.like).where(eq(schema.like.userId, userId));
            await tx.delete(schema.retweet).where(eq(schema.retweet.userId, userId));

            // 8. 기타 userId 테이블
            await tx.delete(schema.fanPost).where(eq(schema.fanPost.userId, userId));
            await tx.delete(schema.userMission).where(eq(schema.userMission.userId, userId));
            await tx.delete(schema.payment).where(eq(schema.payment.userId, userId));
            await tx.delete(schema.relayerLog).where(eq(schema.relayerLog.userId, userId));
            await tx.delete(schema.multichainAddress).where(eq(schema.multichainAddress.userId, userId));
            await tx.delete(schema.exchangeLog).where(eq(schema.exchangeLog.userId, userId));
            await tx.delete(schema.notification).where(eq(schema.notification.userId, userId));

            // 9. Follow (followerId 또는 followingId)
            await tx.delete(schema.follow).where(or(eq(schema.follow.followerId, userId), eq(schema.follow.followingId, userId)));

            // 10. Better Auth: account, session, user
            await tx.delete(schema.account).where(eq(schema.account.userId, userId));
            await tx.delete(schema.session).where(eq(schema.session.userId, userId));
            await tx.delete(schema.user).where(eq(schema.user.id, userId));
        });

        return { success: true };
    } catch (err) {
        logger.error({ category: "DB", message: "[AccountDelete] 계정 삭제 실패", stackTrace: (err as Error).stack });
        return {
            success: false,
            error: err instanceof Error ? err.message : "계정 삭제 중 오류가 발생했습니다.",
        };
    }
}
