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
  SystemProgram,
  LAMPORTS_PER_SOL,
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
import { eq, sql, count, desc } from "drizzle-orm";
import { mintMemoryNFT, getDefaultImageUri } from "~/lib/solana/cnft.server";
import { getRandomIllustration, buildIllustrationWithOverlay } from "~/lib/cloudinary.server";
import { model } from "~/lib/ai/model";
import { HumanMessage } from "@langchain/core/messages";
import { DateTime } from "luxon";

const CHOCO_DECIMALS = 6;
const MINT_COST_CHOCO = 200;
const PHANTOM_GUIDE =
  "Hey, this feature requires a Solana wallet!\n\n" +
  "1️⃣ Install Phantom: https://phantom.app\n" +
  "2️⃣ Copy your wallet address after installation\n" +
  "3️⃣ Go to Profile → Wallet and register your address\n\n" +
  "Once you're set up, we can do this right away! 💕";

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
export function getChoonsimSolanaTools(userId: string, conversationId?: string) {
  return [

    // ── READ 도구 ──────────────────────────────────────────────────────────

    tool(
      async () => {
        const user = await db.query.user.findFirst({
          where: eq(schema.user.id, userId),
          columns: { chocoBalance: true },
        });
        const balance = parseFloat(user?.chocoBalance ?? "0");
        return `Current CHOCO balance: ${balance.toLocaleString()} CHOCO`;
      },
      {
        name: "checkChocoBalance",
        description: "Check the user's current CHOCO balance.",
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
          return `SOL balance of ${walletAddress}: ${(balance / 1e9).toFixed(4)} SOL (Devnet)`;
        } catch {
          return "Invalid wallet address.";
        }
      },
      {
        name: "getSolBalance",
        description: "Check the SOL balance of a specific Solana wallet (Devnet).",
        schema: z.object({
          walletAddress: z.string().describe("Solana wallet address (Base58)"),
        }),
      }
    ),

    tool(
      async () => {
        const baseUrl = process.env.BETTER_AUTH_URL || "";
        return (
          `Today's Check-in Blink 💕\n` +
          `${baseUrl}/api/actions/checkin\n` +
          `Check in and earn 50 CHOCO!`
        );
      },
      {
        name: "getCheckinBlink",
        description: "Provide today's daily check-in Blink URL.",
        schema: z.object({}),
      }
    ),

    tool(
      async ({ amount }) => {
        const baseUrl = process.env.BETTER_AUTH_URL || "";
        return (
          `🍫 ${amount} CHOCO Gift Blink:\n` +
          `${baseUrl}/api/actions/gift?amount=${amount}\n` +
          `Share on X (Twitter) and your fans can receive the gift right away!`
        );
      },
      {
        name: "getGiftBlink",
        description: "Generate and provide a CHOCO gift Blink URL.",
        schema: z.object({
          amount: z.number().int().positive().describe("Amount of CHOCO to gift"),
        }),
      }
    ),

    // ── WRITE 도구 ─────────────────────────────────────────────────────────

    /**
     * engraveMemory — "기억에 새겨줘" 감지 시 cNFT 발행
     * 1. 지갑 확인 → 없으면 Phantom 안내
     * 2. CHOCO 200 확인 → 부족하면 안내
     * 3. 최근 대화에서 AI 제목 + 키워드 자동 생성
     * 4. 랜덤 일러스트 선택 + Cloudinary 날짜 오버레이
     * 5. cNFT 발행 → 유저 지갑으로 전송
     * 6. DB CHOCO 200 차감
     */
    tool(
      async ({ memoryTitle }) => {
        const user = await db.query.user.findFirst({
          where: eq(schema.user.id, userId),
          columns: { solanaWallet: true, chocoBalance: true, id: true, name: true },
        });

        if (!user?.solanaWallet) return PHANTOM_GUIDE;

        const balance = parseFloat(user.chocoBalance ?? "0");
        if (balance < MINT_COST_CHOCO) {
          return (
            `Not enough CHOCO... You have ${balance} CHOCO, but ` +
            `engraving a memory costs ${MINT_COST_CHOCO} CHOCO!`
          );
        }

        try {
          const today = DateTime.now().setZone("Asia/Seoul");
          const dateStr = today.toFormat("yyyy.MM.dd");

          // ── 대화 메시지 조회 ──────────────────────────────────────────────
          let msgCount = 1;
          let recentMessages: Array<{ role: string; content: string }> = [];

          if (conversationId) {
            const [countResult, messages] = await Promise.all([
              db.select({ value: count() })
                .from(schema.message)
                .where(eq(schema.message.conversationId, conversationId)),
              db.query.message.findMany({
                where: eq(schema.message.conversationId, conversationId),
                columns: { role: true, content: true },
                orderBy: [desc(schema.message.createdAt)],
                limit: 8,
              }),
            ]);
            msgCount = countResult[0]?.value ?? 1;
            recentMessages = messages.reverse();
          }

          // ── AI 제목 + 키워드 자동 생성 ───────────────────────────────────
          let nftName = (memoryTitle || "").slice(0, 32);
          let keyword = "";

          if (recentMessages.length > 0) {
            const chatSnippet = recentMessages
              .map(m => `${m.role === "user" ? "User" : "Choonsim"}: ${m.content.slice(0, 60)}`)
              .join("\n");

            try {
              const aiRes = await model.invoke([
                new HumanMessage(
                  `Look at the conversation below and reply with JSON only. Do not say anything else.\n\n` +
                  `{"title": "A poetic one-line title capturing this moment (under 20 chars, English)", "keyword": "One core word from the conversation (English)"}\n\n` +
                  `Conversation:\n${chatSnippet}`
                ),
              ]);
              const raw = aiRes.content.toString().trim()
                .replace(/^```json\s*/i, "").replace(/```$/, "").trim();
              const parsed = JSON.parse(raw) as { title?: string; keyword?: string };
              if (!nftName && parsed.title) nftName = parsed.title.slice(0, 32);
              if (parsed.keyword) keyword = parsed.keyword;
            } catch {
              // AI 생성 실패 시 기본값 사용
            }
          }

          if (!nftName) nftName = "A precious moment with Choonsim";

          // ── 랜덤 이미지 + 오버레이 ────────────────────────────────────────
          const baseImageUri = await getRandomIllustration();
          const imageUri = buildIllustrationWithOverlay(baseImageUri, dateStr, msgCount);

          // ── 속성 구성 ─────────────────────────────────────────────────────
          const extraAttributes = [
            { trait_type: "date", value: dateStr },
            { trait_type: "message_count", value: String(msgCount) },
            ...(keyword ? [{ trait_type: "keyword", value: keyword }] : []),
          ];

          // ── cNFT 발행 ─────────────────────────────────────────────────────
          const result = await mintMemoryNFT({
            ownerAddress: user.solanaWallet,
            name: nftName,
            description: `A precious moment with Choonsim — ${dateStr}`,
            imageUri,
            characterId: "choonsim",
            userId,
            extraAttributes,
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
            `Memory engraved! 🎖️ ${MINT_COST_CHOCO} CHOCO used.\n"${nftName}"\nNow forever sealed on-chain! 💕` +
            `\n---\n` +
            `Explorer: ${explorerUrl}`
          );
        } catch (err) {
          console.error("[engraveMemory] error:", err);
          return "Something went wrong while engraving your memory... Please try again in a moment!";
        }
      },
      {
        name: "engraveMemory",
        description:
          "Use when the user wants to record the current conversation moment as a cNFT on-chain. " +
          "Detect expressions like 'save this memory', 'engrave this moment', 'make an NFT', 'record this'.",
        schema: z.object({
          memoryTitle: z
            .string()
            .optional()
            .describe("NFT title. Auto-generated by AI if not provided"),
        }),
      }
    ),

    /**
     * buyChoco — CHOCO 구매 트랜잭션 즉시 생성
     * 1. 지갑 확인 → 없으면 Phantom 안내
     * 2. SOL 결제 트랜잭션 서버에서 빌드 (feePayer = 유저 지갑)
     * 3. 직렬화된 tx + paymentId를 [SWAP_TX:...] 마커로 반환
     * 4. 프론트엔드가 Phantom에 서명만 요청 → 즉시 CHOCO 충전
     */
    tool(
      async ({ amount }) => {
        const user = await db.query.user.findFirst({
          where: eq(schema.user.id, userId),
          columns: { solanaWallet: true, id: true },
        });

        if (!user?.solanaWallet) return PHANTOM_GUIDE;

        const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
        const recipient = process.env.SOLANA_RECEIVER_WALLET;
        if (!recipient) return "결제 서버 설정 오류입니다. 관리자에게 문의해주세요.";

        // Devnet 고정 가격: 1 CHOCO = 0.00001 SOL
        const SOL_PER_CHOCO = 0.00001;
        const solAmount = parseFloat((amount * SOL_PER_CHOCO).toFixed(6));
        const lamports = Math.round(solAmount * LAMPORTS_PER_SOL);

        // 결제 레코드 생성
        const paymentId = crypto.randomUUID();
        const reference = new Keypair().publicKey.toBase58();

        await db.insert(schema.payment).values({
          id: paymentId,
          userId,
          amount: amount / 1000,
          currency: "USD",
          status: "PENDING",
          type: "TOPUP",
          provider: "SOLANA",
          transactionId: reference,
          creditsGranted: amount,
          cryptoCurrency: "SOL",
          cryptoAmount: solAmount,
          exchangeRate: 1 / SOL_PER_CHOCO / 1000,
          description: `${amount} CHOCO (AI Chat)`,
          updatedAt: new Date(),
        });

        // 트랜잭션 빌드 (feePayer = 유저 지갑 — 서버 서명 불필요)
        const connection = new Connection(rpcUrl, "confirmed");
        const { blockhash } = await connection.getLatestBlockhash();

        const fromPubkey = new PublicKey(user.solanaWallet);
        const toPubkey = new PublicKey(recipient);

        const tx = new Transaction({
          recentBlockhash: blockhash,
          feePayer: fromPubkey,
        }).add(
          SystemProgram.transfer({ fromPubkey, toPubkey, lamports })
        );

        // 유저 서명만 필요하므로 requireAllSignatures: false
        const txBase64 = Buffer.from(
          tx.serialize({ requireAllSignatures: false, verifySignatures: false })
        ).toString("base64");

        return (
          `${amount.toLocaleString()} CHOCO 구매 준비 완료! 🍫\n` +
          `지갑: ${user.solanaWallet.slice(0, 6)}…${user.solanaWallet.slice(-4)}\n` +
          `${solAmount} SOL — Phantom에서 서명만 하면 즉시 충전돼요! 💕\n` +
          `[SWAP_TX:${paymentId}:${txBase64}]`
        );
      },
      {
        name: "buyChoco",
        description:
          "Use when the user wants to purchase CHOCO. " +
          "Detect expressions like 'buy choco', 'purchase choco', 'I want to buy [number] choco'.",
        schema: z.object({
          amount: z.number().int().positive().describe("Amount of CHOCO to purchase"),
        }),
      }
    ),
  ];
}
