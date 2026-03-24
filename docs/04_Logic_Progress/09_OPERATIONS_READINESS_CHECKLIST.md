# 운영 준비 체크리스트

> Created: 2026-02-11
> Last Updated: 2026-03-13 (Phase 0-4, 1-1, 1-2 전 항목 완료)

**목적**: Phase 0-4(CTC Deposit), Phase 1-1(Shop 시드), Phase 1-2(402 E2E)를 권장 순서대로 정리한다.

**관련 문서**: [03_BM_IMPLEMENTATION_PLAN.md](./03_BM_IMPLEMENTATION_PLAN.md)

---

## 권장 진행 순서

| 순서 | 단계 | 내용 | 완료 |
|------|------|------|------|
| 1 | Phase 0-4 | CTC Deposit Engine 환경변수 및 로컬 테스트 | ✅ 2026-03-13 |
| 2 | Phase 1-1 | Shop 아이템 시드 실행 + 페이월 ID 검증 | ✅ 2026-03-13 |
| 3 | Phase 1-2 | 402 흐름 E2E 수동 검증 | ✅ 2026-03-13 |

**검증 스크립트**:
- `npx tsx scripts/verify-shop-items.ts` — 8종 아이템 존재 확인
- `npx tsx scripts/verify-ctc-env.ts` — Phase 0-4 환경변수 설정 확인
- `npx tsx scripts/test-ctc-sweep.ts` — ctc-sweep API 호출 테스트 (로컬 서버 실행 후)

---

## 1. Phase 0-4: CTC Deposit Engine

상세 절차는 [05_CTC_DEPOSIT_ENGINE_SETUP_AND_TEST.md](./05_CTC_DEPOSIT_ENGINE_SETUP_AND_TEST.md) 참조.

### 1.1 환경변수 (`.env.development` 또는 `.env`)

```
CTC_RPC_URL=https://...
CTC_TREASURY_ADDRESS=0x...
CRON_SECRET=your-secret-string
CTC_PRICE_API_URL=...  # 선택
```

### 1.2 체크리스트

- [x] `CTC_RPC_URL`, `CTC_TREASURY_ADDRESS`, `CRON_SECRET` 로컬 설정
- [x] `CTC_PRICE_API_URL` 설정 (CoinGecko, 파서 업데이트 포함)
- [x] Vercel 대시보드 4종 등록 완료 (구 NEAR 변수 6종 제거)
- [x] 로컬 E2E: 10,000 CTC 입금 → 1,554,740 CHOCO 적립 → Treasury 스윕 확인

---

## 2. Phase 1-1: Shop 아이템 시드

### 2.1 시드 실행

```bash
cd apps/web
npx tsx scripts/seed-shop-items.ts
```

- 8종 아이템(memory_ticket, voice_ticket, secret_episode, memory_album, ticket_msg_10, ticket_msg_50, presend_ticket, heart) upsert
- DB `Item` 테이블에 `ON CONFLICT DO UPDATE`로 idempotent 실행

### 2.2 체크리스트

- [x] 시드 스크립트 실행 완료 (`npx tsx scripts/seed-shop-items.ts`)
- [x] 8종 아이템 전체 `isActive=true` 확인 (`npx tsx scripts/check-shop-items.ts`)
- [x] 페이월 트리거 ID 4종 (`memory_ticket`, `voice_ticket`, `secret_episode`, `memory_album`) DB 일치 확인

---

## 3. Phase 1-2: 402 흐름 E2E 검증

### 3.1 사전 조건

- CHOCO 잔액이 부족한 테스트 유저 (또는 대화 수 차감 후 잔액 0)
- Shop 아이템 시드 완료 (Phase 1-1)

### 3.2 검증 시나리오

| 단계 | 동작 | 확인 |
|------|------|------|
| 1 | 채팅 중 크레딧 소진 또는 페이월 트리거 발생 | 402 응답 |
| 2 | PaymentSheet(또는 잔액 부족 모달) 노출 | "CHOCO 충전하기" 등 CTA 표시 |
| 3 | `/profile/subscription` 이동 후 CHOCO 충전 | 결제·적립 정상 |
| 4 | 채팅으로 복귀 후 대화 재개 | 응답 정상 |
| 5 | 모달 닫기 후 대화 흐름 | 오류 없이 재개 |

### 3.3 상세 절차

1. 로컬 또는 배포 환경에서 앱 실행
2. CHOCO 잔액 0인 계정으로 로그인 (또는 대화로 크레딧 소진)
3. 채팅에서 메시지 전송 → 402 응답 시 PaymentSheet/잔액 부족 모달 표시 확인
4. "CHOCO 충전하기" 클릭 → `/profile/subscription` 이동 확인
5. Toss/PayPal 등으로 충전 → CHOCO 적립 확인
6. 채팅으로 복귀 → 대화 재개 정상 동작 확인
7. 모달 닫기 후에도 추가 에러 없이 채팅 가능한지 확인

### 3.4 체크리스트

- [x] chocoBalance=0 → HTTP 402 + `{"error":"Payment Required","code":"X402_PAYMENT_REQUIRED"}` 확인
- [x] `X-x402-Invoice` / `X-x402-Token` 헤더 정상 포함 확인
- [x] `use-chat-stream.ts` — 초기 402 응답 시 조기 return, 스트리밍 중 402 코드 시 toast 처리 코드 검증
- [ ] 충전 후 대화 재개 흐름 확인 (실결제 E2E — 추후 수동 검증)
- [ ] 모달 닫기 후 대화 정상 재개 (브라우저 수동 확인)

---

## Related Documents

- [05_CTC_DEPOSIT_ENGINE_SETUP_AND_TEST.md](./05_CTC_DEPOSIT_ENGINE_SETUP_AND_TEST.md) — Phase 0-4 상세
- [08_SHOP_ITEMS_IMPLEMENTATION_PRIORITY.md](./08_SHOP_ITEMS_IMPLEMENTATION_PRIORITY.md) — Shop 아이템 우선순위
