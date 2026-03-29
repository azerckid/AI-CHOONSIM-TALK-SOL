# Seoulana Hackathon — 11일 구현 로드맵
> Created: 2026-03-25 14:00
> Last Updated: 2026-03-29

**기간**: 2026-03-25(수) ~ 2026-04-05(일) 23:59 KST
**남은 일수**: 7일
**목표**: WarmUp Seoulana Hackathon MVP 제출

---

## 현재 진행 상황 (2026-03-29 기준)

| 구성요소 | 상태 | 비고 |
|:---|:---|:---|
| Solana 개발 환경 | ✅ 완료 | Devnet 지갑, 패키지, WalletProvider |
| Actions/Blinks API | ✅ 완료 | gift / subscribe / checkin 3종 |
| CHOCO Token-2022 | ✅ 배포 완료 | `E2o1MKpnwh5vELG4FDgiX2NA33L11hXPVfAPD3ai4GWf` (1B supply, 1% fee) |
| Merkle Tree (cNFT) | ✅ 배포 완료 | `AJxCqbFdWLmQ7xMqBQN3AXja9paZJZ9qrqvwViXVkXGF` (depth=14) |
| cNFT 민팅 API | ✅ 완료 | `POST /api/solana/mint-memory` |
| AI Agent Kit | ✅ 완료 | LangGraph 5개 Solana 툴 통합 |
| Blinks 관리 페이지 | ✅ 완료 | `/admin/blinks` 라우트 (어드민 전용) |
| WalletButton UI | ✅ 완료 | Profile 페이지 Solana 섹션 |
| Embedded Wallet (Privy) | ✅ 완료 | 이메일/소셜 로그인 → 자동 지갑 생성, 결제 연동 |
| Sign In With Solana (SIWS) | ✅ 완료 | Phantom 서명 로그인, 기존 계정 통합 |
| ZK Compression | ✅ 완료 | Compressed CHOCO 민트 `ATHJdhUxqek9hJjfobda6sdGjLEZSmFhZoniRnsxMmEJ`, 체크인 보상 연동 |
| cNFT 메모리 앨범 UI | 🔲 미구현 | `/profile/memories` — DAS API 조회 |
| 데모 E2E 테스트 | 🔲 미완 | 3분 시나리오 전체 흐름 |
| 데모 영상 | 🔲 미완 | 제출 마감 4/5 23:59 KST |
| GitHub README 업데이트 | 🔲 미완 | Solana 기능 전체 기재 |
| SuperTeam Korea 제출 | 🔲 미완 | 마감 2026-04-05 23:59 KST |

---

## 전략 원칙

1. **Demo First**: 심사위원이 3분 안에 체험 가능한 데모를 최우선으로 완성한다.
2. **Devnet OK**: 온체인 기능은 Solana Devnet에서 작동하면 충분하다.
3. **기존 코드 최대 활용**: AI 엔진, 채팅 UI, DB는 그대로. Solana 레이어를 위에 얹는다.
4. **우선순위 엄수**: Blinks → cNFT → Agent Kit → Token Extensions 순서. 시간 부족 시 뒤에서 제거.

---

## Day-by-Day 계획

### ✅ Day 1~9 — 완료 (2026-03-25 ~ 2026-03-29)

| 작업 | 결과 |
|:---|:---|
| Solana 환경, WalletProvider, .env 설정 | ✅ |
| `connection.server.ts` + CORS 헬퍼 | ✅ |
| Gift / Subscribe / Check-in Blinks (3종) | ✅ |
| `actions.json` Blinks 레지스트리 | ✅ |
| CHOCO Token-2022 Devnet 배포 | ✅ `E2o1MKpnwh5vELG4FDgiX2NA33L11hXPVfAPD3ai4GWf` |
| Merkle Tree Devnet 배포 | ✅ `AJxCqbFdWLmQ7xMqBQN3AXja9paZJZ9qrqvwViXVkXGF` |
| `cnft.server.ts` + `POST /api/solana/mint-memory` | ✅ |
| AI Agent Kit — LangGraph 5개 툴 통합 | ✅ |
| `/admin/blinks` 관리 페이지 + WalletButton | ✅ |
| `verify-solana-stack.ts` 검증 스크립트 | ✅ 10/10 PASS |
| Embedded Wallet (Privy) — Buffer 폴리필, 결제 흐름 완성 | ✅ |
| Sign In With Solana (SIWS) — Phantom 로그인, 기존 계정 통합 | ✅ |
| ZK Compression — Compressed CHOCO 민트 생성 및 체크인 보상 연동 | ✅ |

---

### 🔴 Day 10 (2026-04-03, 금) — cNFT 앨범 UI + 통합 테스트
**목표**: 미구현 UI 완성 + 데모 플로우 전체 검증

#### cNFT 메모리 앨범 UI (코딩 작업)
- [ ] `/profile/memories` 페이지 구현
  - Metaplex DAS API (`getAssetsByOwner`)로 유저 cNFT 목록 조회
  - 민팅 날짜, 대화 내용 미리보기, Explorer 링크 카드 UI
  - 지갑 미연결 시 안내 메시지 표시

#### 통합 테스트
- [ ] 데모 시나리오 E2E 1회 완주 (아래 데모 시나리오 참조)
- [ ] 발견된 버그 우선순위화 및 수정
- [ ] 데모용 Devnet 지갑에 SOL / CHOCO 충분히 확보

#### 환경변수 점검
- [ ] Vercel 환경변수 전체 확인 (ZK Compression, SIWS, Privy 포함)
- [ ] `CHOONSIM_DEFAULT_IMAGE_URI` Vercel 등록 여부 확인

---

### 🟡 Day 11 (2026-04-04, 토) — 제출 준비
**목표**: 제출 서류 + 데모 영상 완성

- [ ] 데모 영상 녹화 (3분 이내, 아래 시나리오 기준)
- [ ] GitHub README 업데이트
  - 구현된 Solana 기능 전체 목록 (Blinks, cNFT, Agent Kit, Token-2022, Privy, SIWS, ZK Compression)
  - 라이브 URL, Solana Explorer 링크, 데모 영상 링크
- [ ] Seoulana 제출 텍스트 작성 (`05_HACKATHON_SUBMISSION_INFO.md` 기반)
- [ ] Vercel 배포 최종 확인 (Devnet 모드 동작 검증)
- [ ] SuperTeam Korea 슬랙 채널 제출 방법 확인

**예비일**: 2026-04-05(일) — 최종 버그 픽스 및 제출

---

## 데모 시나리오 (3분)

1. **Gift Blink** — X에서 춘심 포스트 확인 → Gift Blink 클릭 → Phantom 서명 → 선물 완료
2. **cNFT 메모리 인그레이빙** — 앱에서 AI 춘심과 대화 → 감동적인 순간 → "기억 새기기" → cNFT 민팅 → `/profile/memories`에서 확인 + Explorer 링크
3. **AI Agent Kit** — "춘심아, 내 SOL 잔액 얼마야?" → 춘심이 Agent Kit으로 온체인 조회 → 응답
4. **CHOCO Token-2022** — Solana Explorer 링크 공유로 토큰 증명

---

## 완료 기준 (제출 시점)

| 기능 | 필수 여부 |
|:---|:---|
| Gift Blink (X → 온체인) | 🔴 필수 |
| cNFT 메모리 인그레이빙 + 앨범 UI | 🔴 필수 |
| AI Agent Kit 잔액 조회 | 🔴 필수 |
| GitHub README (Solana 기능 포함) | 🔴 필수 |
| 데모 영상 (3분) | 🔴 필수 |
| CHOCO Token-2022 | 🟡 권장 (Explorer 링크로 증명) |
| Subscribe / Check-in Blink | 🟡 권장 |
| Embedded Wallet (Privy) | 🟡 권장 |
| Sign In With Solana (SIWS) | 🟡 권장 |
| ZK Compression | 🟡 권장 |

---

## 해커톤 후 Phase 2 (2026-04 이후)

| 기능 | 설명 |
|:---|:---|
| 벡터 메모리 (장기 recall) | 대화 임베딩 → 벡터 DB 저장, RAG 검색 |
| Mainnet 이전 | CHOCO Token-2022 + Merkle Tree devnet → mainnet |
| 관계 등급 기반 콘텐츠 잠금 | Visitor → Fan → Supporter → Whale 단계별 언락 |
| Voice TTS 연동 | ElevenLabs (500 CHOCO/msg) |
| cNFT 메타데이터 개인화 | 감정/대화 맥락 반영한 커스텀 이미지 |
| Solana Mobile (SMS) | Android APK, Solana dApp Store 등록 |
| x402 Micro-payment 실서비스 | 완전한 프로덕션 결제 흐름 |

---

## 리스크 관리

| 리스크 | 대응 |
|:---|:---|
| DAS API devnet 응답 지연 | 캐싱 처리 또는 민팅 직후 로컬 상태로 즉시 표시 |
| Agent Kit + LangGraph 충돌 | Agent Kit 없이 수동 RPC 호출로 대체 |
| cNFT 민팅 오류 | Metaplex Devnet 상태 확인; 실패 시 Mock NFT로 데모 |
| Blinks X 렌더링 미작동 | dial.to 화면 녹화로 대체 데모 |
| 시간 부족 | Day 11 체크리스트 항목 중 README · 영상 우선, 나머지 축소 |

---

## Related Documents
- **Concept_Design**: [Seoulana Pitch](../01_Concept_Design/03_SEOULANA_PITCH.md) - 해커톤 전략 및 포지셔닝
- **Technical_Specs**: [Solana Integration Specs](../03_Technical_Specs/02_SOLANA_INTEGRATION_SPECS.md) - 기술 구현 명세
- **Technical_Specs**: [Solana Next Features](../03_Technical_Specs/08_SOLANA_NEXT_FEATURES.md) - Privy / SIWS / ZK Compression 구현 현황
- **Logic_Progress**: [Operations Readiness Checklist](./01_OPERATIONS_READINESS_CHECKLIST.md) - 운영 체크리스트
- **Logic_Progress**: [Vercel Deployment Checklist](./02_VERCEL_DEPLOYMENT_404_CHECKLIST.md) - Vercel 배포 점검
