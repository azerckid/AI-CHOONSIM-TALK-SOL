import type { ActionFunctionArgs } from "react-router";
import { requireUserId } from "~/lib/auth.server";
import { confirmTossPayment, processSuccessfulTossPayment } from "~/lib/toss.server";
import { logger } from "~/lib/logger.server";

export async function action({ request }: ActionFunctionArgs) {
    const userId = await requireUserId(request);
    if (!userId) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { paymentKey, orderId, amount, creditsGranted } = await request.json();

    if (!paymentKey || !orderId || !amount || !creditsGranted) {
        return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    try {
        // 1. 토스 페이먼츠 서버에 최종 결제 승인 요청
        const paymentData = await confirmTossPayment(paymentKey, orderId, amount);

        // 2. DB 업데이트 및 크레딧 부여
        const result = await processSuccessfulTossPayment(userId, paymentData, creditsGranted);

        return Response.json({
            success: true,
            credits: result.user?.credits ?? 0,
            message: "결제가 완료되었습니다."
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error({ category: "PAYMENT", message: "Toss Payment Confirmation Error:", stackTrace: (error as Error).stack });
        return Response.json({
            success: false,
            error: errorMessage || "결제 승인 중 오류가 발생했습니다."
        }, { status: 500 });
    }
}
