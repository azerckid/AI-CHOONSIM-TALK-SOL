# NEAR Deposit Engine 후속 작업 및 NEAR 사용 정리
> Created: 2026-02-08
> Last Updated: 2026-02-08

본 문서는 다음 두 가지를 다룬다.  
(1) **후속 작업**: NEAR 입금·스윕 모니터링 및 deposit-engine 관련 로그에서 확인된 작업 목록 (deprecation, sweep 실패, 모니터링 오류).  
(2) **NEAR 사용 정리**: 이 프로젝트에서 NEAR 지갑·CHOCO 토큰·토큰 소비가 어떻게 쓰이는지 요약.

---

## 0. NEAR·CHOCO 개요

| 구분 | 설명 |
|------|------|
| **지갑** | 유저별 NEAR 서브계정 (`{nanoid}.{serviceAccountId}`). 생성 시 키는 DB 저장, 서비스 계정이 온체인 생성·초기 CHOCO 지급. |
| **토큰** | CHOCO (NEP-141). 컨트랙트 `CHOCO_TOKEN_CONTRACT` (기본 `choco.token.primitives.testnet`). 서비스 계정이 발신·수신에 관여. |
| **토큰 소비** | 채팅 시 CHOCO 차감(온체인 반환), 아이템 구매, X402 결제(잔액 부족 시). 구독/결제(PayPal·Toss 등) 시 CHOCO 지급. |

---

## 1. NEAR JS SDK Deprecation 대응

| 현재 API (deprecated) | 대체 API | 비고 |
|----------------------|----------|------|
| `Account.sendMoney()` | `Account.transfer()` | 다음 메이저 버전에서 제거 예정 |
| `Account.signAndSendTransactionLegacy()` | `Account.signAndSendTransaction()` | 동일 |
| `Account.signTransaction()` | `Account.createSignedTransaction()` | `@near-js/providers` 내부 사용 |

**대상 파일**: `app/lib/near/deposit-engine.server.ts` (라인 225 근처)

**작업 내용**  
- 위 deprecated 메서드를 대체 API로 교체.
- 교체 후 로컬/테스트넷에서 스윕·입금 모니터링 동작 검증.

---

## 2. Sweep 실패(transient error) 조사

**현상**  
- 동일 스윕(예: 0.07818 NEAR → treasury `rogulus.testnet`)이 반복 실패.
- 로그: `Sweep failed for user <userId> due to transient error`
- `Found 26 failed or pending sweeps. Retrying...` 로 재시도 루프 동작.

**조사 항목**  
- Transient error의 구체 원인 (RPC 지연, 가스 부족, 네트워크/테스트넷 상태 등).
- 재시도 정책(횟수, 간격, 백오프)이 적절한지 검토.
- 26건 failed/pending이 계속 쌓이는지, 일부는 성공으로 정리되는지 확인.

**산출**  
- 원인 정리 및 필요 시 재시도/로깅/알림 개선.

---

## 3. 특정 유저 NEAR 입금 모니터링 오류 조사

**현상**  
- 로그: `Error monitoring user VVJ9cxAELl5zO0yhUTDiMvIuJxEXvCuZ for NEAR deposits`
- 해당 유저에 대해 입금 모니터링 단계에서 오류 발생.

**조사 항목**  
- 오류 메시지/스택 전체 확인 (모니터링 로직 내 catch·로그 위치).
- RPC 조회 실패, 계정/키 권한, 계정 상태(삭제/병합 등) 여부.
- 동일 오류가 다른 유저에게도 발생하는지 패턴 확인.

**산출**  
- 원인 문서화 및 필요 시 예외 처리·재시도 또는 스킵 정책 정리.

---

## 4. 회원가입 후 NEAR 지갑 생성 및 이후 흐름 (참고)

### 4.1 회원가입 시점

- NEAR 지갑은 **가입 시점에 생성되지 않음**.
- `app/routes/signup.tsx`: 이메일/비밀번호 가입 후 성공 시 **`/home`으로만 이동**.
- 지갑 생성은 **가입 직후가 아니라, 첫 로그인 후 홈 접속 시** 이어지는 단계에서 수행됨.

### 4.2 가입 후 첫 접속 ~ 지갑 생성

| 단계 | 동작 |
|------|------|
| 1 | 가입 후 `/home` 이동(또는 로그인 후 `/home` 접속). |
| 2 | `home` loader에서 `user.nearAccountId` 조회. **없으면** `/wallet-setup`으로 **리다이렉트**. |
| 3 | **`/wallet-setup`** 로드 시 자동 POST → 서버 `ensureNearWallet(session.user.id)` 호출. |
| 4 | **지갑 생성** (`app/lib/near/wallet.server.ts`): 서비스 계정의 서브계정 생성 (`{nanoid}.{serviceAccountId}`), 키는 DB 저장, 온체인 계정 생성, 가입 축하 CHOCO 전송, 잔액 동기화. |
| 5 | 성공 시 클라이언트에서 **`/home`으로 이동**. |

지갑 ID는 이메일이 아니라 **서비스 계정 하위 랜덤 서브계정** (`{nanoid}.{serviceAccountId}`) 형식.

### 4.3 지갑 생성 이후

| 구분 | 내용 |
|------|------|
| **홈** | `nearAccountId`가 있으면 `/home` 정상 표시. 없으면 `/wallet-setup`으로 리다이렉트. |
| **채팅** | `app/routes/chat/$id.tsx`에서 `user?.nearAccountId` 확인. 없으면 `/wallet-setup`으로 리다이렉트. 있으면 채팅 가능. |
| **CHOCO 사용** | 채팅 비용 차감, 아이템 구매, 구독/결제 시 CHOCO 지급 등 모두 해당 유저의 **NEAR 서브계정(nearAccountId)** 기준으로 처리. |
| **NEAR 입금** | 유저가 자신의 `nearAccountId`로 NEAR를 입금하면 **deposit-engine**이 입금을 모니터링·스윕·CHOCO 전환 등 후속 처리. |

### 4.4 참조 코드

- 지갑 생성: `app/lib/near/wallet.server.ts` (`ensureNearWallet`)
- 지갑 설정 페이지: `app/routes/wallet-setup.tsx`
- 홈/채팅에서 지갑 체크: `app/routes/home.tsx`, `app/routes/chat/$id.tsx`

### 4.5 지갑 생성 대기 시 UX

모달이 아닌 **전용 전체 화면 로딩 페이지** (`/wallet-setup`)에서 대기한다.  
대상: `app/routes/wallet-setup.tsx`.

**대기 중 표시 요소**

| 요소 | 내용 |
|------|------|
| **스피너** | 중앙 `LoadingSpinner` (primary 색). 로딩 중일 때만 표시. |
| **제목** | "Setting up Wallet" / "Blockchain initialization" |
| **진행 문구 (로테이션)** | 4개 문구가 **3초마다** 순서대로 변경됨. |
| ① | 회원님만을 위한 안전한 블록체인 지갑을 생성 중입니다... |
| ② | 가입 축하금 100 CHOCO를 지갑에 전송하고 있습니다... |
| ③ | NEAR 네트워크와 데이터를 동기화하는 중입니다... |
| ④ | 거의 다 되었습니다. 곧 초춘심과의 대화가 시작됩니다! |
| **대기 시간 안내** | 블록체인 네트워크 상황에 따라 약 **10~20초** 소요될 수 있음. 창을 닫지 말고 기다리라는 안내 문구. |
| **배경** | 어두운 배경 + primary 블러 글로우. 로딩 중 글로우에 `animate-pulse` 적용. |

**결과 처리**

- **성공**: `fetcher.data?.success` 시 `window.location.href = "/home"` 으로 홈 이동.
- **실패**: 스피너 대신 경고 아이콘(⚠️), "앗! 문제가 발생했습니다" + 에러 메시지 + **다시 시도하기** 버튼 노출.

요약: 모달이 아니라 **전체 화면 로딩**이며, 스피너와 3초 간격 로테이션 진행 문구·예상 소요 시간(10~20초)·창 유지 안내로 "지갑 생성 중"임을 알린다.

### 4.6 CHOCO를 보내는 지갑(서비스 계정) 정보 출처

지갑 생성 후 가입 축하 CHOCO를 보내는 쪽은 **서비스 계정** 하나이며, 계정 정보는 **환경 변수**에서만 읽는다.

**사용 위치**

- 지갑 생성 직후 CHOCO 전송: `app/lib/near/wallet.server.ts` → `sendChocoToken(newAccountId, chocoAmountRaw)`
- 전송 구현: `app/lib/near/token.server.ts` → 서비스 계정으로 `ft_transfer` 호출

**서비스 계정(CHOCO 발신 지갑) 정보**

| 항목 | 출처 | 비고 |
|------|------|------|
| **계정 ID** | `process.env.NEAR_SERVICE_ACCOUNT_ID` | 미설정 시 기본값 `"rogulus.testnet"` |
| **비밀키(서명용)** | `process.env.NEAR_SERVICE_PRIVATE_KEY` | 반드시 설정. 코드/문서에 노출 금지. |

**코드 정의·사용**

- `app/lib/near/client.server.ts`: `NEAR_CONFIG.serviceAccountId = process.env.NEAR_SERVICE_ACCOUNT_ID || "rogulus.testnet"`. `getNearConnection()`에서 위 두 env를 읽어 KeyStore에 세팅.
- `app/lib/near/wallet.server.ts`: `NEAR_CONFIG.serviceAccountId`, `process.env.NEAR_SERVICE_PRIVATE_KEY`로 서비스 계정 접근 후 계정 생성·CHOCO 전송.
- `app/lib/near/token.server.ts`: `getNearConnection()`으로 이미 서비스 계정 키가 세팅된 연결 사용, `near.account(NEAR_CONFIG.serviceAccountId)`로 `sendChocoToken` 수행.

요약: CHOCO를 보내는 지갑 = **서비스 계정**. 계정 ID·비밀키는 **환경 변수**(`.env` 등)에만 두고, 코드에는 기본값(계정 ID만) 외 노출하지 않는다.

---

## 5. 토큰(CHOCO) 소비 경로

| 경로 | 설명 | 참조 |
|------|------|------|
| **채팅** | 최소 필요 CHOCO 10 (약 1회 분량). 스트리밍 완료 후 토큰 사용량에 따라 CHOCO 차감(1,000 토큰 ≈ 10 CHOCO). 차감분은 유저 지갑에서 **서비스 계정으로 온체인 반환** (ft_transfer). 부족 시 402 + X402 인보이스. | `app/routes/api/chat/index.ts` |
| **아이템 구매** | 구매 시 CHOCO 차감·온체인 전송 (서비스 계정 수신). | `app/routes/api/items/purchase.ts` |
| **X402 결제** | CHOCO 잔액 부족 시 402 응답. 인보이스 생성 ($0.1 = 100 CHOCO 등), 수신 주소 = 서비스 계정. 클라이언트가 결제 후 트랜잭션 해시로 검증. | `app/lib/near/x402.server.ts`, `app/lib/near/silent-payment.server.ts` |
| **CHOCO 지급** | 가입 축하(지갑 생성 시), 구독/결제(PayPal·Toss·capture-order·activate-subscription) 시 서비스 계정에서 유저 지갑으로 CHOCO 전송. | `wallet.server.ts`, `toss.server.ts`, `api.webhooks.paypal.ts`, `api.payment.capture-order.ts` 등 |
| **Gasless / Relayer** | 유저가 NEAR(가스비) 없이 CHOCO 전송 가능. (1) **Relayer**: 클라이언트가 서명한 SignedDelegate를 POST `/api/relayer/submit`으로 제출, 서비스 계정이 가스비 부담 후 온체인 제출. PaymentSheet에서 X402 결제 시 기본 사용. (2) **서버 측 Gasless**: 채팅 차감 시 `returnChocoToService` → `sendGaslessChocoToken`으로 유저 CHOCO를 서비스 계정으로 반환, 가스비는 서비스 계정 부담. | `app/lib/near/relayer.server.ts`, `app/lib/near/token.server.ts`, `app/routes/api/relayer/submit.ts`, `app/components/payment/PaymentSheet.tsx` |

---

## 6. NEAR 입금 → CHOCO 전환 및 스윕

**deposit-engine** (`app/lib/near/deposit-engine.server.ts`)이 주기적으로 다음을 수행한다.

1. **입금 감지**: `nearAccountId`가 있는 유저의 NEAR 잔액을 조회. 이전 잔액(`nearLastBalance`) 대비 증가분이 0.01 NEAR 이상이면 입금으로 간주.
2. **시세·환전**: `exchange-rate.server.ts`로 NEAR/USD 시세 조회 (CoinGecko 등). 실패 시 고정 비율(예: 5000 CHOCO/NEAR). NEAR 입금량 × 비율 = CHOCO량.
3. **CHOCO 전송**: 서비스 계정이 유저 `nearAccountId`로 CHOCO 전송 (`sendChocoToken`). DB `chocoBalance`, `nearLastBalance` 갱신. `ExchangeLog`에 PENDING_SWEEP 기록.
4. **스윕**: 유저 지갑의 NEAR를 **트레저리**로 회수. 스윕 대상 계정 = `NEAR_TREASURY_ACCOUNT_ID` (미설정 시 `rogulus.testnet`). 유저의 `nearPrivateKey`로 서명. 0.02 NEAR 이상만 스윕, 나머지는 가스 등으로 유지.

**서비스 계정 vs 트레저리**  
- **서비스 계정**: CHOCO 발신·수신, 지갑 생성, storage deposit 등. `NEAR_SERVICE_ACCOUNT_ID` + `NEAR_SERVICE_PRIVATE_KEY`.  
- **트레저리**: NEAR 스윕 **수신** 계정. `NEAR_TREASURY_ACCOUNT_ID`. 서비스 계정과 동일 계정을 쓸 수 있으나, 역할상 구분됨.

---

## 7. 환경 변수 및 계정 일람

| 환경 변수 | 용도 | 기본값(있는 경우) |
|-----------|------|-------------------|
| `NEAR_SERVICE_ACCOUNT_ID` | 서비스 계정 ID (CHOCO 발신·지갑 생성 등) | `rogulus.testnet` |
| `NEAR_SERVICE_PRIVATE_KEY` | 서비스 계정 서명 키 | (필수, 없음) |
| `NEAR_TREASURY_ACCOUNT_ID` | NEAR 스윕 수신 계정 | `rogulus.testnet` |
| `CHOCO_TOKEN_CONTRACT` | CHOCO 토큰 컨트랙트 ID | `choco.token.primitives.testnet` |
| `NEAR_NETWORK_ID` | 네트워크 (testnet/mainnet) | `testnet` |
| `NEAR_NODE_URL` | RPC 노드 URL | `https://rpc.testnet.fastnear.com` |
| `NEAR_CHOCO_TOKEN_CONTRACT` | 로그·DB 기록용 (TokenTransfer.tokenContract 등). 온체인 호출에는 미사용. | (섹션 8.2 참고) |

클라이언트(지갑 연결 등): `VITE_NEAR_NETWORK_ID`, `VITE_NEAR_NODE_URL`, `VITE_NEAR_WALLET_URL`, `VITE_CHOCO_TOKEN_CONTRACT` 등.

---

## 8. 추가 확인 사항 (검토 결과)

### 8.1 Gasless / Relayer

**역할**  
유저가 NEAR(가스비)를 보유하지 않아도 CHOCO 전송이 가능하도록, 서비스 계정이 가스비를 대납하는 구조.

**두 가지 방식**

| 방식 | 흐름 | 사용처 |
|------|------|--------|
| **Relayer API** | 클라이언트가 유저 키로 SignedDelegate(ft_transfer) 서명 → POST `/api/relayer/submit` → 서버가 `submitMetaTransaction`으로 서비스 계정이 트랜잭션 제출(가스 부담). | PaymentSheet에서 X402 결제 시 `transferChocoTokenGasless` 호출, 기본값 `useRelayer: true`. |
| **서버 측 Gasless** | 서버가 유저 개인키로 DelegateAction 서명 후 `sendGaslessChocoToken` 호출. 서비스 계정이 `signAndSendTransaction(signedDelegate)` 제출. | 채팅 CHOCO 차감 시 `returnChocoToService` (유저 → 서비스 계정 반환). |

**참조**  
- `app/lib/near/relayer.server.ts`: `submitMetaTransaction`, `getRelayerBalance`, `logRelayerAction`  
- `app/lib/near/token.server.ts`: `sendGaslessChocoToken`, `returnChocoToService`  
- `app/routes/api/relayer/submit.ts`: rate limit, 로그 후 `submitMetaTransaction` 호출  

Relayer 잔액·활동은 관리자 모니터링(`/api/admin/monitoring/near`)에서 확인 가능.

### 8.2 CHOCO 컨트랙트 환경 변수 혼재

**확인 결과**  
코드베이스에 CHOCO 토큰 컨트랙트 ID가 **두 가지 환경 변수**로 사용됨.

| 환경 변수 | 사용처 | 용도 |
|-----------|--------|------|
| **`CHOCO_TOKEN_CONTRACT`** | `app/lib/near/client.server.ts` → `NEAR_CONFIG.chocoTokenContract` | **온체인 호출 전반**: `sendChocoToken`, `sendGaslessChocoToken`, `getChocoBalance`, `storage-deposit`, x402 인보이스의 `tokenContract` 등. 실제 ft_transfer·view 호출에 사용. |
| **`NEAR_CHOCO_TOKEN_CONTRACT`** | 로그·DB 기록, 스크립트 | **TokenTransfer 테이블** `tokenContract` 필드: `api/chat/index.ts`, `wallet.server.ts`, `api/items/purchase.ts`, `toss.server.ts`, `api.webhooks.paypal.ts`, `api.payment.capture-order.ts`, `api.payment.activate-subscription.ts`, `admin/users/detail.tsx`. **스크립트**: `force-mint-correction.ts`, `force-mint-5500.ts`, `check-total-supply.ts`, `audit-lost-tokens.ts` |

**영향**  
- 온체인 전송·잔액 조회는 **`CHOCO_TOKEN_CONTRACT`** 만 사용. 이 값만 맞으면 토큰 전송은 정상 동작.  
- **`NEAR_CHOCO_TOKEN_CONTRACT`** 를 비우거나 다르게 두면: 로그/DB에 빈 문자열 또는 잘못된 컨트랙트가 남고, 스크립트는 `process.env.NEAR_CHOCO_TOKEN_CONTRACT!` 로 인해 미설정 시 에러 가능.

**권장**  
- 운영 환경에서는 **두 변수 모두 동일한 컨트랙트 ID**로 설정 (예: `choco.token.primitives.testnet`).  
- 장기적으로는 코드 정리로 **하나의 변수**(예: `CHOCO_TOKEN_CONTRACT`)로 통일하고, 로그/스크립트에서도 `NEAR_CONFIG.chocoTokenContract` 또는 동일 env를 참조하도록 하는 것이 유지보수에 유리함.

---

## 9. 지갑 생성 UX 개선 제안

### 9.1 현재 문제점

지갑 생성 시 사용자가 `/wallet-setup` 화면에서 **10~20초** 대기해야 하며, 이는 첫 사용자 경험에 부정적 영향을 줄 수 있음.

**현재 흐름의 병목**

1. **순차 실행**: 온체인 계정 생성 → Storage deposit → CHOCO 전송 → 잔액 조회가 순차 진행되어 네트워크 지연이 누적됨.
2. **블로킹**: 모든 단계가 완료될 때까지 사용자는 `/wallet-setup` 화면에서 대기해야 함.
3. **네트워크 의존**: 각 단계가 NEAR 네트워크 응답을 기다려야 하므로, 네트워크 지연 시 대기 시간이 더 길어짐.

### 9.2 개선 방안

#### 방안 1: 비동기 지갑 생성 (권장)

**개념**  
- DB에 `nearAccountId`만 먼저 저장하고, 지갑 생성은 **백그라운드 작업**으로 처리.
- 사용자는 즉시 홈으로 이동 가능. 온체인 계정 생성 완료 전까지는 채팅 비활성화, 홈/캐릭터 보기 등은 가능.
- 백그라운드 작업 완료 시 알림 또는 주기적 확인으로 채팅 활성화.

**장점**  
- 첫 화면 진입이 즉시 가능하여 이탈률 감소.
- 네트워크 지연이 사용자 경험을 직접적으로 막지 않음.
- 확장성: 향후 다른 블로킹 작업도 같은 패턴으로 처리 가능.

**단점**  
- 백그라운드 작업 큐/재시도, 상태 관리 필요.
- 구현 복잡도 증가.

**구현 고려사항**  
- 백그라운드 작업 큐(예: Bull, BullMQ) 또는 간단한 DB 상태 플래그 + Cron.
- 상태: `WALLET_PENDING`, `WALLET_CREATING`, `WALLET_READY`.
- 재시도 로직: 실패 시 자동 재시도(지수 백오프).
- 사용자 알림: 지갑 준비 완료 시 토스트/배지.

#### 방안 2: 최적화 (병렬화 + 선택적 지연)

**개념**  
- Storage deposit과 CHOCO 전송을 **병렬**로 진행.
- 잔액 동기화(`getChocoBalance`)는 첫 채팅 시점으로 지연.
- 낙관적 업데이트: CHOCO 전송 트랜잭션 제출 후 즉시 DB에 `chocoBalance: "100"` 설정, 이후 실제 잔액으로 동기화.

**장점**  
- 구현이 단순하고 기존 흐름 유지.
- 병렬화로 일부 시간 단축 가능.

**단점**  
- 여전히 블로킹이 존재하여 대기 시간은 남음.

#### 방안 3: 하이브리드 (즉시 진입 + 백그라운드 완료)

**개념**  
- DB에 `nearAccountId` 저장 후 바로 홈 이동.
- 온체인 계정 생성·CHOCO 전송을 **백그라운드 작업 큐**에 넣어 처리.
- 지갑 생성 완료 전까지 채팅은 비활성화하거나, 완료 시 자동 활성화.

**장점**  
- 첫 진입이 즉시 가능.
- 사용자는 다른 화면을 볼 수 있어 대기 체감 감소.

**단점**  
- 백그라운드 작업 관리와 상태 추적 필요.

### 9.3 권장 사항

**방안 1 (비동기 지갑 생성)**을 권장함. 이유:
1. 첫 진입이 즉시 가능하여 이탈률 감소.
2. 네트워크 지연이 사용자 경험을 직접적으로 막지 않음.
3. 확장성: 향후 다른 블로킹 작업도 같은 패턴으로 처리 가능.

**구현 시 고려사항**  
- 백그라운드 작업 큐(예: Bull, BullMQ) 또는 간단한 DB 상태 플래그 + Cron.
- 상태: `WALLET_PENDING`, `WALLET_CREATING`, `WALLET_READY`.
- 재시도 로직: 실패 시 자동 재시도(지수 백오프).
- 사용자 알림: 지갑 준비 완료 시 토스트/배지.

---

## 참조

- NEAR deposit/sweep: `app/lib/near/deposit-engine.server.ts`, `exchange-rate.server.ts`
- 지갑·토큰: `app/lib/near/wallet.server.ts`, `token.server.ts`, `client.server.ts`
- X402·결제: `app/lib/near/x402.server.ts`, `silent-payment.server.ts`
- Gasless·Relayer: `app/lib/near/relayer.server.ts`, `app/routes/api/relayer/submit.ts`
- 터미널 로그: deprecation 경고·sweep 실패·모니터링 오류 메시지로 검색 가능

---

**작성일**: 2026-02-05  
**최종 수정일시**: 2026-02-05 18:00 KST


## Related Documents
- **Foundation**: [Document Management Plan](./09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
