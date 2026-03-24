# NEAR Protocol Fungible Token (NEP-141) Issuance & Management Specification
> Created: 2026-02-08
> Last Updated: 2026-02-08

이 문서는 춘심(CHOONSIM) 프로젝트의 자체 토큰인 **CHOCO** 토큰을 NEAR Protocol 상에 발행하고, 이를 서비스와 통합하여 효율적으로 운영하기 위한 기술적 명세를 정의합니다.

---

## 0. 프로젝트 컨텍스트

**현재 프로젝트 상태**:
- **프레임워크**: React Router v7 (Vite)
- **인증**: Better Auth (Google, Kakao, Twitter)
- **데이터베이스**: Turso (libSQL) with Drizzle ORM
- **AI 엔진**: Google Gemini API (LangGraph)
- **현재 NEAR 구현 상태**: 
  - NEAR 네이티브 코인 결제 시스템 부분 구현 완료
  - `near-api-js` 패키지 설치 완료 (v6.5.1)
  - 수동 트랜잭션 해시 입력 방식 사용 중 (개선 필요)
- **관련 문서**: 
  - `docs/plans/NEAR_X402_STRATEGY.md`: NEAR 통합 전략 및 x402 프로토콜
  - `docs/specs/NEAR_X402_UI_SPEC.md`: UI/UX 디자인 사양
  - `docs/specs/CHOCO_TOKEN_CREATION_GUIDE.md`: 토큰 발행 가이드 (성공 가이드 포함)

### 0.1 실제 발행 정보 (Testnet)
- **발행일**: 2026-01-11
- **토큰 컨트랙트 주소**: `choco.token.primitives.testnet`
- **심볼**: `CHOCO`
- **소수점**: 18
- **총 발행량**: 1,000,000,000 CHOCO (1B)
- **소유자 계정**: `rogulus.testnet`
- **트랜잭션 ID**: `6rkNPkREnpuoSbZ6PKjmjALmDArz8xLa5qykZXFGynWH`

**현재 구현된 NEAR 관련 코드**:
- `app/routes/api/payment/near/create-request.ts`: NEAR 결제 요청 생성
- `app/routes/api/payment/near/verify.ts`: NEAR 트랜잭션 검증
- `app/components/payment/NearPayButton.tsx`: NEAR 결제 UI (리팩토링 필요)

**이 문서의 목적**:
- 현재 NEAR 네이티브 코인 결제를 CHOCO 토큰 기반 결제로 전환
- x402 프로토콜과의 통합을 위한 토큰 발행 및 관리 전략 수립
- "Invisible Web3" 경험을 위한 토큰 운영 아키텍처 설계

### 0.2 자산 유형 및 관계 모델 (Asset Model)

| 자산 명칭 | 유형 | 역할 | 관리 주체 | 소비 방식 |
| :--- | :--- | :--- | :--- | :--- |
| **CHOCO** | 온체인 토큰 | **결제 화폐 (Currency)**. 실제 자산 가치를 지님. | 니어 지갑 (On-chain) | X402 프로토콜을 통한 실시간 전송 |
| **Credit** | 앱 내 포인트 | **사용량 단위 (Usage Unit)**. AI 모델 호출 비용 계산. | 앱 데이터베이스 (Off-chain) | CHOCO 결제 확인 시 앱 내 숫자 차감 |
| **Heart** | 디지털 아이템 | **선물용 아이템 (Gift Item)**. 캐릭터에게 선물 가능. | 앱 데이터베이스 (Inventory) | CHOCO로 구매 후 캐릭터에게 선물 시 소모 |

**상호작용 원칙 (Synchronization Principle)**:
1.  **동기화 소모**: 사용자가 AI 서비스를 이용하면 **CHOCO(지갑)**와 **Credit(앱)**이 동일한 가치 비율로 동시에 줄어듭니다.
2.  **화폐와 아이템의 분리**: 하트(Heart)는 화폐가 아닌 **구매 가능한 아이템**이며, 채팅 시 자동으로 소모되지 않습니다.

---

## 1. 토큰 표준 개요 (Standard Overview)

### 1.1 NEP-141 (Core Standard)
NEAR의 대체 가능 토큰(Fungible Token)을 위한 핵심 표준입니다. 이더리움의 ERC-20과 유사하지만, NEAR의 비동기적 런타임에 최적화되어 있습니다.
*   **비동기 전송**: `ft_transfer_call`을 통해 토큰을 전송함과 동시에 수신측 스마트 계약의 함수를 호출할 수 있어, 결제와 동시에 아이템 지급 등의 복잡한 트랜잭션 처리가 가능합니다.
*   **스토리지 관리**: 토큰 데이터 저장에 필요한 소량의 NEAR를 관리하는 **NEP-145(Storage Management)** 표준과 함께 작동합니다.

### 1.2 NEP-148 (Metadata Standard)
토큰의 이름, 심볼, 아이콘 등 비주얼 요소를 정의합니다.
*   **필요 항목**: 이름(name), 심볼(symbol), 아이콘(icon - base64/URL), 소수점(decimals), 참조(reference).

---

## 2. 토큰 발행 전략 (Issuance Strategy)

### 2.1 토큰 팩토리 활용 (추천 방식: 초기 모델)
가장 빠르고 안정적으로 토큰을 발행하는 방식입니다. 이미 보안 감사가 완료된 표준 컨트랙트를 사용합니다.
*   **도구**: [Ref Finance Token Factory](https://tkn.ref.finance/) 또는 [NEAR Token Factory](https://near.org/)
*   **장점**: 별도의 스마트 계약 작성 불필요, 휴먼 에러 방지, 낮은 가스비.
*   **비용**: 발행 시 약 3~5 NEAR (스토리지 비용 포함).

### 2.2 스마트 계약 직접 배포 (심화 방식)
토크노믹스(발행량 조절, 소각 로직 등)가 서비스 로직과 긴밀하게 결합되어야 할 때 사용합니다.
*   **언어**: Rust (near-sdk-rs) 추천.
*   **주요 로직**: 초기 발행(Supply), 권한 관리(Owner), 추가 발행(Mint)/소각(Burn).

---

## 3. CHOCO 토큰 상세 사양 (Token Specification)

| 항목 | 명세 | 비고 |
| :--- | :--- | :--- |
| **Token Name** | CHOONSIM Token | 서비스 신뢰도 제고를 위한 정식 명칭 |
| **Symbol** | CHOCO | 유저 친화적이고 기억하기 쉬운 단위 |
| **Decimals** | 18 | NEAR 및 타 체인(ETH 등)과 호환되는 표준 단위 |
| **Total Supply** | 1,000,000,000 | 서비스 규모에 따른 초기 발행량 설정 |
| **Icon URL** | (춘심 캐릭터 아이콘) | 원형 또는 정사각형 형태의 고해상도 이미지 |

---

## 4. 운영 및 통합 아키텍처 (Operation & Integration)

### 4.1 스토리지 스테이킹 (Storage Deposit)
NEAR 지갑은 토큰 정보를 담을 공간을 먼저 유료로 임대해야 토큰을 받을 수 있습니다.
*   **정책**: 신규 유저(Fast Auth 가입자)가 CHOCO 토큰을 처음 받을 때, **앱 백엔드가 약 0.00125 NEAR의 스토리지 비용을 선제적으로 지불(Deposit)** 해줍니다.
*   **효과**: 유저는 결제 과정에서 NEAR 코인의 존재를 몰라도 토큰 수령 및 거래가 가능합니다.

### 4.2 가스비 추상화 (Gasless Experience)
*   **메타 트랜잭션(Meta-transactions)**: 사용자가 서명한 트랜잭션을 앱의 **릴레이어(Relayer)**가 전송하고 가스비(NEAR)를 대신 납부합니다.
*   **결과**: 유저는 CHOCO 토큰만 가지고 있으면 모든 서비스를 이용할 수 있습니다.

### 4.3 X402 실시간 결제 연동
1.  **402 응답**: AI 답변 등 유료 기능 호출 시 서버가 402 에러와 결제 명세를 반환합니다.
   - 서버: `app/lib/x402/gatekeeper.server.ts`에서 CHOCO 토큰 인보이스 생성
   - 인보이스에는 CHOCO 토큰 수량, 수신 주소(서비스 계정), 토큰 컨트랙트 주소 포함
2.  **자동 전송**: 클라이언트 라이브러리가 유저 지갑에서 `ft_transfer_call`을 호출합니다.
   - `app/lib/x402/interceptor.ts`에서 402 응답 감지
   - 한도 내 자동 결제: 백그라운드에서 `ft_transfer_call` 실행
   - 한도 초과: 결제 시트 표시 후 사용자 승인
3.  **잠금 해제**: 결제 성공 시 스마트 계약의 `on_transfer_complete` 콜백을 통해 콘텐츠에 대한 접근 권한이 즉시 부여됩니다.
   - 서버: `POST /api/x402/verify`에서 트랜잭션 검증
   - 원래 요청 자동 재시도 (Authorization 헤더에 txHash 포함)

**현재 구현과의 차이점**:
- **As-Is**: NEAR 네이티브 코인 전송 (`Transfer` 액션)
- **To-Be**: CHOCO 토큰 전송 (`ft_transfer_call` 액션)
- **장점**: 가격 안정성, 서비스 브랜딩 강화, 토크노믹스 제어 가능

---

## 5. 데이터베이스 스키마 확장

### 5.1 User 테이블 확장 (`app/db/schema.ts`)

```typescript
export const user = sqliteTable("User", {
    // ... 기존 필드들 ...
    credits: integer("credits").notNull().default(100),
    
    // NEAR 계정 정보 (기존 NEAR_X402_STRATEGY.md에서 제안)
    nearAccountId: text("nearAccountId").unique(),
    nearPublicKey: text("nearPublicKey"),
    allowanceAmount: real("allowanceAmount").default(0),
    allowanceCurrency: text("allowanceCurrency").default("USD"),
    allowanceExpiresAt: integer("allowanceExpiresAt", { mode: "timestamp" }),
    
    // CHOCO 토큰 관련 필드 추가
    chocoBalance: text("chocoBalance").default("0"), // BigNumber 문자열로 저장 (18 decimals)
    chocoLastSyncAt: integer("chocoLastSyncAt", { mode: "timestamp" }), // 온체인 잔액 동기화 시간
});
```

### 5.2 TokenTransfer 테이블 생성

```typescript
export const tokenTransfer = sqliteTable("TokenTransfer", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    txHash: text("txHash").notNull().unique(),
    fromAddress: text("fromAddress").notNull(),
    toAddress: text("toAddress").notNull(),
    amount: text("amount").notNull(), // BigNumber 문자열
    tokenContract: text("tokenContract").notNull(), // CHOCO 토큰 컨트랙트 주소
    status: text("status").notNull().default("PENDING"), // PENDING, COMPLETED, FAILED
    purpose: text("purpose"), // PAYMENT, TOPUP, REFUND 등
    relatedPaymentId: text("relatedPaymentId"), // Payment 테이블과의 연관
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
}, (table) => {
    return [
        index("TokenTransfer_userId_idx").on(table.userId),
        index("TokenTransfer_txHash_idx").on(table.txHash),
        index("TokenTransfer_status_idx").on(table.status),
    ];
});
```

### 5.3 TokenConfig 테이블 생성 (토큰 설정 관리)

```typescript
export const tokenConfig = sqliteTable("TokenConfig", {
    id: text("id").primaryKey(),
    tokenContract: text("tokenContract").notNull().unique(), // CHOCO 토큰 컨트랙트 주소
    tokenSymbol: text("tokenSymbol").notNull().default("CHOCO"),
    tokenName: text("tokenName").notNull().default("CHOONSIM Token"),
    decimals: integer("decimals").notNull().default(18),
    isEnabled: integer("isEnabled", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
```

**참고**: 실제 구현에서는 `network`, `updatedAt` 필드가 생략되었고, `isActive` 대신 `isEnabled`를 사용합니다. 네트워크 정보는 환경 변수(`NEAR_NETWORK_ID`)로 관리하는 것으로 보입니다.

**Phase 3 구현 상태**:
- ✅ Storage Deposit 자동화: `app/lib/near/storage-deposit.server.ts` 구현 완료
- ✅ 토큰 잔액 동기화: `app/lib/near/token.server.ts` 구현 완료
- ✅ API: 잔액 조회: `GET /api/token/balance` 구현 완료
- ⚠️ API: 입금 감지: `POST /api/webhooks/near/token-deposit` 부분 완료 (금액 파싱 로직 개선 필요)
- ❌ API: 토큰 전송: Phase 4에서 구현 예정

---

## 6. API 엔드포인트 설계

### 6.1 토큰 잔액 조회

**엔드포인트**: `GET /api/token/balance`

**기능**: 사용자의 CHOCO 토큰 잔액 조회 (온체인 동기화 포함)

**구현 위치**: `app/routes/api/token/balance.ts`

**실제 구현** (완료됨):
```typescript
export async function loader({ request }: LoaderFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session || !session.user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const user = await db.query.user.findFirst({
        where: eq(schema.user.id, userId),
        columns: { nearAccountId: true, chocoBalance: true },
    });

    if (!user?.nearAccountId) {
        return Response.json({
            chocoBalance: user?.chocoBalance || "0",
            nearAccountId: null,
            isSynced: false,
            message: "NEAR wallet not linked"
        });
    }

    // 1. 온체인 잔액 조회
    const onChainBalance = await getChocoBalance(user.nearAccountId);

    // 2. DB 동기화 (값이 다를 경우만)
    if (onChainBalance !== user.chocoBalance) {
        await db.update(schema.user)
            .set({
                chocoBalance: onChainBalance,
                chocoLastSyncAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(schema.user.id, userId));
    }

    return Response.json({
        chocoBalance: onChainBalance,
        nearAccountId: user.nearAccountId,
        isSynced: true,
        lastSyncAt: new Date().toISOString()
    });
}
```

**참고**: 실제 구현에서는 캐싱 전략이 명시적으로 구현되지 않았으나, DB의 `chocoLastSyncAt` 필드로 추적 가능합니다.

### 6.2 토큰 전송 (X402 결제용)

**엔드포인트**: `POST /api/token/transfer`

**기능**: CHOCO 토큰 전송 (X402 인터셉터에서 호출)

**구현 위치**: `app/routes/api/token/transfer.ts`

```typescript
export async function action({ request }: ActionFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
    
    const { amount, recipientAddress, purpose } = await request.json();
    
    // 사용자 지갑 정보 조회
    const user = await db.query.user.findFirst({
        where: eq(schema.user.id, session.user.id),
    });
    
    // ft_transfer_call 트랜잭션 생성 및 서명 요청 반환
    // (실제 전송은 클라이언트에서 임베디드 지갑으로 처리)
    
    return Response.json({
        transaction: {
            // 트랜잭션 데이터 (클라이언트에서 서명)
        },
    });
}
```

### 6.3 토큰 입금 감지 (Webhook)

**엔드포인트**: `POST /api/webhooks/near/token-deposit`

**기능**: CHOCO 토큰 입금 감지 및 크레딧 자동 지급

**구현 위치**: `app/routes/api/webhooks/near/token-deposit.ts` ✅ 완료

**실제 구현** (부분 완료):
```typescript
export async function action({ request }: ActionFunctionArgs) {
    const { txHash, userId } = await request.json();

    // 1. 중복 처리 방지 (txHash 중복 체크)
    const existingTx = await db.query.tokenTransfer.findFirst({
        where: eq(schema.tokenTransfer.txHash, txHash),
    });

    if (existingTx) {
        return Response.json({ error: "Transaction already processed" }, { status: 409 });
    }

    // 2. NEAR 온체인 트랜잭션 검증
    const near = await getNearConnection();
    const txStatus = await near.connection.provider.txStatus(txHash, NEAR_CONFIG.serviceAccountId, "final");

    const isSuccess = (txStatus.status as any).SuccessValue !== undefined;
    if (!isSuccess) {
        return Response.json({ error: "Transaction failed on-chain" }, { status: 400 });
    }

    // 3. DB 트랜잭션: 유저 크레딧 충전 및 전송 기록 생성
    // **참고**: 현재는 하드코딩된 값 사용 (100 CHOCO)
    // 실제 운영 환경에서는 txStatus.receipts_outcome을 파싱하여 실제 금액 추출 필요
    const amountRaw = "100000000000000000000"; // 100 CHOCO (임시)
    const amountHuman = new BigNumber(amountRaw).dividedBy(new BigNumber(10).pow(18)).toNumber();

    await db.transaction(async (tx) => {
        await tx.insert(schema.tokenTransfer).values({
            id: nanoid(),
            userId,
            txHash,
            amount: amountRaw,
            tokenContract: NEAR_CONFIG.chocoTokenContract,
            status: "COMPLETED",
            purpose: "TOPUP",
            createdAt: new Date(),
        });

        // 유저 크레딧 업데이트 (1 CHOCO = 1 Credit 가정)
        await tx.update(schema.user)
            .set({
                credits: sql`${schema.user.credits} + ${amountHuman}`,
                chocoBalance: sql`${schema.user.chocoBalance} + ${amountRaw}`,
                updatedAt: new Date(),
            })
            .where(eq(schema.user.id, userId));
    });

    return Response.json({ success: true, creditedAmount: amountHuman });
}
```

**구현 상태**:
- ✅ 중복 처리 방지 로직 구현됨
- ✅ 온체인 트랜잭션 검증 로직 구현됨
- ✅ 크레딧 지급 로직 구현됨
- ⚠️ 트랜잭션에서 실제 금액 파싱 로직 미완성 (하드코딩된 값 사용)
- ⚠️ `verifyTokenTransfer` 함수 분리 필요
- ⚠️ `calculateCreditsFromChoco` 함수 분리 필요 (현재 1:1 가정)

---

## 7. Storage Deposit 자동화 구현

### 7.1 자동 Deposit 스크립트

**구현 위치**: `app/lib/near/storage-deposit.server.ts`

```typescript
import { connect, KeyPair, keyStores, utils } from "near-api-js";
import { db } from "../db.server";
import * as schema from "../../db/schema";
import { eq } from "drizzle-orm";

const STORAGE_DEPOSIT_AMOUNT = "0.00125"; // NEAR

export async function ensureStorageDeposit(nearAccountId: string) {
    const config = {
        networkId: process.env.NEAR_NETWORK_ID || "testnet",
        keyStore: new keyStores.InMemoryKeyStore(),
        nodeUrl: process.env.NEAR_NODE_URL || "https://rpc.testnet.near.org",
    };
    
    // 서비스 계정의 키 로드 (환경 변수에서)
    const serviceKey = KeyPair.fromString(process.env.NEAR_SERVICE_PRIVATE_KEY!);
    const serviceAccountId = process.env.NEAR_SERVICE_ACCOUNT_ID!;
    config.keyStore.setKey(config.networkId, serviceAccountId, serviceKey);
    
    const near = await connect(config);
    const account = await near.account(serviceAccountId);
    const tokenContract = process.env.CHOCO_TOKEN_CONTRACT!;
    
    // Storage Deposit 확인
    const storageBalance = await account.viewFunction({
        contractId: tokenContract,
        methodName: "storage_balance_of",
        args: { account_id: nearAccountId },
    });
    
    if (!storageBalance) {
        // Storage Deposit 실행
        await account.functionCall({
            contractId: tokenContract,
            methodName: "storage_deposit",
            args: {
                account_id: nearAccountId,
                registration_only: false,
            },
            gas: "30000000000000",
            attachedDeposit: utils.format.parseNearAmount(STORAGE_DEPOSIT_AMOUNT)!,
        });
    }
}
```

### 7.2 사용자 가입 시 자동 실행

**구현 위치**: `app/lib/near/wallet.server.ts` ✅ 완료

**실제 구현** (완료됨):
```typescript
export async function linkNearWallet(
    userId: string,
    nearAccountId: string,
    publicKey?: string
) {
    // 1. NEAR 토큰 수령을 위한 Storage Deposit 자동 처리
    try {
        await ensureStorageDeposit(nearAccountId);
    } catch (e) {
        console.error("Failed to ensure storage deposit during linking:", e);
        // 비즈니스 로직에 따라 에러를 던질지, 무시할지 결정 (여기서는 로그만 남김)
    }

    // 2. DB 업데이트
    await db.update(schema.user)
        .set({
            nearAccountId,
            nearPublicKey: publicKey || null,
            updatedAt: new Date(),
        })
        .where(eq(schema.user.id, userId));
}
```

**특징**:
- ✅ `linkNearWallet` 호출 시 자동으로 Storage Deposit 실행
- ✅ 에러 발생 시에도 DB 업데이트는 진행 (로깅만 남김)
- ✅ 임베디드 지갑 생성 로직은 아직 구현되지 않음 (Phase 4에서 구현 예정)

### 7.3 프로덕션 보안 권고 사항 (Relayer)

1. **Access Key 권한 분리**:
   - `Full Access Key`는 멀티시그 지갑에 안전하게 보관하십시오.
   - 서버에는 특정 컨트랙트의 특정 메서드(`ft_transfer_call`)만 호출하고 가스비를 지불할 수 있는 `FunctionCall Access Key`를 발급하여 사용하십시오.
2. **잔액 모니터링**:
   - 릴레이어 계정 잔액이 1 NEAR 미만으로 떨어질 경우 즉시 알림을 받도록 설정하십시오.
3. **Rate Limit 조정**:
   - 서비스 규모에 따라 `submit.ts`의 `RATE_LIMIT_PER_HOUR` 값을 조정하여 비용을 관리하십시오.
```typescript
export async function initializeUserWallet(userId: string, email: string) {
    // 임베디드 지갑 생성 (Privy/Magic 등)
    const wallet = await createEmbeddedWallet(email);
    
    // NEAR 계정 정보 저장
    await db.update(schema.user)
        .set({
            nearAccountId: wallet.accountId,
            nearPublicKey: wallet.publicKey,
        })
        .where(eq(schema.user.id, userId));
    
    // Storage Deposit 자동 실행
    await ensureStorageDeposit(wallet.accountId);
    
    return wallet;
}
```

---

## 8. 토크노믹스 및 보안 고려사항

### 8.1 초기 발행량 관리

- **총 발행량**: 1,000,000,000 CHOCO (1B)
- **초기 유통량**: 10% (100M CHOCO) - 서비스 운영용
- **나머지 90%**: 스마트 계약에 잠금 (점진적 유통 계획)

### 8.2 가격 안정성 전략

- **USD 페깅**: CHOCO 토큰 가격을 USD 기준으로 안정화
- **환율 계산**: 1 USD = X CHOCO (환율 변동 시 자동 조정)
- **크레딧 변환**: 1 CHOCO = Y Credits (서비스 내부 통화)

### 8.3 보안 고려사항

- **스마트 계약 감사**: 토큰 팩토리 사용 시에도 기본 감사 확인
- **멀티시그**: 서비스 계정의 키 관리는 멀티시그 지갑 사용 권장
- **Rate Limiting**: 토큰 전송 API에 Rate Limiting 적용
- **입금 검증**: 모든 입금은 온체인 트랜잭션 검증 필수

---

## 9. 단계별 구현 체크리스트

### Phase 1: 테스트넷 토큰 발행 (예상 소요: 1주)

- [x] **토큰 팩토리를 통한 발행** ✅ 완료
    *   NEAR Testnet에 `choco.token.primitives.testnet` 발행 완료
    *   `token.primitives.testnet` 팩토리 사용 (near-cli-rs)
    *   메타데이터 설정:
        - 이름: "CHOONSIM Token" ✅
        - 심볼: "CHOCO" ✅
        - Decimals: 18 ✅
        - 총 발행량: 1,000,000,000 CHOCO ✅
        - 아이콘: (추후 추가 가능)
    *   발행 후 컨트랙트 주소: `choco.token.primitives.testnet`
    *   트랜잭션 ID: `6rkNPkREnpuoSbZ6PKjmjALmDArz8xLa5qykZXFGynWH`
- [x] **메타데이터 검증** ✅ 완료
    *   NEAR Explorer에서 토큰 정보 확인 가능
    *   MyNearWallet에서 토큰 표시 확인 가능
- [ ] **초기 유통량 설정** (선택사항)
    *   서비스 운영 계정으로 100M CHOCO 전송 (필요 시)
    *   나머지 900M CHOCO는 컨트랙트에 잠금 (현재 전체가 `rogulus.testnet`에 있음)

### Phase 2: 데이터베이스 스키마 확장 (예상 소요: 2일)

- [x] **스키마 수정** ✅ 완료
    *   User 테이블에 `chocoBalance`, `chocoLastSyncAt` 필드 추가 ✅
    *   TokenTransfer 테이블 생성 ✅
    *   TokenConfig 테이블 생성 ✅
- [x] **마이그레이션 생성 및 적용** ✅ 완료
    *   `npx drizzle-kit generate` 실행 완료 (0002_complex_human_fly.sql)
    *   `npx drizzle-kit push` 적용 완료
- [ ] **환경 변수 설정** (확인 필요)
    *   `.env.development`에 `CHOCO_TOKEN_CONTRACT=choco.token.primitives.testnet` 추가 필요
    *   `.env.production`에도 동일하게 설정 필요
    *   **참고**: `.env` 파일은 `.gitignore`에 포함되어 있어 직접 확인 필요

### Phase 3: 백엔드 Integration (예상 소요: 2주)

- [x] **Storage Deposit 자동화** ✅ 완료
    *   `app/lib/near/storage-deposit.server.ts` 구현 완료 ✅
    *   `ensureStorageDeposit` 함수 구현 완료 ✅
    *   `linkNearWallet` 함수에서 자동 호출됨 ✅
    *   에러 처리 및 "Already registered" 케이스 처리 포함 ✅
- [x] **토큰 잔액 동기화** ✅ 완료
    *   `app/lib/near/token.server.ts`에 `getChocoBalance` 함수 구현됨 ✅
    *   `app/lib/near/client.server.ts`에 NEAR 연결 및 설정 구현됨 ✅
    *   온체인 잔액 조회 및 DB 동기화 로직 구현됨 ✅
    *   **참고**: 캐싱 전략은 명시적으로 구현되지 않았으나, DB에 `chocoLastSyncAt` 필드로 추적 가능
- [x] **API 엔드포인트 구현** (부분 완료)
    *   `GET /api/token/balance`: 잔액 조회 ✅ 구현 완료 (`app/routes/api/token/balance.ts`)
    *   `POST /api/token/transfer`: 토큰 전송 (X402용) - 미구현 (Phase 4에서 구현 예정)
    *   `POST /api/webhooks/near/token-deposit`: 입금 감지 ✅ 구현 완료 (`app/routes/api/webhooks/near/token-deposit.ts`)
- [x] **토큰 입금 감지 로직** (부분 완료)
    *   기본적인 트랜잭션 검증 로직 구현됨 ✅
    *   중복 처리 방지 (txHash 체크) 구현됨 ✅
    *   크레딧 지급 로직 구현됨 ✅
    *   **개선 필요**: 트랜잭션에서 실제 금액 파싱 로직 미완성 (현재 하드코딩된 값 사용)
    *   **개선 필요**: `verifyTokenTransfer` 함수 분리 필요
    *   **개선 필요**: `calculateCreditsFromChoco` 함수 분리 필요 (현재 1:1 가정)

### Phase 4: X402 프로토콜 연동 (예상 소요: 2주)

- [x] **X402 Gatekeeper (서버 사이드)** ✅ 완료
    *   `app/lib/near/x402.server.ts` 구현 완료
    *   `createX402Invoice`, `createX402Response`, `verifyX402Payment` 함수 구현 ✅
    *   CHOCO 토큰 인보이스 생성 및 검증 로직 완료 ✅
    *   `app/routes/api/chat/index.ts`에 통합됨 ✅
- [x] **X402 Interceptor (클라이언트 사이드)** ✅ 완료
    *   `app/lib/near/x402-client.ts` 및 `use-x402.ts` 구현 완료 ✅
    *   글로벌 fetch 가로채기 및 402 에러 처리 로직 통합 ✅
    *   `app/root.tsx`에 전역 통합 완료 ✅
- [x] **결제 검증 API** ✅ 완료
    *   `app/routes/api/x402/verify.ts` 구현 완료 ✅
    *   트랜잭션 검증 및 크레딧 자동 충전 로직 완료 ✅
- [x] **UI 통합** ✅ 완료
    *   `app/components/payment/PaymentSheet.tsx`: 원클릭 결제 시트 구현 완료 ✅
    *   `app/root.tsx` 전역 통합 완료 ✅
    *   실제 지갑 연동 완료 (`app/lib/near/wallet-client.ts`) ✅
    *   지갑 연결 상태 확인, 잔액 조회, 실제 트랜잭션 해시 반환 구현 완료 ✅
- [x] **Silent Payment (Payment Allowance) 로직** ✅ 완료
    *   `app/lib/near/silent-payment.server.ts` 구현 완료 ✅
    *   한도 조회 및 체크 로직 서버 사이드 구현 완료 ✅
    *   `app/routes/api/chat/index.ts`에 `checkSilentPaymentAllowance` 통합 완료 ✅
    *   한도 정보를 `X-x402-Allowance` 헤더에 포함하여 클라이언트에 전달 ✅
    *   클라이언트 인터셉터(`use-x402.ts`)에서 한도 내 자동 결제 시도 로직 구현 완료 ✅
- [x] **토큰 전송 API** ✅ 완료
    *   클라이언트 사이드 `transferChocoToken` 함수 구현 완료 (`app/lib/near/wallet-client.ts`) ✅
    *   `ft_transfer_call` 트랜잭션 생성 및 실행 로직 구현 완료 ✅
    *   `PaymentSheet` 컴포넌트에서 실제 지갑 연결 및 결제 처리 구현 완료 ✅
    *   **참고**: 서버 사이드 API(`POST /api/token/transfer`)는 선택사항 (클라이언트에서 직접 처리)
- [ ] **기존 NEAR 결제 코드 리팩토링** (선택사항)
    *   `app/routes/api/payment/near/create-request.ts`: CHOCO 토큰 지원 추가 (선택사항)
    *   `app/routes/api/payment/near/verify.ts`: 토큰 전송 검증 로직 추가 (선택사항)
    *   **참고**: 현재 CHOCO 토큰은 X402 프로토콜로 처리되므로 기존 코드 리팩토링은 선택사항
- [x] **테스트 및 검증 도구** ✅ 완료
    *   서버 사이드 로직 검증 스크립트 구현 완료 (`app/lib/near/test-x402-logic.ts`) ✅
    *   클라이언트 사이드 인터셉터 테스트 페이지 구현 완료 (`app/routes/test-402.tsx`) ✅
    *   인보이스 생성, Silent Payment Allowance, DB 연동 테스트 가능 ✅
    *   인터셉터 자동 감지 및 결제 시트 표시 테스트 가능 ✅
    *   **참고**: 실제 테스트넷에서 엔드투엔드 테스트는 Phase 5에서 수행 예정

### Phase 5: 가스비 대납 (Relayer) 구현 ✅ 완료 (2026-01-11)

- [x] **Relayer Server 구축**: 서비스 계정을 사용하여 가스비 대납 (`app/lib/near/relayer.server.ts`) ✅
- [x] **Meta Transaction 구현**: 사용자는 서명만 하고, 실제 트랜잭션 전송은 Relayer가 수행 (`app/routes/api/relayer/submit.ts`) ✅
- [x] **보안 및 남용 방지**: 사용자별 시간당 요청 제한(Rate Limiting) 및 로깅 구현 ✅
- [x] **모니터링**: 서비스 계정 잔액 모니터링 및 운영 안정성 강화 ✅
- [ ] **운영 최적화**: 가스비 사용량 통계 및 자동 충전 검토

### Phase 6: 메인넷 배포 (예상 소요: 1주)

- [ ] **메인넷 토큰 발행**
    *   NEAR Mainnet에 CHOCO 토큰 발행
    *   환경 변수 업데이트
- [ ] **최종 테스트**
    *   메인넷에서 전체 플로우 테스트
    *   보안 감사 완료 확인
- [ ] **문서화**
    *   사용자 가이드 작성
    *   개발자 문서 업데이트

---

## 10. 참고 자료 및 관련 파일

### 프로젝트 내 관련 파일
- `app/routes/api/payment/near/create-request.ts`: 현재 NEAR 결제 요청 생성
- `app/routes/api/payment/near/verify.ts`: 현재 NEAR 트랜잭션 검증
- `app/components/payment/NearPayButton.tsx`: 현재 NEAR 결제 UI
- `app/db/schema.ts`: 데이터베이스 스키마 정의
- `docs/plans/NEAR_X402_STRATEGY.md`: NEAR 통합 전략 문서
- `docs/specs/NEAR_X402_UI_SPEC.md`: UI/UX 디자인 사양

### 외부 참고 자료
- [NEP-141 표준 문서](https://nomicon.io/Standards/Tokens/FungibleToken/Core)
- [NEP-148 표준 문서](https://nomicon.io/Standards/Tokens/FungibleToken/Metadata)
- [Ref Finance Token Factory](https://tkn.ref.finance/)
- [NEAR Token Factory](https://near.org/)
- [near-api-js 문서](https://docs.near.org/tools/near-api-js)

---

**작성일**: 2026-01-10
**최종 수정일**: 2026-01-11
**버전**: 1.3 (Phase 4, 5 구현 완료: X402 통합, 실제 지갑 연동, 가스비 대납 Relayer 구축 완료)
**작성**: Antigravity AI Assistant


## Related Documents
- **Specs**: [Document Management Plan](../01_Concept_Design/09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
