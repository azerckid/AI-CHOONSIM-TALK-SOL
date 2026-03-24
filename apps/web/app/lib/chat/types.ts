/**
 * 채팅 공유 타입 정의
 */

export interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    mediaUrl?: string | null;
    createdAt: string | Date;
    isLiked?: boolean;
}
