/**
 * GET /api/solana/memories?wallet=<address>
 *
 * DAS API(getAssetsByOwner)로 사용자 지갑의 cNFT 목록을 조회합니다.
 * symbol "CHM" (ChoonSim Memory) 필터링.
 */
import type { LoaderFunctionArgs } from "react-router";

export interface MemoryNFT {
  id: string;
  name: string;
  description: string;
  image: string;
  characterId: string;
  createdAt?: string;
  explorerUrl: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const wallet = url.searchParams.get("wallet");

  if (!wallet) {
    return Response.json({ memories: [], error: "wallet address required" }, { status: 400 });
  }

  // DAS API(getAssetsByOwner)는 Helius 같은 확장 RPC에서만 지원됨
  // HELIUS_RPC_URL 우선, 없으면 ZK_COMPRESSION_RPC_URL(Photon), 최후 fallback은 공개 devnet
  const rpcUrl =
    process.env.HELIUS_RPC_URL ||
    process.env.ZK_COMPRESSION_RPC_URL ||
    "https://api.devnet.solana.com";

  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "get-memories",
        method: "getAssetsByOwner",
        params: {
          ownerAddress: wallet,
          page: 1,
          limit: 50,
          sortBy: { sortBy: "created", sortDirection: "desc" },
          options: { showUnverifiedCollections: true, showCollectionMetadata: true },
        },
      }),
    });

    const json = await res.json() as { result?: { items?: DASAsset[] }; error?: unknown };

    if (json.error || !json.result?.items) {
      return Response.json({ memories: [] });
    }

    // CHM 심볼만 필터
    const rawItems = json.result.items.filter(
      (asset) => asset.content?.metadata?.symbol === "CHM"
    );

    const memories: MemoryNFT[] = await Promise.all(
      rawItems.map(async (asset) => {
        const meta = asset.content?.metadata ?? {};
        const attrs: { trait_type: string; value: string }[] = asset.content?.metadata?.attributes ?? [];
        const characterId = attrs.find((a) => a.trait_type === "character")?.value ?? "choonsim";

        // DAS가 image를 파싱하지 못한 경우 json_uri에서 직접 fetch
        let image = asset.content?.links?.image ?? asset.content?.files?.[0]?.uri ?? "";
        if (!image && asset.content?.json_uri) {
          try {
            const metaRes = await fetch(asset.content.json_uri, { signal: AbortSignal.timeout(3000) });
            if (metaRes.ok) {
              const metaJson = await metaRes.json() as { image?: string };
              image = metaJson.image ?? "";
            }
          } catch {
            // fetch 실패 시 무시
          }
        }

        return {
          id: asset.id,
          name: meta.name ?? "춘심의 기억",
          description: meta.description ?? "",
          image,
          characterId,
          explorerUrl: `https://explorer.solana.com/address/${asset.id}?cluster=devnet`,
        };
      })
    );

    return Response.json({ memories });
  } catch (err) {
    console.error("[memories] DAS API error:", err);
    return Response.json({ memories: [], error: "DAS API unavailable" });
  }
}

// DAS API 응답 타입 (필요한 필드만)
interface DASAsset {
  id: string;
  content?: {
    json_uri?: string;
    metadata?: {
      name?: string;
      description?: string;
      symbol?: string;
      attributes?: { trait_type: string; value: string }[];
    };
    links?: { image?: string };
    files?: { uri?: string }[];
  };
}
