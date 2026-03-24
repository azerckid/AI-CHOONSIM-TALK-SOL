/**
 * Web Push 발송 유틸 (선톡·알림 등)
 * VAPID 키는 환경변수 VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY 사용.
 */
import webpush from "web-push";

const vapidPublic = process.env.VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails("mailto:support@example.com", vapidPublic, vapidPrivate);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * 저장된 pushSubscription(JSON 문자열)으로 푸시 알림 발송.
 * subscription이 없거나 JSON 파싱 실패 시 무시.
 */
export async function sendWebPush(
  pushSubscriptionJson: string | null,
  payload: PushPayload
): Promise<boolean> {
  if (!pushSubscriptionJson) return false;
  try {
    const subscription = JSON.parse(pushSubscriptionJson);
    const body = JSON.stringify(payload);
    await webpush.sendNotification(subscription, body);
    return true;
  } catch {
    return false;
  }
}
