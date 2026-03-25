/**
 * /profile/memories — cNFT 메모리 앨범
 *
 * 사용자 Solana 지갑에 새겨진 춘심과의 기억(cNFT)을 조회합니다.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "~/components/solana/WalletButton";
import { BottomNavigation } from "~/components/layout/BottomNavigation";
import { Loader2, ExternalLink, ImageOff, ChevronLeft, Sparkles } from "lucide-react";
import type { MemoryNFT } from "~/routes/api/solana/memories";

export default function MemoriesPage() {
  const { publicKey, connected } = useWallet();
  const [memories, setMemories] = useState<MemoryNFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!connected || !publicKey) {
      setMemories([]);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/solana/memories?wallet=${publicKey.toBase58()}`)
      .then((r) => r.json())
      .then((data: { memories: MemoryNFT[]; error?: string }) => {
        setMemories(data.memories ?? []);
        if (data.error) setError(data.error);
      })
      .catch(() => setError("기억을 불러오지 못했어요."))
      .finally(() => setLoading(false));
  }, [connected, publicKey]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Link to="/profile" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h1 className="text-base font-semibold">춘심과의 기억</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* Wallet 연결 영역 */}
        <div className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">솔라나 지갑</p>
            {connected && publicKey ? (
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {publicKey.toBase58().slice(0, 6)}...{publicKey.toBase58().slice(-4)}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">지갑을 연결하면 기억을 볼 수 있어요</p>
            )}
          </div>
          <WalletButton />
        </div>

        {/* 상태별 콘텐츠 */}
        {!connected ? (
          <EmptyState message="지갑을 연결하면 온체인에 새겨진 기억들이 나타나요." />
        ) : loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : memories.length === 0 ? (
          <EmptyState message="아직 새겨진 기억이 없어요. 춘심과 특별한 순간을 만들어보세요!" />
        ) : (
          <MemoryGrid memories={memories} />
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}

function MemoryGrid({ memories }: { memories: MemoryNFT[] }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3">
        총 <span className="text-foreground font-medium">{memories.length}</span>개의 기억이 온체인에 새겨졌어요
      </p>
      <div className="grid grid-cols-2 gap-3">
        {memories.map((m) => (
          <MemoryCard key={m.id} memory={m} />
        ))}
      </div>
    </div>
  );
}

function MemoryCard({ memory }: { memory: MemoryNFT }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden group">
      {/* 이미지 */}
      <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
        {memory.image && !imgError ? (
          <img
            src={memory.image}
            alt={memory.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <ImageOff className="w-6 h-6" />
            <span className="text-xs">이미지 없음</span>
          </div>
        )}
      </div>
      {/* 정보 */}
      <div className="p-3 space-y-1.5">
        <p className="text-sm font-medium line-clamp-1">{memory.name}</p>
        {memory.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{memory.description}</p>
        )}
        <a
          href={memory.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors mt-1"
        >
          <ExternalLink className="w-3 h-3" />
          Explorer
        </a>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
      <Loader2 className="w-6 h-6 animate-spin" />
      <p className="text-sm">기억을 불러오는 중...</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center">
        <Sparkles className="w-7 h-7 text-purple-400" />
      </div>
      <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
      <Link
        to="/chat"
        className="text-sm text-purple-400 hover:text-purple-300 transition-colors underline underline-offset-2"
      >
        춘심과 대화하기
      </Link>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 text-center">
      <p className="text-sm text-destructive">{message}</p>
      <p className="text-xs text-muted-foreground mt-1">
        RPC가 DAS API를 지원하지 않을 수 있어요. Helius RPC를 사용하면 조회가 가능합니다.
      </p>
    </div>
  );
}
