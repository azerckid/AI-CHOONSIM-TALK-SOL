/**
 * /.well-known/solana-actions.json
 * Required for Solana Blinks domain registration (new standard).
 * Proxies the same rules as /actions.json.
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
