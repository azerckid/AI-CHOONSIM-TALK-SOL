import { useEffect } from "react";

export function usePushNotifications() {
    useEffect(() => {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
            return;
        }

        async function registerAndSubscribe() {
            try {
                // 1. 서비스 워커 등록
                const registration = await navigator.serviceWorker.register("/sw.js");

                // 2. 권한 요청
                const permission = await Notification.requestPermission();
                if (permission !== "granted") return;

                // 3. 구독 확인 및 생성
                let subscription = await registration.pushManager.getSubscription();

                if (!subscription) {
                    const publicKey = "BHSfyq4ktAmEhKPlQOesJoFLQ1H3zTfKWvGyHvk0i5ole1SUEwE1altycO2AJEIhqW75dns43hkJdk5rf-IPnXU";
                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: publicKey
                    });
                }

                // 4. 서버로 전송
                await fetch("/api/push-subscription", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ subscription })
                });

            } catch (error) {
                console.error("Push Notification setup failed:", error);
            }
        }

        registerAndSubscribe();
    }, []);
}
