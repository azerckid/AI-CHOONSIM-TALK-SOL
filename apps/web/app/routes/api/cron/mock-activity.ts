/**
 * Mock 유저 소비 시뮬레이션 Cron
 * Related: 21_MOCK_USER_SIMULATION_PLAN, 10_MOCK_USER_IMPLEMENTATION_PLAN
 */
import type { LoaderFunctionArgs } from "react-router";
import { runMockActivity } from "~/lib/mock-users.server";
import { logger } from "~/lib/logger.server";

const CRON_SECRET = process.env.CRON_SECRET;
const DEFAULT_ROUNDS = 1;

export async function loader({ request }: LoaderFunctionArgs) {
  const authHeader = request.headers.get("Authorization");
  const secret = authHeader?.replace(/^Bearer\s+/i, "") ?? request.headers.get("X-Cron-Secret") ?? "";

  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rounds = Math.max(1, Number(process.env.ROUNDS) || DEFAULT_ROUNDS);
    const result = await runMockActivity(rounds);
    return Response.json({
      ok: true,
      logs: result.logs,
      deducted: result.deducted,
      users: result.users,
      rounds,
    });
  } catch (e) {
    logger.error({
      category: "SYSTEM",
      message: "[Mock Activity Cron] 실패",
      stackTrace: (e as Error).stack,
    });
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
