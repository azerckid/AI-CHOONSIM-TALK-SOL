# 프로젝트 로드맵 (ChoonSim-Talk × Solana)
> Created: 2025-12-01
> Last Updated: 2026-03-25

---

## 현재 기술 스택

- **Framework**: React Router v7 (Vite) + Vercel Edge
- **Database**: Turso (libSQL) + Drizzle ORM
- **AI**: Gemini 2.5 Flash + LangGraph (5-Layer Context)
- **Auth**: Better Auth (session-based)
- **Blockchain**: Solana Devnet → Mainnet
- **Payment**: CHOCO (SPL Token-2022) + x402 마이크로 결제

---

## Phase 0 — MVP 완성 (✅ 2026-03-25 완료)

| 항목 | 상태 |
|:---|:---|
| Solana 개발 환경 (Devnet 지갑, WalletProvider) | ✅ |
| Solana Actions & Blinks (gift / subscribe / checkin 3종) | ✅ |
| CHOCO Token-2022 Devnet 배포 (`E2o1MK...`) | ✅ |
| Merkle Tree cNFT Devnet 배포 (`AJxCqb...`) | ✅ |
| cNFT 민팅 API (`POST /api/solana/mint-memory`) | ✅ |
| AI Agent Kit — LangGraph Solana 툴 5개 통합 | ✅ |
| Blinks 데모 페이지 (`/blinks`) + WalletButton | ✅ |
| `verify-solana-stack.ts` 검증 스크립트 10/10 PASS | ✅ |

---

## Phase 1 — Seoulana 해커톤 제출 (🎯 2026-04-05 마감)

| 항목 | 상태 | 설명 |
|:---|:---|:---|
| cNFT 메모리 앨범 UI (`/profile/memories`) | 🔲 | DAS API로 지갑 내 cNFT 조회·표시 |
| Vercel 배포 (라이브 URL) | 🔲 | 해커톤 심사위원 접속용 |
| 데모 시나리오 E2E 1회 완주 | 🔲 | Gift Blink → cNFT 민팅 → Agent 잔액 조회 |
| 데모 영상 녹화 (3분 이내) | 🔲 | |
| GitHub README 업데이트 | 🔲 | Solana 기능 포함 |
| SuperTeam Korea 슬랙 제출 | 🔲 | 마감 4/5 23:59 KST |

**데모 시나리오 (3분)**:
1. X에서 춘심 포스트 확인 → Gift Blink 클릭 → Phantom 서명 → 선물 완료
2. 앱에서 AI 춘심과 대화 → 감동적인 순간 → "기억 새기기" → cNFT 민팅 → Explorer 확인
3. "춘심아, 내 SOL 잔액 얼마야?" → Agent Kit이 온체인 조회 → 응답
4. CHOCO Token-2022 Solana Explorer 링크 공유

---

## Phase 2 — 수익화 고도화 (2026-04 이후)

| 항목 | 설명 |
|:---|:---|
| CHOCO Mainnet 배포 | Devnet → Mainnet 전환 |
| x402 마이크로 결제 정식 가동 | CHOCO 기반 건당 과금 (500원 이하 마이크로) |
| 결정적 순간 페이월 | 호감도 Lv. 달성 시 cNFT / 보이스 / 시크릿 에피소드 잠금 해제 |
| 보이스 메시지 TTS | ElevenLabs 연동, CHOCO 500/회 |
| 관계 기반 등급제 | 방문자 → 팬 → 조상신 → 고래 (X 인증 + 온체인 활동 기준) |
| Non-Transferable 구독 토큰 | VIP 멤버십 배지 (Token-2022 Extension) |

---

## Phase 3 — 생태계 확장 (2026 하반기)

| 항목 | 설명 |
|:---|:---|
| Multi-character Ecosystem | 복수 AI 캐릭터 각자 Blinks + Agent 보유 |
| X-native Fan Economy | 모든 K-fandom IP가 Blinks 기반 온체인 팬덤 경제로 전환 가능한 인프라 |
| Open Builder Platform | 외부 IP/캐릭터가 Blinks + cNFT + Agent를 조립하는 오픈 생태계 |
| Credit-based AI Agent | 유저 온체인 활동 학습 → 자산 관리 지원 에이전트 |
| Character RWA Market | AI 캐릭터가 수익 창출 RWA로 Solana 마켓플레이스에서 거래 |

---

## Antigravity Global Rubric (6/6)

| Criterion | 현황 |
|:---|:---|
| **Functionality** | AI 대화 400ms + Blinks 3종 + cNFT 민팅 + Agent Kit Devnet 작동 |
| **Potential Impact** | X 팔로워 33,000명 → Solana 온보딩 채널. AI Companion 글로벌 시장 |
| **Novelty** | AI Companion + Blinks + Agent Kit 통합 — 현존하지 않는 조합 |
| **UX** | 400ms AI 응답 = 400ms Solana 확정성 → 체감 속도 일치 |
| **Open-source** | Blinks 스펙 공개, Solana Agent Kit 오픈소스, cNFT Bubblegum 표준 |
| **Business Plan** | CHOCO 구매 + 구독 + Transfer Fee 자동 징수 → 즉시 수익 구조 |

---

## Related Documents
- **Concept_Design**: [Core Pitch Deck](./01_CORE_PITCH_DECK.md) - 투자자 피치 및 핵심 비즈니스 비전
- **Concept_Design**: [Seoulana Pitch](./03_SEOULANA_PITCH.md) - 해커톤 전략
- **Concept_Design**: [Monetization Strategy](./05_MONETIZATION_STRATEGY.md) - 수익 모델 상세
- **Logic_Progress**: [Seoulana Hackathon Roadmap](../04_Logic_Progress/04_SEOULANA_HACKATHON_ROADMAP.md) - 11일 구현 계획
- **Technical_Specs**: [Solana Integration Specs](../03_Technical_Specs/02_SOLANA_INTEGRATION_SPECS.md) - 기술 구현 명세
