# Shop 아이템 구현 우선순위 및 입력 가이드

> Created: 2026-03-03
> Last Updated: 2026-03-03 (Commit/배포 단위 섹션 추가)

**목적**: 수익화 전략(19_MONETIZATION_STRATEGY)에 따른 유료 아이템을 Admin에서 생성할 때의 **우선순위**, **이유**, **입력 스펙**을 정리하여 운영·개발이 동일한 기준으로 작업할 수 있게 한다.

**관련 문서**  
- [19_MONETIZATION_STRATEGY.md](../01_Concept_Design/19_MONETIZATION_STRATEGY.md) — 수익화 전략 및 아이템 카테고리  
- [03_BM_IMPLEMENTATION_PLAN.md](./03_BM_IMPLEMENTATION_PLAN.md) — Phase 1-1 Shop 아이템 데이터 입력

---

## 1. 우선순위 요약

| 순위 | 아이템명 | ID (필수) | type | priceChoco | 우선 처리 이유 |
|------|----------|-----------|------|------------|----------------|
| 1 | 기억 각인 티켓 | `memory_ticket` | MEMORY | 500 | 첫 유료 진입용. 전략상 최저가로 첫 결제 유도. 페이월 트리거 연동됨. |
| 2 | 보이스 티켓 | `voice_ticket` | VOICE | 500 | 페이월(생일 보이스 등)에 필수. TTS는 후순위 구현 가능. |
| 3 | 비밀 에피소드 해금 | `secret_episode` | EPISODE | 3,000 | 호감도 Lv.5 등 페이월과 1:1 매칭. 고가 핵심 상품. |
| 4 | 우정 앨범 생성 | `memory_album` | ALBUM | 2,000 | "대화 100회" 등 앨범 페이월 트리거와 연결. PDF 생성은 후순위. |
| 5 | 메시지 티켓 x10 | (자동 생성) | TICKET | 1,000 | 무료 소진 후 Soft Lock → 티켓 구매 플로우에 필요. |
| 6 | 메시지 티켓 x50 | (자동 생성) | TICKET | 4,500 | 번들 할인으로 단가 당 구매 유도. |
| 7 | 선톡 티켓 | (자동 생성) | PRESEND | 300 | 선톡 기능 구현 시 즉시 판매 가능. 재방문 루프용. |
| 8 | 하트 x10 | `heart` | HEART | 1,000 | 캐릭터에게 선물. 감정 소비 포인트. |

---

## 2. 우선순위 결정 근거

### 2.1 전략 문서와의 정합

- **19_MONETIZATION_STRATEGY** Section 5·심리적 구매 흐름:  
  첫 유료는 **기억 각인(500 CHOCO)** 으로 유도 → 이후 보이스·에피소드·앨범 순으로 감정 고점 결제.
- **PAYWALL_TRIGGER** 연동:  
  채팅 프론트엔드(`routes/chat/$id.tsx`)의 `PAYWALL_TRIGGER_CONFIG`가 아래 ID를 참조한다.  
  **해당 ID의 아이템이 DB에 없으면** 페이월 모달에서 조회 실패·오류가 발생한다.
  - `memory_ticket` — 기억 회상 트리거
  - `voice_ticket` — 생일 보이스 트리거
  - `secret_episode` — 비밀 에피소드 트리거
  - `memory_album` — 대화 앨범 트리거

### 2.2 순위별 이유

| 순위 | 이유 |
|------|------|
| 1~4 | 페이월용 **고정 ID 4종**을 먼저 생성해야 채팅 페이월이 정상 동작함. 전략상 1=기억 각인(첫 유료), 2=보이스, 3=비밀 에피소드, 4=앨범 순. |
| 5~6 | **메시지 티켓**은 무료 횟수 소진 후 "오늘의 대화 끝" → 티켓 구매로 이어지는 Soft Lock의 핵심. x10·x50으로 단일/번들 제공. |
| 7 | **선톡 티켓**은 선톡(캐릭터가 먼저 DM) 기능 구현 시 바로 판매 가능하도록 미리 등록. |
| 8 | **하트**는 "캐릭터에게 선물" 플로우와 전략 문서의 디지털 선물 항목과 맞춤. |

---

## 3. 아이템별 입력 스펙

**입력 경로**: `/admin/items/new`  
**공통**: `isActive: true` 로 생성. 필요 시 상세 설명은 Admin 설명란 또는 `description` 필드에 기입.

### 3.1 1순위 — 페이월 필수 (ID 고정)

| 아이템명 | ID | type | priceChoco | 설명 (참고) |
|----------|-----|------|------------|-------------|
| 기억 각인 티켓 | `memory_ticket` | MEMORY | 500 | 대화 영구 각인 1회. "이 기억, 영원히 간직할까?" 트리거. |
| 보이스 티켓 | `voice_ticket` | VOICE | 500 | 음성 메시지 1회. 생일 보이스 등 페이월 트리거. |
| 비밀 에피소드 해금 | `secret_episode` | EPISODE | 3,000 | 특별 시나리오 1회. "우리만의 비밀 이야기" 트리거. |
| 우정 앨범 생성 | `memory_album` | ALBUM | 2,000 | 월간 대화 앨범 생성. "우리 추억을 앨범으로" 트리거. |

- **ID는 반드시 위와 동일하게 입력.** 대소문자·언더스코어까지 일치해야 함.
- 가격은 프론트 `PAYWALL_TRIGGER_CONFIG`와 동일하게 두었으며, 운영 정책에 따라 Admin에서만 조정 가능.

### 3.2 5~6순위 — 메시지 티켓 (ID 자동 생성)

| 아이템명 | ID | type | priceChoco | 설명 (참고) |
|----------|-----|------|------------|-------------|
| 메시지 티켓 x10 | (비워둠) | TICKET | 1,000 | 대화 10회 추가. |
| 메시지 티켓 x50 | (비워둠) | TICKET | 4,500 | 대화 50회. 10% 할인 번들. |

- ID는 Admin에서 비워두면 자동 생성. 페이월 트리거와 매핑되지 않으므로 자동 생성으로 충분.

### 3.3 7~8순위 — 선톡·선물

| 아이템명 | ID | type | priceChoco | 설명 (참고) |
|----------|-----|------|------------|-------------|
| 선톡 티켓 | (비워둠) | PRESEND | 300 | 캐릭터가 먼저 DM 1회. |
| 하트 x10 | `heart` | HEART | 1,000 | 캐릭터에게 선물. |

- `heart`는 선물/하트 UI에서 참조할 수 있으므로 ID 고정 권장.

---

## 4. 구현(입력) 순서 — 운영 체크리스트

1. **1~4순위 (페이월 필수 4종)**  
   - [ ] `memory_ticket` — 기억 각인 티켓 (MEMORY, 500)  
   - [ ] `voice_ticket` — 보이스 티켓 (VOICE, 500)  
   - [ ] `secret_episode` — 비밀 에피소드 해금 (EPISODE, 3,000)  
   - [ ] `memory_album` — 우정 앨범 생성 (ALBUM, 2,000)  
   - [ ] `/shop` 에서 4종 노출 확인  
   - [ ] 채팅방에서 페이월 트리거 발생 시 해당 아이템으로 결제 모달·가격 정상 동작 확인  

2. **5~6순위 (메시지 티켓)**  
   - [ ] 메시지 티켓 x10 (TICKET, 1,000)  
   - [ ] 메시지 티켓 x50 (TICKET, 4,500)  
   - [ ] `/shop` 노출 및 무료 소진 후 구매 플로우(또는 Soft Lock UI)와 연동 확인  

3. **7~8순위**  
   - [ ] 선톡 티켓 (PRESEND, 300)  
   - [ ] 하트 x10 (`heart`, HEART, 1,000)  
   - [ ] `/shop` 노출 확인  

4. **공통**  
   - [ ] 모든 아이템 `isActive: true` 설정  
   - [ ] 필요 시 아이콘·설명(Admin 또는 `description`) 입력  

---

## 4.5 Commit / 배포 단위

우선순위대로 진행 시 커밋·배포를 끊는 기준.

| 단위 | 범위 | 시점 | 이유 |
|------|------|------|------|
| **1차** | 1~4순위 (페이월 필수 4종) | 4종 Admin 생성 완료 후 1회 배포·검증 | 페이월 플로우가 이 4종에 의존. 하나라도 없으면 해당 트리거에서 오류 발생 |
| **2차** | 5~6순위 (메시지 티켓) | 2종 Admin 생성 완료 후 | Soft Lock → 티켓 구매 흐름 단위 |
| **3차** | 7~8순위 (선톡·하트) | 2종 Admin 생성 완료 후 | 선톡·선물 기능 구현 전 아이템만 먼저 준비 |

- Admin 입력만 하는 경우: 코드 커밋 없이 체크리스트로 완료 표시.
- 시드/마이그레이션 스크립트 추가 시: 1차·2차·3차별로 커밋 분리 권장.
- 코드 수정이 섞이면: 데이터 작업과 코드 변경은 커밋 분리 권장.

### 4.6 시드 스크립트 (선택)

Admin UI 대신 일괄 입력할 때 사용:

```bash
cd apps/web && npx tsx scripts/seed-shop-items.ts
```

- `scripts/seed-shop-items.ts` — 8종 전체 upsert (ID 존재 시 업데이트)
- 메시지 티켓 ID: `ticket_msg_10`, `ticket_msg_50`
- 선톡 티켓 ID: `presend_ticket`

---

## 5. 주의 사항

- **ID 오타**: `memory_ticket`, `voice_ticket`, `secret_episode`, `memory_album` 중 하나라도 다르면 해당 트리거에서 아이템 조회 실패 가능. 배포 후 채팅 페이월 한 번씩 점검 권장.
- **가격 변경**: Admin에서만 변경 가능. 프론트 `PAYWALL_TRIGGER_CONFIG`의 `price`는 UI 표시용일 수 있으므로, 실제 검증·차감은 `api/items/purchase.ts`의 DB 조회(`priceChoco`) 기준임.
- **신규 페이월 트리거 추가 시**: 새 트리거용 ID를 정한 뒤 이 문서 3.1에 스펙을 추가하고, 동일 ID로 Admin에 아이템 생성 후 페이월 연동 테스트.

---

## 6. Related Documents

- **Concept_Design**: [19_MONETIZATION_STRATEGY.md](../01_Concept_Design/19_MONETIZATION_STRATEGY.md) — 수익화 전략 및 아이템 카테고리  
- **Logic_Progress**: [03_BM_IMPLEMENTATION_PLAN.md](./03_BM_IMPLEMENTATION_PLAN.md) — Phase 1-1 Shop 아이템 데이터 입력  
- **Logic_Progress**: [00_BACKLOG.md](./00_BACKLOG.md) — 전체 백로그  
- **구현 참조**: `apps/web/app/routes/chat/$id.tsx` — `PAYWALL_TRIGGER_CONFIG` itemId 매핑  
- **구현 참조**: `apps/web/app/routes/api/items/purchase.ts` — DB 아이템 조회 및 가격 검증  
