# 07. 춘심 마스터 로드맵
> Created: 2026-04-30 00:00
> Last Updated: 2026-05-05 19:54
> 목적: Colosseum 해커톤 마감부터 서비스화까지 전체 작업 현황 및 우선순위 통합 관리

---

## 전체 Phase 개요

```
Phase 0  해커톤 마감 전     ~2026-05-11   ← 지금 여기
Phase 1  해커톤 후 기술부채  2026-05~06
Phase 2  메인넷 출시         2026 Q3
Phase 3  서비스화·고도화     2026 Q4 이후
Phase ∞  보류 (생태계 대기)  미정
```

---

## 상태 라벨 정의

로드맵의 체크박스는 구현 또는 데모 확인 여부를 표시한다. 서비스 출시 준비도는 아래 라벨로 별도 관리한다.

| 라벨 | 의미 | 완료 기준 |
| :--- | :--- | :--- |
| `Demo Verified` | 해커톤 제출 또는 데모 영상 기준으로 정상 동작을 확인했다. | 지정된 데모 시나리오에서 한 번 이상 성공했다. |
| `Service Verified` | 반복 사용, 로그인 후 복구, 운영 예외까지 검증했다. | 테스트 계정 또는 실제 운영 조건에서 회귀 검증을 통과했다. |
| `Needs Regression` | 구현은 되었거나 데모는 성공했지만, 서비스 기준 재검증이 필요하다. | 모바일, 로그인 후 E2E, 실패 복구, 중복 처리 중 하나 이상이 미검증이다. |
| `Open Risk` | 구현 또는 정책 결정이 아직 남아 있다. | 코드, 문서, 운영 정책 중 명확한 후속 작업이 존재한다. |

## 현재 우선순위 점검 큐

| 우선순위 | 항목 | 현재 라벨 | 다음 확인 |
| :--- | :--- | :--- | :--- |
| P0 | Solana 결제 검증 강화 | `Needs Regression` | Phantom 직접 결제와 Privy 임베디드 지갑 devnet E2E 완료. chat `SWAP_TX` Memo 제거 및 기존 스트리밍 경로 복귀, 실제 지갑 E2E와 402 복구 흐름 검증 필요 |
| P0 | 402 이후 충전 복귀 UX | `Needs Regression` | 버그 수정: 402 시 하트 모달(ItemStoreModal) 대신 BuyChocoPayCard Dialog 표시로 변경. 채팅 -> 402 -> CHOCO 충전 -> 모달 닫기 -> 대화 복귀 수동 QA 필요 |
| P0 | AI 모델 장애 폴백 | `Needs Regression` | Gemini 429/503 발생 시 OpenAI fallback 모델 사용. 실제 장애 상황 재현 및 응답 품질 수동 QA 필요 |
| P0 | 핵심 사용자 루프 명확화 | `Open Risk` | 첫 비밀 대화 -> 감정적 순간 -> CHOCO 액션 -> 기억 저장 또는 선물 흐름으로 home/chat/guide/shop 점검 |
| P1 | 로그인 후 모바일 E2E QA | `Needs Regression` | 테스트 계정으로 채팅, 지갑, 결제, 기억 앨범 전체 흐름 검증 |
| P1 | LLM Tool Calling 정식 복구 | `Open Risk` | LangGraph `ToolNode` 기반 도구 실행 구조 복구 |
| P1 | Vercel AI SDK V2 재도입 검토 | `Open Risk` | 결제/잔액/온체인 도구 호출 parity 확보 전까지 채팅 API는 기존 스트리밍 경로 사용 |
| P2 | Privy/RPC 환경 설정 분리 | `Open Risk` | 하드코딩된 공개 설정을 `VITE_*` 설정 레이어로 이동 |
| P2 | 서버 지갑 운영 모니터링 | `Open Risk` | 서버 SOL/CHOCO 잔액과 funding 실패 상태를 운영자가 확인 가능하게 정리 |

---

## Phase 0 — Colosseum 해커톤 마감 전 (~2026-05-11)

> 남은 기간: **11일**. 구현 추가 없이 제출 품질 완성에 집중.

### 0-1. Vercel 환경변수 점검

- [x] `LANGCHAIN_TRACING_V2=true` Vercel에 등록 — 확인 2026-04-30
- [x] `LANGCHAIN_API_KEY` Vercel에 등록 — 확인 2026-04-30
- [x] `LANGCHAIN_PROJECT=choonsim-prod` Vercel에 등록 — 확인 2026-04-30
- [x] `CHOONSIM_DEFAULT_IMAGE_URI` Vercel 등록 — 확인 2026-04-30
- [x] `ZK_COMPRESSION_RPC_URL` Vercel 등록 — 확인 2026-04-30
- [x] `HELIUS_RPC_URL` — `memories.ts`에 fallback 로직 존재 (`ZK_COMPRESSION_RPC_URL` → devnet 순서), 별도 등록 불필요
- [x] `CHOCO_COMPRESSED_MINT_ADDRESS` Vercel 등록 — 확인 2026-04-30
- [x] `VITE_PRIVY_APP_ID` — `PrivyWalletProvider.tsx:21`에 하드코딩됨. `Demo Verified`, 서비스 전환 전 env 분리 필요
- [ ] 데모용 서버 지갑에 SOL 충분히 확보 (Devnet faucet) — `Open Risk`
- [ ] 데모용 서버 지갑에 CHOCO 충분히 확보 — `Open Risk`

### 0-2. E2E 데모 테스트 (Colosseum 시나리오 기준)

> 브라우저에서 직접 수행 — 아래 5가지 흐름 전부 통과해야 제출 가능

- [x] **Gift Blink** — X(또는 dial.to)에서 Gift Blink 클릭 → Phantom 서명 → 온체인 트랜잭션 완료 확인 — `Demo Verified`
- [x] **cNFT 각인** — 채팅에서 "기억 새겨줘" → cNFT 민팅 → Explorer 링크 반환 → `/profile/memories`에서 카드 정상 표시 — `Demo Verified`
- [x] **AI Agent Kit** — "내 SOL 잔액 얼마야?" → 춘심이 온체인 조회 후 응답 — `Demo Verified`, `Needs Regression`
- [x] **CHOCO 구매** — 채팅에서 "초코 100개 사줘" → SwapTxCard 표시 → Phantom 서명 → 잔액 반영 확인 — `Demo Verified`, `Needs Regression`
- [x] **일일 체크인** — `/checkin` Blink → Phantom 서명 → Compressed CHOCO 수령 확인 — `Demo Verified`
- [x] **SIWS 로그인** — Phantom으로 Sign In → 세션 정상 생성 확인 — `Demo Verified`
- [x] **Privy 임베디드 지갑** — 이메일/소셜 로그인 → 자동 지갑 생성 확인 — `Demo Verified`, `Needs Regression`
- [x] **구독 결제** — Subscribe Blink → 결제 완료 → tier 업데이트 확인 — `Demo Verified`, `Needs Regression`
- [x] **cNFT 앨범** — `/profile/memories` → DAS API 정상 조회 → cNFT 카드 렌더링 — `Demo Verified`, `Needs Regression`
- [ ] 발견된 버그 우선순위화 및 수정 — `Open Risk`

### 0-3. 피치 머티리얼 완성

- [x] **12슬라이드 React 피치덱** (`apps/web/app/routes/pitch.tsx`) — 완료 2026-04-26
- [x] **3분 영어 VO 스크립트** (`docs/01_Concept_Design/07_PITCH_SCRIPT_3MIN_EN.md`) — ElevenLabs 설정값 포함 완료
- [x] **2분 영상 스크립트** (`docs/01_Concept_Design/08_PITCH_VIDEO_2MIN_EN.md`) — 완료
- [x] **Colosseum 피치덱 문서** (`docs/01_Concept_Design/04_COLOSSEUM_PITCH_DECK.md`) — 완료
- [x] **가속기 Q&A** (`docs/01_Concept_Design/09_ACCELERATOR_QNA_KO.md`) — 완료
- [x] **데모 영상 녹화** (3분 이내) — 완료 2026-05-04
  - [x] 시나리오 1: Gift Blink → Phantom 서명 → 선물 완료
  - [x] 시나리오 2: 채팅 → "기억 새기자" → cNFT 각인 → Explorer 확인
  - [x] 시나리오 3: "내 SOL 잔액 얼마야?" → Agent Kit 온체인 응답
  - [x] 시나리오 4: CHOCO 구매 → SwapTxCard → 잔액 반영
  - [x] 녹화 완료 후 README 상단에 영상 링크 추가
- [x] **ElevenLabs TTS VO 생성** (`07_PITCH_SCRIPT_3MIN_EN.md` 스크립트 사용) — 완료 2026-05-04
- [x] **팀 슬라이드 추가** (`pitch.tsx` Slide 12 — Solo Founder 슬라이드 완료, TOTAL 13으로 업데이트) — `Demo Verified`
- [x] **미커밋 변경사항 전체 커밋** (pitch.tsx 포함)

### 0-5. 결제 UX / 내부 지갑 개선 (2026-05-04 완료)

- [x] **BottomNavigation Store 탭 추가** — 4탭 → 5탭 구조 (Home | Chat | Fandom | Store | Profile) 전환, `shopping_bag` 아이콘 사용 — `Demo Verified`
- [x] **Shop 페이지 CHOCO 충전 배너** — 아이템 그리드 상단에 CHOCO 구매 버튼 추가 — `Demo Verified`, `Needs Regression`
- [x] **BuyChocoPayCard 컴포넌트 신규 구현** — `/buy-choco` 전용, Phantom / 내부 지갑 탭 선택 UI (자동 분기 → 사용자가 직접 선택) — `Demo Verified`, `Needs Regression`
- [x] **SwapTxCard 선택 UI 개선** — 채팅 인라인 결제도 동일한 탭 선택 방식으로 통일 — `Demo Verified`, `Needs Regression`
- [x] **PrivyChocoPayCard 서명 오류 수정** — `useWallets()` 가 임베디드 지갑 미반환 문제 해결, `useStandardWallets()` + `solana:signTransaction` feature 직접 호출로 교체 — `Demo Verified`, `Needs Regression`
- [x] **EmbeddedWalletSection 신규 구현** — 프로필 페이지에 Privy 임베디드 지갑 주소 표시·복사·Export Private Key UI 추가 (Phantom 유무 무관 항상 표시)
- [x] **신규 지갑 0.5 SOL 자동 에어드랍** — `airdrop.server.ts` 구현, `PATCH /api/user/wallet` 최초 등록 시 자동 지급 (중복 방지 로직 포함) — `Demo Verified`, `Open Risk`
- [x] **에어드랍 토스트 중복 표시 수정** — API 응답 `isNew` 필드 기반 조건부 토스트, 재로그인 시 오발동 방지
- [x] **프로필 SOL 잔액 실시간 표시** — Privy 임베디드 지갑 주소 기준 devnet RPC 실시간 조회 — `Demo Verified`
- [x] **Incognito 모드 지원 확인** — Privy 내부 지갑은 Privy 서버 보관, localStorage 미의존, 브라우저 확장 없이 결제 가능

### 0-4. 제출 준비

- [x] Colosseum Frontier 제출 폼 작성
- [x] GitHub README 최종 점검 (Solana 기능·온체인 주소·데모 영상 링크 포함)
- [x] 라이브 URL 정상 동작 최종 확인 (`https://choonsim-talk-sol.vercel.app`)
- [x] Vercel 배포 최종 확인 (Devnet 모드 동작 검증)
- [x] 제출 마감 **2026-05-11** 전 제출 완료

---

## Phase 1 — 해커톤 후 기술부채 해소 (2026-05~06)

> 해커톤 중 발생한 구조적 문제 해결. 실서비스 전 필수.

### 1-0. Phase 1 진입 기준

Phase 1은 기능 추가보다 서비스 신뢰성 보강을 우선한다. 아래 P0 항목이 정리되기 전에는 Phase 2 mainnet 준비로 넘어가지 않는다.

- [x] P0 결제 검증 설계 및 코드 보강 완료 — `reference`, payer, amount, createdAt, duplicate signature, reconciliation 포함. Phantom 직접 결제와 Privy 임베디드 지갑 devnet E2E 통과, chat `SWAP_TX` Memo 제거 및 빌드 통과, 실제 지갑 E2E와 402 복구 흐름은 `Needs Regression`
- [ ] P0 402 결제 복구 UX 수동 QA 완료 — HTTP 402 즉시 반환 처리 코드 수정 및 빌드 통과 2026-05-05, 모바일 우선 수동 확인 필요
- [ ] P0 핵심 사용자 루프 문장 확정 — home/chat/guide/shop 반영 기준으로 사용

### 1-1. LangGraph 아키텍처 통합

> 현재 `stream.ts`가 LangGraph를 우회해 모델을 직접 호출 → 메모리(요약)가 스트리밍 경로에서 실제로 작동하지 않음

- [x] `stream.ts`의 `model.stream()` 직접 호출을 `graph.stream()` 기반으로 교체
- [x] `summarizeNode`가 스트리밍 경로에도 적용되도록 수정 → 대화 요약 메모리 정상 작동
- [x] `createChatGraph()`를 모듈 수준에서 한 번만 컴파일 (매 요청 재컴파일 제거)
- [x] `graph.ts` / `stream.ts` 코드 중복 제거 (시스템 프롬프트 빌드 로직 통합)
- [ ] LangSmith 대시보드에서 그래프 노드별 실행 시간·토큰 소비 확인 및 최적화

### 1-2. 결제 E2E 검증

- [x] 충전(CHOCO 구매) → 대화 재개 흐름 실결제 E2E 확인 (Shop `/buy-choco` 기준 Phantom 직접 결제 + Privy 임베디드 지갑 devnet 검증 완료 2026-05-05) — `Service Verified`
- [ ] 모달 닫기 후 대화 정상 재개 (브라우저 수동 확인) — `Needs Regression`
- [ ] 402 응답 후 충전 → 원래 대화로 복귀 흐름 검증 — HTTP 402 즉시 반환 처리 코드 수정 및 빌드 통과 2026-05-05, 실제 충전 후 복귀 수동 확인 필요 — `Needs Regression`
- [x] Solana `verify-sig` 검증 강화 — `reference`, payer, 결제 생성 시각, 중복 signature, reconciliation 상태 확인 — 코드 보강 및 Shop 기준 Phantom/Privy devnet E2E 완료 2026-05-05, `Needs Regression`
- [x] 비로그인 결제 API 보호 확인 — `/api/payment/solana/create-tx`, `/api/payment/solana/verify-sig` 모두 401 반환 확인 2026-05-05
- [x] 실제 지갑 devnet E2E — Shop `/buy-choco` 기준 Phantom 직접 결제와 Privy 임베디드 지갑 결제 모두 `create-tx -> verify-sig 200` 확인 2026-05-05 — `Service Verified`
- [ ] 채팅 `SWAP_TX` 서명 검증 — Agent Kit 생성 트랜잭션의 reference account 포함 방식 코드 수정 및 빌드 통과 2026-05-05, 실제 지갑 E2E 확인 필요 — `Needs Regression`

### 1-3. Vercel 배포 체크리스트 정리

> `02_VERCEL_DEPLOYMENT_404_CHECKLIST.md` 항목 — 현재 미체크 상태

- [ ] Vercel Root Directory = `apps/web` 설정 확인 및 체크박스 업데이트
- [ ] Build Command = `npm run build` 확인
- [ ] Output Directory = 비움 확인
- [ ] 체크리스트 문서 체크박스 업데이트 (완료 항목 ✅ 처리)

### 1-4. LangSmith 활용 버그 추적

- [ ] LangSmith 대시보드에서 Solana 도구 실패 패턴 분석
- [ ] 가장 많이 실패하는 도구 상위 3개 식별 및 오류 핸들링 강화
- [ ] 토큰 소비량 상위 경로 파악 → 프롬프트 최적화

### 1-5. 코드 정리

- [ ] `sanitizeToolSchema()` — Gemini 호환 처리 주석 명확화
- [ ] `executeNaturalLanguageCommand()` 패턴 확장 (새 자연어 트리거 추가 검토)
- [ ] 미사용 `generateAIResponse()` 호출 경로 존재 여부 확인 → 정리 또는 유지 결정
- [x] 채팅 API Vercel AI SDK V2 실험 경로 비활성화 — 결제 도구 호출 parity 확보 전까지 기존 `streamAIResponse` 경로 사용 2026-05-05
- [x] Gemini 장애 대비 OpenAI fallback 모델 추가 — `OPENAI_API_KEY`가 있을 때 `OPENAI_FALLBACK_MODEL` 또는 `gpt-5-mini` 사용 2026-05-05

### 1-6. LLM Tool Calling 정식 복구

> 현재 `executeNaturalLanguageCommand()`는 정규식 패턴으로 도구를 수동 호출하는 임시 방식.
> LLM이 의도를 직접 파악하고 도구를 자동 선택하는 구조로 교체 필요.

- [ ] `callModelNode`에 `sanitizeToolSchema()` 적용한 도구 binding 복구
- [ ] LangGraph `ToolNode` 추가 및 조건부 엣지 연결 (tool call → tool execute → 재응답)
- [ ] `executeNaturalLanguageCommand()` 전체 제거 및 stream.ts 로직 단순화
- [ ] Gemini + Solana Agent Kit 도구 E2E 테스트 (SOL 잔액, CHOCO 잔액, cNFT 각인 등)

---

## Phase 2 — 메인넷 출시 (2026 Q3)

> CHOCO를 Mainnet에서 실제 가치 있는 토큰으로 런칭.

### 2-1. CHOCO 메인넷 발행

- [ ] CHOCO SPL Token-2022 메인넷 배포 (Transfer Fee extension 포함)
- [ ] CHOCO 공급량·초기 배분 계획 확정
- [ ] 메인넷 CHOCO Mint 주소 → 모든 환경변수 및 문서 업데이트

### 2-2. DEX 유동성 풀 등록

- [ ] Orca 또는 Raydium에 SOL/CHOCO 유동성 풀 생성
- [ ] Jupiter 인덱싱 확인 (`GET /quote?inputMint=SOL&outputMint=CHOCO_MINT`)
- [ ] 초기 유동성 규모 및 가격 책정 결정

### 2-3. Jupiter API 실제 연동 (buyChoco 대체)

> 현재 SOL→서버 중앙화 방식 → 완전 탈중앙화 스왑으로 교체

- [ ] `agent-kit.server.ts`의 `buyChoco` 도구를 Jupiter API v6 기반으로 교체
  - `GET /v6/quote` → `POST /v6/swap` → base64 tx 반환
- [ ] `SwapTxCard` 컴포넌트 유지 (base64 tx 서명 패턴 그대로 사용 가능)
- [ ] `/api/payment/solana/verify-sig` 엔드포인트 메인넷용 검증 로직 수정
- [ ] SOL 수령 → CHOCO 수동 전송 로직 제거 (Jupiter 스왑이 대체)
- [ ] 메인넷 E2E 테스트 (실제 SOL 사용)

### 2-4. Meta-Blinks 추가 고도화

- [x] Linked Actions 체인 (체크인 완료 → 선물 Blink 자동 연결) — 완료 2026-04-27
- [ ] cNFT 이미지 동적 미리보기 (Blink GET 응답에 실제 cNFT 이미지 삽입)
- [ ] 실시간 CHOCO 가격 표시 (Blink description에 `1 SOL = N CHOCO`)

### 2-5. Solana Pay QR 실물 결제

- [ ] 오프라인 행사·팝업에서 CHOCO 결제 가능한 QR 코드 생성
- [ ] `/pay` 라우트 신설

---

## Phase 3 — 서비스화·고도화 (2026 Q4 이후)

> 실사용자 규모에서 운영 가능한 수준으로 고도화.

### 3-1. 벡터 메모리 (장기 recall)

- [ ] 대화 임베딩 → 벡터 DB 저장 (Pinecone 또는 Turso + SQLite-vec)
- [ ] RAG 검색으로 오래된 대화 맥락 복원
- [ ] `summarizeNode` 대체 또는 병행 운영

### 3-2. Voice TTS 연동

- [ ] ElevenLabs API 연동 (`500 CHOCO/msg` 과금)
- [ ] 채팅 응답을 음성으로 재생하는 UI 컴포넌트
- [ ] 음성 파일 Cloudinary 캐싱

### 3-3. cNFT 메타데이터 개인화

- [ ] 감정·대화 맥락을 반영한 커스텀 이미지 생성 (DALL·E 또는 Stability AI)
- [ ] 각인 시 사용자 선택 이미지 업로드 지원

### 3-4. Solana Mobile (SMS) 지원

- [ ] Android APK 빌드 (Expo 또는 React Native)
- [ ] Solana dApp Store 등록
- [ ] Mobile Wallet Adapter 연동

### 3-5. 관계 등급 기반 콘텐츠 잠금

- [ ] Visitor → Fan → Supporter → Whale 4단계 등급 시스템
- [ ] 등급별 언락 콘텐츠 기획 및 구현
- [ ] 온체인 보유 CHOCO 수량으로 등급 자동 산정

### 3-6. DAO 거버넌스

- [ ] CHOCO 보유자 투표권 부여
- [ ] 캐릭터 업데이트·가격 정책 DAO 결정 구조

---

## Phase ∞ — 보류 (생태계 지원 대기)

> 현재 Solana 생태계 미성숙으로 구현 불가. 조건 충족 시 재착수.

### ∞-1. Eliza Framework 멀티플랫폼 통합

> 재착수 조건: `@elizaos/plugin-solana`가 **SPL Token-2022 Transfer Fee** 및 **cNFT(Bubblegum)** 를 공식 지원

- [ ] `packages/eliza-agent/` 모노레포 패키지 신설
- [ ] 춘심 Character JSON 정의 (`bio`, `messageExamples`, `style`)
- [ ] Turso Memory Adapter 구현 (기존 `/api/context` REST 재사용)
- [ ] CHOCO 구매 · 체크인 커스텀 Eliza Action
- [ ] Discord · Telegram 클라이언트 연결
- [ ] X(트위터) 클라이언트 연결 (API 비용 확인 후)
- [ ] Railway 배포 (Eliza는 장시간 실행 프로세스 → Vercel 불가)
- [ ] 웹앱(Vercel) ↔ Eliza(Railway) 메모리 공유 E2E 테스트

### ∞-2. TEE 기반 에이전트 키 위임

> 재착수 조건: Lit Protocol Naga 메인넷의 **Ed25519 네이티브 PKP 서명** 안정화 + Token-2022 트랜잭션 서명 레퍼런스 등장

- [ ] Lit Protocol Wrapped Keys SDK (`signTransactionWithSolanaEncryptedKey`) 기반 재설계
- [ ] `apps/web/scripts/mint-agent-pkp.ts` — PKP 민팅 스크립트
- [ ] `choonsim-sign-action.js` — Lit Action (IPFS 배포)
- [ ] `agent-kit.server.ts` 피처 플래그 `USE_LIT_SIGNER` 추가
- [ ] Token-2022 Transfer Fee 트랜잭션 서명 검증
- [ ] cNFT(Bubblegum) 민팅 트랜잭션 서명 검증
- [ ] `/trust` 신뢰 증명 페이지 (PKP 주소 + Lit Action CID + 최근 트랜잭션)
- [ ] 피처 플래그로 점진적 전환 후 `SOLANA_AGENT_PRIVATE_KEY` 환경변수 제거

---

## 현황 요약 대시보드

체크리스트의 상위 항목과 하위 항목이 섞이면 완료율이 왜곡될 수 있으므로, 현재 대시보드는 수치형 완료율보다 서비스 준비 상태를 기준으로 관리한다.

| Phase | 대표 상태 | 주요 열린 항목 | 다음 게이트 |
| :--- | :--- | :--- | :--- |
| Phase 0 (해커톤 마감 전) | `Demo Verified` 중심 | 서버 SOL/CHOCO 잔액, 팀 슬라이드, 발견 버그 우선순위화 | 제출 자료 최종 확인 |
| Phase 1 (기술부채) | `Needs Regression` / `Open Risk` | 결제 검증, 402 복구 UX, LangSmith 분석, LLM Tool Calling | `Service Verified` 전환 |
| Phase 2 (메인넷) | `Open Risk` | CHOCO mainnet, DEX 유동성, Jupiter 연동 | 결제 신뢰성 검증 완료 |
| Phase 3 (서비스화) | `Open Risk` | 장기 메모리, TTS, 개인화, 모바일 | mainnet 운영 안정화 |
| Phase ∞ (보류) | 보류 | Eliza, TEE 키 위임 | 생태계 조건 충족 |

> Phase 0 항목은 **2026-05-11 전 전부 완료** 목표.

---

## Related Documents

- [01_OPERATIONS_READINESS_CHECKLIST](./01_OPERATIONS_READINESS_CHECKLIST.md) — 운영 체크리스트 (결제 E2E)
- [02_VERCEL_DEPLOYMENT_404_CHECKLIST](./02_VERCEL_DEPLOYMENT_404_CHECKLIST.md) — Vercel 배포 설정
- [04_SEOULANA_HACKATHON_ROADMAP](./04_SEOULANA_HACKATHON_ROADMAP.md) — Seoulana 해커톤 로드맵 (완료)
- [05_ELIZA_INTEGRATION_PLAN](./05_ELIZA_INTEGRATION_PLAN.md) — Eliza 통합 계획 (보류)
- [06_TEE_IMPLEMENTATION_PLAN](./06_TEE_IMPLEMENTATION_PLAN.md) — TEE 구현 계획 (보류)
- [AI_AGENT_TRANSFORMATION](../03_Technical_Specs/05_AI_AGENT_TRANSFORMATION.md) — LangGraph 개선 로드맵
- [ADVANCED_ROADMAP](../03_Technical_Specs/09_ADVANCED_ROADMAP.md) — 고도화 기술 분석
