# Mock 유저 50명 구현 계획

> Created: 2026-03-05
> Last Updated: 2026-02-11

**목적**: 50명 Mock 유저 생성, 매일 초코 지급, 차등 소비 시뮬레이션을 통해 30일간 BondBase 수익 현황 검증.

**관련 문서**:
- [21_MOCK_USER_SIMULATION_PLAN.md](../01_Concept_Design/21_MOCK_USER_SIMULATION_PLAN.md) — 기획
- [24_mock-user-simulation-spec.md](../03_Technical_Specs/24_mock-user-simulation-spec.md) — 기술 명세

---

## 사전 조건

기획문서 [0. 점검 사항 및 선행조치](../01_Concept_Design/21_MOCK_USER_SIMULATION_PLAN.md#0-점검-사항-및-선행조치) 완료 후 진행.

---

## 구현 단계

### Phase 1. Mock 유저 생성 스크립트

| 항목 | 내용 |
| :--- | :--- |
| **파일** | `apps/web/scripts/seed-mock-users.ts` |
| **기능** | User, account, session 50명 삽입 |
| **식별** | `provider: "local"`, `email: "mock-{uuid}@test.local"` |
| **초기 지급** | chocoBalance = 5000~10000 CHOCO (조정 가능) |

### Phase 2. 초코 일일 지급 스크립트

| 항목 | 내용 |
| :--- | :--- |
| **파일** | `apps/web/scripts/grant-mock-users-choco.ts` |
| **기능** | Mock 유저 50명 chocoBalance 업데이트 |
| **실행** | 30일 테스트 기간 동안 매일 cron 또는 수동 실행 |

### Phase 3. 소비 시뮬레이션 스크립트

| 항목 | 내용 |
| :--- | :--- |
| **파일** | `apps/web/scripts/run-mock-activity.ts` |
| **기능** | 채팅(deductChocoForTokens), 선물(gift 로직) 차등 소비 |
| **차등** | 유저별 소비량 랜덤/가중치 적용 — 춘심·리나 귀속 |
| **실행** | 30일간 주기 실행 |

### Phase 4. 실행 자동화

| 항목 | 내용 |
| :--- | :--- |
| **방식** | GitHub Actions |
| **스케줄** | 초코 지급: 매일 00:00 UTC (`mock-grant.yml`), 소비 시뮬레이션: 매시간 (`mock-activity.yml`) |
| **Cron API** | `api/cron/mock-grant`, `api/cron/mock-activity` (CRON_SECRET 인증) |
| **서버 로직** | `app/lib/mock-users.server.ts` (grantMockUsersChoco, runMockActivity) |

---

## 완료 기준

- [x] seed-mock-users.ts 실행 → 50명 생성 (`npm run mock:seed`)
- [x] grant-mock-users-choco.ts 실행 → 초코 지급 확인 (`npm run mock:grant`)
- [x] run-mock-activity.ts 실행 → ChocoConsumptionLog 적재 (`npm run mock:activity`)
- [ ] bondbase-sync 동작 → BondBase Revenue 전송 확인
- [x] 30일간 주기 실행 설정 (GitHub Actions: mock-grant.yml, mock-activity.yml)

## 실행 예시

```bash
cd apps/web
npm run mock:seed       # 50명 생성
npm run mock:grant      # 일일 초코 지급 (CHOCO_PER_USER=3000 기본)
npm run mock:activity   # 채팅 소비 시뮬레이션 (ROUNDS=5 등)
```

---

## 배포 환경: Mock 유저가 초코를 소비하지 않는 이유

**원인**: `seed-mock-users.ts`는 **로컬에서 실행하는 스크립트**이며, 기본적으로 `.env.development`(로컬/개발 DB)를 사용한다. **배포(프로덕션) DB에는 Mock 유저 50명을 시드하는 절차가 별도로 없다.**

| 구분 | 동작 |
|------|------|
| mock-grant / mock-activity (Cron API) | GitHub Actions가 **배포 URL**을 호출 → 배포 앱은 **배포 DB**를 사용. |
| 배포 DB에 `email LIKE 'mock-%@test.local'` 유저 수 | **0명** (시드 스크립트를 배포 DB 대상으로 실행한 적 없음) |
| 결과 | mock-grant가 찾는 Mock 유저 0명 → 지급 0건. mock-activity가 찾는 Mock 유저 0명 → 소비 0건, ChocoConsumptionLog 0건. |

**조치**: **배포 DB에 Mock 유저 50명을 최소 1회 시드해야 한다.**

- **방법 (권장)**: 배포 URL로 `GET /api/cron/mock-seed` (Header: `Authorization: Bearer {CRON_SECRET}`) 1회 호출. 배포 DB에 Mock 유저 50명 생성. 이미 50명 이상이면 추가하지 않음.
- **방법 A (대안)**: 프로덕션 DB 연결 정보(`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`)를 사용해 로컬 또는 CI에서 `npx tsx scripts/seed-mock-users.ts` 실행. (실행 시 `dotenv`가 `.env.development`를 읽지 않도록, 프로덕션용 env 파일을 지정하거나 환경변수를 직접 넣어 실행.)
- “Mock 유저 시드 1회”용 Cron 또는 관리자 API를 두고, 배포 URL로 1회만 호출해 배포 DB에 50명 생성.

이후 mock-grant·mock-activity 워크플로가 배포 URL을 호출하면 배포 DB에 Mock 유저가 있으므로 초코 지급·소비가 이루어지고, ChocoConsumptionLog가 쌓여 bondbase-sync가 BondBase로 전송할 수 있다.
