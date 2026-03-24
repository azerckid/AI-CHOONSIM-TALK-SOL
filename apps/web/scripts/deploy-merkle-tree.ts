/**
 * cNFT Merkle Tree 배포 스크립트 (Metaplex Bubblegum)
 *
 * Compressed NFT 발행을 위한 Merkle Tree를 Devnet에 배포합니다.
 * Tree 크기: depth=14, bufferSize=64 → 최대 16,384 cNFT
 *
 * 사용:
 *   cd apps/web && npx tsx scripts/deploy-merkle-tree.ts
 */
import * as dotenv from "dotenv";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  keypairIdentity,
  generateSigner,
  publicKey as umiPublicKey,
} from "@metaplex-foundation/umi";
import {
  createTree,
  mplBubblegum,
} from "@metaplex-foundation/mpl-bubblegum";

dotenv.config({ path: ".env.development" });

const TREE_MAX_DEPTH = 14;    // 2^14 = 16,384 cNFTs
const TREE_MAX_BUFFER_SIZE = 64;
const CANOPY_DEPTH = 0;       // canopy 없음 (비용 절감)

async function main() {
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const agentKeyRaw = process.env.SOLANA_AGENT_PRIVATE_KEY;

  if (!agentKeyRaw) {
    console.error("[ERROR] SOLANA_AGENT_PRIVATE_KEY is not set.");
    process.exit(1);
  }

  const agentKeyArray = JSON.parse(agentKeyRaw) as number[];

  // UMI 초기화
  const umi = createUmi(rpcUrl).use(mplBubblegum());

  // Agent 키페어 설정
  const agentUmiKeypair = umi.eddsa.createKeypairFromSecretKey(
    Uint8Array.from(agentKeyArray)
  );
  umi.use(keypairIdentity(agentUmiKeypair));

  console.log("[INFO] Agent:", agentUmiKeypair.publicKey);
  console.log("[INFO] Creating Merkle Tree (depth=14, max ~16,384 cNFTs)...");

  // Merkle Tree 계정 생성
  const merkleTreeSigner = generateSigner(umi);

  const builder = await createTree(umi, {
    merkleTree: merkleTreeSigner,
    maxDepth: TREE_MAX_DEPTH,
    maxBufferSize: TREE_MAX_BUFFER_SIZE,
    canopyDepth: CANOPY_DEPTH,
  });

  const { signature } = await builder.sendAndConfirm(umi);
  const sigBase58 = Buffer.from(signature).toString("base64");

  console.log("\n✅ Merkle Tree 배포 완료!");
  console.log("Tree Address :", merkleTreeSigner.publicKey);
  console.log("Signature    :", sigBase58);
  console.log(
    "Explorer     : https://explorer.solana.com/address/" +
      merkleTreeSigner.publicKey +
      "?cluster=devnet"
  );
  console.log("\n👉 .env.development 에 다음을 복사하세요:");
  console.log(`MERKLE_TREE_ADDRESS=${merkleTreeSigner.publicKey}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
