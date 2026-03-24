# BondBase Revenue Bridge 구현 계획
> Created: 2026-02-26
> Last Updated: 2026-03-13 (전 Phase 구현 완료, 실 전송 E2E 검증 완료)

**대상**: 춘심톡(AI-CHOONSIM-TALK) 백엔드 개발팀
**목적**: 춘심톡에서 발생하는 캐릭터별 CHOCO 소비를 집계하여 BondBase `POST /api/revenue`에 주기적으로 전송하는 연동 모듈을 구현합니다.

---

## 1. 설계 원칙

### 1.1 귀속 기준: CHOCO 소비 귀속 방식
결제 수단(PayPal/Toss/구독)이 아닌, **CHOCO가 어느 캐릭터에게 소비되었는가**를 기준으로 캐릭터별 REVENUE를 집계합니다.

| 소비 이벤트 | 캐릭터 식별 근거 | 소비 금액 근거 |
|---|---|---|
| 채팅 크레딧 소비 | `api/chat/index.ts`의 `characterId` 파라미터 | `totalTokens / 100` (CHOCO 단위) |
| 선물 증정 | `api/items/gift.ts`의 `toCharacterId` | `item.priceChoco * amount` |

- **CHOCO 범위**: 무상 지급(가입 보상 등) 포함, 캐릭터에게 소비된 전체 CHOCO
- **전송 단위**: CHOCO → USDC 환산 후 BondBase `amount` 필드로 전달

### 1.2 안전성 원칙
BondBase API 오류가 춘심톡 결제·채팅 흐름에 영향을 주지 않도록 **fire-and-forget 패턴** 적용. 오류 발생 시 로그만 기록하고 서비스 응답에는 영향 없음.

### 1.3 전송 방식: 배치 집계
매 메시지마다 API 호출(고빈도)하지 않고, **Vercel Cron (1시간 주기)**으로 캐릭터별로 합산 후 1회 전송.

---

## 2. 전체 구조

```
춘심톡 (이벤트 발생)
    │
    ├─ 채팅 크레딧 소비 → ChocoConsumptionLog (source=CHAT, characterId)
    ├─ 선물 증정      → ChocoConsumptionLog (source=GIFT, characterId)
    │
Vercel Cron (1시간마다)
    │
    ├─ isSynced=false 레코드 → characterId별 집계
    ├─ CHOCO → USDC 환산
    ├─ character.bondBaseId 조회
    │
    └─ POST /api/revenue (BondBase) → isSynced=true 업데이트
```

---

## 3. 구현 단계

### Phase A. DB 스키마 변경

#### A-1. `Character` 테이블에 `bondBaseId` 컬럼 추가
**파일**: `apps/web/app/db/schema.ts`

```ts
export const character = sqliteTable("Character", {
    // ... 기존 컬럼
    bondBaseId: integer("bondBaseId"), // BondBase 온체인 bondId. null이면 전송 건너뜀.
});
```

**초기 데이터 설정 (마이그레이션 후)**:
| characterId | bondBaseId |
|---|---|
| `chunsim` | 101 |
| 신규 캐릭터 추가 시 | 102, 103 … 순차 부여 |

#### A-2. `ChocoConsumptionLog` 테이블 신규 추가
**파일**: `apps/web/app/db/schema.ts`

```ts
export const chocoConsumptionLog = sqliteTable("ChocoConsumptionLog", {
    id: text("id").primaryKey(),
    characterId: text("characterId").notNull(),       // 소비 귀속 캐릭터
    chocoAmount: text("chocoAmount").notNull(),        // 소비된 CHOCO (BigNumber 문자열)
    source: text("source").notNull(),                  // "CHAT" | "GIFT"
    isSynced: integer("isSynced", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [
    index("ChocoConsumptionLog_characterId_isSynced_idx").on(table.characterId, table.isSynced),
]);
```

#### A-3. 마이그레이션 실행
```bash
cd apps/web
npx drizzle-kit push
```

**완료 기준**: `Character.bondBaseId` 컬럼 생성, `ChocoConsumptionLog` 테이블 생성

---

### Phase B. 소비 이벤트 로그 삽입

#### B-1. 채팅 소비 로그
**파일**: `apps/web/app/routes/api/chat/index.ts`

CHOCO 차감 DB 업데이트 직후 추가:

```ts
// fire-and-forget: BondBase 집계용 소비 로그
db.insert(schema.chocoConsumptionLog).values({
    id: crypto.randomUUID(),
    characterId,
    chocoAmount: chocoToDeduct,
    source: "CHAT",
    createdAt: new Date(),
}).catch(err => logger.error({ category: "BONDBASE", message: "ConsumptionLog insert failed", stackTrace: err.stack }));
```

#### B-2. 선물 소비 로그
**파일**: `apps/web/app/routes/api/items/gift.ts`

GiftLog 삽입 직후, 동일 DB 트랜잭션 내에 추가:

```ts
// BondBase 집계용 소비 로그 (트랜잭션 내)
await tx.insert(schema.chocoConsumptionLog).values({
    id: crypto.randomUUID(),
    characterId,
    chocoAmount: ((item.priceChoco ?? 0) * amount).toString(),
    source: "GIFT",
    createdAt: new Date(),
});
```

**완료 기준**: 채팅/선물 각 1회 실행 후 `ChocoConsumptionLog`에 행 생성 확인

---

### Phase C. BondBase 클라이언트 모듈

**신규 파일**: `apps/web/app/lib/bondbase/client.server.ts`

```ts
const BONDBASE_API_URL = process.env.BONDBASE_API_URL;
const CHOONSIM_API_KEY = process.env.CHOONSIM_API_KEY;

export async function sendRevenue(bondId: number, amountUsdc: string, description: string): Promise<void> {
    if (!BONDBASE_API_URL || !CHOONSIM_API_KEY) {
        console.warn("[BondBase] 환경변수 미설정. 전송 건너뜀.");
        return;
    }
    await fetch(BONDBASE_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${CHOONSIM_API_KEY}`,
        },
        body: JSON.stringify({
            bondId,
            type: "REVENUE",
            data: { amount: amountUsdc, source: "SUBSCRIPTION", description },
        }),
    });
}

export async function sendMetrics(bondId: number, followers: number, subscribers: number): Promise<void> {
    if (!BONDBASE_API_URL || !CHOONSIM_API_KEY) return;
    await fetch(BONDBASE_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${CHOONSIM_API_KEY}`,
        },
        body: JSON.stringify({
            bondId,
            type: "METRICS",
            data: { followers, subscribers },
        }),
    });
}
```

---

### Phase D. 집계 Cron Job

#### D-1. Cron API 라우트
**신규 파일**: `apps/web/app/routes/api/cron/bondbase-sync.ts`

처리 흐름:
1. `CRON_SECRET` 헤더 인증
2. `ChocoConsumptionLog`에서 `isSynced=false` 레코드 조회
3. `characterId`별 `chocoAmount` 합산
4. `character.bondBaseId` 조회 (null이면 skip)
5. CHOCO 합산액 → USDC 환산 (`calculateUSDFromChoco`)
6. `sendRevenue(bondId, usdcAmount, description)` 호출
7. 성공 시 해당 레코드들 `isSynced=true` 업데이트

#### D-2. `calculateUSDFromChoco` 역방향 함수 추가
**파일**: `apps/web/app/lib/ctc/exchange-rate.server.ts`

기존 `calculateChocoFromUSD`의 역산 함수 신규 작성.

#### D-3. Cron 스케줄 등록
**파일**: `apps/web/vercel.json`

```json
{
  "path": "/api/cron/bondbase-sync",
  "schedule": "0 * * * *"
}
```

**완료 기준**: Cron 수동 트리거 시 캐릭터별 REVENUE 전송 성공, `isSynced=true` 업데이트 확인

---

### Phase E. METRICS 전송 (선택)

`bondbase-sync.ts` Cron 내에 METRICS 전송 로직 추가:
- `subscriptionStatus="ACTIVE"` 유저 수 → `subscribers`
- 전체 등록 유저 수 → `followers` 대용
- 캐릭터별 구독 분리 전까지는 전체 유저 수를 각 bondId에 동일하게 전송

---

## 4. 환경변수

| 변수명 | 설명 |
|---|---|
| `BONDBASE_API_URL` | BondBase API 엔드포인트 URL |
| `CHOONSIM_API_KEY` | BondBase 팀에서 발급한 API Key (서버 전용) |

- **로컬**: `.env.development`에 BondBase 스테이징 URL 사용
- **운영**: Vercel 대시보드 > Environment Variables에 등록

---

## 5. 전체 체크리스트

### Phase A: DB 스키마
- [x] `schema.ts`: `Character.bondBaseId` 컬럼 추가
- [x] `schema.ts`: `ChocoConsumptionLog` 테이블 추가
- [x] `drizzle-kit push` 실행 및 확인
- [x] DB에서 `chunsim` bondBaseId=101, `rina` bondBaseId=102 설정 완료

### Phase B: 소비 로그 삽입
- [x] `lib/chat/choco.server.ts`: 채팅 소비 로그 삽입 (fire-and-forget, `deductChocoForTokens` 내)
- [x] `api/items/gift.ts`: 선물 소비 로그 삽입 (트랜잭션 내)

### Phase C: BondBase 클라이언트
- [x] `lib/bondbase/client.server.ts` 생성 완료 (sendRevenue, sendMetrics)
- [x] 환경변수 미설정 시 graceful skip 처리 확인

### Phase D: Cron Job
- [x] `lib/ctc/exchange-rate.server.ts`: `calculateUSDFromChoco` 구현 완료
- [x] `routes/api/cron/bondbase-sync.ts` 생성 완료
- [x] `.github/workflows/bondbase-sync.yml` — 매시간 GitHub Actions 실행 (vercel.json 대신 GA 사용)

### Phase E: METRICS (선택)
- [x] `bondbase-sync.ts` 내 METRICS 전송 로직 포함 (전체 유저/ACTIVE 구독자 각 bondId에 전송)

### 검증
- [x] `ChocoConsumptionLog` 154건 확인 (2026-03-13 기준, 실 데이터 쌓이는 중)
- [x] chunsim/rina bondBaseId 설정 확인
- [x] Cron 수동 트리거 → BondBase REVENUE/METRICS 전송 확인 (2026-03-13, `revenue.synced:2`, `metrics.sent:2`)
- [x] BondBase API 오류 시 춘심톡 서비스 영향 없음 (fire-and-forget 패턴, 코드 검증)

---

## 6. 배포 환경 BondBase 연동 요약

배포 환경에서는 **BondBase가 데이터를 받을 수 있도록 이미 구성돼 있습니다.**

| 구성 요소 | 설명 |
|-----------|------|
| 배포 앱 | `GET /api/cron/bondbase-sync` — 배포 DB의 ChocoConsumptionLog를 읽어 characterId별 합산 후 BondBase로 POST |
| 배포 DB | ChocoConsumptionLog (isSynced=false인 건이 전송 대상) |
| GitHub Actions | `bondbase-sync.yml`이 주기적으로 배포 URL의 bondbase-sync API 호출 |

**BondBase에 CHOCO_CONSUMPTION 건수가 0인 이유**는 다음 두 가지 가능성만 보면 됩니다.

| 원인 | 설명 | 확인·조치 |
|------|------|-----------|
| **(1) 배포 DB에 isSynced=false 로그가 없음** | 보낼 데이터가 없어서 0건만 전송됨 | 배포 앱으로 `GET /api/cron/bondbase-sync` 호출 후 응답 `revenue.synced` 확인. 0이면 이번에 전송한 건 0건. → mock-activity Cron(배포 URL)을 수동 실행하거나, mock-grant·mock-activity 워크플로가 배포 DB에 로그를 쌓은 뒤 bondbase-sync가 다음 주기에 전송하는지 확인. |
| **(2) BondBase API가 500 등으로 실패** | 전송 시도는 하였으나 BondBase가 오류를 반환해 수신 0건 | 동일 호출의 응답 `revenue.errors` 확인. 500 등 에러 메시지가 있으면 BondBase 측 수신 준비·API 스펙 확인 필요. |

**할 일 정리**: (1)이면 배포 DB에 소비 로그를 쌓게 한 뒤 bondbase-sync 재실행. (2)이면 BondBase 팀과 API·수신 준비 상태 확인.

---

## X. Related Documents
- **Specs (BondBase)**: [Revenue Bridge Spec](../../../../BondBase/docs/03_Specs/02_REVENUE_BRIDGE_SPEC.md) - BondBase API 호출 규격
- **Specs (BondBase)**: [Multi-Character Bond Spec](../../../../BondBase/docs/03_Specs/07_MULTI_CHARACTER_BOND_SPEC.md) - bondId 확장 규격
- **Logic**: [BM Implementation Plan](./03_BM_IMPLEMENTATION_PLAN.md) - 전체 BM 구현 계획
- **Logic**: [Backlog](./00_BACKLOG.md) - 전체 작업 현황
