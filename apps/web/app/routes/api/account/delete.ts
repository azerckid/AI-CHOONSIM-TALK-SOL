/**
 * POST /api/account/delete
 * 계정 탈퇴: 사용자 연관 데이터 전체 삭제 후 세션 무효화.
 * 클라이언트에서 성공 시 signOut() 호출 후 /login 또는 /home으로 이동해야 함.
 *
 * Created: 2026-02-22
 * Last Updated: 2026-02-22
 */

import type { ActionFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { deleteUserData } from "~/lib/account-delete.server";

export async function action({ request }: ActionFunctionArgs) {
    if (request.method !== "POST") {
        return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session || !session.user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const result = await deleteUserData(userId);

    if (!result.success) {
        return Response.json(
            { error: result.error || "계정 삭제에 실패했습니다." },
            { status: 500 }
        );
    }

    return Response.json({ success: true });
}
