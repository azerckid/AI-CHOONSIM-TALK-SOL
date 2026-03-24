/**
 * cNFT 메모리 각인 — Metaplex Bubblegum
 *
 * 춘심과의 특별한 순간을 Compressed NFT로 온체인에 영구 기록합니다.
 * 저비용(~0.0001 SOL)으로 Devnet에서 발행합니다.
 */
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  keypairIdentity,
  publicKey as umiPublicKey,
} from "@metaplex-foundation/umi";
import {
  mintV1,
  mplBubblegum,
  TokenProgramVersion,
} from "@metaplex-foundation/mpl-bubblegum";
import type { MetadataArgsArgs } from "@metaplex-foundation/mpl-bubblegum";

function getUmi() {
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const agentKeyRaw = process.env.SOLANA_AGENT_PRIVATE_KEY;

  if (!agentKeyRaw) throw new Error("SOLANA_AGENT_PRIVATE_KEY is not set");

  const agentKeyArray = JSON.parse(agentKeyRaw) as number[];
  const umi = createUmi(rpcUrl).use(mplBubblegum());
  const agentKeypair = umi.eddsa.createKeypairFromSecretKey(
    Uint8Array.from(agentKeyArray)
  );
  umi.use(keypairIdentity(agentKeypair));
  return umi;
}

export interface MintMemoryNFTParams {
  /** 사용자 Solana 지갑 주소 */
  ownerAddress: string;
  /** NFT 제목 (채팅 첫 문장 또는 사용자 정의) */
  name: string;
  /** NFT 설명 */
  description: string;
  /** 이미지 URI (Cloudinary URL) */
  imageUri: string;
  /** 캐릭터 ID */
  characterId: string;
  /** 사용자 ID (속성으로 저장) */
  userId: string;
}

export interface MintResult {
  signature: string;
  assetId?: string;
}

/**
 * 사용자의 특별한 순간을 cNFT로 발행
 * - 서버 Agent 지갑이 minting authority
 * - 사용자 지갑이 owner
 */
export async function mintMemoryNFT(params: MintMemoryNFTParams): Promise<MintResult> {
  const merkleTreeAddress = process.env.MERKLE_TREE_ADDRESS;
  if (!merkleTreeAddress) throw new Error("MERKLE_TREE_ADDRESS is not set");

  const umi = getUmi();

  const metadata: MetadataArgsArgs = {
    name: params.name.slice(0, 32), // Metaplex 최대 32자
    symbol: "CHM",
    uri: buildMetadataUri(params),
    sellerFeeBasisPoints: 0,
    collection: null,
    creators: [
      {
        address: umi.identity.publicKey,
        verified: false,
        share: 100,
      },
    ],
    uses: null,
    isMutable: true,
    primarySaleHappened: false,
    editionNonce: null,
    tokenStandard: null,
    tokenProgramVersion: TokenProgramVersion.Original,
  };

  const { signature } = await mintV1(umi, {
    leafOwner: umiPublicKey(params.ownerAddress),
    merkleTree: umiPublicKey(merkleTreeAddress),
    metadata,
  }).sendAndConfirm(umi);

  return {
    signature: Buffer.from(signature).toString("base64"),
  };
}

/** 온체인 Metadata JSON URI — Cloudinary 기반 */
function buildMetadataUri(params: MintMemoryNFTParams): string {
  // 실제 배포 시 IPFS/Arweave 사용 권장
  // 현재는 온체인 속성을 URI에 인코딩 (데모)
  const metadataJson = {
    name: params.name,
    description: params.description,
    image: params.imageUri,
    attributes: [
      { trait_type: "character", value: params.characterId },
      { trait_type: "userId", value: params.userId },
      { trait_type: "type", value: "memory" },
    ],
    properties: {
      files: [{ uri: params.imageUri, type: "image/png" }],
    },
  };

  // Base64 Data URI (해커톤 데모용 — 실제론 Arweave/IPFS)
  const encoded = Buffer.from(JSON.stringify(metadataJson)).toString("base64");
  return `data:application/json;base64,${encoded}`;
}
