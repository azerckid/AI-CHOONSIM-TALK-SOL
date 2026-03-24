/**
 * CHOCO Token-2022 배포 스크립트
 *
 * 기능:
 *   - SPL Token-2022 (Transfer Fee extension) 민트 생성
 *   - Agent 지갑으로 초기 CHOCO 발행
 *   - .env.development 의 CHOCO_TOKEN_MINT_ADDRESS 업데이트 안내
 *
 * 사용:
 *   cd apps/web && npx tsx scripts/deploy-choco-token.ts
 */
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  createInitializeMintInstruction,
  createInitializeTransferFeeConfigInstruction,
  getMintLen,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
  createMintToInstruction,
} from "@solana/spl-token";

dotenv.config({ path: ".env.development" });

const CHOCO_DECIMALS = 6;
const INITIAL_SUPPLY = 1_000_000_000; // 10억 CHOCO
const TRANSFER_FEE_BASIS_POINTS = 100; // 1% transfer fee
const MAX_FEE = BigInt(1_000_000); // 최대 1 CHOCO fee

async function main() {
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const agentKeyRaw = process.env.SOLANA_AGENT_PRIVATE_KEY;
  const treasuryAddress = process.env.CHOCO_TREASURY_ADDRESS;

  if (!agentKeyRaw) {
    console.error("[ERROR] SOLANA_AGENT_PRIVATE_KEY is not set.");
    process.exit(1);
  }
  if (!treasuryAddress) {
    console.error("[ERROR] CHOCO_TREASURY_ADDRESS is not set.");
    process.exit(1);
  }

  const connection = new Connection(rpcUrl, "confirmed");
  const agentKeyArray = JSON.parse(agentKeyRaw) as number[];
  const agentKeypair = Keypair.fromSecretKey(Uint8Array.from(agentKeyArray));
  const treasuryPubkey = new PublicKey(treasuryAddress);

  console.log("[INFO] Agent  :", agentKeypair.publicKey.toBase58());
  console.log("[INFO] Treasury:", treasuryPubkey.toBase58());

  // SOL 잔액 확인
  const balance = await connection.getBalance(agentKeypair.publicKey);
  console.log(`[INFO] Agent SOL Balance: ${balance / 1e9} SOL`);
  if (balance < 0.05 * 1e9) {
    console.error("[ERROR] Insufficient SOL. Get Devnet SOL from https://faucet.solana.com");
    process.exit(1);
  }

  // 새 민트 키페어 생성
  const mintKeypair = Keypair.generate();
  console.log("[INFO] Mint Address:", mintKeypair.publicKey.toBase58());

  // 민트 계정 크기 계산 (Transfer Fee extension 포함)
  const extensions = [ExtensionType.TransferFeeConfig];
  const mintLen = getMintLen(extensions);
  const mintRent = await connection.getMinimumBalanceForRentExemption(mintLen);

  // 트랜잭션 빌드
  const tx = new Transaction();
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = agentKeypair.publicKey;

  // 1. 민트 계정 생성
  tx.add(
    SystemProgram.createAccount({
      fromPubkey: agentKeypair.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: mintLen,
      lamports: mintRent,
      programId: TOKEN_2022_PROGRAM_ID,
    })
  );

  // 2. Transfer Fee Config 초기화
  tx.add(
    createInitializeTransferFeeConfigInstruction(
      mintKeypair.publicKey,
      agentKeypair.publicKey, // fee config authority
      treasuryPubkey,          // withdraw withheld authority
      TRANSFER_FEE_BASIS_POINTS,
      MAX_FEE,
      TOKEN_2022_PROGRAM_ID
    )
  );

  // 3. 민트 초기화
  tx.add(
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      CHOCO_DECIMALS,
      agentKeypair.publicKey, // mint authority
      null,                    // freeze authority (없음)
      TOKEN_2022_PROGRAM_ID
    )
  );

  // 4. Agent ATA 생성
  const agentAta = getAssociatedTokenAddressSync(
    mintKeypair.publicKey,
    agentKeypair.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  tx.add(
    createAssociatedTokenAccountInstruction(
      agentKeypair.publicKey,
      agentAta,
      agentKeypair.publicKey,
      mintKeypair.publicKey,
      TOKEN_2022_PROGRAM_ID
    )
  );

  // 5. 초기 공급량 Mint
  const mintAmount = BigInt(INITIAL_SUPPLY) * BigInt(10 ** CHOCO_DECIMALS);
  tx.add(
    createMintToInstruction(
      mintKeypair.publicKey,
      agentAta,
      agentKeypair.publicKey,
      mintAmount,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );

  console.log("[INFO] Sending transaction...");
  const sig = await sendAndConfirmTransaction(
    connection,
    tx,
    [agentKeypair, mintKeypair],
    { commitment: "confirmed" }
  );

  console.log("\n✅ CHOCO Token-2022 배포 완료!");
  console.log("Mint Address :", mintKeypair.publicKey.toBase58());
  console.log("Signature    :", sig);
  console.log("Explorer     : https://explorer.solana.com/tx/" + sig + "?cluster=devnet");
  console.log("\n👉 .env.development 에 다음을 복사하세요:");
  console.log(`CHOCO_TOKEN_MINT_ADDRESS=${mintKeypair.publicKey.toBase58()}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
