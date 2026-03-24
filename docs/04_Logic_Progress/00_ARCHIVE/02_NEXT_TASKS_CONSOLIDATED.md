# 다음 할 일 통합 정리 (Next Tasks Consolidated)

> Created: 2026-02-22
> Last Updated: 2026-02-22 (캐릭터 서비스 상태, Admin 404, 지갑 404 반영)

본 문서는 UI 정리 대상(01_UI_CLEANUP_LIST.md)과 백로그(00_BACKLOG.md)를 통합하여, 우선 처리할 다음 할 일을 정리한 실행 목록입니다.

---

## Part 1. UI/라우트 찌꺼기 정리

### 1.1 채팅 검색 라우트 (`/search`) ✅ 완료 (2026-02-22)

| 항목 | 내용 |
|------|------|
| **조치** | (B) 검색 버튼 제거 - `/chats` 상단 `/search` 링크 제거 |
| **결과** | 404 위험 제거, 검색 구현 시 버튼 재추가 예정 |

### 1.2 계정 탈퇴 로직 (`/settings`) ✅ 완료 (2026-02-22)

| 항목 | 내용 |
|------|------|
| **조치** | `POST /api/account/delete` API 구현, `deleteUserData()`로 FK 순서대로 전체 연관 데이터 삭제 |
| **결과** | settings 탈퇴 버튼 클릭 시 DB 삭제 후 signOut, `/login` 이동 |
| **구현 파일** | `routes/api/account/delete.ts`, `lib/account-delete.server.ts` |
| **참조** | [01_UI_CLEANUP_LIST.md](./01_UI_CLEANUP_LIST.md) Section 4 |

> **알려진 제한사항 (후속 보완 가능)**
> - `giftLog`: 탈퇴 유저가 **수신**한 선물 기록(`toUserId`) 미삭제 — 현재는 발신(`fromUserId`)만 삭제. 완전 삭제 정책 시 추가 필요.
> - `pushSubscription`: 웹 푸시 구독 테이블이 schema에 존재할 경우 삭제 목록 추가 필요.

### 1.3 기타 UI 정리 항목 ✅ 전체 완료 (2026-02-22)

> **커밋**: `31ec998`, `41e22bb`, `61dc93b` (Phase 1 + Phase 3)

| 구분 | 경로/위치 | 상태 |
|------|-----------|------|
| ~~ComingSoon~~ | `/profile/edit` | ✅ 프로필 수정 페이지 구현 완료 |
| ~~ComingSoon~~ | `/profile/saved` | ✅ 저장된 순간들(좋아요 내역) 페이지 구현 완료 |
| ~~Placeholder 탭~~ | `/character/:id` Voice | ✅ VoicePlayer 컴포넌트 + 실제 데이터 연동 완료 |
| ~~Placeholder 탭~~ | `/character/:id` Gallery | ✅ Masonry 그리드 + Lightbox 모달 구현 완료 |

---

## Part 2. 코어 비즈니스 로직 및 신규 기능

### 2.1 나만의 춘심 (Identity 커스텀 에디터)

| 항목 | 내용 |
|------|------|
| **목표** | 유료 아이템 구매 시 Identity / Soul / Heartbeat 및 캐릭터 이름을 유저가 직접 편집 가능 |
| **예정 내용** | 상점 "나만의 춘심" 아이템 구매 → 편집 기능 해금, 관련 데이터 스키마 및 API 설계 |
| **참조** | [00_BACKLOG.md](./00_BACKLOG.md) Upcoming #1 |

### 2.2 목소리로 대화하는 기능 (Live Voice Chat)

| 항목 | 내용 |
|------|------|
| **목표** | 텍스트 채팅을 넘어 마이크를 통한 AI와 실시간 음성 인터랙션 |
| **예정 내용** | Voice-to-Text, AI 응답 스트리밍, 실시간 음성 입출력 파이프라인 구현 |
| **참조** | [04_VOICE_INTERACTION_STRATEGY.md](../01_Concept_Design/04_VOICE_INTERACTION_STRATEGY.md), [00_BACKLOG.md](./00_BACKLOG.md) Upcoming #2 |

### 2.3 CTC EVM x402 기반 결제 생태계

| 항목 | 내용 |
|------|------|
| **현황** | NEAR → CTC EVM 마이그레이션 완료. PayPal/토스 기반 CHOCO 충전 + DB-only 잔액 차감 구조 가동 중 |
| **필요** | CTC EVM 스윕 엔진(0-4) 완료 및 5대 유료 아이템 카테고리별 스키마 정의 |
| **예정 내용** | CTC EVM x402 기반 마이크로 결제 프로토콜 설계, 기억 각인/나만의 춘심 에디터 연동 |
| **참조** | [19_MONETIZATION_STRATEGY.md](../01_Concept_Design/19_MONETIZATION_STRATEGY.md), [00_BACKLOG.md](./00_BACKLOG.md) Upcoming #4 |

### 2.4 캐릭터 서비스 상태 및 UI 정리 ✅ 완료 (2026-02-22)

| 항목 | 내용 |
|------|------|
| **캐릭터** | 춘심·Rina만 서비스 중, Mina/Yuna/Sora/Hana 준비 중 |
| **구현** | `isOnline` 플래그, api/chat/create 403 차단, 홈 Trending 회색 처리 |
| **스크립트** | `npm run characters:set-service` |

### 2.5 DB 리셋 및 클린 슬레이트 ✅ 완료 (2026-02-22)

| 항목 | 내용 |
|------|------|
| **조치** | `npm run db:reset` 스크립트 구현 - 전체 테이블 DELETE 후 캐릭터/미션 시드 재적재 |
| **실행** | `DB_RESET_CONFIRM=1 npm run db:reset` (Turso 원격 DB 시 확인 변수 필수) |
| **참조** | `apps/web/scripts/db-reset.ts`, [00_BACKLOG.md](./00_BACKLOG.md) Upcoming #5 |

---

## 우선순위 제안

| 순위 | 항목 | 근거 |
|------|------|------|
| ~~1~~ | ~~채팅 검색 `/search`~~ | ✅ 버튼 제거 완료 |
| ~~1~~ | ~~계정 탈퇴 로직~~ | ✅ API 및 UI 연동 완료 |
| ~~2~~ | ~~DB 리셋 및 클린 슬레이트~~ | ✅ db:reset 스크립트 완료 |
| 3 | 나만의 춘심 / Voice Chat / CTC EVM x402 결제 | 중장기 코어 기능 |
| ~~5~~ | ~~UI 찌꺼기 (ComingSoon/Placeholder)~~ | ✅ Phase 1~3에서 전체 완료 |

---

## Related Documents

- **Logic_Progress**: [00_BACKLOG.md](./00_BACKLOG.md) - 프로젝트 백로그
- **Logic_Progress**: [01_UI_CLEANUP_LIST.md](./01_UI_CLEANUP_LIST.md) - UI 정리 대상 목록
- **Concept_Design**: [04_VOICE_INTERACTION_STRATEGY.md](../01_Concept_Design/04_VOICE_INTERACTION_STRATEGY.md) - 목소리 대화 전략
- **Concept_Design**: [19_MONETIZATION_STRATEGY.md](../01_Concept_Design/19_MONETIZATION_STRATEGY.md) - 수익화 전략
- **Technical_Specs**: [22_MISSING_UI_FEATURES_SPEC.md](../03_Technical_Specs/22_MISSING_UI_FEATURES_SPEC.md) - 누락 UI 기능 명세
