# 07. 춘심 마스터 로드맵
> Created: 2026-04-30
> Updated: 2026-05-04 (3차)
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
- [x] `VITE_PRIVY_APP_ID` — `PrivyWalletProvider.tsx:21`에 하드코딩됨, 환경변수 불필요
- [ ] 데모용 서버 지갑에 SOL 충분히 확보 (Devnet faucet)
- [ ] 데모용 서버 지갑에 CHOCO 충분히 확보

### 0-2. E2E 데모 테스트 (Colosseum 시나리오 기준)

> 브라우저에서 직접 수행 — 아래 5가지 흐름 전부 통과해야 제출 가능

- [x] **Gift Blink** — X(또는 dial.to)에서 Gift Blink 클릭 → Phantom 서명 → 온체인 트랜잭션 완료 확인
- [x] **cNFT 각인** — 채팅에서 "기억 새겨줘" → cNFT 민팅 → Explorer 링크 반환 → `/profile/memories`에서 카드 정상 표시
- [x] **AI Agent Kit** — "내 SOL 잔액 얼마야?" → 춘심이 온체인 조회 후 응답
- [x] **CHOCO 구매** — 채팅에서 "초코 100개 사줘" → SwapTxCard 표시 → Phantom 서명 → 잔액 반영 확인
- [x] **일일 체크인** — `/checkin` Blink → Phantom 서명 → Compressed CHOCO 수령 확인
- [x] **SIWS 로그인** — Phantom으로 Sign In → 세션 정상 생성 확인
- [x] **Privy 임베디드 지갑** — 이메일/소셜 로그인 → 자동 지갑 생성 확인
- [x] **구독 결제** — Subscribe Blink → 결제 완료 → tier 업데이트 확인
- [x] **cNFT 앨범** — `/profile/memories` → DAS API 정상 조회 → cNFT 카드 렌더링
- [ ] 발견된 버그 우선순위화 및 수정

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
- [ ] **팀 슬라이드 추가** (`pitch.tsx` Slide에 팀 정보 기입)
- [x] **미커밋 변경사항 전체 커밋** (pitch.tsx 포함)

### 0-5. 결제 UX / 내부 지갑 개선 (2026-05-04 완료)

- [x] **BottomNavigation Store 탭 추가** — 4탭 → 5탭 구조 (Home | Chat | Fandom | Store | Profile) 전환, `shopping_bag` 아이콘 사용
- [x] **Shop 페이지 CHOCO 충전 배너** — 아이템 그리드 상단에 CHOCO 구매 버튼 추가
- [x] **BuyChocoPayCard 컴포넌트 신규 구현** — `/buy-choco` 전용, Phantom / 내부 지갑 탭 선택 UI (자동 분기 → 사용자가 직접 선택)
- [x] **SwapTxCard 선택 UI 개선** — 채팅 인라인 결제도 동일한 탭 선택 방식으로 통일
- [x] **PrivyChocoPayCard 서명 오류 수정** — `useWallets()` 가 임베디드 지갑 미반환 문제 해결, `useStandardWallets()` + `solana:signTransaction` feature 직접 호출로 교체
- [x] **EmbeddedWalletSection 신규 구현** — 프로필 페이지에 Privy 임베디드 지갑 주소 표시·복사·Export Private Key UI 추가 (Phantom 유무 무관 항상 표시)
- [x] **신규 지갑 0.5 SOL 자동 에어드랍** — `airdrop.server.ts` 구현, `PATCH /api/user/wallet` 최초 등록 시 자동 지급 (중복 방지 로직 포함)
- [x] **에어드랍 토스트 중복 표시 수정** — API 응답 `isNew` 필드 기반 조건부 토스트, 재로그인 시 오발동 방지
- [x] **프로필 SOL 잔액 실시간 표시** — Privy 임베디드 지갑 주소 기준 devnet RPC 실시간 조회
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

### 1-1. LangGraph 아키텍처 통합

> 현재 `stream.ts`가 LangGraph를 우회해 모델을 직접 호출 → 메모리(요약)가 스트리밍 경로에서 실제로 작동하지 않음

- [x] `stream.ts`의 `model.stream()` 직접 호출을 `graph.stream()` 기반으로 교체
- [x] `summarizeNode`가 스트리밍 경로에도 적용되도록 수정 → 대화 요약 메모리 정상 작동
- [x] `createChatGraph()`를 모듈 수준에서 한 번만 컴파일 (매 요청 재컴파일 제거)
- [x] `graph.ts` / `stream.ts` 코드 중복 제거 (시스템 프롬프트 빌드 로직 통합)
- [ ] LangSmith 대시보드에서 그래프 노드별 실행 시간·토큰 소비 확인 및 최적화

### 1-2. 결제 E2E 검증

- [x] 충전(CHOCO 구매) → 대화 재개 흐름 실결제 E2E 확인 (내부 지갑 + Phantom 양쪽 검증 완료 2026-05-04)
- [ ] 모달 닫기 후 대화 정상 재개 (브라우저 수동 확인)
- [ ] 402 응답 후 충전 → 원래 대화로 복귀 흐름 검증

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

| Phase | 항목 수 | 완료 | 진행률 |
|-------|---------|------|--------|
| Phase 0 (해커톤 마감 전) | 41 | 44 | 98% |
| Phase 1 (기술부채) | 14 | 5 | 36% |
| Phase 2 (메인넷) | 16 | 1 | 6% |
| Phase 3 (서비스화) | 14 | 0 | 0% |
| Phase ∞ (보류) | 16 | 0 | 보류 |

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
