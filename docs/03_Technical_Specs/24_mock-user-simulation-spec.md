# Mock 유저 시뮬레이션 기술 명세

> Created: 2026-02-11
> Last Updated: 2026-02-11

## 1. 개요

본 문서는 Mock 유저 50명을 생성하고, **30일 테스트 기간 동안** 초코를 지속 지급한 뒤 채팅·선물 등으로 소비시켜 BondBase 현황을 검증하기 위한 **기술 구현 방식**을 정의합니다.

**기획 문서**: [21_MOCK_USER_SIMULATION_PLAN.md](../01_Concept_Design/21_MOCK_USER_SIMULATION_PLAN.md)

**사전 점검**: 기획문서 [0. 점검 사항 및 선행조치](../01_Concept_Design/21_MOCK_USER_SIMULATION_PLAN.md#0-점검-사항-및-선행조치) 완료 후 진행.

---

## 2. 아키텍처 선택

### 2.1 권장: 서버 스크립트 방식 (DB + 직접 함수 호출)

| 구분 | 내용 |
| :--- | :--- |
| 방식 | `scripts/` 아래 스크립트에서 DB 직접 조작 및 서버 함수 호출 |
| 세션/HTTP | 불필요 |
| AI API | 불필요 (채팅 시 토큰 사용량만 가상 생성) |

**선택 이유**:
- AI 비용 없이 50명 × N회 반복 실행 가능
- BondBase 연동 검증에 필요한 ChocoConsumptionLog 삽입은 동일 서버 함수 사용
- 구현 난이도 낮음, Playwright·인증 등 부수 구성 불필요

### 2.2 대안: HTTP 기반 (Playwright/세션)

- 실제 브라우저·API 호출 시 AI 비용 발생
- E2E·결제 흐름 검증용으로만 권장

---

## 3. CHOCO 흐름 및 BondBase 연동

### 3.1 ChocoConsumptionLog 생성 경로

| 액션 | 테이블/함수 | characterId | BondBase 반영 |
| :--- | :--- | :--- | :--- |
| 채팅 | `deductChocoForTokens()` → ChocoConsumptionLog | O | O |
| 선물 | `api/items/gift` 로직 → ChocoConsumptionLog | O | O |
| 아이템 구매 | `api/items/purchase` | - | X |

BondBase 현황 검증을 위해서는 **채팅** 또는 **선물** 시뮬레이션이 필수입니다.

### 3.2 BondBase Sync 흐름

```
ChocoConsumptionLog (isSynced=false)
  → bondbase-sync Cron: characterId별 합산
  → Character.bondBaseId 조회 (null이면 skip)
  → CHOCO → USDC 환산 후 sendRevenue()
  → isSynced=true 업데이트
```

**전제 조건**: 춘심·리나 Character 행에 `bondBaseId`가 설정되어 있어야 함.

---

## 4. 구현 구성요소

### 4.1 Mock 유저 생성 스크립트

**파일**: `scripts/seed-mock-users.ts`

- User, account, session 테이블에 50명 삽입
- `provider: "local"`, `email: "mock-{uuid}@test.local"` 로 구분
- `chocoBalance` 초기값 설정 (예: 5000~10000 CHOCO)

### 4.2 초코 지급

- DB: `UPDATE User SET chocoBalance = ? WHERE id IN (mock_user_ids)`
- 또는 Admin API 활용 (필요 시)
- **30일 테스트 기간 동안 매일 또는 주기적으로 지급 스크립트 실행** — cron 또는 수동 실행

### 4.3 소비 시뮬레이션 스크립트

**파일**: `scripts/run-mock-activity.ts`

| 액션 | 구현 방식 |
| :--- | :--- |
| 채팅 | `deductChocoForTokens(userId, characterId, { totalTokens: N })` 직접 호출. N은 가상 값 (예: 500~2000) |
| 선물 | gift 비즈니스 로직을 공통 함수로 분리 후 호출. 또는 gift API 내부 로직 재사용 |

### 4.4 실행 순서

1. `tsx scripts/seed-mock-users.ts` — Mock 유저 50명 생성
2. 초코 지급 스크립트 (30일간 매일/주기 실행)
3. `tsx scripts/run-mock-activity.ts` — 채팅·선물 시뮬레이션 (30일간 주기 실행)
4. `GET /api/cron/bondbase-sync` 호출 또는 Cron 대기 — BondBase 동기화

---

## 5. 데이터 스키마 참조

### 5.1 User (필수 필드)

- id, email, provider, chocoBalance, createdAt, updatedAt
- Mock: provider="local", email="mock-*@test.local"

### 5.2 ChocoConsumptionLog

- id, characterId, chocoAmount, source ("CHAT" | "GIFT"), isSynced, createdAt

### 5.3 Character

- bondBaseId (BondBase 전송 대상 여부 결정)

---

## 6. 환경 변수

| 변수 | 용도 |
| :--- | :--- |
| BONDBASE_API_URL | BondBase API 엔드포인트 |
| CHOONSIM_API_KEY | BondBase 인증 |
| CRON_SECRET | bondbase-sync 수동 호출 시 인증 |

---

## 7. 관련 문서

- [Mock 유저 시뮬레이션 기획](../01_Concept_Design/21_MOCK_USER_SIMULATION_PLAN.md)
- [BondBase Bridge Plan](../04_Logic_Progress/06_BONDBASE_BRIDGE_PLAN.md)
- `lib/chat/choco.server.ts` — deductChocoForTokens
- `routes/api/cron/bondbase-sync.ts` — BondBase 동기화
