/**
 * SwapTxCard - inline CHOCO purchase card for chat
 *
 * Rendered when MessageBubble detects a [SWAP_TX:paymentId:base64tx] marker.
 * Phantom payments build a fresh transaction from the connected Phantom payer.
 *
 * 1. Click "Sign with Phantom"
 * 2. Send payer to /api/payment/solana/create-tx
 * 3. Build a VersionedTransaction and sign with Phantom
 * 4. Send signature to /api/payment/solana/verify-sig
 */
import { useState, useEffect } from "react";
import { useRevalidator } from "react-router";
import { toast } from "sonner";
import { PrivyChocoPayCard } from "./PrivyChocoPayCard";

interface Props {
  paymentId: string;
  txBase64: string;
  /** CHOCO amount parsed from the chat message. */
  choco: number;
}

type Status = "idle" | "connecting" | "signing" | "verifying" | "done" | "error";

export function SwapTxCard({ paymentId, txBase64, choco }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [grantedChoco, setGrantedChoco] = useState(0);
  const [hasPhantom, setHasPhantom] = useState(false);
  const [tab, setTab] = useState<"phantom" | "internal">("internal");
  const revalidator = useRevalidator();
  void paymentId;
  void txBase64;

  const solAmount = (choco * 0.00001).toFixed(6);

  useEffect(() => {
    const phantom = (window as any).phantom?.solana;
    if (!phantom?.isPhantom) return;
    phantom.connect({ onlyIfTrusted: true })
      .then(() => { setHasPhantom(true); setTab("phantom"); })
      .catch(() => setHasPhantom(false));
  }, []);

  async function handleSign() {
    const phantom = (window as any).phantom?.solana;
    if (!phantom?.isPhantom) {
      toast.error("Phantom wallet is required. Install it at phantom.app.");
      window.open("https://phantom.app", "_blank");
      return;
    }

    try {
      setStatus("connecting");
      const connectResult = await phantom.connect();
      const payer = connectResult.publicKey.toString();

      const createRes = await fetch("/api/payment/solana/create-tx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choco, payer }),
      });
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        throw new Error(err.error || `Server error (${createRes.status})`);
      }
      const { recipient, lamports, paymentId: phantomPaymentId, rpcUrl, reference } = await createRes.json();

      const {
        SystemProgram,
        PublicKey,
        Connection,
        VersionedTransaction,
        TransactionMessage,
      } = await import("@solana/web3.js");

      const connection = new Connection(rpcUrl, "confirmed");
      const latestBlockhash = await connection.getLatestBlockhash();
      const fromPubkey = new PublicKey(payer);
      const toPubkey = new PublicKey(recipient);
      const referencePubkey = new PublicKey(reference);
      const transferInstruction = SystemProgram.transfer({ fromPubkey, toPubkey, lamports });
      transferInstruction.keys.push({
        pubkey: referencePubkey,
        isSigner: false,
        isWritable: false,
      });

      const message = new TransactionMessage({
        payerKey: fromPubkey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: [transferInstruction],
      }).compileToV0Message();

      const tx = new VersionedTransaction(message);

      setStatus("signing");
      const signedTx = await phantom.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });
      await connection.confirmTransaction(
        {
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        },
        "confirmed",
      );

      setStatus("verifying");
      const verifyRes = await fetch("/api/payment/solana/verify-sig", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature, paymentId: phantomPaymentId }),
      });
      const verifyData = await verifyRes.json();

      if (verifyData.status === "COMPLETED") {
        setGrantedChoco(verifyData.chocoGranted ?? choco);
        setStatus("done");
        revalidator.revalidate();
      } else {
        throw new Error(verifyData.error || "Payment verification failed.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes("User rejected") ||
        msg.includes("cancelled") ||
        msg.includes("rejected")
      ) {
        toast("Payment cancelled.");
        setStatus("idle");
        return;
      }
      console.error("[SwapTxCard]", err);
      toast.error(msg || "Payment failed. Please try again.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 text-sm font-semibold">
        <span className="material-symbols-outlined text-[18px]">check_circle</span>
        {grantedChoco.toLocaleString()} CHOCO topped up
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mt-3 flex flex-col gap-2">
        <p className="text-xs text-red-400">Something went wrong. Please try again.</p>
        <button
          onClick={() => setStatus("idle")}
          className="text-xs text-white/50 hover:text-white/80 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const isLoading = status !== "idle";
  const statusLabel: Record<Status, string> = {
    idle: "",
    connecting: "Connecting wallet...",
    signing: "Approve in Phantom...",
    verifying: "Confirming on-chain...",
    done: "",
    error: "",
  };

  return (
    <div className="mt-3 p-3 rounded-xl bg-[#9945FF]/10 border border-[#9945FF]/30 space-y-2.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-white">{choco.toLocaleString()} CHOCO</span>
        <span className="text-white/50 text-xs">{solAmount} SOL (Devnet)</span>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-[#14F195]/70 font-medium">
        <span className="material-symbols-outlined text-[12px]">auto_fix_high</span>
        Transaction ready - sign to continue
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-[#9945FF]">
          <span className="w-3 h-3 border-2 border-[#9945FF]/40 border-t-[#9945FF] rounded-full animate-spin shrink-0" />
          {statusLabel[status]}
        </div>
      )}

      <div className="flex rounded-xl overflow-hidden border border-white/10">
        <button
          onClick={() => setTab("phantom")}
          disabled={!hasPhantom}
          className={`flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-bold transition-all
            ${tab === "phantom"
              ? "bg-[#9945FF] text-white"
              : hasPhantom
                ? "bg-white/5 text-white/60 hover:bg-white/10"
                : "bg-white/5 text-white/20 cursor-not-allowed"
            }`}
        >
          <span className="material-symbols-outlined text-[13px]">account_balance_wallet</span>
          Phantom
          {!hasPhantom && <span className="text-[9px] opacity-60">(Not installed)</span>}
        </button>
        <button
          onClick={() => setTab("internal")}
          className={`flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-bold transition-all
            ${tab === "internal"
              ? "bg-[#9945FF] text-white"
              : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
        >
          <span className="material-symbols-outlined text-[13px]">lock</span>
          Internal Wallet
        </button>
      </div>

      {tab === "phantom" ? (
        <button
          onClick={handleSign}
          disabled={isLoading || !hasPhantom}
          className="w-full flex items-center justify-center gap-2 bg-[#9945FF] hover:bg-[#7b35d9] disabled:opacity-50 text-white text-sm font-bold py-2.5 px-4 rounded-xl transition-all active:scale-[0.98]"
        >
          {isLoading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
              Sign with Phantom
            </>
          )}
        </button>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-3">
          <p className="text-xs leading-relaxed text-white/60">
            Complete this CHOCO top-up with your internal wallet.
          </p>
          <PrivyChocoPayCard choco={choco} compact />
        </div>
      )}
    </div>
  );
}
