import { DateTime } from "luxon";
import { getFullContextData, updateHeartbeat } from "./db";
import { DEFAULT_HEARTBEAT, type HeartbeatDoc } from "./types";

/**
 * 대화 시작/종료 시 Heartbeat 갱신
 * @param userId 유저 ID
 * @param characterId 캐릭터 ID
 * @param isEnd 대화 종료 시점 여부 (선택)
 */
export async function updateHeartbeatContext(
    userId: string,
    characterId: string,
    isEnd: boolean = false
): Promise<void> {
    const fullContext = await getFullContextData(userId, characterId);
    const prevHeartbeat = fullContext?.heartbeat || DEFAULT_HEARTBEAT;

    const now = DateTime.now();
    const lastSeen = prevHeartbeat.lastSeenAt
        ? DateTime.fromISO(prevHeartbeat.lastSeenAt)
        : null;

    const nextHeartbeat: HeartbeatDoc = { ...prevHeartbeat };

    // 1. lastSeenAt 갱신
    if (!isEnd) {
        // 시작 시점에만 시간 갱신 (또는 종료 시점에도 하지만, 주로 시작 시점 기준으로 '얼마만에 왔는지' 판단)
        // 여기서는 시작/종료 모두 갱신하되, 프롬프트용 텍스트 생성 시점(시작)과 갱신 시점(시작+종료) 유의
        nextHeartbeat.lastSeenAt = now.toISO();
    } else {
        // 종료 시점에도 갱신하여 "마지막 활동 시간" 최신화
        nextHeartbeat.lastSeenAt = now.toISO();
    }

    // 2. 누적 대화 수 증가 (종료 시)
    if (isEnd) {
        nextHeartbeat.totalConversations = (nextHeartbeat.totalConversations || 0) + 1;
    }

    // 3. 접속 빈도/연속 접속일 계산 (시작 시점에만 계산, 종료 시에는 중복 계산 방지)
    if (!isEnd) {
        if (lastSeen) {
            // 날짜 차이 계산 (일 단위, 로컬 시간 기준 startOf day 비교가 정확하나 서버 타임존 따름)
            const daysDiff = Math.floor(now.startOf('day').diff(lastSeen.startOf('day'), 'days').days);

            if (daysDiff === 1) {
                // 어제 오고 오늘 또 옴 -> 연속 접속 +1
                nextHeartbeat.streakDays = (nextHeartbeat.streakDays || 0) + 1;
            } else if (daysDiff > 1) {
                // 하루 이상 건너뜀 -> 리셋 (오늘 1일차)
                nextHeartbeat.streakDays = 1;
            } else {
                // 같은 날 재접속 -> 유지. 만약 0이라면 1로 설정
                if (!nextHeartbeat.streakDays) nextHeartbeat.streakDays = 1;
            }

            // recentDaysCount (최근 7일간 접속일수)
            // 오늘 처음 접속(daysDiff > 0)이면 증가. 단 7일 이상 공백이면 1로 초기화.
            if (daysDiff > 0) {
                if (daysDiff >= 7) {
                    nextHeartbeat.recentDaysCount = 1;
                } else {
                    nextHeartbeat.recentDaysCount = Math.min(7, (nextHeartbeat.recentDaysCount || 0) + 1);
                }
            }
        } else {
            // 첫 접속
            nextHeartbeat.streakDays = 1;
            nextHeartbeat.recentDaysCount = 1;
            nextHeartbeat.totalConversations = 0;
            // 첫 접속 시 lastSeenAt도 설정
            nextHeartbeat.lastSeenAt = now.toISO();
        }

        // 데이터 저장
        await updateHeartbeat(userId, characterId, nextHeartbeat);
    } else {
        // 종료 시에는 totalConversations 및 lastSeenAt만 저장
        await updateHeartbeat(userId, characterId, nextHeartbeat);
    }
}

/**
 * 프롬프트에 주입할 Heartbeat 요약 문자열 생성
 * 예: "3시간 만에 다시 만났네! (3일째 연속 대화 중)"
 */
export function formatHeartbeatForPrompt(heartbeat: HeartbeatDoc | null): string {
    if (!heartbeat || !heartbeat.lastSeenAt) {
        return "첫 만남이다.";
    }

    const now = DateTime.now();
    const lastSeen = DateTime.fromISO(heartbeat.lastSeenAt);

    // 차이 계산
    const diffDays = Math.floor(now.startOf('day').diff(lastSeen.startOf('day'), 'days').days);
    const diffMinutes = Math.floor(now.diff(lastSeen, 'minutes').minutes);

    let timeText = "";
    if (diffDays > 0) {
        timeText = `${diffDays}일 만에`;
    } else if (diffMinutes > 60) {
        const hours = Math.floor(diffMinutes / 60);
        timeText = `${hours}시간 만에`;
    } else if (diffMinutes > 5) {
        timeText = `${diffMinutes}분 만에`;
    } else {
        timeText = "방금";
    }

    const streak = heartbeat.streakDays || 0;
    const streakText = streak > 1 ? ` (${streak}일째 연속 만남)` : "";

    // totalConversations는 현재 진행 전의 횟수
    const count = (heartbeat.totalConversations || 0) + 1;

    return `유저와 ${timeText} 만났다.${streakText} 지금까지 총 ${count}번째 대화했다.`;
}
