# 프로젝트 백로그 (Project Backlog)
> Created: 2026-02-08 17:59
> Last Updated: 2026-03-13 (Phase 0-4, 1-1, 1-2 완료; BondBase 연동 E2E 검증 완료 — revenue.synced:2, metrics.sent:2)

본 문서는 프로젝트의 현재 진행 상황과 향후 계획을 칸반 형태로 관리하는 실행 로직 문서입니다.

---

## 🏃 In Progress (진행 중)

> 현재 완료된 큰 작업 없음. 아래 Upcoming 항목 중 우선순위 선택 필요.

---

## 📅 Upcoming (예정)

### ~~0-a. 크론 작업 외부 스케줄러 마이그레이션~~ ✅ 완료 (2026-03-03)
- **방식**: GitHub Actions `schedule` 트리거 사용
- **완료 내역**:
  - `.github/workflows/bondbase-sync.yml` — 매시간 BondBase 수익 동기화
  - `.github/workflows/ctc-sweep.yml` — 10분마다 CTC EVM 스윕
  - GitHub Secrets: `CRON_SECRET`, `APP_URL` 등록 완료
  - HTTP Status 200 수동 테스트 확인 완료
- **관련 문서**: [07_GITHUB_ACTIONS_CRON_SETUP.md](./07_GITHUB_ACTIONS_CRON_SETUP.md)

### ~~0-d. BondBase 수익 연동~~ ✅ 완료 (2026-03-13)
- **완료 내역**:
  - [x] Phase A~E 전체 구현 (schema, 소비 로그, client, cron, metrics)
  - [x] `BONDBASE_API_URL` / `CHOONSIM_API_KEY` `.env.development` 등록
  - [x] 배포 Cron 수동 트리거 E2E 확인: `revenue.synced:2`, `metrics.sent:2`
  - [x] GitHub Actions `bondbase-sync.yml` 매시간 자동 실행 중
- **관련 문서**: [06_BONDBASE_BRIDGE_PLAN.md](./06_BONDBASE_BRIDGE_PLAN.md)

### ~~0-c. Phase 0-4 CTC 스윕 엔진 + 운영 검증~~ ✅ 완료 (2026-03-13)
- **완료 내역**:
  - [x] CoinGecko CTC 시세 파서 적용 (`deposit-engine.server.ts`)
  - [x] 환경변수 4종 로컬 설정 (`CTC_RPC_URL`, `CTC_TREASURY_ADDRESS`, `CRON_SECRET`, `CTC_PRICE_API_URL`)
  - [x] Vercel 3환경 등록 완료 (구 NEAR 변수 6종 제거)
  - [x] CC3 테스트넷 로컬 E2E: 10,000 CTC → 1,554,740 CHOCO 적립 → Treasury 스윕 확인
  - [x] Phase 1-1: Shop 8종 아이템 + 페이월 트리거 ID 4종 검증 완료
  - [x] Phase 1-2: chocoBalance=0 → HTTP 402 + X-x402-Invoice 헤더 정상 반환 확인
- **관련 문서**: [05_CTC_DEPOSIT_ENGINE_SETUP_AND_TEST.md](./05_CTC_DEPOSIT_ENGINE_SETUP_AND_TEST.md)

### ~~0-b. Mock 유저 50명 시뮬레이션~~ (30일 테스트) (2026-02-11)
- **목표**: 50명 Mock 유저 생성, 매일 초코 지급, 채팅·선물 차등 소비 → BondBase 수익 현황 검증
- **관련 문서**: [21_MOCK_USER_SIMULATION_PLAN.md](../01_Concept_Design/21_MOCK_USER_SIMULATION_PLAN.md), [10_MOCK_USER_IMPLEMENTATION_PLAN.md](./10_MOCK_USER_IMPLEMENTATION_PLAN.md)
- **완료 내역**:
    - [x] `scripts/seed-mock-users.ts` — Mock 유저 50명 생성
    - [x] `scripts/grant-mock-users-choco.ts` — 매일 초코 지급
    - [x] `scripts/run-mock-activity.ts` — 채팅·선물 차등 소비 시뮬레이션
    - [x] `app/lib/mock-users.server.ts` — Cron용 서버 로직
    - [x] `api/cron/mock-grant`, `api/cron/mock-activity` Cron API
    - [x] `.github/workflows/mock-grant.yml`, `mock-activity.yml` — 매일/매시간 실행

### 1. 나만의 춘심 (유료 아이템)
- **목표**: 유저가 구매한 아이템을 통해 Identity, Soul, Heartbeat를 직접 설정하고, 캐릭터 이름 변경 가능.
- **예정 내용**:
    - 유료 아이템 "나만의 춘심" 구매 시 Identity/Soul/Heartbeat 편집 기능 해금
    - 캐릭터 이름 변경 기능 포함
    - 작업 시점: 추후 진행

### 2. 목소리로 대화하는 기능
- **목표**: AI 캐릭터와 실시간 음성 대화 가능.
- **관련 문서**: `../01_Concept_Design/04_VOICE_INTERACTION_STRATEGY.md`

### 3. UI 정리 (준비 중/불필요 메뉴 처리)
- **목표**: ComingSoon 화면 및 placeholder 탭 정리, 미등록 라우트/미구현 기능 보완.
- **관련 문서**: [01_UI_CLEANUP_LIST.md](./01_UI_CLEANUP_LIST.md)
- **진행 상황**:
    - 프로필 수정(`/profile/edit`), 저장된 순간들(`/profile/saved`) 구현 완료
    - 캐릭터 상세 Voice/Gallery 탭 구현 완료
    - `/search` 라우트 링크 제거 완료
    - 계정 탈퇴 로직 구현 완료 (2026-02-22)

### 4. 유료 아이템 및 경제 시스템 설계
- **목표**: 서비스 지속성을 위한 5대 유료 아이템 카테고리 구체화 및 CTC EVM 기반 결제 UX 설계.
- **관련 문서**: `../01_Concept_Design/19_MONETIZATION_STRATEGY.md`
- **예정 내용**:
    - [ ] 5대 카테고리(소통, 콘텐츠, 커뮤니티, 관계, 구독)별 데이터 스키마 정의
    - [ ] CTC EVM x402 기반 마이크로 결제 프로토콜 설계
    - [ ] '기억 각인' 및 '나만의 춘심' 에디터 구현 계획 수립

### 5. 데이터베이스 리셋 및 스키마 클린업
- **목표**: 신규 유저 컨텍스트 5계층 아키텍처 및 수익화 모델을 위한 클린 슬레이트 확보.
- **완료 (2026-02-22)**:
    - [x] `db:reset` 스크립트 구현 (전체 테이블 DELETE, 시드 재적재)
    - [x] Turso 원격 DB 시 `DB_RESET_CONFIRM=1` 안전 확인 추가

---

## ✅ Completed (완료됨)

### 0. AI 응답 속도 최적화 (Vercel AI SDK 적용) (2026-02-11)
- **목표**: 스트리밍 응답 가독성 및 서버 부하 개선.
- **완료 내용**:
    - [x] Phase 1: ai, @ai-sdk/google 설치, ai-v2.server.ts 프로토타입
    - [x] Phase 2: USE_VERCEL_AI_SDK=true 시 streamAIResponseV2 사용, buildStreamSystemInstruction 공유
    - [x] Phase 3: 수동 타이핑 지연 제거 (문자 단위 setTimeout 제거)
- **활성화**: `.env`에 `USE_VERCEL_AI_SDK=true` 설정 시 V2 경로 사용 (이미지 첨부 시에는 기존 LangChain 경로 유지)

### 1. 안티그래비티 글로벌 표준 적용 및 문서 미세 조정 (2026-02-11)
- **목표**: AGENTS.md 및 최신 스킬 주입, 문서 5-Layer 표준화 정밀 교정.
- **작업 내용**:
    - [x] AGENTS.md 및 .agent/skills 글로벌 표준 업데이트
    - [x] docs/archive 보관함 단일화 (04_Logic_Progress/00_ARCHIVE/)
    - [x] 주요 문서 내 레이어 명칭 및 경로 최신화
    - [x] 전체 문서 상호 참조 가치 검증

### 2. 문서 체계 5계층 표준화 도입 (2026-02-08)
- [x] 디렉토리 구조 재편 (Concept_Design, UI_Screens, Technical_Specs, Logic_Progress, QA_Validation)
- [x] 레거시 폴더 정리 및 `09_DOCUMENT_MANAGEMENT_PLAN.md` 업데이트.

### 3. EVM 지갑 비동기 생성 구현 (2026-02-08)
- **목표**: 회원가입 시 CTC EVM 지갑 생성을 백그라운드 작업으로 전환하여 대기 시간 제거.

### 4. 사용자 컨텍스트 레이어 시스템 구축
- [x] Phase 1~10 시스템 아키텍처 및 API 구현 완료.

### 5. UI/운영 정리 및 캐릭터 서비스 상태 (2026-02-22)
- **지갑 생성 후 404**: wallet-setup 단순화, home 로더에서 지갑 생성 트리거
- **Admin 404**: `/admin` 접근 시 `/admin/dashboard` 리다이렉트 (`routes/admin/index.tsx`)
- **Admin 지정**: `scripts/set-admin.mjs` - 이메일로 role ADMIN 설정 (`npm run` via tsx)
- **캐릭터 서비스 상태**: 춘심·Rina만 서비스 중(isOnline=true), 나머지 준비 중
    - `lib/characters.ts` isOnline 동기화
    - `scripts/set-character-service.mjs` - DB 업데이트 (`npm run characters:set-service`)
    - `api/chat/create` 미서비스 캐릭터 403 차단
    - 홈 Trending Idols: 전체 표시, 미서비스 회색(grayscale), 춘심 1번·Rina 2번 정렬
    - 채팅 목록 새 대화: 미서비스 "준비 중" 표시 및 클릭 시 토스트
- **Fandom Lounge**: 춘심·Rina만 활성, 나머지 비활성(회색), 춘심 1번·Rina 2번 순서

### 6. i18n 영어 기본 및 Gallery 수정 (2026-02-22)
- **i18n (영어 기본)**:
    - i18next, react-i18next 도입, `app/lib/i18n.ts`, `useLocalizedCharacter` 훅
    - 영어 기본(fallback), 향후 한국어·일본어 추가 예정
    - 캐릭터명: 춘심 → Choonsim 등 영문 표기
    - 적용 범위: root ErrorBoundary, home, chat, character profile, fandom
- **Gallery 필터 수정**:
    - `character/$id.tsx` 갤러리: `type === "IMAGE"` → `type === "NORMAL"`
    - Admin Standard Gallery 업로드 사진이 캐릭터 프로필 Gallery 탭에 표시
    - `22_MISSING_UI_FEATURES_SPEC.md` 문서 동기화

### 7. Today's Pick 매일 교체 로직 (2026-02-22)
- **목표**: 활성 캐릭터 2명(Choonsim, Rina)이 매일 교체되어 노출
- **구현**:
    - `home.tsx` loader: Luxon `DateTime.now().setZone("Asia/Seoul").ordinal` 사용
    - 홀수일 → Choonsim, 짝수일 → Rina (ordinal % 2 기반)
    - `systemSettings.TODAYS_PICK_ID` 미사용 (날짜 기반으로 대체)

### 8. Mock 유저 50명 시뮬레이션 (2026-02-11)
- 스크립트 3종, Cron API (mock-grant, mock-activity), GitHub Actions 워크플로우
- [10_MOCK_USER_IMPLEMENTATION_PLAN.md](./10_MOCK_USER_IMPLEMENTATION_PLAN.md)

### 9. CTC EVM 마이그레이션 완료 (2026-02-11)
- NEAR → CTC EVM 전환 완료. UI/코드/스키마에서 NEAR 잔여 제거, lib/ctc/ 이전 완료.

---

## Related Documents
- **Concept_Design**: [Roadmap](../01_Concept_Design/02_ROADMAP.md) - 중장기 프로젝트 목표
- **Concept_Design**: [Document Management Plan](../01_Concept_Design/09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 표준
- **QA_Validation**: [Verification Reports](../05_QA_Validation/00_ARCHIVE/08_PHASE_1_TO_5_COMPLETE_VERIFICATION.md) - 이전 단계 완료 검증서
- **QA_Validation**: [Cross-Reference Verification](../05_QA_Validation/00_ARCHIVE/24_CROSS_REFERENCE_VERIFICATION.md) - 문서 상호 참조 검증 보고서
