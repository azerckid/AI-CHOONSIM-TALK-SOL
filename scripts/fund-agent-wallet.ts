/**
 * 서버 Agent 지갑에 Devnet SOL을 airdrop합니다.
 *
 * 사용법:
 *   npx tsx scripts/fund-agent-wallet.ts
 *   npx tsx scripts/fund-agent-wallet.ts --amount 2
 *
 * Devnet 제한: 주소당 최대 2 SOL/요청, 24시간 ~10 SOL
 */
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// .env.development 로드
const envPath = path.resolve(__dirname, "../apps/web/.env.development");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const PRIVATE_KEY_RAW = process.env.SOLANA_AGENT_PRIVATE_KEY;

if (!PRIVATE_KEY_RAW) {
  console.error("❌ SOLANA_AGENT_PRIVATE_KEY 환경변수가 설정되지 않았습니다.");
  process.exit(1);
}

// CLI 인자로 amount 지정 가능 (기본 2 SOL, devnet 최대)
const amountIndex = process.argv.indexOf("--amount");
const amountArg =
  process.argv.find((a) => a.startsWith("--amount="))?.split("=")[1] ??
  (amountIndex !== -1 ? process.argv[amountIndex + 1] : undefined);
const requestSol = amountArg ? parseFloat(amountArg) : 2;

if (isNaN(requestSol) || requestSol <= 0 || requestSol > 2) {
  console.error("❌ amount는 0 초과 2 이하여야 합니다. (Devnet 제한)");
  process.exit(1);
}

async function main() {
  const connection = new Connection(RPC_URL, "confirmed");
  const keypairArray = JSON.parse(PRIVATE_KEY_RAW!) as number[];
  const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairArray));
  const address = keypair.publicKey;

  // 현재 잔액 조회
  const beforeLamports = await connection.getBalance(address);
  const beforeSol = beforeLamports / LAMPORTS_PER_SOL;

  console.log(`\n🔑 Agent 지갑 주소: ${address.toBase58()}`);
  console.log(`💰 현재 잔액: ${beforeSol.toFixed(4)} SOL`);
  console.log(`📡 RPC: ${RPC_URL}`);

  // 잔액이 충분하면 충전 불필요
  const SUFFICIENT_SOL = 1;
  if (beforeSol >= SUFFICIENT_SOL) {
    console.log(`\n✅ 잔액이 충분합니다 (${beforeSol.toFixed(4)} SOL ≥ ${SUFFICIENT_SOL} SOL 기준).`);
    console.log(`   유저 ${Math.floor(beforeSol / 0.5)}명 온보딩 가능 (1인당 0.5 SOL 기준)\n`);
    return;
  }

  console.log(`\n⏳ ${requestSol} SOL airdrop 요청 중...`);

  // 1차: 표준 RPC airdrop
  let success = false;
  try {
    const sig = await connection.requestAirdrop(address, requestSol * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, "confirmed");
    const afterSol = (await connection.getBalance(address)) / LAMPORTS_PER_SOL;
    console.log(`✅ 성공! +${requestSol} SOL 충전됨`);
    console.log(`💰 충전 후 잔액: ${afterSol.toFixed(4)} SOL`);
    console.log(`🔗 Explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet\n`);
    success = true;
  } catch {
    console.log("⚠️  RPC airdrop 실패 — 공식 faucet API 시도 중...");
  }

  // 2차: 공식 Solana faucet API
  if (!success) {
    try {
      const res = await fetch("https://faucet.solana.com/api/request_airdrop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: address.toBase58(), amount: requestSol }),
      });
      if (res.ok) {
        const afterSol = (await connection.getBalance(address)) / LAMPORTS_PER_SOL;
        console.log(`✅ faucet API 성공! 충전 후 잔액: ${afterSol.toFixed(4)} SOL\n`);
        success = true;
      } else {
        throw new Error(await res.text());
      }
    } catch (err2) {
      console.error("❌ faucet API도 실패:", err2);
    }
  }

  if (!success) {
    console.log("\n💡 수동 충전 방법:");
    console.log("   1) https://faucet.solana.com 접속");
    console.log(`   2) 주소 입력: ${address.toBase58()}`);
    console.log("   3) Devnet 선택 후 충전\n");
    process.exit(1);
  }
}

main();
