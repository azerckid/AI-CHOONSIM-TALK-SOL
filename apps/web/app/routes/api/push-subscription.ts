import type { ActionFunctionArgs } from "react-router";
import { db } from "~/lib/db.server";
import { auth } from "~/lib/auth.server";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "~/lib/logger.server";

export async function action({ request }: ActionFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subscription } = await request.json();

    try {
        await db.update(schema.user)
            .set({
                pushSubscription: JSON.stringify(subscription),
                updatedAt: new Date(),
            })
            .where(eq(schema.user.id, session.user.id));

        return Response.json({ success: true });
    } catch (error) {
        logger.error({ category: "API", message: "Save push subscription error", stackTrace: (error as Error).stack });
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}

