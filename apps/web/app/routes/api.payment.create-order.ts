import { type ActionFunctionArgs, data } from "react-router";
import { z } from "zod";
import { paypal, paypalClient } from "~/lib/paypal.server";
import { CREDIT_PACKAGES } from "~/lib/subscription-plans";
import { requireUserId } from "~/lib/auth.server";
import { logger } from "~/lib/logger.server";

const CreateOrderSchema = z.object({
    packageId: z.string(),
});

export async function action({ request }: ActionFunctionArgs) {
    const userId = await requireUserId(request);
    if (!userId) {
        throw data({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const submission = CreateOrderSchema.safeParse(Object.fromEntries(formData));

    if (!submission.success) {
        return data({ error: "Invalid payload" }, { status: 400 });
    }

    const { packageId } = submission.data;
    const creditPackage = CREDIT_PACKAGES.find((p) => p.id === packageId);

    if (!creditPackage) {
        return data({ error: "Invalid package ID" }, { status: 400 });
    }

    // PayPal 주문 생성 요청 구성
    const requestBody = new paypal.orders.OrdersCreateRequest();
    requestBody.prefer("return=representation");
    requestBody.requestBody({
        intent: "CAPTURE",
        purchase_units: [
            {
                reference_id: packageId,
                amount: {
                    currency_code: "USD",
                    value: creditPackage.price.toFixed(2),
                },
                description: `${creditPackage.credits + creditPackage.bonus} Credits Top-up`,
                custom_id: userId, // 나중에 검증용으로 사용자 ID 포함
            },
        ],
    });

    try {
        const order = await paypalClient.execute(requestBody);
        return data({ orderId: order.result.id });
    } catch (error) {
        logger.error({ category: "PAYMENT", message: "PayPal Create Order Error:", stackTrace: (error as Error).stack });
        return data({ error: "Failed to create PayPal order" }, { status: 500 });
    }
}
