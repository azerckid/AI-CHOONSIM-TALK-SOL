/**
 * Mock 유저 50명 시드 (배포 DB 1회용)
 * 배포 환경에서 Mock 유저가 없을 때 1회 호출. CRON_SECRET 인증.
 * Related: 21_MOCK_USER_SIMULATION_PLAN, 10_MOCK_USER_IMPLEMENTATION_PLAN
 */
import type { LoaderFunctionArgs } from "react-router";
import { seedMockUsers } from "~/lib/mock-users.server";
import { logger } from "~/lib/logger.server";

const CRON_SECRET = process.env.CRON_SECRET;

export async function loader({ request }: LoaderFunctionArgs) {
  const authHeader = request.headers.get("Authorization");
  const secret = authHeader?.replace(/^Bearer\s+/i, "") ?? request.headers.get("X-Cron-Secret") ?? "";

  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { created, total } = await seedMockUsers();
    return Response.json({ ok: true, created, total });
  } catch (e) {
    logger.error({
      category: "SYSTEM",
      message: "[Mock Seed Cron] 실패",
      stackTrace: (e as Error).stack,
    });
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
