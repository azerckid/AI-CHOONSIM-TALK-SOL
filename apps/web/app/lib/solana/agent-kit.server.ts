/**
 * Solana AI Agent Kit 통합
 *
 * LangGraph 채팅 파이프라인에서 Spring AI Agent가 호출하는 Solana 도구 모음:
 *   - checkChocoBalance: 사용자 CHOCO 잔액 조회
 *   - transferChoco: CHOCO 토큰 전송 (사용자 → 다른 지갑)
 *   - mintMemoryNFT: cNFT 메모리 각인 (Agent가 자동 실행)
 *   - getDailyCheckinStatus: 오늘 체크인 여부 확인
 */
import { SolanaAgentKit, KeypairWallet } from "solana-agent-kit";
import { Keypair, Connection } from "@solana/web3.js";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";

let _agentKit: SolanaAgentKit | null = null;

function getAgentKit(): SolanaAgentKit {
  if (_agentKit) return _agentKit;

  const agentKeyRaw = process.env.SOLANA_AGENT_PRIVATE_KEY;
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const geminiKey = process.env.GEMINI_API_KEY || "";

  if (!agentKeyRaw) throw new Error("SOLANA_AGENT_PRIVATE_KEY is not set");

  const agentKeyArray = JSON.parse(agentKeyRaw) as number[];
  const agentKeypair = Keypair.fromSecretKey(Uint8Array.from(agentKeyArray));
  const wallet = new KeypairWallet(agentKeypair, rpcUrl);

  _agentKit = new SolanaAgentKit(
    wallet,
    rpcUrl,
    { OPENAI_API_KEY: geminiKey }
  );

  return _agentKit;
}

/** 춘심 전용 Solana 도구 (LangGraph 노드용) */
export function getChoonsimSolanaTools(userId: string) {
  return [
    // 1. CHOCO 잔액 조회
    tool(
      async () => {
        const user = await db.query.user.findFirst({
          where: eq(schema.user.id, userId),
          columns: { chocoBalance: true },
        });
        const balance = parseFloat(user?.chocoBalance ?? "0");
        return `현재 CHOCO 잔액: ${balance} CHOCO`;
      },
      {
        name: "checkChocoBalance",
        description: "사용자의 현재 CHOCO 토큰 잔액을 조회합니다.",
        schema: z.object({}),
      }
    ),

    // 2. Devnet SOL 잔액 조회
    tool(
      async ({ walletAddress }) => {
        try {
          const connection = new Connection(
            process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
            "confirmed"
          );
          const { PublicKey } = await import("@solana/web3.js");
          const pubkey = new PublicKey(walletAddress);
          const balance = await connection.getBalance(pubkey);
          return `${walletAddress}의 SOL 잔액: ${balance / 1e9} SOL (Devnet)`;
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

    // 3. 오늘의 체크인 현황 안내
    tool(
      async () => {
        const blinksUrl = process.env.BETTER_AUTH_URL
          ? `${process.env.BETTER_AUTH_URL}/api/actions/checkin`
          : "/api/actions/checkin";
        return (
          `오늘의 체크인 Blink: ${blinksUrl}\n` +
          `체크인하면 50 CHOCO를 받을 수 있어요! 💕`
        );
      },
      {
        name: "getCheckinBlink",
        description: "오늘의 일일 체크인 Blink URL을 안내합니다.",
        schema: z.object({}),
      }
    ),

    // 4. cNFT 메모리 각인 안내
    tool(
      async () => {
        return (
          `특별한 순간을 NFT로 기록할 수 있어요! 🎖️\n` +
          `비용: 200 CHOCO\n` +
          `API: POST /api/solana/mint-memory\n` +
          `{ ownerAddress, name, description, characterId }`
        );
      },
      {
        name: "getMemoryNFTInfo",
        description: "cNFT 메모리 각인 기능과 비용을 안내합니다.",
        schema: z.object({}),
      }
    ),

    // 5. CHOCO 선물 Blink 안내
    tool(
      async ({ amount }) => {
        const baseUrl = process.env.BETTER_AUTH_URL || "";
        const blinkUrl = `${baseUrl}/api/actions/gift?amount=${amount}`;
        return (
          `🍫 ${amount} CHOCO 선물 Blink:\n` +
          `${blinkUrl}\n` +
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
  ];
}
