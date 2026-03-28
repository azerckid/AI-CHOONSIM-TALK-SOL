/**
 * ExportWalletButton — Privy 임베디드 지갑 프라이빗 키 내보내기
 * Privy의 안전한 iframe 모달에서 키를 노출합니다 (앱은 키에 접근 불가).
 * 반드시 PrivyWalletProvider 하위에서 사용해야 합니다.
 */
import { useState, useEffect } from "react";
import { useExportWallet } from "@privy-io/react-auth/solana";
import { KeyRound } from "lucide-react";

interface Props {
  address: string;
}

function ExportWalletButtonInner({ address }: Props) {
  const { exportWallet } = useExportWallet();
  return (
    <button
      onClick={() => exportWallet({ address })}
      className="flex items-center gap-1 text-xs text-white/30 hover:text-yellow-400 transition-colors shrink-0"
      title="Export private key"
    >
      <KeyRound className="w-3 h-3" />
    </button>
  );
}

export function ExportWalletButton({ address }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return <ExportWalletButtonInner address={address} />;
}
