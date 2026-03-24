# 미구현 UI 기능 구현 및 고도화 스펙 (Missing UI Features Spec)

> Created: 2026-02-22
> Updated: 2026-02-22
> Related Backlog: `docs/04_Logic_Progress/00_BACKLOG.md` (UI 정리 및 기능 세분화)

## 1. 개요 (Overview)

현재 어플리케이션(UI) 상에 버튼, 링크, 탭 등의 형태로 노출되어 있으나 실제 페이지 컴포넌트나 백엔드 로직이 연결되지 않은(Dead Link 또는 Placeholder 화면) 6개의 핵심 기능을 식별했습니다. 이 문서는 해당 기능들을 "어떻게 구현(How)"할 것인지에 대한 데이터·API 스키마 및 클라이언트 렌더링 명세서입니다.

해당 기능들은 3가지 Phase로 나누어 점진적으로 도입되어야 합니다.

---

## 2. Phase 1: 프로필 기능 고도화 (Profile Enhancement)

### 2.1 프로필 수정 (`/profile/edit`) ✅ 구현 완료 (2026-02-22)

> **커밋**: `31ec998 feat(profile): 프로필 수정 페이지 구현`

- **UI/UX**:
  - 본인의 아바타 미리보기 및 변경 (이미지 업로더 탑재, FileReader 로컬 preview → Cloudinary 업로드).
  - 닉네임 입력 폼(`user.name`) 및 상태 메시지(`user.bio`) 조작.
  - 저장 버튼: `useNavigation().state` 기반 "저장 중..." 로딩 표시 (Optimistic UI 미적용 → 서버 응답 후 리다이렉트 방식으로 대체).
  - `profile/index.tsx` 아바타 편집 버튼 onClick 연결 (`/profile/edit`).
- **실제 구현 방식** (원안 API Spec과 상이):
  - 별도 `PATCH /api/user/profile` 엔드포인트 대신, **React Router v7 route action** 패턴 사용.
  - Form 제출 → `action()` → Zod 검증 → `db.update(schema.user)` → `redirect("/profile")`.
  - 아바타 이미지는 기존 `/api/upload` 엔드포인트(Cloudinary) 재사용. 기존 이미지 교체 시 `deleteImage()` 호출.
- **Zod 검증 규칙**:
  - `name`: 필수, 1~20자
  - `bio`: 선택, 최대 100자
  - `avatarUrl`: 선택, URL 형식 또는 빈 문자열
- **DB Schema**:
  - `user.bio`, `user.avatarUrl`, `user.name` 모두 기존 스키마에 존재 → 마이그레이션 불필요.

### 2.2 저장된 순간들 (`/profile/saved`) ✅ 구현 완료 (2026-02-22)

> **커밋**: `feat(profile): 저장된 순간들(좋아요 내역) 페이지 구현`

- **UI/UX**:
  - 유저의 하트(북마크) 상호작용이 일어난 특정 메시지나 이미지 에셋들을 타임라인 뷰로 최신순 정렬 모아보기.
  - 다크 테마 기반의 모바일 친화적 List View UI (각 항목 우측에 핑크색 하트 아이콘 표시).
  - 빈 상태(`Empty State`) UI 지원 ("저장된 순간이 없어요").
- **구현 방식** (API 분리 대신 Route Loader 패턴 적용):
  - `profile/saved.tsx` 내부 `loader()` 함수에서 Drizzle ORM `db.select()`의 체이닝 `InnerJoin` 문법을 사용.
  - `messageLike` 기준 `message` 및 `conversation` 테이블, 그리고 `character`(이름 텍스트 매핑) 테이블 조인.
  - 1차 조회 후 결과셋의 독자적인 `characterId` 목록으로 `characterMedia(type="COVER")`를 2차 질의, In-memory Mapped 후 클라이언트로 Response 전송 (아바타 URL 매핑).
- **DB Schema**:
  - 기존 `messageLike` 테이블 활용 (`messageId`, `userId` 기반). 스키마 변경 불필요.

---

## 3. Phase 2: 코어 상점 및 시스템 알림 (Commerce & Notifications)

### 3.1 인앱 상점 (`/shop`) ✅ 구현 완료 (2026-02-22)

> **커밋**: `7e9c7eb feat(shop+notifications): Phase 2 인앱 상점 + 알림함 구현`

- **UI/UX**:
  - `home.tsx` 내 `Shop` 버튼 onClick → `navigate("/shop")` 연결 완료.
  - DB `item` 테이블 기준 `isActive=true` 아이템 목록 조회 및 2열 그리드 표시.
  - 아이템 썸네일(Material Symbols 아이콘), 설명, 가격(CHOCO), 바텀시트 구매 확정 모달(Double-check) 지원.
  - `useFetcher`로 `POST /api/items/purchase` 호출 → 성공 시 `toast.success` + 로컬 잔액 즉시 업데이트, 실패(잔액 부족 등) 시 `toast.error`.
  - 헤더 CHOCO 잔액 실시간 표시, 잔액 부족 아이템 버튼 비활성화.
  - 활성 아이템 없을 때 빈 상태("상점 준비 중") UI 지원.
- **실제 구현 방식** (원안 API Spec과 상이):
  - 카탈로그 별도 API 대신 **Route Loader 패턴** 사용 (`loader()`에서 DB 직접 조회).
  - 구매는 기존 `POST /api/items/purchase` 엔드포인트 재사용 (CHOCO 차감 + `userInventory` 증가 ACID 트랜잭션 보장).
- **DB Schema**:
  - `item` 테이블 (카탈로그 기본 정보) — 마이그레이션 불필요.
  - `userInventory` 테이블 (구매 획득 로그 및 잔여 아이템 처리) — 마이그레이션 불필요.

### 3.2 알림함 (`/notifications`) ✅ 구현 완료 (2026-02-22)

> **커밋**: `7e9c7eb feat(shop+notifications): Phase 2 인앱 상점 + 알림함 구현`

- **UI/UX**:
  - `home.tsx` 톱-오른쪽 `notifications` 버튼 onClick → `navigate("/notifications")` 연결 완료.
  - 미읽음 알림 수 > 0 일 때만 red dot badge 표시 (home loader에서 DB count 조회).
  - 알림 종류별 고유 색상 아이콘 표출: PAYMENT(녹색 credit_card), SYSTEM(파란 campaign), CHAT(보라 chat_bubble), PROMO(주황 local_offer).
  - 읽음/안읽음 항목 opacity 구분, 상대 시간 표시 (`"3분 전"` 형식).
  - "모두 읽음" 버튼 → route `action()`에서 일괄 업데이트 후 `useRevalidator`로 목록 갱신.
  - 알림 없을 때 빈 상태("아직 알림이 없어요") UI 지원.
- **실제 구현 방식** (원안 API Spec과 상이):
  - 별도 REST API 대신 **Route Loader + Action 패턴** 사용.
  - `api.payment.capture-order.ts` PayPal 결제 완료 트랜잭션 내 PAYMENT 알림 자동 생성 트리거 추가.
- **DB Schema**:
  - `Notification` 테이블 신설 완료 (`schema.ts` 추가 + Turso 마이그레이션 스크립트 `scripts/create-notification-table.mjs` 실행).
    - `id` (text, PK)
    - `userId` (text, NOT NULL)
    - `type` (text: SYSTEM | CHAT | PAYMENT | PROMO)
    - `title` (text, NOT NULL), `body` (text, NOT NULL)
    - `isRead` (integer/boolean, default: false)
    - `createdAt` (integer/timestamp, default: unixepoch())
    - 인덱스: `Notification_userId_isRead_idx`, `Notification_userId_createdAt_idx`

---

## 4. Phase 3: 캐릭터 미디어 확장 (Character Ambience)

### 4.1 캐릭터 보이스 탭 (Voice Tab) ✅ 구현 완료 (2026-02-22)

> **커밋**: `(Commit pending) feat(character): 캐릭터 보이스 및 갤러리 탭 구현`

- **UI/UX**:
  - `character/$id.tsx` 내부 `VoicePlayer` 사용자 정의 컴포넌트 추가 탑재.
  - 리스트 형태의 오디오 커스텀 플레이어 제공, 재생 시 아이콘 애니메이션 및 진행률(progress bar) 드래그/탐색 지원.
  - About 탭 內 하드코딩되었던 Mock Voice Preview 카드를 실제 데이터 기반의 `VoicePlayer` 로 교체 성공.
- **Data Flow**:
  - 기존 로더에서 불러온 `character.media` 목록 중 `type === "VOICE"` 속성을 가진 요소들을 클라이언트 필터링하여 매핑.

### 4.2 캐릭터 갤러리 탭 (Gallery Tab) ✅ 구현 완료 (2026-02-22)

> **커밋**: `(Commit pending) feat(character): 캐릭터 보이스 및 갤러리 탭 구현`

- **UI/UX**:
  - CSS Columns (`columns-2 break-inside-avoid`) 속성을 활용한 무경량 Masonry 그리드 레이아웃 구축.
  - 이미지 썸네일 클릭 시 전체 화면 모달(Lightbox) 팝업 제공, `z-index` 및 줌인 인터랙션 포함.
- **Data Flow**:
  - 기존 로더에서 불러온 `character.media` 목록 중 `type === "NORMAL"` 속성을 가진 요소들을 클라이언트 필터링하여 매핑.

---

## 5. 단계별 검증 및 완료 조건 (DoD: Definition of Done)

해당 3단계 작업을 수행할 때 반드시 다음 조건을 모두 불식시켜야 해당 Phase가 완료(Done) 처리됩니다.

1. **라우트 안정성**: `routes.ts`와 연결된 모든 메뉴가 페이지 이탈/404/새로고침 현상이 없어야 합니다.
2. **에러 핸들링**: 백엔드 API 요청 시 Zod 검증을 통과해야 하며 실패 시 UI 하단(Sonner Toast)에 명확한 한글 에러가 표시되어야 합니다.
3. **DB 트랜잭션 보장**: 특히 Phase 2의 상점(Shop) 기능 구현 및 포인트 차감 시에는 원자성(ACID)이 철저하게 보장되어야 합니다.
4. **End-to-End QA**: 로컬 개발이 완료된 이후, 프로덕션 URL과 클라우드 배포 상태에서 전체 프로세싱 시나리오가 끊어짐 없이 진행되어야 합니다.
