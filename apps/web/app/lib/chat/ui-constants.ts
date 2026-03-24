/**
 * 채팅 UI 상수 — 감정 맵 + 페이월 트리거 설정
 */
import type React from "react";
import { PAYWALL_ITEM_PRICES } from "~/lib/constants/chat";

export const EMOTION_MAP: Record<string, { color: string; text: string; aura: string; style?: React.CSSProperties }> = {
    JOY: {
        color: "text-pink-400",
        text: "기분 좋음",
        aura: "ring-2 ring-pink-500/30 animate-aura-breathe",
        style: { "--aura-color": "rgba(236,72,153,0.6)" } as React.CSSProperties
    },
    SHY: {
        color: "text-rose-400",
        text: "부끄러움",
        aura: "ring-2 ring-rose-500/40 animate-neon-flicker",
        style: { "--aura-color": "rgba(251,113,133,0.5)" } as React.CSSProperties
    },
    EXCITED: {
        color: "text-orange-400",
        text: "신남!",
        aura: "ring-4 ring-orange-500/50 animate-intense-pulse",
        style: { "--aura-color": "rgba(251,146,60,0.8)" } as React.CSSProperties
    },
    LOVING: {
        color: "text-red-500",
        text: "사랑해",
        aura: "ring-4 ring-red-600 animate-intense-pulse shadow-[0_0_10px_rgba(220,38,38,0.8)]",
        style: { "--aura-color": "rgba(220,38,38,0.9)" } as React.CSSProperties
    },
    SAD: {
        color: "text-blue-400",
        text: "시무룩",
        aura: "ring-1 ring-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.3)]",
        style: { "--aura-color": "rgba(59,130,246,0.3)" } as React.CSSProperties
    },
    THINKING: {
        color: "text-purple-400",
        text: "생각 중",
        aura: "ring-2 ring-purple-500/40 animate-aura-breathe",
        style: { "--aura-color": "rgba(168,85,247,0.5)" } as React.CSSProperties
    },
};

export const PAYWALL_TRIGGER_CONFIG: Record<string, {
    title: string;
    desc: string;
    itemName: string;
    itemId: string;
    icon: string;
    price: number;
}> = {
    memory_recall: {
        title: "이 기억, 영원히 간직할까?",
        desc: "춘심이가 이 순간을 영원히 기억하도록 고정할 수 있어요.",
        itemName: "기억 각인 티켓",
        itemId: "memory_ticket",
        icon: "bookmark_heart",
        price: PAYWALL_ITEM_PRICES.memory_ticket,
    },
    secret_episode: {
        title: "우리만의 비밀 이야기가 있어",
        desc: "지금 이 특별한 순간을 비밀 에피소드로 간직해요.",
        itemName: "비밀 에피소드",
        itemId: "secret_episode",
        icon: "lock_open",
        price: PAYWALL_ITEM_PRICES.secret_episode,
    },
    memory_album: {
        title: "우리 추억을 앨범으로 만들어줄게",
        desc: "지금까지의 대화를 AI가 편집한 앨범으로 만들어드려요.",
        itemName: "대화 앨범",
        itemId: "memory_album",
        icon: "photo_album",
        price: PAYWALL_ITEM_PRICES.memory_album,
    },
    birthday_voice: {
        title: "목소리로 전하고 싶어",
        desc: "춘심이의 목소리로 직접 생일 축하 메시지를 들어보세요.",
        itemName: "보이스 티켓",
        itemId: "voice_ticket",
        icon: "record_voice_over",
        price: PAYWALL_ITEM_PRICES.voice_ticket,
    },
};
