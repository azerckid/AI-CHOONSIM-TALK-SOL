import { type ActionFunctionArgs, data } from "react-router";
import { z } from "zod";
import { paypal, paypalClient } from "~/lib/paypal.server";
import { HEART_PACKAGES } from "~/lib/items";
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

    const body = await request.json();
    const submission = CreateOrderSchema.safeParse(body);

    if (!submission.success) {
        return data({ error: "Invalid payload" }, { status: 400 });
    }

    const { packageId } = submission.data;
    const itemPackage = HEART_PACKAGES.find((p) => p.id === packageId);

    if (!itemPackage) {
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
                    value: itemPackage.priceUSD.toFixed(2),
                },
                description: `${itemPackage.name} (${itemPackage.quantity} Hearts)`,
                custom_id: userId,
            },
        ],
    });

    try {
        const order = await paypalClient.execute(requestBody);
        return data({ orderId: order.result.id });
    } catch (error) {
        logger.error({ category: "PAYMENT", message: "PayPal Create Item Order Error:", stackTrace: (error as Error).stack });
        return data({ error: "Failed to create PayPal order" }, { status: 500 });
    }
}
