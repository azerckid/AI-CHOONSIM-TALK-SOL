/**
 * WalletAddressForm — Phantom 지갑 주소 등록 컴포넌트
 *
 * - currentWallet이 있으면: 주소 표시 + 변경 버튼
 * - currentWallet이 없으면: Phantom 설치 안내 + 주소 입력 폼
 * PATCH /api/user/wallet로 저장
 */
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  currentWallet: string | null;
}

export function WalletAddressForm({ currentWallet }: Props) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const trimmed = input.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user/wallet", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ solanaWallet: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to save wallet address");
        return;
      }
      toast.success("Wallet address saved!");
      // 페이지 새로고침으로 loader 데이터 갱신
      window.location.reload();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // 이미 등록된 지갑이 있고 편집 모드가 아닐 때
  if (currentWallet && !editing) {
    return (
      <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-[#9945FF] font-mono truncate">
            {currentWallet.slice(0, 6)}...{currentWallet.slice(-6)}
          </span>
          <span className="text-xs text-white/30">registered</span>
        </div>
        <button
          onClick={() => { setInput(currentWallet); setEditing(true); }}
          className="text-xs text-white/40 hover:text-white/70 transition-colors shrink-0 ml-2"
        >
          Change
        </button>
      </div>
    );
  }

  // 등록 안 됨 or 편집 모드
  return (
    <div className="space-y-2">
      {!currentWallet && (
        <div className="bg-[#9945FF]/10 border border-[#9945FF]/20 rounded-xl p-3 space-y-1">
          <p className="text-xs font-semibold text-[#9945FF]">Phantom Wallet Required</p>
          <p className="text-xs text-white/50 leading-relaxed">
            To receive CHOCO on-chain and mint memory NFTs, you need a Phantom wallet.
          </p>
          <a
            href="https://phantom.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[#9945FF] hover:underline mt-1"
          >
            <span className="material-symbols-outlined text-[13px]">open_in_new</span>
            Install Phantom →
          </a>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your Solana wallet address"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-[#9945FF]/50 transition-colors font-mono"
        />
        <button
          onClick={save}
          disabled={saving || !input.trim()}
          className="shrink-0 bg-[#9945FF] text-white text-xs font-semibold px-3 py-2 rounded-xl disabled:opacity-40 hover:bg-[#7b35d9] transition-colors"
        >
          {saving ? "..." : "Save"}
        </button>
        {editing && (
          <button
            onClick={() => setEditing(false)}
            className="shrink-0 text-xs text-white/40 hover:text-white/70 px-2 py-2 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
