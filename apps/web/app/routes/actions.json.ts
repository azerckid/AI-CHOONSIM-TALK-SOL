/**
 * Solana Actions 레지스트리 — /actions.json
 * Blink 클라이언트(Dialect, X/Twitter 등)가 이 파일을 읽어 Action 엔드포인트를 검색합니다.
 * https://docs.dialect.to/documentation/actions/actions-json
 */
import type { LoaderFunctionArgs } from "react-router";
import { ACTIONS_CORS_HEADERS } from "~/lib/solana/connection.server";

export function loader({ request }: LoaderFunctionArgs) {
  const baseUrl = new URL(request.url).origin;

  const payload = {
    rules: [
      {
        pathPattern: "/api/actions/gift",
        apiPath: `${baseUrl}/api/actions/gift`,
      },
      {
        pathPattern: "/api/actions/subscribe",
        apiPath: `${baseUrl}/api/actions/subscribe`,
      },
      {
        pathPattern: "/api/actions/checkin",
        apiPath: `${baseUrl}/api/actions/checkin`,
      },
    ],
  };

  return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });
}
