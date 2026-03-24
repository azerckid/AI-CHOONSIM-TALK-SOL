import { useState, useRef, useEffect } from "react";
import { cn } from "~/lib/utils";
import { ITEMS } from "~/lib/items";
import { LoadingSpinner } from "~/components/ui/LoadingSpinner";
import { toast } from "sonner";
import type { SItem, SUserInventory } from "~/lib/types/routes";

interface GiftSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onGift: (itemId: string, amount: number) => Promise<void>;
    onOpenStore: () => void;
    ownedHearts?: number;
    userInventory?: (SUserInventory & { item: SItem })[];
    heartItem?: SItem;
}

export function GiftSelector({
    isOpen,
    onClose,
    onGift,
    onOpenStore,
    ownedHearts = 0,
    userInventory = [],
    heartItem
}: GiftSelectorProps) {
    const defaultHeartData = {
        id: heartItem?.id || ITEMS.HEART.id,
        name: heartItem?.name || ITEMS.HEART.name,
        iconUrl: heartItem?.iconUrl || ITEMS.HEART.iconUrl,
        quantity: ownedHearts,
    };

    // 필터링: 하트 외의 보유 아이템 (isActive: true 이면서 수량이 1개 이상인 경우)
    const otherItems = userInventory
        .filter(inv => inv.item && inv.item.id !== defaultHeartData.id && inv.item.isActive && inv.quantity > 0)
        .map(inv => ({
            id: inv.item.id,
            name: inv.item.name,
            iconUrl: inv.item.iconUrl,
            quantity: inv.quantity
        }));

    // 전체 아이템 리스트 (하트는 항상 맨 앞에 고정)
    const allItems = [defaultHeartData, ...otherItems];

    const [selectedItemId, setSelectedItemId] = useState(defaultHeartData.id);
    const [selectedAmount, setSelectedAmount] = useState(1);
    const [isSending, setIsSending] = useState(false);

    if (!isOpen) return null;

    const selectedItemData = allItems.find(i => i.id === selectedItemId) || defaultHeartData;
    const isImageUrl = selectedItemData.iconUrl && selectedItemData.iconUrl.includes('/');
    const hasEnough = selectedItemData.quantity >= selectedAmount;

    // 아이템 탭 선택 핸들러 -> 탭 변경 시 수량 선택 리셋
    const handleSelectTab = (itemId: string) => {
        setSelectedItemId(itemId);
        setSelectedAmount(1);
    };

    const handleAction = async () => {
        if (!hasEnough) {
            onOpenStore();
            return;
        }

        setIsSending(true);
        try {
            await onGift(selectedItemData.id, selectedAmount);
            onClose();
        } catch (error) {
            console.error("Gift error:", error);
            toast.error("선물 발송에 실패했습니다.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="absolute bottom-20 left-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-[#1A1821]/95 backdrop-blur-xl border border-white/10 rounded-[32px] pt-5 px-6 pb-6 shadow-2xl overflow-hidden relative flex flex-col gap-4">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />

                {/* Header */}
                <div className="flex justify-between items-center relative z-10">
                    <div>
                        <h3 className="text-sm font-black italic tracking-tighter text-white uppercase leading-none">
                            Gift <span className="text-primary">Inventory</span>
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-white/20 hover:text-white transition-colors bg-white/5 rounded-full p-1 h-8 w-8 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>

                {/* Swiper Tabs (Horizontal List) */}
                <div className="flex overflow-x-auto snap-x gap-3 pt-2 pb-2 -mx-2 px-2 hide-scrollbar relative z-10 w-full">
                    {allItems.map(item => {
                        const isSelected = selectedItemId === item.id;
                        const isHeart = item.id === defaultHeartData.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleSelectTab(item.id)}
                                className={cn(
                                    "snap-start shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all min-w-[76px]",
                                    isSelected
                                        ? "bg-primary/20 border-primary shadow-[0_0_15px_rgba(238,43,140,0.3)] scale-105 transform origin-bottom"
                                        : "bg-white/5 border-white/10 opacity-60 hover:opacity-100 hover:bg-white/10"
                                )}
                            >
                                <div className="w-10 h-10 rounded-full bg-black/40 border border-white/5 flex items-center justify-center overflow-hidden shadow-inner relative">
                                    {(item.iconUrl && item.iconUrl.includes('/')) ? (
                                        <img src={item.iconUrl} alt={item.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className={cn("material-symbols-outlined", isHeart ? "text-primary text-xl" : "text-white text-xl")} style={{ fontVariationSettings: "'FILL' 1" }}>
                                            {item.iconUrl || "favorite"}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] font-bold text-white whitespace-nowrap">{item.name}</span>
                                    <span className={cn("text-[9px] font-black", isHeart ? "text-primary/80" : "text-white/50")}>
                                        {item.quantity}개
                                    </span>
                                </div>
                            </button>
                        );
                    })}

                    {/* Store Upsell Button */}
                    <button
                        onClick={onOpenStore}
                        className="snap-start shrink-0 flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border border-dashed border-white/20 bg-white/5 hover:bg-white/10 transition-all min-w-[76px]"
                    >
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-white/60 text-xl">storefront</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-white/60 whitespace-nowrap mt-1">상점 가기</span>
                        </div>
                    </button>
                </div>

                {/* Main Highlight & Action Area */}
                <div className="flex flex-col items-center gap-5 relative z-10 pt-2 border-t border-white/5">
                    {/* Item Preview Large */}
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-4">
                            <div className="relative group shrink-0">
                                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full group-hover:bg-primary/30 transition-all" />
                                <div className="relative w-14 h-14 rounded-[20px] bg-[#2d1622] border border-primary/20 flex items-center justify-center overflow-hidden shadow-[inset_0_2px_10px_rgba(238,43,140,0.1)]">
                                    {isImageUrl ? (
                                        <img src={selectedItemData.iconUrl ?? ""} alt={selectedItemData.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                            {selectedItemData.iconUrl || "favorite"}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <h4 className="text-white font-black text-lg">{selectedItemData.name}</h4>
                                <p className="text-white/50 text-[11px] font-bold uppercase tracking-widest mt-0.5">
                                    선택됨
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">보유량</p>
                            <p className="text-primary font-black text-xl leading-none">{selectedItemData.quantity}</p>
                        </div>
                    </div>

                    {/* Amount Selector */}
                    <div className="grid grid-cols-4 gap-2 w-full">
                        {[1, 10, 50, 100].map((num) => (
                            <button
                                key={num}
                                onClick={() => setSelectedAmount(num)}
                                className={cn(
                                    "py-2.5 rounded-[12px] text-[12px] font-black tracking-tighter transition-all border",
                                    selectedAmount === num
                                        ? "bg-primary border-primary text-black shadow-[0_0_15px_rgba(238,43,140,0.4)] scale-105"
                                        : "bg-white/3 border-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                                )}
                            >
                                x{num}
                            </button>
                        ))}
                    </div>

                    {/* Submit Section */}
                    <div className="w-full space-y-3 pt-1">
                        {!hasEnough && (
                            <p className="text-center text-[11px] font-bold text-red-500/90 bg-red-500/10 py-2 rounded-xl border border-red-500/20">
                                보유 수량이 부족합니다. 상점을 방문해 주세요.
                            </p>
                        )}
                        <button
                            onClick={handleAction}
                            disabled={isSending}
                            className={cn(
                                "w-full h-14 rounded-[16px] font-black text-sm shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95",
                                hasEnough
                                    ? "bg-primary text-black shadow-primary/20 hover:shadow-primary/40"
                                    : "bg-white/8 border border-white/10 text-white/50 hover:bg-white/15"
                            )}
                        >
                            {isSending ? (
                                <LoadingSpinner size="sm" />
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                        {hasEnough ? "send" : "storefront"}
                                    </span>
                                    {hasEnough ? `${selectedItemData.name} ${selectedAmount}개 선물하기` : "상점으로 이동하기"}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
