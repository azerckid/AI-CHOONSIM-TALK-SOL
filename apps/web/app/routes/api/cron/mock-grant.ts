/**
 * Mock 유저 일일 초코 지급 Cron
 * Related: 21_MOCK_USER_SIMULATION_PLAN, 10_MOCK_USER_IMPLEMENTATION_PLAN
 */
import type { LoaderFunctionArgs } from "react-router";
import { grantMockUsersChoco } from "~/lib/mock-users.server";
import { logger } from "~/lib/logger.server";

const CRON_SECRET = process.env.CRON_SECRET;
const DEFAULT_CHOCO = 3000;

export async function loader({ request }: LoaderFunctionArgs) {
  const authHeader = request.headers.get("Authorization");
  const secret = authHeader?.replace(/^Bearer\s+/i, "") ?? request.headers.get("X-Cron-Secret") ?? "";

  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const chocoPerUser = Number(process.env.CHOCO_PER_USER) || DEFAULT_CHOCO;
    const { updated } = await grantMockUsersChoco(chocoPerUser);
    return Response.json({ ok: true, updated, chocoPerUser });
  } catch (e) {
    logger.error({
      category: "SYSTEM",
      message: "[Mock Grant Cron] 실패",
      stackTrace: (e as Error).stack,
    });
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
