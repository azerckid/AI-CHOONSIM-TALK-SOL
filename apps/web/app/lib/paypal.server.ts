import paypal from "@paypal/checkout-server-sdk";
import { logger } from "./logger.server";

// 환경 변수 확인
const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
const mode = process.env.PAYPAL_MODE || "sandbox";
const webhookId = process.env.PAYPAL_WEBHOOK_ID;

if (!clientId || !clientSecret) {
    throw new Error("MISSING_PAYPAL_CREDENTIALS");
}

// PayPal 환경 설정
const environment =
    mode === "live"
        ? new paypal.core.LiveEnvironment(clientId, clientSecret)
        : new paypal.core.SandboxEnvironment(clientId, clientSecret);

// PayPal 클라이언트 생성
export const paypalClient = new paypal.core.PayPalHttpClient(environment);

// Webhook 서명 검증 함수
export async function verifyWebhookSignature(headers: Record<string, string>, body: unknown) {
    if (!webhookId) {
        logger.warn({ category: "PAYMENT", message: "PAYPAL_WEBHOOK_ID is not set in env. Skipping signature verification (NOT RECOMMENDED for production)." });
        return true;
    }

    const request = {
        path: "/v1/notifications/verify-webhook-signature",
        verb: "POST",
        body: {
            auth_algo: headers['paypal-auth-algo'],
            cert_url: headers['paypal-cert-url'],
            transmission_id: headers['paypal-transmission-id'],
            transmission_sig: headers['paypal-transmission-sig'],
            transmission_time: headers['paypal-transmission-time'],
            webhook_id: webhookId,
            webhook_event: body
        },
        headers: {
            "Content-Type": "application/json"
        }
    };

    try {
        const response = await paypalClient.execute({
            ...request,
            headers: request.headers,
            // @ts-ignore
            body: request.body
        });

        return response.result.verification_status === "SUCCESS";
    } catch (error) {
        logger.error({ category: "PAYMENT", message: "PayPal Webhook Verification Failed", stackTrace: (error as Error).stack });
        return false;
    }
}

// 구독 취소 함수
export async function cancelPayPalSubscription(subscriptionId: string, reason: string = "User requested cancellation") {
    // REST API Request for Cancel
    // POST /v1/billing/subscriptions/{id}/cancel
    const request = {
        path: `/v1/billing/subscriptions/${subscriptionId}/cancel`,
        verb: "POST",
        body: {
            reason: reason
        },
        headers: {
            "Content-Type": "application/json"
        }
    };

    try {
        const response = await paypalClient.execute(request);
        // Successful cancellation returns 204 No Content
        return response.statusCode === 204;
    } catch (error) {
        logger.error({ category: "PAYMENT", message: "Failed to cancel PayPal subscription", stackTrace: (error as Error).stack });
        throw error;
    }
}

// export types for convenience
export { paypal };
