/**
 * Phase 1-2 E2E 테스트용: chocoBalance=0인 이메일+패스워드 테스트 계정 생성
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.development" });

const BASE = "http://localhost:5173";
const EMAIL = "e2e-test-402@choonsim.local";
const PASSWORD = "TestPass1234!";
const HEADERS = {
    "Content-Type": "application/json",
    "Origin": BASE,
};

async function main() {
    // 1. 회원가입
    const signupRes = await fetch(`${BASE}/auth/sign-up/email`, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ email: EMAIL, password: PASSWORD, name: "E2E Tester" }),
    });
    const signup = await signupRes.json();
    console.log("회원가입:", signupRes.status, JSON.stringify(signup).slice(0, 120));

    // 2. 로그인
    const loginRes = await fetch(`${BASE}/auth/sign-in/email`, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
        redirect: "manual",
    });
    const loginBody = await loginRes.json().catch(() => ({}));
    console.log("로그인:", loginRes.status, JSON.stringify(loginBody).slice(0, 120));

    // 세션 쿠키 추출
    const setCookie = loginRes.headers.get("set-cookie") ?? "";
    const sessionMatch = setCookie.match(/better-auth\.session_token=([^;]+)/);
    if (!sessionMatch) {
        console.error("❌ 세션 쿠키 없음:", setCookie.slice(0, 200));
        return;
    }
    const sessionToken = sessionMatch[1];
    console.log("\n✅ 세션 토큰:", sessionToken.slice(0, 30) + "...");

    // 3. 유저 정보 확인
    const meRes = await fetch(`${BASE}/auth/get-session`, {
        headers: { Cookie: `better-auth.session_token=${sessionToken}`, Origin: BASE },
    });
    const me = await meRes.json();
    console.log("유저 ID:", me?.user?.id);
    console.log("이메일:", me?.user?.email);
    console.log("chocoBalance:", me?.user?.chocoBalance ?? "(로더에서 미포함)");

    console.log("\n--- 테스트 준비 완료 ---");
    console.log(`SESSION_TOKEN=${sessionToken}`);
    console.log(`USER_ID=${me?.user?.id}`);
}

main().catch(console.error);
