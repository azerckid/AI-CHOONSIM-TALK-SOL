import type { LoaderFunctionArgs } from "react-router";
import { useState, useCallback } from "react";
import { useLoaderData } from "react-router";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { AdminLayout } from "~/components/admin/AdminLayout";
import { requireAdmin } from "~/lib/auth.server";
import { WalletButton } from "~/components/solana/WalletButton";
import { Button } from "~/components/ui/button";
import {
  CheckCircle,
  ExternalLink,
  Loader2,
  Gift,
  Calendar,
  Zap,
  Link2,
} from "lucide-react";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { count, ne, isNotNull, eq, and, gte } from "drizzle-orm";

import { toast } from "sonner";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAdmin(request);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [[checkinRow], [subscriberRow], [walletRow]] = await Promise.all([
    db.select({ total: count() }).from(schema.userMission)
      .where(and(eq(schema.userMission.status, "COMPLETED"), gte(schema.userMission.lastUpdated, todayStart))),
    db.select({ total: count() }).from(schema.user).where(ne(schema.user.subscriptionTier, "FREE")),
    db.select({ total: count() }).from(schema.user).where(isNotNull(schema.user.solanaWallet)),
  ]);

  return {
    stats: {
      todayCheckins: checkinRow?.total ?? 0,
      subscribers: subscriberRow?.total ?? 0,
      walletFans: walletRow?.total ?? 0,
    },
  };
}

type ActionState = "idle" | "loading" | "signing" | "success" | "error";

interface ActionCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  label: string;
  href: string;
  color: string;
}

const ACTION_CARDS: ActionCard[] = [
  {
    id: "checkin",
    icon: <Calendar className="w-5 h-5" />,
    title: "Daily Check-in",
    description: "Earn 50 CHOCO for checking in every day. Attendance is permanently recorded on-chain via Memo.",
    label: "Check-in → 50 CHOCO",
    href: "/api/actions/checkin",
    color: "from-blue-600 to-cyan-600",
  },
  {
    id: "gift",
    icon: <Gift className="w-5 h-5" />,
    title: "Gift CHOCO",
    description: "Send CHOCO tokens to another fan. Generates a Blink URL you can share directly on X (Twitter).",
    label: "Gift 100 CHOCO",
    href: "/api/actions/gift?amount=100",
    color: "from-pink-600 to-rose-600",
  },
  {
    id: "subscribe",
    icon: <Zap className="w-5 h-5" />,
    title: "SOL Subscription",
    description: "Buy a monthly subscription for 0.01 SOL. Get daily CHOCO rewards + premium features unlocked.",
    label: "Subscribe 0.01 SOL",
    href: "/api/actions/subscribe?plan=monthly",
    color: "from-violet-600 to-purple-600",
  },
];

export default function AdminBlinksPage() {
  const { stats } = useLoaderData<typeof loader>();
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [states, setStates] = useState<Record<string, ActionState>>({});
  const [sigs, setSigs] = useState<Record<string, string>>({});

  const setActionState = (id: string, state: ActionState) => {
    setStates((prev) => ({ ...prev, [id]: state }));
  };

  const executeAction = useCallback(
    async (card: ActionCard) => {
      if (!publicKey || !signTransaction) {
        toast.error("Please connect your wallet first.");
        return;
      }

      setActionState(card.id, "loading");

      try {
        const metaRes = await fetch(card.href);
        if (!metaRes.ok) throw new Error("Failed to load action metadata");

        setActionState(card.id, "signing");
        const txRes = await fetch(card.href, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ account: publicKey.toBase58() }),
        });

        if (!txRes.ok) {
          const err = await txRes.json();
          throw new Error(err.message || "Failed to build transaction");
        }

        const { transaction, message } = await txRes.json();

        const txBuf = Buffer.from(transaction, "base64");
        const tx = Transaction.from(txBuf);
        tx.feePayer = publicKey;

        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;

        const signedTx = await signTransaction(tx);
        const sig = await connection.sendRawTransaction(signedTx.serialize());
        await connection.confirmTransaction(sig, "confirmed");

        setSigs((prev) => ({ ...prev, [card.id]: sig }));
        setActionState(card.id, "success");
        toast.success(message || "Transaction confirmed!");

        if (card.id === "checkin") {
          await fetch("/api/actions/checkin/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ txSignature: sig }),
          });
        }
      } catch (err) {
        setActionState(card.id, "error");
        toast.error((err as Error).message || "Execution failed");
      }
    },
    [publicKey, signTransaction, connection]
  );

  const explorerUrl = (sig: string) =>
    `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

  const dialUrl = (href: string) =>
    typeof window !== "undefined"
      ? `https://dial.to/?action=solana-action:${window.location.origin}${href}`
      : `https://dial.to/?action=solana-action:<domain>${href}`;

  return (
    <AdminLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">
              Solana <span className="text-primary">Blinks</span>
            </h1>
            <p className="text-white/40 text-sm font-medium">
              Manage and test on-chain Actions. Copy Blink URLs to post on X (Twitter).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <WalletButton />
          </div>
        </div>

        {/* How to use */}
        <div className="bg-[#1A1821] border border-white/5 rounded-[32px] p-6 space-y-5">
          <h2 className="text-xs font-black text-white/40 uppercase tracking-[0.3em] flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">info</span>
            How to use Blinks
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-black flex items-center justify-center shrink-0">1</span>
                <p className="text-sm font-bold text-white">Copy the Blink URL</p>
              </div>
              <p className="text-xs text-white/40 leading-relaxed pl-8">
                Each action card below has a <span className="text-primary/70">Blink URL</span> starting with <code className="text-primary/60">dial.to/?action=...</code>. Copy it with the button.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-black flex items-center justify-center shrink-0">2</span>
                <p className="text-sm font-bold text-white">Post it on X (Twitter)</p>
              </div>
              <p className="text-xs text-white/40 leading-relaxed pl-8">
                Paste the URL into a post on the official Choonsim X account. X automatically renders it as an interactive action card in the feed.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-black flex items-center justify-center shrink-0">3</span>
                <p className="text-sm font-bold text-white">Fans click & sign</p>
              </div>
              <p className="text-xs text-white/40 leading-relaxed pl-8">
                Fans see the card in the feed, click the button, sign with their Phantom wallet — and the on-chain action executes instantly without leaving X.
              </p>
            </div>
          </div>
          <div className="border-t border-white/5 pt-4 space-y-2">
            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Recommended posting schedule</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-white/40">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-blue-400 text-sm mt-0.5">calendar_today</span>
                <span><span className="text-white/60 font-bold">Daily Check-in</span> — Post every morning. Fans check in to earn 50 CHOCO.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-violet-400 text-sm mt-0.5">bolt</span>
                <span><span className="text-white/60 font-bold">Subscription</span> — Post during events or membership campaigns.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-pink-400 text-sm mt-0.5">redeem</span>
                <span><span className="text-white/60 font-bold">Gift CHOCO</span> — Fans share this themselves to send CHOCO to others.</span>
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 pt-4 flex items-start gap-2 text-[11px] text-yellow-400/60">
            <span className="material-symbols-outlined text-sm shrink-0 mt-0.5">warning</span>
            <span>
              The <span className="font-bold">Test</span> buttons below let you verify each action works before posting publicly.
              Connect your Phantom wallet (Devnet) to run a test transaction.
            </span>
          </div>
        </div>

        {/* Live Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Today's Check-ins", value: stats.todayCheckins, icon: "calendar_today", color: "text-blue-400" },
            { label: "Subscribers", value: stats.subscribers, icon: "bolt", color: "text-violet-400" },
            { label: "Wallet Fans", value: stats.walletFans, icon: "account_balance_wallet", color: "text-primary" },
          ].map((s) => (
            <div key={s.label} className="bg-[#1A1821] border border-white/5 rounded-2xl px-5 py-4 flex items-center gap-3">
              <span className={`material-symbols-outlined text-xl ${s.color}`}>{s.icon}</span>
              <div>
                <p className="text-2xl font-black text-white">{s.value.toLocaleString()}</p>
                <p className="text-[11px] text-white/30 font-medium">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Linked Actions Chain */}
        <div className="bg-[#1A1821] border border-white/5 rounded-[32px] p-6 space-y-4">
          <h2 className="text-xs font-black text-white/40 uppercase tracking-[0.3em] flex items-center gap-2">
            <Link2 className="w-3.5 h-3.5 text-primary" />
            Linked Actions — Interoperable Blinks Chain
          </h2>
          <p className="text-xs text-white/30 leading-relaxed">
            Each action automatically chains to the next after completion. Fans stay engaged without leaving X.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { label: "Check-in", sub: "+50 CHOCO", color: "bg-blue-600/20 border-blue-600/40 text-blue-300" },
              { label: "Subscribe", sub: "+3,000 CHOCO", color: "bg-violet-600/20 border-violet-600/40 text-violet-300" },
              { label: "Gift CHOCO", sub: "spread love", color: "bg-pink-600/20 border-pink-600/40 text-pink-300" },
              { label: "Check-in", sub: "loop", color: "bg-blue-600/10 border-blue-600/20 text-blue-400/60" },
            ].map((step, i, arr) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`px-3 py-2 rounded-xl border text-xs font-bold ${step.color}`}>
                  <p>{step.label}</p>
                  <p className="text-[10px] opacity-70 font-normal">{step.sub}</p>
                </div>
                {i < arr.length - 1 && (
                  <span className="text-white/20 text-lg font-black">→</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Wallet warning */}
        {!connected && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-dashed border-white/10 bg-white/2 text-white/40 text-sm">
            <span className="material-symbols-outlined text-primary text-lg">wallet</span>
            Connect your Phantom wallet to test actions directly from this page.
          </div>
        )}

        {/* Action Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {ACTION_CARDS.map((card) => {
            const state = states[card.id] || "idle";
            const sig = sigs[card.id];
            const isLoading = state === "loading" || state === "signing";

            return (
              <div
                key={card.id}
                className="bg-[#1A1821] border border-white/5 rounded-[32px] overflow-hidden hover:border-primary/20 transition-all"
              >
                {/* Card Header */}
                <div className={`bg-linear-to-r ${card.color} p-5 flex items-center gap-3`}>
                  <div className="p-2 rounded-xl bg-white/20">{card.icon}</div>
                  <div>
                    <h3 className="font-black text-sm">{card.title}</h3>
                    <p className="text-white/70 text-xs mt-0.5">{card.description}</p>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Blink URL (dial.to) */}
                  <div>
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1.5">Blink URL (for X post)</p>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/30 border border-white/5">
                      <code className="text-[10px] text-primary/70 truncate flex-1">
                        {dialUrl(card.href)}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(dialUrl(card.href));
                          toast.success("Copied!");
                        }}
                        className="text-white/30 hover:text-white/60 transition-colors text-[10px] shrink-0"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  {/* Action URL (raw) */}
                  <div>
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1.5">Action Endpoint</p>
                    <div className="px-3 py-2 rounded-xl bg-black/30 border border-white/5">
                      <code className="text-[10px] text-white/30 truncate block">
                        {typeof window !== "undefined"
                          ? `${window.location.origin}${card.href}`
                          : card.href}
                      </code>
                    </div>
                  </div>

                  {/* Test Button */}
                  {state === "success" && sig ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-green-400 text-xs font-medium">
                        <CheckCircle className="w-4 h-4" />
                        Transaction confirmed!
                      </div>
                      <a
                        href={explorerUrl(sig)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/70 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View on Solana Explorer
                      </a>
                    </div>
                  ) : (
                    <Button
                      onClick={() => executeAction(card)}
                      disabled={!connected || isLoading}
                      className="w-full h-10 rounded-2xl font-black text-sm"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          {state === "signing" ? "Signing..." : "Processing..."}
                        </>
                      ) : (
                        `Test: ${card.label}`
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </AdminLayout>
  );
}
