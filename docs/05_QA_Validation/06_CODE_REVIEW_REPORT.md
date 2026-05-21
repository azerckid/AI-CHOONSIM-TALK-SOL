# 06. Code Review Report
> Created: 2026-05-21 07:42
> Last Updated: 2026-05-21 19:58
> Category: QA Validation - 전체 코드 리뷰 결과

---

## 1. 결론

이번 리뷰는 **배포/PR 차단** 상태로 판정한다.

가장 큰 이유는 채팅/메시지 계층의 소유권 검증 누락이다. 정적 코드 리뷰뿐 아니라 로컬 서버에서 테스트 계정 2개를 생성해 실제로 재현했으며, 첫 번째 계정이 두 번째 계정의 대화방 페이지와 메시지 API에 접근하고 메시지까지 삽입할 수 있었다.

두 번째 차단 사유는 `npm audit --audit-level=high`에서 `react-router`, `vite`, `drizzle-orm`, `axios`, `hono`, `kysely`, `rollup` 등 핵심 런타임/빌드 의존성의 high 취약점이 다수 확인된 점이다.

---

## 2. Findings

### F-01. 높음 - 대화방/메시지 소유권 검증 누락으로 다른 사용자의 채팅 조회, 삽입, 삭제가 가능함

**영향**

- 인증된 사용자가 다른 사용자의 `conversationId`를 알면 대화 페이지에 접근할 수 있다.
- `/api/messages`로 다른 사용자의 대화 메시지를 조회하거나 삽입할 수 있다.
- `/api/chat` 스트리밍 요청은 다른 사용자의 대화 히스토리를 프롬프트에 포함할 수 있다.
- `/api/chat/delete`는 다른 사용자의 메시지와 대화방, Cloudinary 이미지 삭제까지 수행할 수 있다.
- 선물, 좋아요, 중단 메시지 저장도 메시지/대화 소유권 확인 없이 실행된다.

**근거**

- `apps/web/app/routes/chat/$id.tsx:78` - 메시지를 `conversationId`만으로 조회한다.
- `apps/web/app/routes/chat/$id.tsx:83` - 대화방을 `conversation.id`만으로 조회한다.
- `apps/web/app/routes/chat/$id.tsx:147` - action이 대화방 소유권 확인 없이 메시지를 저장한다.
- `apps/web/app/routes/api/messages/index.ts:26` - loader가 `conversationId`만으로 메시지를 반환한다.
- `apps/web/app/routes/api/messages/index.ts:53` - action이 소유권 확인 없이 메시지를 삽입한다.
- `apps/web/app/routes/api/chat/index.ts:64` - 채팅 히스토리와 대화방을 소유자 조건 없이 조회한다.
- `apps/web/app/routes/api/chat/index.ts:401` - assistant 메시지를 소유권 확인 없이 `conversationId`에 저장한다.
- `apps/web/app/routes/api/chat/delete.ts:38` - 삭제 대상 메시지를 `conversationId`만으로 조회한다.
- `apps/web/app/routes/api/chat/delete.ts:57` - 메시지 삭제가 `conversationId` 조건만 사용한다.
- `apps/web/app/routes/api/chat/interrupt.ts:26` - 중단 메시지 저장 전 대화 소유권을 확인하지 않는다.
- `apps/web/app/routes/api/items/gift.ts:28` - `characterId`와 `conversationId`를 클라이언트 입력 그대로 사용한다.
- `apps/web/app/routes/api/messages/$id.like.ts:27` - 메시지 존재만 확인하고 그 메시지가 현재 사용자의 대화인지 확인하지 않는다.
- `apps/web/app/db/schema.ts:229` - `Conversation.userId`가 nullable이며 DB 레벨 FK/ownership 제약이 없다.
- `apps/web/app/db/schema.ts:239` - `Message.conversationId`도 DB 선언상 FK 제약이 아니라 애플리케이션 검증에 의존한다.

**실제 재현**

- 로컬 서버: `http://127.0.0.1:5173`
- 테스트 계정 A 생성: 성공
- 테스트 계정 B 생성: 성공
- 계정 B로 대화방 생성: `27a2cf11-7eaa-4a84-8b60-ec08d73a0332`
- 계정 A 세션으로 `GET /api/messages?conversationId=27a2cf11-7eaa-4a84-8b60-ec08d73a0332`: `200`
- 계정 A 세션으로 `GET /chat/27a2cf11-7eaa-4a84-8b60-ec08d73a0332`: `200`
- 계정 A 세션으로 `POST /api/messages`에 계정 B의 `conversationId` 사용: `200`
- 테스트 계정 A/B 삭제: 각각 `200`

**수정 방향**

- 공통 helper를 추가해 `conversationId + session.user.id`를 함께 검증한다.
- loader/action/API 모두에서 `conversation.userId === session.user.id`가 아니면 `403`을 반환한다.
- 메시지 단위 API는 `message -> conversation -> userId` 조인을 통해 소유권을 검증한다.
- 삭제, 좋아요, 선물, 중단 저장, 음성 생성, 채팅 스트리밍에 동일한 ownership helper를 적용한다.
- 회귀 테스트는 "A 사용자가 B 대화방 조회/쓰기/삭제 시 403"을 최소 케이스로 추가한다.

### F-02. 높음 - 레거시 Solana Pay verify 경로가 payment reference 일치를 검증하지 않음

**영향**

- `/api/payment/solana/create-request`는 고유 reference를 `Payment.transactionId`에 저장한다.
- `/api/payment/solana/verify`는 클라이언트가 보낸 `reference`를 사용해 온체인 거래를 찾지만, 그 `reference`가 해당 `paymentId`의 `transactionId`와 같은지 확인하지 않는다.
- 다른 결제의 reference 또는 외부에서 확보한 matching transfer를 pending payment에 연결할 여지가 있다.
- 같은 signature 재사용도 사전 차단하지 않고, DB unique 제약에 기대는 구조다.

**근거**

- `apps/web/app/routes/api/payment/solana/create-request.ts:72` - reference 생성.
- `apps/web/app/routes/api/payment/solana/create-request.ts:85` - `transactionId`에 reference 저장.
- `apps/web/app/routes/api/payment/solana/verify.ts:26` - 클라이언트 입력 `reference`, `paymentId` 수신.
- `apps/web/app/routes/api/payment/solana/verify.ts:32` - payment 조회는 id/user만 확인.
- `apps/web/app/routes/api/payment/solana/verify.ts:45` - 클라이언트 reference로 온체인 거래 조회.
- `apps/web/app/routes/api/payment/solana/verify.ts:69` - 완료 처리와 CHOCO 지급.
- `apps/web/app/db/schema.ts:463` - `transactionId` unique.
- `apps/web/app/db/schema.ts:466` - `txHash` unique.
- `apps/web/app/routes/buy-choco.tsx:159` - `/buy-choco`에서 레거시 `SolanaPayButton`을 계속 노출한다.
- `apps/web/app/components/payment/SolanaPayButton.tsx:63` - 폴링이 `/api/payment/solana/verify`를 호출한다.

**수정 방향**

- `/api/payment/solana/verify`를 제거하거나 `/verify-sig`로 통합한다.
- 유지해야 한다면 `reference === paymentRecord.transactionId`를 먼저 확인한다.
- `payment.status === "PENDING"` 조건과 txHash 중복 조회를 transaction 안에서 처리한다.
- `/buy-choco`의 QR 결제도 안전한 signature 기반 verify로 전환한다.

### F-03. 높음 - 공개 test-cron API가 임의 userId로 AI 비용과 메시지 쓰기를 유발함

**영향**

- 인증, 관리자 권한, cron secret 없이 `userId`만 받는다.
- 외부 호출자가 임의 사용자에 대해 대화방을 만들거나 기존 대화방에 assistant 메시지를 쓸 수 있다.
- AI 호출 비용과 데이터 오염이 발생할 수 있다.

**근거**

- `apps/web/app/routes/api/test-cron.ts:9` - 공개 action.
- `apps/web/app/routes/api/test-cron.ts:11` - formData의 `userId`를 신뢰한다.
- `apps/web/app/routes/api/test-cron.ts:18` - 해당 user 조회.
- `apps/web/app/routes/api/test-cron.ts:27` - 해당 user의 대화방 조회/생성.
- `apps/web/app/routes/api/test-cron.ts:60` - AI 응답 생성.
- `apps/web/app/routes/api/test-cron.ts:64` - 메시지 저장.

**수정 방향**

- production route에서 제거하거나 `x-cron-secret` 또는 `requireAdmin`을 필수화한다.
- 테스트 전용이면 dev 환경에서만 라우트를 노출한다.
- 호출 로그와 rate limit을 추가한다.

### F-04. 높음 - npm audit high 취약점 21건 포함

**결과**

- `npm audit --audit-level=high`: 실패
- 총 `73 vulnerabilities`: low 1, moderate 51, high 21

**주요 패키지**

- `react-router 7.10.1`: action/server action CSRF, open redirect XSS, ScrollRestoration SSR XSS 계열 advisory.
- `vite 7.1.7`: dev server path traversal / arbitrary file read 계열 advisory.
- `drizzle-orm 0.45.1`: SQL identifier escaping 관련 SQL injection advisory.
- `axios 1.13.2`: SSRF, prototype pollution, header/injection 계열 advisory.
- `hono`, `@hono/node-server`: auth/static/cookie/SSE/path traversal/prototype pollution 계열 advisory.
- `kysely`: SQL injection advisory.
- `rollup`: path traversal arbitrary file write advisory.
- `express-rate-limit`: IPv4-mapped IPv6 bypass advisory.
- `lodash`, `defu`, `fast-uri`, `langsmith`: high 또는 다수 moderate advisory.

**수정 방향**

- 우선 non-breaking `npm audit fix` 범위를 검토한다.
- `react-router`와 `@react-router/*`는 동일 버전 세트로 업그레이드한다.
- `drizzle-orm`, `vite`, `axios`, `better-auth`는 별도 회귀 테스트와 함께 즉시 갱신한다.
- Solana/Privy/WalletConnect 계열 transitive 취약점은 lockfile 영향 범위를 따로 검토한다.

### F-05. 중간 - 지갑 주소 바인딩이 서명 소유권 없이 가능함

**영향**

- 로그인한 사용자가 임의 Solana 주소를 본인 `solanaWallet` 또는 `privyWallet`로 저장할 수 있다.
- SIWS 로그인은 `solanaWallet`이 같은 유저를 찾아 세션을 생성한다.
- 공격자가 타인의 공개 주소를 선점하면 이후 지갑 기반 identity가 꼬일 수 있다.
- 첫 지갑 등록 시 devnet SOL airdrop도 임의 주소로 전송된다.

**근거**

- `apps/web/app/routes/api/user/wallet.ts:23` - 요청 body의 `solanaWallet` 수신.
- `apps/web/app/routes/api/user/wallet.ts:30` - base58 형식만 검증.
- `apps/web/app/routes/api/user/wallet.ts:43` - 서명 검증 없이 저장.
- `apps/web/app/routes/api/user/wallet.ts:50` - 신규 등록이면 onboarding SOL 지급.
- `apps/web/app/routes/api/user/privy-wallet.ts:23` - 요청 body의 `privyWallet` 수신.
- `apps/web/app/routes/api/user/privy-wallet.ts:36` - 서명 검증 없이 저장.
- `apps/web/app/routes/api/auth/siws/verify.ts:113` - `solanaWallet` 기준 기존 유저 세션 생성.
- `apps/web/app/db/schema.ts:39` - `solanaWallet` unique 제약 없음.
- `apps/web/app/db/schema.ts:42` - `privyWallet` unique 제약 없음.

**수정 방향**

- `solanaWallet` 변경은 SIWS nonce/signature 검증을 통과한 주소만 허용한다.
- `solanaWallet`과 `privyWallet`에 unique 제약을 추가한다.
- 결제 수령용 지갑과 로그인 identity 지갑을 분리한다.

### F-06. 중간 - 로컬 테스트 자동화가 신뢰 가능한 기준선이 아님

**영향**

- `npm test`는 실제 테스트 스위트가 아니라 `turbo run test`의 build 의존성만 실행한다.
- 컨텍스트 테스트 2개는 로컬 DB에 `UserMemoryItem` 테이블이 없어 실패한다.
- `apps/web/package.json`의 DB/seed/mock 스크립트 경로가 실제 파일 위치와 다르다.

**근거**

- `turbo.json:74` - `test` task는 `build`에만 의존한다.
- `apps/web/package.json:10` - `test:context`.
- `apps/web/package.json:11` - `test:context-memory`.
- `apps/web/package.json:12` - `db:reset`이 없는 `scripts/db-reset.ts`를 가리킨다.
- `apps/web/package.json:13` - `mock:seed`가 없는 `scripts/seed-mock-users.ts`를 가리킨다.
- `apps/web/package.json:14` - `mock:grant`가 없는 `scripts/grant-mock-users-choco.ts`를 가리킨다.
- 실제 파일은 `apps/web/scripts/ops/db-reset.ts`, `apps/web/scripts/seed/seed-mock-users.ts`, `apps/web/scripts/ops/grant-mock-users-choco.ts`에 있다.
- `dev.db`, `apps/web/dev.db`는 모두 0 bytes.
- `npm --prefix apps/web run test:context`: `SQLITE_ERROR: no such table: UserMemoryItem`
- `npm --prefix apps/web run test:context-memory`: `SQLITE_ERROR: no such table: UserMemoryItem`

**수정 방향**

- `turbo test`가 실제 test script를 호출하도록 구성한다.
- 로컬 테스트 전용 DB 생성/마이그레이션 스크립트를 고정한다.
- package script 경로를 실제 디렉터리 구조에 맞춘다.

### F-07. 중간 - 업로드 API에 파일 크기, MIME, rate limit 검증이 없음

**영향**

- 인증만 통과하면 임의 파일 타입과 큰 파일을 `arrayBuffer`로 메모리에 올린 뒤 Cloudinary로 전송한다.
- 채팅 첨부, 프로필, 관리자 이미지 업로드가 모두 같은 `/api/upload`를 사용한다.
- 저장소 비용, 메모리 사용량, 비이미지 업로드 리스크가 있다.

**근거**

- `apps/web/app/routes/api/upload.ts:20` - formData 수신.
- `apps/web/app/routes/api/upload.ts:21` - 파일 존재만 확인.
- `apps/web/app/routes/api/upload.ts:27` - 전체 파일을 arrayBuffer로 읽는다.
- `apps/web/app/routes/api/upload.ts:29` - `file.type`을 그대로 data URI에 사용한다.
- `apps/web/app/routes/api/upload.ts:31` - Cloudinary 업로드.
- `apps/web/app/components/chat/MessageInput.tsx:61` - 클라이언트도 크기/MIME 검증 없이 업로드한다.
- `apps/web/app/lib/cloudinary.server.ts:10` - server upload helper도 resource type 제한이 없다.

**수정 방향**

- 서버에서 `file.size`, `file.type`, 확장자, 최대 픽셀 수를 검증한다.
- route-level rate limit을 추가한다.
- Cloudinary `resource_type: "image"`와 transformation 기반 제한을 명시한다.

### F-08. 중간 - DB CHOCO 지급과 SPL 전송 사이 reconciliation 공백이 남아 있음

**영향**

- DB상 결제 완료와 CHOCO balance 지급이 먼저 완료된다.
- 그 이후 SPL 전송이 실패하면 metadata에 실패가 남지만 사용자/관리자 재시도 흐름이 명확하지 않다.
- 운영에서 DB 잔액과 온체인 토큰 잔액이 갈라질 수 있다.

**근거**

- `apps/web/app/routes/api/payment/solana/verify-sig.ts:200` - DB payment/user 업데이트 transaction.
- `apps/web/app/routes/api/payment/solana/verify-sig.ts:227` - SPL 전송은 DB 완료 이후 수행.
- `apps/web/app/routes/api/payment/solana/verify-sig.ts:246` - SPL 실패 시 metadata만 `FAILED`로 남긴다.
- `apps/web/app/routes/api/payment/solana/verify.ts:92` - 레거시 verify도 DB 완료 후 SPL 전송을 별도 처리한다.

**수정 방향**

- `splTransfer.status`를 관리자 화면에서 필터링하고 재시도할 수 있어야 한다.
- 결제 완료와 온체인 지급의 source of truth를 문서화한다.
- 실패한 SPL 전송에 대한 background job 또는 수동 retry endpoint를 만든다.

### F-09. 중간 - 운영/개발 환경 분리가 아직 코드에 하드코딩되어 있음

**영향**

- Privy app id와 Solana devnet RPC가 클라이언트 코드에 직접 들어 있다.
- production/mainnet 전환 시 환경변수만 바꾸는 방식으로 배포하기 어렵다.
- 로컬 Node/npm 버전도 package 기준과 불일치한다.

**근거**

- `apps/web/app/components/solana/PrivyWalletProvider.tsx:21` - Privy app id 하드코딩.
- `apps/web/app/components/solana/PrivyWalletProvider.tsx:36` - devnet RPC 하드코딩.
- `apps/web/app/components/payment/PrivyChocoPayCard.tsx:43` - devnet RPC 하드코딩.
- `apps/web/app/routes/api/payment/solana/create-tx.ts:100` - fallback devnet RPC.
- `apps/web/package.json:40` - `@react-router/*` 7.10.1 고정.
- 로컬 실행 환경: Node `v25.8.0`, npm `11.11.0`
- `apps/web/package.json` engines: Node `22.x`
- 루트 `package.json`: packageManager `npm@10.8.2`

**수정 방향**

- `VITE_PRIVY_APP_ID`, `VITE_SOLANA_CLUSTER`, `VITE_SOLANA_RPC_URL` 등 공개 env로 이동한다.
- server-only secret과 client env를 문서와 `turbo.json` env list에 분리한다.
- 로컬 개발 환경은 `.nvmrc` 또는 Volta 설정으로 고정한다.

### F-10. 중간 - 번들 크기와 dynamic import 경고가 누적되어 초기 로드 비용이 큼

**영향**

- 지갑, PDF, 브라우저 polyfill, AI/crypto 관련 코드가 큰 청크로 남아 있다.
- build는 통과하지만 Vite가 큰 chunk warning과 dynamic import 비효율을 출력한다.

**근거**

- `index.browser-D7IYAl62.js`: 1,384.70 kB, gzip 403.32 kB.
- `core-DfEbqWcd.js`: 569.37 kB, gzip 164.25 kB.
- `browser-ponyfill-BFDIo1E5.js`: 421.05 kB, gzip 133.40 kB.
- `index-DpnPJEmE.js`: 289.74 kB, gzip 110.71 kB.
- `logger.server.ts`, `subscription-plans.ts`, `solana/agent-kit.server.ts`, `toss.server.ts`는 dynamic import와 static import가 섞여 code splitting 효과가 약하다.

**수정 방향**

- payment/wallet/PDF/admin 전용 코드를 route-level lazy boundary로 분리한다.
- server-only 모듈이 client graph에 들어오지 않는지 build analyzer로 확인한다.
- dynamic import 대상 모듈은 static import를 제거하거나 반대로 명시적 static import로 단순화한다.

### F-11. 낮음 - 클라이언트 결제 경로에 디버그 console 로그가 많이 남아 있음

**영향**

- 브라우저 콘솔에 지갑 주소, signature, verify 상태가 노출된다.
- 개발 표준의 `console.*` 제거 원칙과 어긋난다.

**근거**

- `apps/web/app/components/payment/PrivyChocoPayCard.tsx:77`
- `apps/web/app/components/payment/PrivyChocoPayCard.tsx:83`
- `apps/web/app/components/payment/PrivyChocoPayCard.tsx:188`
- `apps/web/app/components/payment/PrivyChocoPayCard.tsx:221`
- `apps/web/app/components/payment/PrivyChocoPayCard.tsx:246`
- `apps/web/app/components/payment/BuyChocoPayCard.tsx:138`
- `apps/web/app/components/payment/SolanaPayButton.tsx:49`
- `apps/web/app/hooks/use-chat-stream.ts:84`

**수정 방향**

- 운영 client bundle에서는 console 로그를 제거한다.
- 필요한 결제 추적은 서버의 구조화 로그와 payment metadata로 한정한다.

---

## 3. 자동 검증 결과

| 항목 | 결과 | 메모 |
|:---|:---:|:---|
| `git status --short` | 확인 | 리뷰 계획 문서가 untracked 상태로 시작했다. |
| `git branch --show-current` | PASS | `main` |
| `git diff --name-only HEAD` | PASS | tracked diff 없음 |
| `node --version` | 확인 | `v25.8.0`; 앱 engines `22.x`와 불일치 |
| `npm --version` | 확인 | `11.11.0`; 루트 packageManager `npm@10.8.2`와 불일치 |
| `npm run typecheck` | PASS | `react-router typegen && tsc` 통과 |
| `npm test` | 제한적 PASS | 실제 테스트가 아니라 build 의존성 중심으로 실행됨 |
| `npm run build` | PASS with warnings | 큰 chunk, empty chunk, unused import, dynamic import 경고 |
| `npm audit --audit-level=high` | FAIL | 73 vulnerabilities, high 21 |
| `npm --prefix apps/web run test:identity` | PASS | Vitest identity test 통과 |
| `npm --prefix apps/web run test:context` | FAIL | `SQLITE_ERROR: no such table: UserMemoryItem` |
| `npm --prefix apps/web run test:context-memory` | FAIL | `SQLITE_ERROR: no such table: UserMemoryItem` |
| 로컬 dev server | PASS | 권한 승격 후 `127.0.0.1:5173`에서 기동 |
| 테스트 계정 signup | PASS | 테스트 계정 2개 생성 후 삭제 완료 |
| 교차 사용자 대화 접근 E2E | FAIL | 계정 A가 계정 B의 대화 조회/쓰기 가능 |

---

## 4. PASS 항목

- TypeScript typecheck는 통과했다.
- production build는 생성된다.
- `.gitignore`는 `.env`, `.env.local`, `.env.development`, `.env.production` 등을 제외하고 `.env.example`만 허용한다.
- 관리자 화면 다수는 `requireAdmin`을 사용한다.
- `/api/admin/setup-compressed-token`은 `CRON_SECRET` 헤더를 요구한다.
- `/api/voice/generate`는 메시지의 conversation 소유권을 확인한다.
- 채팅 402 응답은 `useChatStream`에서 모달 복구 흐름으로 연결된다.
- `/api/payment/solana/verify-sig`는 레거시 `/verify`보다 강한 검증을 수행한다: signature 중복, payment owner, reference, recipient, payer, blockTime, amount를 확인한다.

---

## 5. 미검증 또는 제한 항목

- 실제 브라우저 스크린샷 기반 UI 검증은 이번 세션에서 브라우저 callable tool이 노출되지 않아 HTTP 기반 E2E로 대체했다.
- Phantom/Privy 지갑 서명 팝업과 실제 devnet 송금은 수행하지 않았다.
- Toss/PayPal/Coinbase 실결제는 수행하지 않았다.
- admin 권한 테스트 계정은 제공받지 않아 관리자 화면의 실제 POST action은 일부 정적 리뷰로 대체했다.
- `npm audit fix`는 코드 변경과 lockfile 변경을 수반하므로 실행하지 않았다.

---

## 6. 우선 수정 순서

1. `conversationId` ownership helper를 만들고 채팅/메시지/선물/삭제/중단/좋아요 API 전체에 적용한다.
2. 교차 사용자 접근/쓰기/삭제가 모두 `403`이 되는 회귀 테스트를 추가한다.
3. `/api/payment/solana/verify`와 `SolanaPayButton` 레거시 QR 결제 경로를 제거하거나 `verify-sig` 수준으로 강화한다.
4. `/api/test-cron`을 제거하거나 `CRON_SECRET`/admin 전용으로 잠근다.
5. `react-router`, `vite`, `drizzle-orm`, `axios`, `better-auth`를 우선 업그레이드하고 audit을 재실행한다.
6. 테스트 DB 생성/마이그레이션과 package script 경로를 고쳐 `test:context` 계열을 신뢰 가능한 기준선으로 만든다.
7. 지갑 바인딩을 SIWS 서명 기반으로 바꾸고 wallet unique 제약을 추가한다.
8. 업로드 API에 MIME, size, rate limit, image-only 제한을 추가한다.
9. SPL transfer failure 재시도/관리자 reconciliation 화면을 추가한다.
10. Privy/RPC/devnet 설정을 env 기반으로 분리하고 번들 split을 정리한다.

---

## 7. Review Gate

| Gate | 결과 | 근거 |
|:---|:---:|:---|
| 전체 리뷰 범위 포함 | PASS | routes, components, lib, schema, scripts, docs, audit 확인 |
| 자동 검증 기록 | PASS | typecheck, test, build, audit, app tests 기록 |
| audit 실행 | PASS | high 기준 실제 실행 |
| 보안 항목 분류 | FAIL | ownership, test-cron, audit high 차단 |
| 결제 항목 분류 | FAIL | legacy verify 경로 차단 |
| DB 항목 분류 | FAIL | 테스트 DB/스크립트/ownership 제약 문제 |
| UI/UX 항목 분류 | PARTIAL | HTTP E2E 완료, 브라우저 스크린샷 미수행 |
| 성능 항목 분류 | WARN | build 통과, bundle warning 존재 |
| 배포/PR 가능 여부 | BLOCKED | F-01, F-02, F-03, F-04 |

---

## 8. 수정 진행 결과

### 8-1. 완료된 수정

| Finding | 결과 | 적용 내용 |
|:---|:---:|:---|
| F-01 ownership | DONE | `conversationId`/`messageId` 소유권 helper를 추가하고 채팅, 메시지, 삭제, 좋아요, 선물, 중단 API에 403 가드를 적용했다. |
| F-02 Solana verify | DONE | 레거시 `/api/payment/solana/verify`에서 payment reference, PENDING 상태, txHash 중복을 검증하도록 강화했다. |
| F-03 test-cron | DONE | `/api/test-cron`을 POST 전용 + `CRON_SECRET` 인증 경로로 잠갔다. |
| F-04 dependency audit | PARTIAL | non-breaking `npm audit fix` 및 핵심 패키지 업그레이드를 적용했다. 잔여 high 8건은 breaking `--force` 변경만 제시된다. |
| F-05 wallet binding | DONE | Phantom 지갑 저장을 SIWS nonce/signature 검증 기반으로 전환하고, `solanaWallet`/`privyWallet` 중복 차단 및 DB unique index migration을 추가했다. |
| F-06 local tests | DONE | `npm test`가 실제 authz, identity, upload, context, context-memory 테스트를 실행하도록 복구했다. |
| F-07 upload API | DONE | 업로드 size/MIME/extension/magic-byte 검증, image-only Cloudinary 제한, 사용자 단위 rate limit을 추가했다. |
| F-08 SPL reconciliation | DONE | 관리자 결제 화면에 SPL 상태 필터와 FAILED/SKIPPED 재시도 action을 추가하고 결과를 `payment.metadata.splTransfer`에 기록한다. |
| F-09 env separation | DONE | `VITE_PRIVY_APP_ID`, `VITE_SOLANA_CLUSTER`, `VITE_SOLANA_RPC_URL`, `SOLANA_CLUSTER`, `SOLANA_RPC_URL` 기반 설정 helper를 추가하고 `.env.example`, `turbo.json`, `.nvmrc`를 갱신했다. |
| F-10 bundle warnings | PARTIAL | Solana 전송 서버 모듈의 관리자 화면 정적 import를 제거했다. 잔여 build 경고는 주로 Privy/WalletConnect 패키지 내부 Rollup 주석 및 React Router empty chunk 계열이다. |
| F-11 client console logs | DONE | 결제 컴포넌트와 `use-chat-stream`의 클라이언트 `console.*` 디버그 로그를 제거했다. |

### 8-2. 최신 자동 검증

| 항목 | 결과 | 메모 |
|:---|:---:|:---|
| `npm --prefix apps/web run typecheck` | PASS | `react-router typegen && tsc` 통과 |
| `npm test` | PASS | build + authz + identity + upload + context + context-memory 통과 |
| `npm audit --audit-level=high` | FAIL | 47 vulnerabilities, high 8. 잔여 high는 `bigint-buffer`, `langsmith` 계열이며 `npm audit fix --force`가 breaking 변경을 제시한다. |
| build warnings | WARN | Privy 내부 PURE annotation 경고, empty chunk 경고, Vitest EMFILE watcher 경고가 남아 있으나 빌드/테스트는 성공했다. |

### 8-3. 잔여 의사결정 필요 항목

- `npm audit fix --force`는 `solana-agent-kit`, `@solana/spl-token`, `@metaplex-foundation/mpl-bubblegum`, `ethers`, `drizzle-kit`의 breaking downgrade/major impact를 포함하므로 자동 적용하지 않았다.
- `0018_add_wallet_unique_indexes.sql`은 기존 운영 DB에 중복 지갑 주소가 있으면 실패할 수 있다. 운영 적용 전 중복 데이터 점검이 필요하다.
- Phantom/Privy 실제 지갑 팝업과 devnet 송금 E2E는 로컬 자동 테스트 대신 코드/HTTP 검증으로 대체했다.

## 9. Related Documents

- **Concept_Design**: [Roadmap](../01_Concept_Design/02_ROADMAP.md) - 제품 단계별 방향과 제출 이후 전략 참고
- **UI_Screens**: [UI Design](../02_UI_Screens/01_UI_DESIGN.md) - 화면 구조와 사용자 경험 검증 기준
- **Technical_Specs**: [CHOCO Payment Flow](../03_Technical_Specs/11_CHOCO_PAYMENT_FLOW.md) - 결제 흐름과 검증 기준
- **Technical_Specs**: [AI Agent Transformation](../03_Technical_Specs/05_AI_AGENT_TRANSFORMATION.md) - AI 도구 호출 구조 검증 기준
- **Logic_Progress**: [Master Roadmap](../04_Logic_Progress/07_MASTER_ROADMAP.md) - 현재 P0/P1/P2 리스크와 회귀 검증 상태
- **QA_Validation**: [Code Review Plan](./05_CODE_REVIEW_PLAN.md) - 이번 리뷰의 실행 계획과 범위
- **QA_Validation**: [Current Issues and Priorities](./04_CURRENT_ISSUES_AND_PRIORITIES.md) - 현재 문제점과 우선순위 기준
