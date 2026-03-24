import { useState, useEffect } from "react";
import { useNavigate, useLoaderData, useFetcher, redirect, Link } from "react-router";
import { auth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import type { LoaderFunctionArgs } from "react-router";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import { toast } from "sonner";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return redirect("/login");

  const [items, userRow] = await Promise.all([
    db.query.item.findMany({
      where: eq(schema.item.isActive, true),
    }),
    db.query.user.findFirst({
      where: eq(schema.user.id, session.user.id),
      columns: { chocoBalance: true },
    }),
  ]);

  return Response.json({
    items,
    chocoBalance: userRow?.chocoBalance ?? "0",
  });
}

type Item = {
  id: string;
  name: string;
  type: string;
  priceChoco: number | null;
  iconUrl: string | null;
  description: string | null;
  isActive: boolean;
};

const ICON_MAP: Record<string, string> = {
  GIFT: "redeem",
  BOOST: "bolt",
  COSMETIC: "palette",
  TICKET: "confirmation_number",
  MEMORY: "bookmark_heart",
  VOICE: "record_voice_over",
  EPISODE: "lock_open",
  PRESEND: "send",
  HEART: "favorite",
};

export default function ShopPage() {
  const { items, chocoBalance } = useLoaderData<typeof loader>() as {
    items: Item[];
    chocoBalance: string;
  };
  const navigate = useNavigate();
  const fetcher = useFetcher();

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [localBalance, setLocalBalance] = useState(parseFloat(chocoBalance) || 0);

  // Watch fetcher for success/error and close modal
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      const result = fetcher.data as any;
      if (result.success) {
        toast.success(`${selectedItem?.name} 구매 완료!`);
        setLocalBalance((prev) => prev - (result.chocoSpent ?? 0));
        setConfirmOpen(false);
        setSelectedItem(null);
      } else if (result.error) {
        if (result.error === "Insufficient CHOCO balance") {
          toast.error("CHOCO 잔액이 부족합니다.", {
            action: { label: "안내 보기", onClick: () => window.location.href = "/guide#earn" },
          });
        } else {
          toast.error(result.error);
        }
      }
    }
  }, [fetcher.state, fetcher.data]);

  const handleDetailClick = (item: Item) => {
    setSelectedItem(item);
    setDetailOpen(true);
  };

  const handleBuy = (item: Item) => {
    setSelectedItem(item);
    setDetailOpen(false);
    setConfirmOpen(true);
  };

  const handleConfirmPurchase = () => {
    if (!selectedItem) return;
    fetcher.submit(
      { itemId: selectedItem.id, quantity: 1 },
      {
        method: "POST",
        action: "/api/items/purchase",
        encType: "application/json",
      }
    );
  };

  const isSubmitting = fetcher.state === "submitting";

  return (
    <div className="bg-background-dark text-white font-display antialiased min-h-screen max-w-md mx-auto shadow-2xl pb-8">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center bg-background-dark/80 backdrop-blur-md px-4 py-3 border-b border-white/5 gap-3">
        <button
          onClick={() => navigate("/home")}
          className="text-white hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
        <h1 className="text-white text-lg font-bold flex-1">아이템 상점</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-surface-dark rounded-full px-3 py-1.5 border border-white/10">
            <span className="material-symbols-outlined text-[16px] text-[#FFD700]">toll</span>
            <span className="text-sm font-bold text-[#FFD700]">
              {localBalance.toLocaleString()} CHOCO
            </span>
          </div>
          <Link
            to="/guide#items"
            className="flex items-center justify-center size-8 rounded-full bg-white/5 border border-white/10 hover:border-primary/40 transition-colors"
            title="아이템 안내"
          >
            <span className="material-symbols-outlined text-[16px] text-white/40">help</span>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <span className="material-symbols-outlined text-[56px] text-white/20">
              storefront
            </span>
            <p className="text-white/40 font-bold text-base">상점 준비 중</p>
            <p className="text-white/20 text-sm text-center">
              곧 멋진 아이템들이 추가될 예정이에요!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => {
              const icon = ICON_MAP[item.type] || "shopping_bag";
              const price = item.priceChoco ?? 0;
              const canAfford = localBalance >= price;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleDetailClick(item)}
                  className="w-full text-left bg-surface-dark border border-white/8 rounded-2xl p-4 flex flex-col gap-3 hover:border-white/15 transition-colors"
                >
                  {/* Icon */}
                  <div className="h-16 w-16 rounded-xl bg-white/5 flex items-center justify-center mx-auto overflow-hidden">
                    {item.iconUrl ? (
                      <img src={item.iconUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-[36px] text-primary">
                        {icon}
                      </span>
                    )}
                  </div>
                  {/* Info */}
                  <div className="text-center">
                    <h3 className="text-white font-bold text-sm leading-tight">{item.name}</h3>
                    {item.description && (
                      <p className="text-white/40 text-xs mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>
                  {/* Price */}
                  <div className="flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-[#FFD700]">toll</span>
                    <span className="text-[#FFD700] font-bold text-sm">
                      {price.toLocaleString()}
                    </span>
                  </div>
                  {/* Status hint */}
                  <div className={`w-full py-2.5 rounded-xl text-sm font-bold text-center ${canAfford
                    ? "bg-primary/20 text-primary"
                    : "bg-white/5 text-white/30"
                    }`}>
                    {canAfford ? "상세 보기" : "잔액 부족"}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Bottom Sheet */}
      {detailOpen && selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => { setDetailOpen(false); setSelectedItem(null); }}
        >
          <div
            className="w-full max-w-md bg-surface-dark border border-white/10 rounded-t-3xl p-6 pb-10 shadow-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />
            <div className="flex items-start gap-4 mb-4">
              <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 overflow-hidden">
                {selectedItem.iconUrl ? (
                  <img src={selectedItem.iconUrl} alt={selectedItem.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-[36px] text-primary">
                    {ICON_MAP[selectedItem.type] || "shopping_bag"}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-white text-lg font-bold">{selectedItem.name}</h2>
                <div className="flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-[14px] text-[#FFD700]">toll</span>
                  <span className="text-[#FFD700] font-bold">{(selectedItem.priceChoco ?? 0).toLocaleString()} CHOCO</span>
                </div>
              </div>
            </div>
            <div className="mb-6">
              <p className="text-white/60 text-sm leading-relaxed">
                {selectedItem.description || "이 아이템을 사용하면 특별한 경험을 할 수 있어요. 상점에서 구매 후 대화 중에 활용해 보세요."}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setDetailOpen(false); setSelectedItem(null); }}
                className="flex-1 py-3.5 rounded-xl border border-white/10 text-white/70 font-bold hover:bg-white/5 transition-colors"
              >
                닫기
              </button>
              <button
                onClick={() => handleBuy(selectedItem)}
                disabled={localBalance < (selectedItem.priceChoco ?? 0)}
                className="flex-1 py-3.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                구매하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface-dark border border-white/10 rounded-t-3xl p-6 pb-10 shadow-2xl">
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />
            <h2 className="text-white text-lg font-bold text-center mb-1">구매 확인</h2>
            <p className="text-white/50 text-sm text-center mb-6">
              아이템을 구매하면 CHOCO가 차감됩니다.
            </p>

            <div className="bg-white/5 rounded-2xl p-4 mb-6 flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-white/5 flex items-center justify-center shrink-0 overflow-hidden">
                {selectedItem.iconUrl ? (
                  <img src={selectedItem.iconUrl} alt={selectedItem.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-[28px] text-primary">
                    {ICON_MAP[selectedItem.type] || "shopping_bag"}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold">{selectedItem.name}</p>
                <p className="text-white/40 text-xs mt-0.5">수량: 1개</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-[#FFD700]">toll</span>
                  <span className="text-[#FFD700] font-bold">
                    {(selectedItem.priceChoco ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setConfirmOpen(false);
                  setSelectedItem(null);
                }}
                disabled={isSubmitting}
                className="flex-1 py-3.5 rounded-xl border border-white/10 text-white/70 font-bold hover:bg-white/5 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleConfirmPurchase}
                disabled={isSubmitting}
                className="flex-1 py-3.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "구매 중..." : "구매 확정"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
