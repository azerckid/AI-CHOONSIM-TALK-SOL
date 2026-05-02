import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

/**
 * React Router v7 라우트 설정
 * 
 * 주의사항:
 * - 더 구체적인 라우트를 일반적인 라우트보다 먼저 등록해야 합니다.
 *   예: `profile/edit`은 `profile`보다 먼저 등록해야 합니다.
 * - OAuth 콜백 라우트는 Better Auth의 내부 경로와 매핑하기 위해 별도 파일이 필요합니다.
 *   (자세한 내용은 AGENTS.md의 "Authentication & Routing Setup" 섹션 참조)
 */
export default [
  // 인덱스 라우트
  index("routes/index.tsx"),
  route("splash", "routes/splash.tsx"),

  // 지갑 Provider가 필요한 페이지 (Privy + Solana Wallet Adapter)
  layout("routes/layouts/wallet-layout.tsx", [
    route("login", "routes/login.tsx"),
    route("wallet-setup", "routes/wallet-setup.tsx"),
    route("buy-choco", "routes/buy-choco.tsx"),
    route("blinks", "routes/blinks.tsx"),
    route("profile/memories", "routes/profile/memories.tsx"),
    route("profile", "routes/profile/index.tsx"),
    route("profile/edit", "routes/profile/edit.tsx"),
    route("profile/subscription", "routes/profile/subscription.tsx"),
    route("profile/saved", "routes/profile/saved.tsx"),
    route("admin/blinks", "routes/admin/blinks.tsx"),
  ]),

  // 지갑 불필요 페이지
  route("home", "routes/home.tsx"),
  route("signup", "routes/signup.tsx"),
  route("forgot-password", "routes/forgot-password.tsx"),
  route("onboarding/choco", "routes/onboarding/choco.tsx"),
  route("pitch", "routes/pitch.tsx"),

  // 약관 및 정책
  route("terms", "routes/terms.tsx"),
  route("privacy", "routes/privacy.tsx"),
  route("help", "routes/help.tsx"),

  // 채팅
  route("chat/:id", "routes/chat/$id.tsx"),
  route("chats", "routes/chat/index.tsx"),

  // 팬덤
  route("fandom", "routes/fandom.tsx"),
  route("missions", "routes/missions.tsx"),
  route("notices", "routes/notices/index.tsx"),
  route("notices/:id", "routes/notices/$id.tsx"),

  // CHOCO 구매 (wallet-layout에 포함됨)

  // 상점 & 알림
  route("shop", "routes/shop/index.tsx"),
  route("notifications", "routes/notifications/index.tsx"),
  route("guide", "routes/guide.tsx"),

  // 설정
  route("settings", "routes/settings.tsx"),
  route("settings/blocked", "routes/settings/blocked.tsx"),
  route("settings/chat", "routes/settings/chat.tsx"),

  // 캐릭터
  route("character/:id", "routes/character/$id.tsx"),

  // OAuth 콜백 라우트 (Better Auth와의 경로 매핑을 위한 별도 파일)
  // AGENTS.md의 "Authentication & Routing Setup" 섹션 참조
  route("auth/*", "routes/api/auth/$.ts"), // Better Auth의 모든 경로 처리

  // SIWS (Sign In With Solana)
  route("api/auth/siws/nonce", "routes/api/auth/siws/nonce.ts"),
  route("api/auth/siws/verify", "routes/api/auth/siws/verify.ts"),

  // API 라우트
  route("api/chat", "routes/api/chat/index.ts"),
  route("api/chat/create", "routes/api/chat/create.ts"),
  route("api/chat/delete", "routes/api/chat/delete.ts"),
  route("api/chat/interrupt", "routes/api/chat/interrupt.ts"),
  route("api/messages", "routes/api/messages/index.ts"),
  route("api/messages/:id/like", "routes/api/messages/$id.like.ts"),
  route("api/upload", "routes/api/upload.ts"),
  route("api/test-cron", "routes/api/test-cron.ts"),
  route("api/cron/presend", "routes/api/cron/presend.ts"),
  route("api/user/wallet", "routes/api/user/wallet.ts"),
  route("api/account/delete", "routes/api/account/delete.ts"),
  route("api/push-subscription", "routes/api/push-subscription.ts"),
  route("api/stats/usage", "routes/api/stats/usage.ts"),
  route("api/items/gift", "routes/api/items/gift.ts"),
  route("api/payment/create-order", "routes/api.payment.create-order.ts"),
  route("api/payment/capture-order", "routes/api.payment.capture-order.ts"),
  route("api/payment/item/create-order", "routes/api.payment.item.create-order.ts"),
  route("api/payment/item/capture-order", "routes/api.payment.item.capture-order.ts"),
  route("pricing", "routes/pricing.tsx"),
  route("api/payment/activate-subscription", "routes/api.payment.activate-subscription.ts"),
  route("api/webhooks/paypal", "routes/api.webhooks.paypal.ts"),
  route("api/payment/cancel-subscription", "routes/api.payment.cancel-subscription.ts"),
  route("api/payment/toss-confirm", "routes/api.payment.toss.confirm.ts"),
  route("payment/toss/success", "routes/payment.toss.success.tsx"),
  route("payment/toss/fail", "routes/payment.toss.fail.tsx"),
  route("api/items/purchase", "routes/api/items/purchase.ts"),
  route("api/voice/generate", "routes/api/voice/generate.ts"),
  route("api/album/generate", "routes/api/album/generate.ts"),
  route("api/payment/coinbase/create-charge", "routes/api/payment/coinbase/create-charge.ts"),
  route("api/webhooks/coinbase", "routes/api/webhooks/coinbase.ts"),
  route("api/payment/solana/create-request", "routes/api/payment/solana/create-request.ts"),
  route("api/payment/solana/create-tx", "routes/api/payment/solana/create-tx.ts"),
  route("api/payment/solana/verify-sig", "routes/api/payment/solana/verify-sig.ts"),
  route("api/payment/solana/verify", "routes/api/payment/solana/verify.ts"),
  // Context API
  route("api/context", "routes/api/context/index.ts"), // DELETE all context (full, confirm required)
  route("api/context/all", "routes/api/context/all.ts"), // GET all character contexts (must be before :characterId)
  route("api/context/:characterId", "routes/api/context/$characterId.ts"), // GET(Full), DELETE(Reset)
  route("api/context/:characterId/memory", "routes/api/context/$characterId.memory.ts"),
  route("api/context/:characterId/identity", "routes/api/context/$characterId.identity.ts"),
  route("api/context/:characterId/soul", "routes/api/context/$characterId.soul.ts"),
  route("api/context/:characterId/tools", "routes/api/context/$characterId.tools.ts"),
  route("api/context/:characterId/heartbeat", "routes/api/context/$characterId.heartbeat.ts"),
  route("api/context/:characterId/export", "routes/api/context/$characterId.export.ts"),

  // Solana Actions & Blinks (blinks 페이지는 wallet-layout에 포함됨)
  route("actions.json", "routes/actions.json.ts"),
  route(".well-known/solana-actions.json", "routes/well-known/solana-actions.ts"),
  route("api/actions/gift", "routes/api/actions/gift.ts"),
  route("api/actions/subscribe", "routes/api/actions/subscribe.ts"),
  route("api/actions/subscribe/verify", "routes/api/actions/subscribe.verify.ts"),
  route("api/actions/checkin", "routes/api/actions/checkin.ts"),
  route("api/actions/checkin/verify", "routes/api/actions/checkin.verify.ts"),

  // Solana cNFT
  route("api/solana/mint-memory", "routes/api/solana/mint-memory.ts"),
  route("api/solana/memories", "routes/api/solana/memories.ts"),

  // ZK Compression setup (admin)
  route("api/admin/setup-compressed-token", "routes/api/admin/setup-compressed-token.ts"),

  // Admin Routes
  route("admin", "routes/admin/index.tsx"),
  route("admin/dashboard", "routes/admin/dashboard.tsx"),
  route("admin/characters", "routes/admin/characters/index.tsx"),
  route("admin/characters/new", "routes/admin/characters/edit.tsx", { id: "admin-character-new" }),
  route("admin/characters/:id", "routes/admin/characters/edit.tsx", { id: "admin-character-edit" }),
  route("admin/items", "routes/admin/items/index.tsx"),
  route("admin/items/new", "routes/admin/items/edit.tsx", { id: "admin-item-new" }),
  route("admin/items/:id", "routes/admin/items/edit.tsx", { id: "admin-item-edit" }),
  route("admin/items/statistics", "routes/admin/items/statistics.tsx"),
  route("admin/users", "routes/admin/users/index.tsx"),
  route("admin/users/:id", "routes/admin/users/detail.tsx"),
  route("admin/payments", "routes/admin/payments/index.tsx"),
  route("admin/content", "routes/admin/content/index.tsx"),
  route("admin/content/home", "routes/admin/content/home.tsx"),
  route("admin/content/feed", "routes/admin/content/feed.tsx"),
  route("admin/content/notices", "routes/admin/notices/index.tsx"),
  route("admin/content/notices/new", "routes/admin/notices/edit.tsx", { id: "admin-notice-new" }),
  route("admin/content/notices/:id", "routes/admin/notices/edit.tsx", { id: "admin-notice-edit" }),
  route("admin/content/missions", "routes/admin/missions/index.tsx"),
  route("admin/content/missions/new", "routes/admin/missions/edit.tsx", { id: "admin-mission-new" }),
  route("admin/content/missions/:id", "routes/admin/missions/edit.tsx", { id: "admin-mission-edit" }),
  route("admin/system", "routes/admin/system.tsx"),
  route("admin/*", "routes/admin/$.tsx"),

] satisfies RouteConfig;


