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
  base58,
} from "@metaplex-foundation/umi";
import {
  mintV1,
  mplBubblegum,
  TokenProgramVersion,
} from "@metaplex-foundation/mpl-bubblegum";
import type { MetadataArgsArgs } from "@metaplex-foundation/mpl-bubblegum";
import { uploadNFTMetadata } from "~/lib/cloudinary.server";

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

/** NFT 이미지 URL — 환경변수 우선, 없으면 Cloudinary fallback */
export function getDefaultImageUri(): string {
  return (
    process.env.CHOONSIM_DEFAULT_IMAGE_URI ||
    "https://res.cloudinary.com/dpmw96p8k/image/upload/v1/choonsim/choonsim.png"
  );
}

export interface NFTAttribute {
  trait_type: string;
  value: string;
}

export interface MintMemoryNFTParams {
  /** 사용자 Solana 지갑 주소 */
  ownerAddress: string;
  /** NFT 제목 */
  name: string;
  /** NFT 설명 */
  description: string;
  /** 이미지 URI (Cloudinary URL) */
  imageUri: string;
  /** 캐릭터 ID */
  characterId: string;
  /** 사용자 ID */
  userId: string;
  /** 추가 속성 (date, message_count, keyword 등) */
  extraAttributes?: NFTAttribute[];
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

  const metadataUri = await buildMetadataUri(params);

  const metadata: MetadataArgsArgs = {
    name: params.name.slice(0, 32), // Metaplex 최대 32자
    symbol: "CHM",
    uri: metadataUri,
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
    signature: base58.deserialize(signature)[0],
  };
}

/**
 * 메타데이터 JSON을 Cloudinary에 업로드하고 HTTPS URL을 반환합니다.
 * DAS API 호환 표준 URI 형식을 사용합니다.
 */
async function buildMetadataUri(params: MintMemoryNFTParams): Promise<string> {
  const baseAttributes: NFTAttribute[] = [
    { trait_type: "character", value: params.characterId },
    { trait_type: "userId", value: params.userId },
    { trait_type: "type", value: "memory" },
  ];

  const metadataJson = {
    name: params.name,
    description: params.description,
    image: params.imageUri,
    attributes: [...baseAttributes, ...(params.extraAttributes ?? [])],
    properties: {
      files: [{ uri: params.imageUri, type: "image/png" }],
    },
  };

  const fileName = `${params.userId}-${Date.now()}`;
  return uploadNFTMetadata(metadataJson, fileName);
}
