/**
 * Sign In With Solana (SIWS) — 서버 유틸리티
 *
 * 지갑 서명으로 로그인:
 * 1. nonce 생성 → verification 테이블 저장
 * 2. 클라이언트에서 phantom.signMessage(message)
 * 3. 서버에서 서명 검증
 * 4. 지갑 주소에서 email/password 파생 → Better Auth 이메일 로그인
 */
import { createHmac } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";

/** 32바이트 hex nonce 생성 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** 사용자가 서명할 메시지 생성 */
export function buildSiwsMessage(walletAddress: string, nonce: string, issuedAt: string): string {
  return [
    "Sign in to ChoonsimTalk",
    "",
    `Wallet: ${walletAddress}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join("\n");
}

/** tweetnacl으로 Ed25519 서명 검증 */
export function verifySignature(
  message: string,
  signatureBase58: string,
  walletAddress: string,
): boolean {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signatureBase58);
    const publicKeyBytes = new PublicKey(walletAddress).toBytes();
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch {
    return false;
  }
}

/**
 * 지갑 주소 → Better Auth용 (email, password) 파생
 * 같은 지갑은 항상 같은 credentials을 갖는다.
 */
export function deriveSiwsCredentials(walletAddress: string): { email: string; password: string } {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET 환경 변수가 설정되지 않았습니다.");
  }
  const password = createHmac("sha256", secret)
    .update(`siws:${walletAddress}`)
    .digest("hex");
  return {
    email: `siws_${walletAddress}@choonsim.wallet`,
    password,
  };
}
