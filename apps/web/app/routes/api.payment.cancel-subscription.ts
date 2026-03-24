
import { type ActionFunctionArgs, data } from "react-router";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import { requireUserId } from "~/lib/auth.server";
import { cancelPayPalSubscription } from "~/lib/paypal.server";
import { logger } from "~/lib/logger.server";

export async function action({ request }: ActionFunctionArgs) {
    const userId = await requireUserId(request);
    if (!userId) {
        throw new Response("Unauthorized", { status: 401 });
    }

    if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    // 사용자 정보 및 구독 ID 조회
    const user = await db.query.user.findFirst({
        where: eq(schema.user.id, userId),
    });

    if (!user || !user.subscriptionId) {
        return data({ error: "No active subscription found" }, { status: 400 });
    }

    try {
        // 1. PayPal API로 구독 취소 요청
        await cancelPayPalSubscription(user.subscriptionId, "User requested cancellation via website");

        // 2. DB 업데이트
        // subscriptionStatus를 'CANCELLED'로 변경하지만,
        // subscriptionTier나 currentPeriodEnd는 그대로 두어 남은 기간 동안 혜택을 유지할 수 있게 함.
        await db.update(schema.user).set({
            subscriptionStatus: "CANCELLED",
        }).where(eq(schema.user.id, userId));

        // 3. Payment 로그 기록 (선택 사항, 기록 남기면 좋음)
        // 여기서는 상태 변경만 기록하거나 skip 가능

        return data({ success: true });

    } catch (error) {
        logger.error({ category: "PAYMENT", message: "Subscription Cancellation Error:", stackTrace: (error as Error).stack });
        return data({ error: "Failed to cancel subscription. Please try again later." }, { status: 500 });
    }
}
