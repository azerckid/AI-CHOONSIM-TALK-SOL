# NEAR 지갑 비동기 생성 구현 계획서
> Created: 2026-02-05
> Last Updated: 2026-02-08 18:01

본 문서는 **14_NEAR_DEPOSIT_ENGINE_FOLLOW_UP.md** 섹션 9.2 방안 1(비동기 지갑 생성)을 실제로 구현하기 위한 단계별 계획서입니다.

---

## 1. 개요

### 1.1 목표

- 사용자가 회원가입/로그인 후 **즉시 홈 화면으로 이동** 가능하도록 변경.
- 지갑 생성(온체인 계정 생성, CHOCO 전송 등)은 **백그라운드 작업**으로 처리.
- 지갑 생성 완료 전까지는 채팅 비활성화, 완료 시 자동 활성화 또는 알림.

### 1.2 현재 구조

- `app/lib/near/wallet.server.ts`: `ensureNearWallet()` - 동기적으로 모든 단계 실행.
- `app/routes/wallet-setup.tsx`: 지갑 생성 완료까지 대기 화면 표시.
- `app/routes/home.tsx`, `app/routes/chat/$id.tsx`: `nearAccountId` 존재 여부만 체크.

### 1.3 변경 후 구조

- `ensureNearWallet()`: DB에 `nearAccountId`만 저장 후 즉시 반환. 백그라운드 작업 큐에 지갑 생성 작업 등록.
- 백그라운드 작업: 온체인 계정 생성 → Storage deposit → CHOCO 전송 → 잔액 동기화 → 상태 업데이트.
- 프론트엔드: 지갑 상태(`WALLET_PENDING`, `WALLET_CREATING`, `WALLET_READY`)에 따라 UI 제어.

---

## 2. DB 스키마 변경

### 2.1 User 테이블에 walletStatus 필드 추가

**마이그레이션**

```typescript
// drizzle/schema.ts 또는 마이그레이션 파일
export const user = sqliteTable("User", {
    // ... 기존 필드들 ...
    nearAccountId: text("nearAccountId").unique(),
    nearPublicKey: text("nearPublicKey"),
    nearPrivateKey: text("nearPrivateKey"),
    walletStatus: text("walletStatus").default("READY"), // NEW: "PENDING" | "CREATING" | "READY" | "FAILED"
    walletCreatedAt: integer("walletCreatedAt", { mode: "timestamp" }), // NEW: 백그라운드 작업 시작 시각
    walletCompletedAt: integer("walletCompletedAt", { mode: "timestamp" }), // NEW: 완료 시각
    walletError: text("walletError"), // NEW: 실패 시 에러 메시지
    // ...
});
```

**상태 값**

| 상태 | 설명 |
|------|------|
| `PENDING` | 지갑 생성 작업이 큐에 등록됨. 아직 시작 전. |
| `CREATING` | 백그라운드 작업이 실행 중 (온체인 계정 생성, CHOCO 전송 등). |
| `READY` | 지갑 생성 완료. 채팅 가능. |
| `FAILED` | 지갑 생성 실패. 재시도 가능. |

**기존 유저 마이그레이션**

- 기존 유저 중 `nearAccountId`가 있으면 `walletStatus = "READY"`.
- `nearAccountId`가 없으면 `walletStatus = null` (새 유저와 동일).

---

## 3. 백그라운드 작업 구현

### 3.1 옵션 A: Cron 기반 (간단)

**구현 위치**: `app/lib/cron.server.ts` 또는 `app/lib/near/wallet-queue.server.ts`

```typescript
// app/lib/near/wallet-queue.server.ts
import { db } from "../db.server";
import * as schema from "../../db/schema";
import { eq, and, isNull, or } from "drizzle-orm";
import { ensureNearWalletOnChain } from "./wallet.server"; // 기존 ensureNearWallet 로직 분리

/**
 * Cron에서 주기적으로 호출: PENDING/CREATING 상태의 지갑 생성 작업 처리
 */
export async function processWalletCreationQueue() {
    const pendingUsers = await db.query.user.findMany({
        where: and(
            or(
                eq(schema.user.walletStatus, "PENDING"),
                eq(schema.user.walletStatus, "CREATING")
            ),
            sql`${schema.user.nearAccountId} IS NOT NULL`
        ),
        columns: {
            id: true,
            nearAccountId: true,
            nearPublicKey: true,
            nearPrivateKey: true,
        },
        limit: 10, // 한 번에 10개씩 처리
    });

    for (const user of pendingUsers) {
        try {
            // CREATING으로 상태 변경 (중복 실행 방지)
            await db.update(schema.user)
                .set({ walletStatus: "CREATING", walletCreatedAt: new Date() })
                .where(and(
                    eq(schema.user.id, user.id),
                    or(
                        eq(schema.user.walletStatus, "PENDING"),
                        isNull(schema.user.walletStatus)
                    )
                ));

            // 실제 지갑 생성 로직 실행 (기존 ensureNearWallet의 온체인 부분)
            await ensureNearWalletOnChain(user.id, user.nearAccountId!, user.nearPublicKey!, user.nearPrivateKey!);

            // 완료 상태로 변경
            await db.update(schema.user)
                .set({
                    walletStatus: "READY",
                    walletCompletedAt: new Date(),
                })
                .where(eq(schema.user.id, user.id));

        } catch (error) {
            // 실패 시 상태 업데이트 (재시도 가능하도록)
            await db.update(schema.user)
                .set({
                    walletStatus: "FAILED",
                    walletError: error instanceof Error ? error.message : "Unknown error",
                })
                .where(eq(schema.user.id, user.id));

            console.error(`[Wallet Queue] Failed for user ${user.id}:`, error);
        }
    }
}
```

**Cron 등록**

```typescript
// app/lib/cron.server.ts
import { processWalletCreationQueue } from "./near/wallet-queue.server";

export function initCronJobs() {
    // 기존 cron 작업들...
    
    // 지갑 생성 큐 처리: 30초마다
    setInterval(async () => {
        try {
            await processWalletCreationQueue();
        } catch (error) {
            console.error("[Cron] Wallet queue processing error:", error);
        }
    }, 30 * 1000);
}
```

### 3.2 옵션 B: 작업 큐 라이브러리 (확장성)

**Bull/BullMQ 사용** (Redis 필요)

```typescript
// app/lib/near/wallet-queue.server.ts
import Queue from "bull";
import { ensureNearWalletOnChain } from "./wallet.server";

const walletQueue = new Queue("wallet-creation", {
    redis: { host: process.env.REDIS_HOST || "localhost", port: 6379 },
});

// 작업 처리
walletQueue.process(async (job) => {
    const { userId, nearAccountId, nearPublicKey, nearPrivateKey } = job.data;
    await ensureNearWalletOnChain(userId, nearAccountId, nearPublicKey, nearPrivateKey);
});

export async function enqueueWalletCreation(userId: string, nearAccountId: string, nearPublicKey: string, nearPrivateKey: string) {
    await walletQueue.add({ userId, nearAccountId, nearPublicKey, nearPrivateKey }, {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
    });
}
```

**권장**: 초기에는 **옵션 A (Cron)**로 시작. 트래픽 증가 시 옵션 B로 전환.

---

## 4. wallet.server.ts 리팩토링

### 4.1 함수 분리

```typescript
// app/lib/near/wallet.server.ts

/**
 * [기존] 동기적 지갑 생성 (레거시 호환용)
 * @deprecated 비동기 방식으로 전환 권장
 */
export async function ensureNearWallet(userId: string) {
    // ... 기존 로직 유지 (점진적 마이그레이션) ...
}

/**
 * [신규] 즉시 반환: DB에 nearAccountId만 저장, 백그라운드 작업 등록
 */
export async function ensureNearWalletAsync(userId: string): Promise<string | null> {
    const user = await db.query.user.findFirst({
        where: eq(schema.user.id, userId),
        columns: {
            id: true,
            nearAccountId: true,
            nearPublicKey: true,
            nearPrivateKey: true,
            walletStatus: true,
        }
    });

    if (!user) return null;

    // 이미 READY 상태면 즉시 반환
    if (user.nearAccountId && user.walletStatus === "READY") {
        return user.nearAccountId;
    }

    // 키 페어 생성 (없는 경우)
    let newAccountId = user.nearAccountId;
    let publicKey = user.nearPublicKey;
    let encryptedPrivateKey = user.nearPrivateKey;

    if (!newAccountId || !publicKey || !encryptedPrivateKey) {
        const { nanoid } = await import("nanoid");
        const serviceAccountId = NEAR_CONFIG.serviceAccountId;
        const uniqueSuffix = nanoid(10).toLowerCase().replace(/[^a-z0-9]/g, "");
        newAccountId = `${uniqueSuffix}.${serviceAccountId}`;

        const keyPair = KeyPair.fromRandom("ed25519");
        publicKey = keyPair.getPublicKey().toString();
        const privateKey = keyPair.toString();
        const { encrypt } = await import("./key-encryption.server");
        encryptedPrivateKey = encrypt(privateKey);
    }

    // DB에 저장 (PENDING 상태)
    await db.update(schema.user)
        .set({
            nearAccountId: newAccountId,
            nearPublicKey: publicKey,
            nearPrivateKey: encryptedPrivateKey,
            walletStatus: "PENDING",
            walletCreatedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(schema.user.id, userId));

    // 백그라운드 작업 등록 (Cron 방식)
    // 또는 작업 큐에 추가 (Bull 방식)
    // await enqueueWalletCreation(userId, newAccountId, publicKey, encryptedPrivateKey);

    return newAccountId;
}

/**
 * [신규] 백그라운드 작업에서 호출: 온체인 계정 생성 및 CHOCO 전송
 */
export async function ensureNearWalletOnChain(
    userId: string,
    nearAccountId: string,
    publicKey: string,
    encryptedPrivateKey: string
): Promise<void> {
    // 기존 ensureNearWallet의 온체인 부분만 추출
    const serviceAccountId = NEAR_CONFIG.serviceAccountId;
    const servicePrivateKey = process.env.NEAR_SERVICE_PRIVATE_KEY;
    if (!servicePrivateKey) throw new Error("NEAR_SERVICE_PRIVATE_KEY is missing");

    // 1. 온체인 계정 생성
    const networkId = NEAR_CONFIG.networkId;
    const nodeUrl = NEAR_CONFIG.nodeUrl;
    const keyStore = new keyStores.InMemoryKeyStore();
    await keyStore.setKey(networkId, serviceAccountId, KeyPair.fromString(servicePrivateKey as any));
    const near = await connect({ networkId, nodeUrl, keyStore });
    const serviceAccount = await near.account(serviceAccountId);

    const initialBalance = BigInt("100000000000000000000000"); // 0.1 NEAR

    try {
        await (serviceAccount as any).createAccount(nearAccountId, publicKey as any, initialBalance.toString());
    } catch (createError: any) {
        const isAccountExists = createError.type === 'AccountAlreadyExists' ||
            createError.message?.includes("already exists");
        if (!isAccountExists) throw createError;
    }

    // 2. Storage deposit
    await ensureStorageDeposit(nearAccountId);

    // 3. CHOCO 전송
    const { BigNumber } = await import("bignumber.js");
    const { sendChocoToken, getChocoBalance } = await import("./token.server");
    const { nanoid } = await import("nanoid");

    const existingReward = await db.query.tokenTransfer.findFirst({
        where: (table, { and, eq }) => and(
            eq(table.userId, userId),
            eq(table.purpose, "SIGNUP_REWARD"),
            eq(table.status, "COMPLETED")
        )
    });

    if (!existingReward) {
        const signupReward = 100;
        const chocoAmountRaw = new BigNumber(signupReward).multipliedBy(new BigNumber(10).pow(18)).toFixed(0);
        const sendResult = await sendChocoToken(nearAccountId, chocoAmountRaw);
        const chocoTxHash = (sendResult as any).transaction.hash;

        if (chocoTxHash) {
            await db.insert(schema.tokenTransfer).values({
                id: nanoid(),
                userId,
                txHash: chocoTxHash,
                amount: chocoAmountRaw,
                tokenContract: process.env.NEAR_CHOCO_TOKEN_CONTRACT || "",
                status: "COMPLETED",
                purpose: "SIGNUP_REWARD",
                createdAt: new Date(),
            });
        }
    }

    // 4. 잔액 동기화
    const onChainBalanceRaw = await getChocoBalance(nearAccountId);
    const onChainBalanceBN = new BigNumber(onChainBalanceRaw).dividedBy(new BigNumber(10).pow(18));

    await db.update(schema.user)
        .set({
            chocoBalance: onChainBalanceBN.toString(),
            chocoLastSyncAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(schema.user.id, userId));
}
```

---

## 5. API 변경

### 5.1 wallet-setup.tsx action 변경

```typescript
// app/routes/wallet-setup.tsx

export async function action({ request }: Route.ActionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return { error: "Unauthorized" };

    try {
        // 비동기 방식으로 변경
        const { ensureNearWalletAsync } = await import("~/lib/near/wallet.server");
        const accountId = await ensureNearWalletAsync(session.user.id);

        if (accountId) {
            return { 
                success: true, 
                accountId,
                status: "PENDING" // 또는 DB에서 조회한 walletStatus
            };
        } else {
            return { error: "지갑 생성에 실패했습니다." };
        }
    } catch (error: any) {
        console.error(`[Wallet Setup] Action Error:`, error);
        return { error: error.message || "지갑 생성 중 알 수 없는 오류가 발생했습니다." };
    }
}
```

### 5.2 지갑 상태 확인 API 추가

```typescript
// app/routes/api/wallet/status.ts

import { auth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import type { ActionFunctionArgs } from "react-router";

export async function loader({ request }: ActionFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.query.user.findFirst({
        where: eq(schema.user.id, session.user.id),
        columns: {
            nearAccountId: true,
            walletStatus: true,
            walletError: true,
        }
    });

    return Response.json({
        accountId: user?.nearAccountId || null,
        status: user?.walletStatus || null,
        error: user?.walletError || null,
        isReady: user?.walletStatus === "READY",
    });
}
```

---

## 6. 프론트엔드 변경

### 6.1 wallet-setup.tsx 수정

```typescript
// app/routes/wallet-setup.tsx

export default function WalletSetupPage() {
    const fetcher = useFetcher<typeof action>();
    const [isStarted, setIsStarted] = useState(false);

    useEffect(() => {
        if (!isStarted && fetcher.state === "idle" && !fetcher.data) {
            setIsStarted(true);
            fetcher.submit({}, { method: "post" });
        }
    }, [isStarted, fetcher]);

    // 성공 시 즉시 홈으로 이동 (대기 없음)
    useEffect(() => {
        if (fetcher.data?.success) {
            // 짧은 딜레이 후 이동 (사용자가 메시지를 볼 수 있도록)
            setTimeout(() => {
                window.location.href = "/home";
            }, 1000);
        }
    }, [fetcher.data]);

    const messages = [
        "회원님만을 위한 안전한 블록체인 지갑을 준비 중입니다...",
        "곧 초춘심과의 대화가 시작됩니다!",
    ];

    // ... UI 렌더링 ...
}
```

### 6.2 home.tsx / chat/$id.tsx 수정

```typescript
// app/routes/home.tsx 또는 chat/$id.tsx

export async function loader({ request }: LoaderFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return redirect("/login");

    const user = await db.query.user.findFirst({
        where: eq(schema.user.id, session.user.id),
        columns: { 
            nearAccountId: true,
            walletStatus: true, // NEW
        }
    });

    // 지갑이 없으면 wallet-setup으로
    if (!user?.nearAccountId) {
        return redirect("/wallet-setup");
    }

    // 지갑이 PENDING/CREATING 상태면 홈은 보여주되 채팅은 비활성화
    // (또는 별도 "지갑 준비 중" 화면 표시)
    
    return { 
        user,
        walletStatus: user.walletStatus,
        canChat: user.walletStatus === "READY",
    };
}
```

### 6.3 지갑 상태 폴링 (선택)

```typescript
// app/components/wallet/WalletStatusPolling.tsx

import { useEffect, useState } from "react";
import { useFetcher } from "react-router";

export function WalletStatusPolling() {
    const fetcher = useFetcher();
    const [status, setStatus] = useState<string | null>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            fetcher.load("/api/wallet/status");
        }, 5000); // 5초마다 확인

        return () => clearInterval(interval);
    }, [fetcher]);

    useEffect(() => {
        if (fetcher.data?.status) {
            setStatus(fetcher.data.status);
            
            if (fetcher.data.isReady) {
                // 지갑 준비 완료 알림
                // toast.success("지갑이 준비되었습니다!");
            }
        }
    }, [fetcher.data]);

    if (status === "READY") return null;

    return (
        <div className="fixed bottom-4 right-4 bg-primary/10 border border-primary/20 rounded-lg p-3 text-sm">
            {status === "PENDING" && "지갑 생성 대기 중..."}
            {status === "CREATING" && "지갑 생성 중..."}
            {status === "FAILED" && "지갑 생성 실패. 재시도 중..."}
        </div>
    );
}
```

---

## 7. 구현 단계

### Phase 1: DB 스키마 변경

1. `drizzle/schema.ts`에 `walletStatus`, `walletCreatedAt`, `walletCompletedAt`, `walletError` 필드 추가.
2. 마이그레이션 생성 및 적용: `npx drizzle-kit generate`, `npx drizzle-kit push`.
3. 기존 유저 마이그레이션 스크립트 실행: `nearAccountId` 있으면 `walletStatus = "READY"`.

### Phase 2: 백엔드 리팩토링

1. `wallet.server.ts`에 `ensureNearWalletAsync`, `ensureNearWalletOnChain` 함수 추가.
2. `wallet-queue.server.ts` 생성 (Cron 기반 또는 Bull).
3. `cron.server.ts`에 지갑 생성 큐 처리 등록.

### Phase 3: API 변경

1. `wallet-setup.tsx` action을 `ensureNearWalletAsync` 사용하도록 변경.
2. `/api/wallet/status` API 추가.

### Phase 4: 프론트엔드 변경

1. `wallet-setup.tsx`: 성공 시 즉시 홈 이동.
2. `home.tsx`, `chat/$id.tsx`: `walletStatus` 체크, `READY`가 아니면 채팅 비활성화.
3. (선택) `WalletStatusPolling` 컴포넌트 추가.

### Phase 5: 테스트 및 모니터링

1. 로컬/테스트넷에서 지갑 생성 플로우 테스트.
2. 백그라운드 작업 실패 시 재시도 로직 검증.
3. 모니터링: 지갑 생성 완료 시간, 실패율 등.

---

## 8. 롤백 계획

- 기존 `ensureNearWallet()` 함수는 유지 (레거시 호환).
- 문제 발생 시 `wallet-setup.tsx` action을 기존 함수로 되돌림.
- DB 스키마 변경은 되돌릴 수 없으나, `walletStatus` 필드를 무시하고 기존 로직 사용 가능.

---

## 9. 참조

- 기존 지갑 생성 로직: `app/lib/near/wallet.server.ts`
- Cron 작업: `app/lib/cron.server.ts`
- 관련 문서: `./14_NEAR_DEPOSIT_ENGINE_FOLLOW_UP.md` (섹션 9)

---

**작성일**: 2026-02-05  
**최종 수정일시**: 2026-02-05 19:00 KST


## Related Documents
- **Foundation**: [Document Management Plan](./09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
