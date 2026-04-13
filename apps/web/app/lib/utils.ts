import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 메시지 content에서 내부 프로토콜 마커를 제거한다.
 * 채팅 목록 미리보기, 홈 화면 등에서 raw 마커가 노출되지 않도록 사용.
 * - [SWAP_TX:paymentId:base64tx]
 * - [PHANTOM:amount]
 */
export function stripMessageMarkers(content: string): string {
  return content
    .replace(/\[SWAP_TX:[^\]]+\]/g, "")
    .replace(/\[PHANTOM:\d+\]/g, "")
    .trim() || content.trim();
}
