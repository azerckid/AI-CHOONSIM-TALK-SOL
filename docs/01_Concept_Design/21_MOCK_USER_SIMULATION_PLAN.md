# Mock 유저 시뮬레이션 기획

> Created: 2026-02-11
> Last Updated: 2026-03-05

## 0. 점검 사항 및 선행조치

Mock 유저 작업 전에 아래 항목을 확인·완료한다.

### 0.1 운영 체크리스트 선행

| 항목 | 내용 | 완료 |
| :--- | :--- | :--- |
| Phase 0-4 | CTC Deposit Engine 환경변수, ctc-sweep 200 응답 | [ ] |
| Phase 1-1 | Shop 아이템 8종 시드 실행 (`npx tsx scripts/seed-shop-items.ts`) | [ ] |
| Phase 1-2 | (선택) 402 흐름 E2E 수동 검증 | [ ] |

**검증 스크립트**: `npx tsx scripts/verify-ctc-env.ts`, `npx tsx scripts/verify-shop-items.ts`

### 0.2 BondBase 연동 사전 확인

| 항목 | 내용 | 완료 |
| :--- | :--- | :--- |
| Character.bondBaseId | 춘심(chunsim)·리나(rina) bondBaseId 설정 | [ ] |
| ChocoConsumptionLog | 테이블 존재 및 마이그레이션 완료 | [ ] |
| 환경변수 | BONDBASE_API_URL, CHOONSIM_API_KEY 설정 | [ ] |
| bondbase-sync | GitHub Actions 또는 수동 호출 시 200 응답 | [ ] |

### 0.3 GitHub Actions / Cron

| 항목 | 내용 | 완료 |
| :--- | :--- | :--- |
| APP_URL | 춘심톡 배포 URL (GitHub Secrets) | [ ] |
| CRON_SECRET | Vercel `.env.production`과 동일값 | [ ] |
| ctc-sweep | 워크플로 200 성공 확인 | [ ] |

### 0.4 선행조치 요약

1. Shop 아이템 시드 실행 (선물 시뮬레이션에 필요)
2. 춘심·리나 Character.bondBaseId 설정 (`scripts/set-bondbase-id.ts` 또는 직접 DB)
3. bondbase-sync가 정상 동작하는지 수동 호출 확인
4. 운영 체크리스트(09_OPERATIONS_READINESS_CHECKLIST.md) Phase 0-4, 1-1 권장 선행

### 0.5 BondBase 진행 전 1번 확인 절차 (실행 가능)

아래를 순서대로 실행하여 각 항목을 확인한다.

| # | 확인 항목 | 실행/확인 방법 | 확인 |
|---|-----------|----------------|------|
| 1 | **Character.bondBaseId** | `cd apps/web && npx tsx scripts/set-bondbase-id.ts` 실행 후 출력에서 chunsim=101, rina=102 확인. 미설정이면 동 스크립트가 설정함. | [ ] |
| 2 | **Mock 유저·소비** | `npx tsx scripts/seed-mock-users.ts` → `npx tsx scripts/grant-mock-users-choco.ts` → `npx tsx scripts/run-mock-activity.ts` (최소 1회). ChocoConsumptionLog에 레코드 생성을 DB 또는 Admin에서 확인. | [ ] |
| 3 | **bondbase-sync 200** | `curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $CRON_SECRET" "$APP_URL/api/cron/bondbase-sync"` (CRON_SECRET, APP_URL을 실제 값으로 치환). 200이면 정상. | [ ] |
| 4 | **환경변수** | 프로덕션(Vercel 등)에 `BONDBASE_API_URL`, `CHOONSIM_API_KEY` 설정 여부 확인. 미설정 시 bondbase-sync는 200을 반환하지만 전송은 건너뜀(로그: "환경변수 미설정. 전송 건너뜀"). | [ ] |

- **코드/설정 검증 결과**: 스크립트·Cron 라우트·`lib/bondbase/client.server.ts` 참조 존재. `.env.example`에 BondBase 항목 추가됨.

### 0.6 배포 환경: Mock 유저 50명이 초코를 소비하지 않는 이유

**원인**: 배포 DB에 Mock 유저가 없음. `seed-mock-users.ts`는 로컬에서 `.env.development`(로컬 DB) 기준으로 실행되었고, **배포 DB를 대상으로 Mock 유저 시드를 한 적이 없음.**  
→ 배포 앱의 mock-grant·mock-activity는 배포 DB를 조회하므로 "Mock 유저 0명" → 지급·소비 0건.

**조치**: 배포 DB에 Mock 유저 50명을 **최소 1회** 시드. 배포 URL로 `GET /api/cron/mock-seed` (Authorization: Bearer {CRON_SECRET}) 1회 호출. 자세한 절차는 [10_MOCK_USER_IMPLEMENTATION_PLAN.md](../04_Logic_Progress/10_MOCK_USER_IMPLEMENTATION_PLAN.md#배포-환경-mock-유저가-초코를-소비하지-않는-이유) 참고.

### 0.7 BondBase에 CHOCO_CONSUMPTION이 0건일 때 (진단)

BondBase에 revenue가 한 건도 안 들어가면, **보낼 미전송 로그가 없는지** 먼저 확인한다.

| 방법 | 확인 내용 |
|------|-----------|
| **방법 1 (배포 앱)** | `GET /api/cron/bondbase-sync` 호출(Authorization: Bearer {CRON_SECRET}) 후 응답 `revenue.synced` 확인. 0이면 전송한 건 0건(미전송 로그 없음). |
| **방법 2 (DB)** | `npx tsx scripts/check-choco-consumption-log-sync.ts` 실행. isSynced=false 개수 확인. 0이면 보낼 데이터 없음. |
| **조치** | 미전송 로그가 없으면 `mock-grant` → `mock-activity` 실행해 ChocoConsumptionLog를 쌓은 뒤 bondbase-sync가 다음 주기에 전송하거나 수동 호출. |

**한 줄**: ChoonSim DB에 isSynced=false 로그가 있는지 확인하고, 없으면 mock-activity 등으로 로그를 쌓은 뒤 bondbase-sync가 보내는지 확인.

---

## 1. 개요

본 문서는 춘심톡 서비스에서 **Mock 유저 50명**을 생성하고, 초코(CHOCO)를 공급한 뒤 자동으로 채팅·아이템 구매·미션·선물 등 액션을 수행하며 초코를 소비하도록 하는 시뮬레이션의 **목적, 배경, 시나리오, 기대 효과**를 정의합니다.

---

## 2. 목적 및 배경

### 2.1 목적

- **경제 시뮬레이션**: 초코 유통·소비 패턴을 사전 검증
- **BondBase 연동 검증**: 춘심·리나 등 캐릭터별 초코 소비가 BondBase 수익 현황에 정상 반영되는지 확인
- **스테이징/데모**: 실제 유저 없이 서비스가 활발히 운영되는 것처럼 보이도록 데모 데이터 구성

### 2.2 배경

- 실제 유저 트래픽이 적은 초기/스테이징 환경에서 경제·투자 지표 검증이 어려움
- BondBase에 춘심·리나 bond별 수익 현황이 표시되려면 ChocoConsumptionLog 기반 소비 이벤트가 필요
- 수동 테스트 대비 자동화된 시뮬레이션으로 지속적인 검증이 필요

---

## 3. 시뮬레이션 시나리오

### 3.1 규모

| 항목 | 수치 |
| :--- | :--- |
| 테스트 기간 | 30일 |
| Mock 유저 수 | 50명 |
| 대상 캐릭터 | 춘심(chunsim), 리나(rina) |
| 초코 공급 | 유저당 5,000~10,000 CHOCO (조정 가능), **30일간 지속 지급** |

### 3.2 액션 유형

| 액션 | 초코 소비 | BondBase 반영 | 비고 |
| :--- | :--- | :--- | :--- |
| 채팅 | O (토큰 수/100 CHOCO) | O | characterId 귀속 |
| 선물 | O (아이템 가격 × 수량) | O | characterId 귀속 |
| 아이템 구매 | O | X | 캐릭터 귀속 없음 |
| 미션 클레임 | 지급 (보상) | X | 초코 증가 |

BondBase에 수익 현황이 보이려면 **채팅** 또는 **선물** 액션이 반드시 포함되어야 합니다.

### 3.3 실행 주기

- 수동 실행 또는 cron 주기적 실행 (예: 1시간마다)
- **테스트 기간 30일 동안 초코 지급 및 소비 시뮬레이션을 계속 수행**
- 반복 횟수/강도는 스테이징 환경 및 BondBase 부하에 맞춰 조절

---

## 4. 기대 효과

- 50명 Mock 유저가 춘심·리나와 채팅/선물을 수행하면 ChocoConsumptionLog가 characterId별로 적재됨
- bondbase-sync Cron이 characterId별 합산 후 BondBase sendRevenue 호출
- BondBase 대시보드에 춘심·리나 bond별 수익 현황이 표시됨
- 실제 유저 없이도 투자자·데모용으로 "유저들이 캐릭터에 투자 중"인 현황 시연 가능

---

## 5. 제약 및 주의사항

- **채팅**: 실제 AI API 호출 시 비용 발생. 서버 스크립트 방식에서는 토큰 사용량만 가상으로 생성하여 초코 차감만 시뮬레이션 가능
- **Mock 유저 식별**: `provider: "local"`, `email: "mock-{uuid}@test.local"` 등으로 실제 유저와 구분
- **Character.bondBaseId**: 춘심·리나의 bondBaseId가 설정되어 있어야 BondBase 전송 대상에 포함됨

---

## 6. 관련 문서

- [Mock 유저 시뮬레이션 기술 명세](../03_Technical_Specs/24_mock-user-simulation-spec.md) — 구현 방식, 스크립트 설계
- [Mock 유저 구현 계획](../04_Logic_Progress/10_MOCK_USER_IMPLEMENTATION_PLAN.md) — 단계별 구현 계획
- [00_BACKLOG](../04_Logic_Progress/00_BACKLOG.md) — 0-b. Mock 유저 50명 시뮬레이션
- [BondBase Bridge Plan](../04_Logic_Progress/06_BONDBASE_BRIDGE_PLAN.md) — ChocoConsumptionLog, bondbase-sync 연동
