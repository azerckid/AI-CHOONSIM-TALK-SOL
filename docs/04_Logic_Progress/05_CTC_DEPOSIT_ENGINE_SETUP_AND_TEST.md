# Phase 0-4 CTC 입금 엔진: 환경변수 정리 및 로컬 테스트 절차

> Created: 2026-02-11
> Last Updated: 2026-03-13 (로컬 E2E 테스트 완료, Vercel 등록 완료)

**목적**: CTC 스윕 엔진(Deposit Engine) 배포 전 환경변수 설정과 로컬 E2E 테스트 절차를 체크리스트로 정리한다.

**관련 문서**: [03_BM_IMPLEMENTATION_PLAN.md](./03_BM_IMPLEMENTATION_PLAN.md) Phase 0-4

---

## 1. 환경변수 정리

### 1.1 필수·선택 구분

| 변수명 | 필수 | 설명 | 비고 |
|--------|------|------|------|
| `CTC_RPC_URL` | 필수 | CTC 메인넷(또는 테스트넷) RPC 엔드포인트 | 예: `https://rpc.creditcoin.network` (실제 URL은 Creditcoin 문서 확인) |
| `CTC_TREASURY_ADDRESS` | 필수 | 서비스 Treasury 지갑 주소 (스윕 수신용) | 0x... 형식. 유저 지갑에서 스윕된 CTC가 입금되는 주소 |
| `CRON_SECRET` | 필수 (배포 시) | Cron 엔드포인트 인증용 시크릿 | 로컬 테스트 시에도 동일 값 사용 권장. `Authorization: Bearer <값>` 또는 `X-Cron-Secret` 헤더 |
| `CTC_PRICE_API_URL` | 선택 | CTC/USD 시세 API URL | 미설정 시 입금 시 CHOCO 0 적립(스윕만 수행). GET 요청 후 JSON에서 `price` 또는 `usd` 숫자 필드 사용 |

- 스윕은 **유저의 `evmPrivateKey`**로 서명하므로, Treasury 쪽 프라이빗 키는 이 엔진에서 사용하지 않는다.

### 1.2 로컬 설정 (`.env.development` 또는 `.env`)

```
# Phase 0-4 CTC Deposit Engine
CTC_RPC_URL=https://...
CTC_TREASURY_ADDRESS=0x...
CRON_SECRET=your-secret-string
# 선택: 시세 API 있으면 설정
CTC_PRICE_API_URL=https://...
```

- `CRON_SECRET`은 로컬에서 Cron 엔드포인트를 수동 호출할 때 사용한다.

### 1.3 Vercel 배포 설정

- **Vercel 대시보드** → 프로젝트 → Settings → Environment Variables
- 위 네 변수를 **Production / Preview / Development** 중 필요한 환경에 추가
- `CRON_SECRET`은 강한 랜덤 문자열 권장 (노출 금지)

### 1.4 환경변수 체크리스트

- [x] `CTC_RPC_URL` 확보 및 로컬 `.env.development`에 추가 (`https://rpc.cc3-testnet.creditcoin.network`)
- [x] `CTC_TREASURY_ADDRESS` 확보 및 로컬 `.env.development`에 추가
- [x] `CRON_SECRET` 생성 후 로컬 `.env.development`에 추가
- [x] `CTC_PRICE_API_URL` 설정 (CoinGecko: `https://api.coingecko.com/api/v3/simple/price?ids=creditcoin-2&vs_currencies=usd`)
- [x] Vercel 대시보드에 위 변수 동일하게 추가 (Production/Preview/Development 3환경, 구 NEAR 변수 6종 제거 완료)

---

## 2. 로컬 테스트 절차

### 2.1 사전 조건

- 로컬 DB(Turso 또는 file)에 테스트용 유저가 있고, 해당 유저에 `evmAddress`, `evmPrivateKey`가 저장되어 있음
- CTC 테스트넷(또는 메인넷)에서 위 `evmAddress`로 소량 CTC를 입금할 수 있음 (지갑/파우셋 등 사용)
- `User.ctcLastBalance` 마이그레이션 적용 완료 (`npx tsx scripts/run-migration-0013.ts`)

### 2.2 테스트 흐름 요약

1. 테스트 유저의 CTC 잔액을 0으로 인지시키기 (선택: DB에서 `ctcLastBalance`를 현재 잔액과 동일하게 설정)
2. 해당 유저의 `evmAddress`로 CTC 소액 입금
3. Cron 엔드포인트 수동 호출 (`/api/cron/ctc-sweep`)
4. DB·로그에서 CHOCO 적립, TokenTransfer 기록, Treasury 스윕 여부 확인

### 2.3 단계별 절차

#### Step 1: 환경변수 로드 확인

```bash
cd apps/web
# .env.development 또는 .env 존재 여부 및 CTC_*, CRON_SECRET 확인
```

- [x] `CTC_RPC_URL`, `CTC_TREASURY_ADDRESS`, `CRON_SECRET`이 로드되는지 확인

#### Step 2: 테스트 유저 준비

- `npx tsx scripts/check-evm-users.ts` 로 evmAddress 보유 유저 확인

- [x] 테스트 유저: `azerckid@gmail.com` (`0x270C8983faa1025D0DBB0476C84116A4D394EC4A`)

#### Step 3: 입금 전 ctcLastBalance 맞추기 (선택)

- [x] ctcLastBalance=0 (기본값) 확인 완료

#### Step 4: CTC 소액 입금

- Creditcoin Discord `#token-faucet` 채널에서 `/faucet address:0x270C8983faa1025D0DBB0476C84116A4D394EC4A` 실행
- CC3 테스트넷 Faucet: `https://discord.gg/creditcoin` → `#token-faucet`

- [x] 10,000 CTC 입금 완료 (CC3 testnet faucet, 2026-03-13)

#### Step 5: Cron 엔드포인트 수동 호출

```bash
curl -X GET “http://localhost:5173/api/cron/ctc-sweep” \
  -H “Authorization: Bearer <CRON_SECRET>”
```

- [x] `{“ok”:true,”processed”:1,”errors”:0}` 응답 확인

#### Step 6: DB 및 결과 검증

- [x] User.chocoBalance 증가 확인 (5,000 → 1,559,740 CHOCO, CoinGecko $0.155/CTC 기준)
- [x] User.ctcLastBalance 갱신 확인 (→ “0”)
- [x] TokenTransfer COMPLETED 기록 확인 (txHash: `0x135feab3...`)
- [x] Treasury 주소 잔액 증가 확인 (블록 익스플로러)

### 2.4 로컬 테스트 체크리스트 (요약)

- [x] 환경변수 4종 로컬 설정
- [x] 테스트 유저(evmAddress 보유) 준비
- [x] CTC 소액 입금 실행 및 컨펌 확인
- [x] `/api/cron/ctc-sweep` 수동 호출 → 200 OK
- [x] CHOCO 적립, ctcLastBalance 갱신, TokenTransfer 기록, Treasury 입금 검증

---

## 3. 트러블슈팅 참고

| 현상 | 확인 사항 |
|------|-----------|
| Cron 401 Unauthorized | `CRON_SECRET`과 요청 헤더 값 일치 여부, 환경변수 로드 여부 |
| processed: 0 | `CTC_RPC_URL`/네트워크 접근, evmAddress·evmPrivateKey 보유 유저 존재 여부, 입금 트랜잭션 컨펌 여부 |
| CHOCO 0 적립 | `CTC_PRICE_API_URL` 설정 및 API 응답 형식(`price` 또는 `usd`), 또는 의도적으로 미설정 상태인지 |
| 스윕 실패(에러 로그) | 가스비 부족(잔액 일부 남겨두기), RPC 제한, Treasury 주소 유효성 |

---

## 4. Related Documents

- **Logic_Progress**: [03_BM_IMPLEMENTATION_PLAN.md](./03_BM_IMPLEMENTATION_PLAN.md) — Phase 0-4 CTC 스윕 엔진
- **Logic_Progress**: [00_BACKLOG.md](./00_BACKLOG.md) — 전체 백로그
