// app/routes/wallet-setup.tsx
// 지갑 생성은 home 로더에서 자동 처리됨.
// 이 라우트는 하위 호환성을 위해 유지되며 /home으로 리다이렉트합니다.
import { redirect } from "react-router";
import type { Route } from "./+types/wallet-setup";
import { auth } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return redirect("/login");
    return redirect("/home");
}

export default function WalletSetupPage() {
    return null;
}
