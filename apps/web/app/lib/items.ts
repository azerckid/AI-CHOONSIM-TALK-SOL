export const ITEMS = {
    HEART: {
        id: "heart",
        name: "하트",
        type: "GIFT",
        iconUrl: "favorite",
        description: "아이돌에게 사랑을 전하는 가장 기본적인 방법입니다.",
        priceChoco: 1500,
    },
    MEMORY_TICKET: {
        id: "memory_ticket",
        name: "기억 각인 티켓",
        type: "MEMORY",
        iconUrl: "bookmark_heart",
        description: "중요한 대화를 영원히 기억하도록 고정합니다.",
        priceChoco: 500,
    },
    SECRET_EPISODE: {
        id: "secret_episode",
        name: "비밀 에피소드 해금",
        type: "EPISODE",
        iconUrl: "lock_open",
        description: "특정 조건 달성 시 잠긴 특별 시나리오 1회 이용 가능.",
        priceChoco: 3000,
    },
    MEMORY_ALBUM: {
        id: "memory_album",
        name: "대화 앨범",
        type: "ALBUM",
        iconUrl: "photo_album",
        description: "한 달간의 베스트 대화를 AI가 편집한 PDF로 생성합니다.",
        priceChoco: 2000,
    },
    VOICE_TICKET: {
        id: "voice_ticket",
        name: "보이스 티켓",
        type: "VOICE",
        iconUrl: "record_voice_over",
        description: "춘심이의 AI 목소리로 답변을 들을 수 있습니다.",
        priceChoco: 1500,
    },
} as const;

export interface ItemPackage {
    id: string;
    itemId: string;
    name: string;
    quantity: number;
    priceKRW: number;
    priceUSD: number;
    description?: string;
    image?: string;
    isPopular?: boolean;
}

export const HEART_PACKAGES: ItemPackage[] = [
    {
        id: "heart_pack_1",
        itemId: "heart",
        name: "하트 작은 상자",
        quantity: 10,
        priceKRW: 1500,
        priceUSD: 1.2,
        description: "가볍게 마음을 전하기 좋아요.",
        image: "https://cdn-icons-png.flaticon.com/512/1077/1077035.png", // Heart icon
    },
    {
        id: "heart_pack_2",
        itemId: "heart",
        name: "하트 큰 상자",
        quantity: 50,
        priceKRW: 7000,
        priceUSD: 5.5,
        description: "듬뿍 담긴 하트로 응원해주세요!",
        image: "https://cdn-icons-png.flaticon.com/512/3128/3128313.png", // Multiple hearts
        isPopular: true,
    },
    {
        id: "heart_pack_3",
        itemId: "heart",
        name: "하트 보물상자",
        quantity: 100,
        priceKRW: 13000,
        priceUSD: 10.0,
        description: "당신은 최고의 팬입니다!",
        image: "https://cdn-icons-png.flaticon.com/512/2859/2859706.png", // Glowing heart
    },
];

export type ItemId = keyof typeof ITEMS;
