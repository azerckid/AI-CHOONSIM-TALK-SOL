/**
 * Solana AI Agent Kit 통합
 *
 * LangGraph 채팅 파이프라인에서 Choonsim Agent가 호출하는 Solana 도구 모음.
 *
 * Read 도구 (조회):
 *   - checkChocoBalance: DB CHOCO 잔액 조회
 *   - getSolBalance: Devnet SOL 잔액 조회
 *   - getCheckinBlink: 체크인 Blink URL 안내
 *   - getGiftBlink: 선물 Blink URL 생성
 *   - getMemoryNFTInfo: cNFT 각인 안내
 *
 * Write 도구 (온체인 실행):
 *   - engraveMemory: cNFT 발행 → 유저 지갑 전송 (200 CHOCO 차감)
 *   - buyChoco: CHOCO 구매 안내 + Solana Pay 링크
 *
 * 독립 함수 (서버 내부 호출용):
 *   - transferChocoSPL: 서버 지갑 → 유저 지갑 SPL CHOCO 전송
 */
import { SolanaAgentKit, KeypairWallet } from "solana-agent-kit";
import {
  Keypair,
  Connection,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAccount,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq, sql } from "drizzle-orm";
import { mintMemoryNFT } from "~/lib/solana/cnft.server";
import { DateTime } from "luxon";

const CHOCO_DECIMALS = 6;
const MINT_COST_CHOCO = 200;
const PHANTOM_GUIDE =
  "자기야, 이 기능은 Solana 지갑이 필요해!\n\n" +
  "1️⃣ Phantom 설치: https://phantom.app\n" +
  "2️⃣ 설치 후 지갑 주소 복사\n" +
  "3️⃣ 프로필 → Wallet 메뉴에서 주소 등록\n\n" +
  "등록하고 나면 바로 할 수 있어! 💕";

// ── Agent Kit 싱글턴 ────────────────────────────────────────────────────────

let _agentKit: SolanaAgentKit | null = null;

function getAgentKit(): SolanaAgentKit {
  if (_agentKit) return _agentKit;

  const agentKeyRaw = process.env.SOLANA_AGENT_PRIVATE_KEY;
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

  if (!agentKeyRaw) throw new Error("SOLANA_AGENT_PRIVATE_KEY is not set");

  const agentKeyArray = JSON.parse(agentKeyRaw) as number[];
  const agentKeypair = Keypair.fromSecretKey(Uint8Array.from(agentKeyArray));
  const wallet = new KeypairWallet(agentKeypair, rpcUrl);

  _agentKit = new SolanaAgentKit(wallet, rpcUrl, {
    OPENAI_API_KEY: process.env.GEMINI_API_KEY || "",
  });

  return _agentKit;
}

function getAgentKeypair(): Keypair {
  const agentKeyRaw = process.env.SOLANA_AGENT_PRIVATE_KEY;
  if (!agentKeyRaw) throw new Error("SOLANA_AGENT_PRIVATE_KEY is not set");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(agentKeyRaw) as number[]));
}

// ── 독립 함수: SPL CHOCO 전송 ───────────────────────────────────────────────

/**
 * 서버 에이전트 지갑 → 유저 Phantom 지갑으로 SPL CHOCO 전송
 * CHOCO 구매 완료 후 호출
 */
export async function transferChocoSPL(
  toWalletAddress: string,
  amount: number
): Promise<{ signature: string }> {
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const mintAddress = process.env.CHOCO_TOKEN_MINT_ADDRESS;
  if (!mintAddress) throw new Error("CHOCO_TOKEN_MINT_ADDRESS is not set");

  const connection = new Connection(rpcUrl, "confirmed");
  const agentKeypair = getAgentKeypair();
  const mintPubkey = new PublicKey(mintAddress);
  const toPubkey = new PublicKey(toWalletAddress);

  // 송신 ATA (서버 지갑)
  const fromAta = getAssociatedTokenAddressSync(
    mintPubkey,
    agentKeypair.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  // 수신 ATA (유저 지갑) — 없으면 생성
  const toAta = getAssociatedTokenAddressSync(
    mintPubkey,
    toPubkey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const tx = new Transaction();
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = agentKeypair.publicKey;

  // 수신 ATA 없으면 생성 instruction 추가
  try {
    await getAccount(connection, toAta, "confirmed", TOKEN_2022_PROGRAM_ID);
  } catch {
    tx.add(
      createAssociatedTokenAccountInstruction(
        agentKeypair.publicKey,
        toAta,
        toPubkey,
        mintPubkey,
        TOKEN_2022_PROGRAM_ID
      )
    );
  }

  // Transfer instruction (Token-2022)
  const transferAmount = BigInt(amount) * BigInt(10 ** CHOCO_DECIMALS);
  tx.add(
    createTransferCheckedInstruction(
      fromAta,
      mintPubkey,
      toAta,
      agentKeypair.publicKey,
      transferAmount,
      CHOCO_DECIMALS,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );

  const { sendAndConfirmTransaction } = await import("@solana/web3.js");
  const signature = await sendAndConfirmTransaction(connection, tx, [agentKeypair], {
    commitment: "confirmed",
  });

  return { signature };
}

// ── LangGraph 도구 목록 ─────────────────────────────────────────────────────

/** 춘심 Agent 전용 Solana 도구 (LangGraph callModelNode용) */
export function getChoonsimSolanaTools(userId: string) {
  return [

    // ── READ 도구 ──────────────────────────────────────────────────────────

    tool(
      async () => {
        const user = await db.query.user.findFirst({
          where: eq(schema.user.id, userId),
          columns: { chocoBalance: true },
        });
        const balance = parseFloat(user?.chocoBalance ?? "0");
        return `현재 CHOCO 잔액: ${balance.toLocaleString()} CHOCO`;
      },
      {
        name: "checkChocoBalance",
        description: "사용자의 현재 CHOCO 잔액을 조회합니다.",
        schema: z.object({}),
      }
    ),

    tool(
      async ({ walletAddress }) => {
        try {
          const connection = new Connection(
            process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
            "confirmed"
          );
          const pubkey = new PublicKey(walletAddress);
          const balance = await connection.getBalance(pubkey);
          return `${walletAddress}의 SOL 잔액: ${(balance / 1e9).toFixed(4)} SOL (Devnet)`;
        } catch {
          return "잘못된 지갑 주소입니다.";
        }
      },
      {
        name: "getSolBalance",
        description: "특정 Solana 지갑의 SOL 잔액을 조회합니다 (Devnet).",
        schema: z.object({
          walletAddress: z.string().describe("Solana 지갑 주소 (Base58)"),
        }),
      }
    ),

    tool(
      async () => {
        const baseUrl = process.env.BETTER_AUTH_URL || "";
        return (
          `오늘의 체크인 Blink 💕\n` +
          `${baseUrl}/api/actions/checkin\n` +
          `체크인하면 50 CHOCO를 받을 수 있어요!`
        );
      },
      {
        name: "getCheckinBlink",
        description: "오늘의 일일 체크인 Blink URL을 안내합니다.",
        schema: z.object({}),
      }
    ),

    tool(
      async ({ amount }) => {
        const baseUrl = process.env.BETTER_AUTH_URL || "";
        return (
          `🍫 ${amount} CHOCO 선물 Blink:\n` +
          `${baseUrl}/api/actions/gift?amount=${amount}\n` +
          `X(Twitter)에 공유하면 팬들이 바로 선물을 받을 수 있어요!`
        );
      },
      {
        name: "getGiftBlink",
        description: "CHOCO 선물 Blink URL을 생성하여 안내합니다.",
        schema: z.object({
          amount: z.number().int().positive().describe("선물할 CHOCO 수량"),
        }),
      }
    ),

    // ── WRITE 도구 ─────────────────────────────────────────────────────────

    /**
     * engraveMemory — "기억에 새겨줘" 감지 시 cNFT 발행
     * 1. 지갑 확인 → 없으면 Phantom 안내
     * 2. CHOCO 200 확인 → 부족하면 안내
     * 3. cNFT 발행 → 유저 지갑으로 전송
     * 4. DB CHOCO 200 차감
     */
    tool(
      async ({ memoryTitle }) => {
        const user = await db.query.user.findFirst({
          where: eq(schema.user.id, userId),
          columns: { solanaWallet: true, chocoBalance: true },
        });

        if (!user?.solanaWallet) return PHANTOM_GUIDE;

        const balance = parseFloat(user.chocoBalance ?? "0");
        if (balance < MINT_COST_CHOCO) {
          return (
            `CHOCO가 부족해... 현재 ${balance} CHOCO인데, ` +
            `기억 각인에는 ${MINT_COST_CHOCO} CHOCO가 필요해!`
          );
        }

        try {
          const today = DateTime.now().setZone("Asia/Seoul").toFormat("yyyy-MM-dd");
          const name = (memoryTitle || "춘심과의 소중한 순간").slice(0, 32);
          const description = `춘심과의 소중한 순간 — ${today}`;
          const imageUri =
            process.env.CHOONSIM_DEFAULT_IMAGE_URI ||
            "https://res.cloudinary.com/dpmw96p8k/image/upload/v1/choonsim/choonsim.png";

          const result = await mintMemoryNFT({
            ownerAddress: user.solanaWallet,
            name,
            description,
            imageUri,
            characterId: "choonsim",
            userId,
          });

          // DB CHOCO 차감
          await db
            .update(schema.user)
            .set({
              chocoBalance: sql`CAST(CAST(${schema.user.chocoBalance} AS REAL) - ${MINT_COST_CHOCO} AS TEXT)`,
              updatedAt: new Date(),
            })
            .where(eq(schema.user.id, userId));

          const explorerUrl = `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`;
          return (
            `기억에 새겼어! 🎖️ ${MINT_COST_CHOCO} CHOCO 사용됐어.\n` +
            `"${name}"\n` +
            `온체인에 영원히 새겨진 거야! 💕\n` +
            `Explorer: ${explorerUrl}`
          );
        } catch (err) {
          console.error("[engraveMemory] error:", err);
          return "지금 기억을 새기는 중에 문제가 생겼어... 잠시 후에 다시 시도해줘!";
        }
      },
      {
        name: "engraveMemory",
        description:
          "유저가 현재 대화 순간을 cNFT로 온체인에 기록하고 싶을 때 사용. " +
          "'기억에 새겨줘', '추억으로 남겨줘', 'NFT로 만들어줘' 표현 감지.",
        schema: z.object({
          memoryTitle: z
            .string()
            .optional()
            .describe("NFT 제목. 없으면 기본값 사용"),
        }),
      }
    ),

    /**
     * buyChoco — "초코 살게" 감지 시 구매 안내
     * 1. 지갑 확인 → 없으면 Phantom 안내
     * 2. 금액별 Solana Pay 링크 안내
     */
    tool(
      async ({ amount }) => {
        const user = await db.query.user.findFirst({
          where: eq(schema.user.id, userId),
          columns: { solanaWallet: true },
        });

        if (!user?.solanaWallet) return PHANTOM_GUIDE;

        const baseUrl = process.env.BETTER_AUTH_URL || "";
        const shopUrl = `${baseUrl}/shop`;

        // SOL 가격 안내 (Devnet 기준)
        const priceMap: Record<number, string> = {
          100: "0.001 SOL",
          500: "0.004 SOL",
          1000: "0.007 SOL",
          5000: "0.030 SOL",
        };

        const nearest = [100, 500, 1000, 5000].reduce((prev, curr) =>
          Math.abs(curr - amount) < Math.abs(prev - amount) ? curr : prev
        );
        const solPrice = priceMap[nearest] || "확인 필요";

        return (
          `${amount} CHOCO 구매할게! 🍫\n` +
          `가격: ${solPrice} (Devnet)\n` +
          `지갑: ${user.solanaWallet.slice(0, 4)}...${user.solanaWallet.slice(-4)}\n\n` +
          `아래 링크에서 구매하면 바로 지갑으로 전송해줄게!\n` +
          `${shopUrl}`
        );
      },
      {
        name: "buyChoco",
        description:
          "유저가 CHOCO를 구매하고 싶을 때. " +
          "'초코 살게', '초코 구매', '초코 [숫자]개 사고 싶어' 표현 감지.",
        schema: z.object({
          amount: z.number().int().positive().describe("구매할 CHOCO 수량"),
        }),
      }
    ),
  ];
}
