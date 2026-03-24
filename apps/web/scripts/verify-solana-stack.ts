/**
 * Solana 4-Stack 검증 스크립트
 *
 * 해커톤 제출 전 온체인 상태 및 엔드포인트를 한 번에 점검합니다.
 *
 * 사용: cd apps/web && npx tsx scripts/verify-solana-stack.ts
 */
import * as dotenv from "dotenv";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import {
  getMint,
  getAccount,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

dotenv.config({ path: ".env.development" });

const OK = "✅";
const FAIL = "❌";
const WARN = "⚠️ ";

async function main() {
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");

  console.log("═══════════════════════════════════════════════");
  console.log("  Choonsim × Solana — Stack Verification");
  console.log("═══════════════════════════════════════════════\n");

  let passed = 0;
  let failed = 0;

  async function check(label: string, fn: () => Promise<string>) {
    try {
      const result = await fn();
      console.log(`${OK} ${label}: ${result}`);
      passed++;
    } catch (err) {
      console.log(`${FAIL} ${label}: ${(err as Error).message}`);
      failed++;
    }
  }

  // ─── 1. 환경 변수 ──────────────────────────────────────────
  console.log("[ 1/4 ] Environment Variables");
  await check("SOLANA_RPC_URL", async () => rpcUrl);
  await check("SOLANA_AGENT_PRIVATE_KEY", async () => {
    if (!process.env.SOLANA_AGENT_PRIVATE_KEY) throw new Error("Not set");
    const arr = JSON.parse(process.env.SOLANA_AGENT_PRIVATE_KEY);
    if (arr.length !== 64) throw new Error("Invalid length");
    return "OK (64 bytes)";
  });
  await check("CHOCO_TOKEN_MINT_ADDRESS", async () => {
    if (!process.env.CHOCO_TOKEN_MINT_ADDRESS) throw new Error("Not set");
    return process.env.CHOCO_TOKEN_MINT_ADDRESS;
  });
  await check("MERKLE_TREE_ADDRESS", async () => {
    if (!process.env.MERKLE_TREE_ADDRESS) throw new Error("Not set");
    return process.env.MERKLE_TREE_ADDRESS;
  });
  await check("CHOCO_TREASURY_ADDRESS", async () => {
    if (!process.env.CHOCO_TREASURY_ADDRESS) throw new Error("Not set");
    return process.env.CHOCO_TREASURY_ADDRESS;
  });

  console.log();

  // ─── 2. 지갑 잔액 ─────────────────────────────────────────
  console.log("[ 2/4 ] Wallet Balances");
  const agentKeyRaw = process.env.SOLANA_AGENT_PRIVATE_KEY;
  if (agentKeyRaw) {
    const agentKeypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(agentKeyRaw)));
    await check("Agent SOL Balance", async () => {
      const bal = await connection.getBalance(agentKeypair.publicKey);
      if (bal < 0.1 * 1e9) throw new Error(`Low: ${bal / 1e9} SOL`);
      return `${(bal / 1e9).toFixed(4)} SOL`;
    });
  }
  if (process.env.CHOCO_TREASURY_ADDRESS) {
    await check("Treasury SOL Balance", async () => {
      const bal = await connection.getBalance(new PublicKey(process.env.CHOCO_TREASURY_ADDRESS!));
      return `${(bal / 1e9).toFixed(4)} SOL`;
    });
  }

  console.log();

  // ─── 3. Token-2022 ────────────────────────────────────────
  console.log("[ 3/4 ] CHOCO Token-2022");
  if (process.env.CHOCO_TOKEN_MINT_ADDRESS) {
    const mintPubkey = new PublicKey(process.env.CHOCO_TOKEN_MINT_ADDRESS);
    await check("Mint Account exists", async () => {
      const mintInfo = await getMint(connection, mintPubkey, "confirmed", TOKEN_2022_PROGRAM_ID);
      return `supply=${mintInfo.supply}, decimals=${mintInfo.decimals}`;
    });
    if (agentKeyRaw) {
      const agentKeypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(agentKeyRaw)));
      await check("Agent ATA has CHOCO", async () => {
        const ata = getAssociatedTokenAddressSync(mintPubkey, agentKeypair.publicKey, false, TOKEN_2022_PROGRAM_ID);
        const acct = await getAccount(connection, ata, "confirmed", TOKEN_2022_PROGRAM_ID);
        const balance = Number(acct.amount) / 1e6;
        return `${balance.toLocaleString()} CHOCO`;
      });
    }
  }

  console.log();

  // ─── 4. Merkle Tree ───────────────────────────────────────
  console.log("[ 4/4 ] cNFT Merkle Tree");
  if (process.env.MERKLE_TREE_ADDRESS) {
    await check("Merkle Tree Account", async () => {
      const info = await connection.getAccountInfo(new PublicKey(process.env.MERKLE_TREE_ADDRESS!));
      if (!info) throw new Error("Account not found");
      return `data=${info.data.length} bytes, owner=${info.owner.toBase58().slice(0, 8)}...`;
    });
  }

  // ─── Summary ─────────────────────────────────────────────
  console.log();
  console.log("═══════════════════════════════════════════════");
  console.log(`  Result: ${passed} passed, ${failed} failed`);
  console.log("═══════════════════════════════════════════════");

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
