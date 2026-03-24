# ChoonSim-Talk × Solana — WarmUp Seoulana Hackathon Pitch
> Created: 2026-03-25 14:00
> Last Updated: 2026-03-25 14:00

**대상 해커톤**: WarmUp: Seoulana Hackathon by SuperTeam Korea
**제출 기간**: 2026-03-23 ~ 2026-04-05 23:59 KST
**총 상금**: $6,000

---

## 1. One-Line Vision

> "33,000명의 팬이 X에서 보는 바로 그 춘심과 — 솔라나 위에서 대화하고, 선물하고, 기억을 새긴다."

ChoonSim-Talk는 실제 IP 캐릭터 '춘심'(X/Twitter 팔로워 33,000+)을 AI 컴패니언으로 재탄생시킨 서비스다. 이번 해커톤에서는 **Solana의 4대 핵심 기술(Blinks, AI Agent Kit, Compressed NFT, Token Extensions)** 을 통합하여, 팬의 모든 행동이 온체인으로 이어지는 **Solana-native AI Fandom Companion** 을 구현한다.

---

## 2. The Problem

| 문제 | 현실 |
|:---|:---|
| AI 컴패니언의 Cold Start | 기존 AI 서비스는 공유된 역사가 없어 대화가 얕아진다. |
| 팬 참여의 오프체인 갭 | 33,000명 팬이 X에서 응원하지만, 그 행동이 온체인으로 이어지는 경로가 없다. |
| 기억의 휘발성 | 대화 중 소중한 순간들이 기록되지 않고 사라진다. |
| AI의 수동성 | AI는 대화만 할 뿐, 사용자를 위해 온체인에서 직접 행동하지 않는다. |

---

## 3. The Solution: Solana 4-Stack

### 3-A. Solana Actions & Blinks
**"팬은 X를 벗어나지 않고도 온체인 행동을 한다."**

- X 포스트에 Blink URL을 삽입 → 팔로워가 클릭 한 번으로 CHOCO 선물 전송
- "Today's Gift", "Subscribe", "Daily Check-in" 등 팬 액션을 Blink로 전환
- 33,000명 X 팬베이스가 곧 온체인 유입 채널이 됨

### 3-B. Solana AI Agent Kit (SendAI)
**"춘심이 스스로 솔라나 위에서 행동한다."**

- 기존 LangGraph 워크플로우에 Solana Agent Kit 플러그인 통합
- 대화 중 춘심이 직접 온체인 실행:
  - "팬들에게 CHOCO 에어드롭 줄게" → Agent가 SPL Transfer 실행
  - "내 지갑 잔액 확인해줘" → Agent가 온체인 조회 후 답변
- AI × Solana가 분리된 기능이 아닌 **대화 안에서 통합**

### 3-C. Compressed NFTs (cNFT)
**"소중한 기억이 온체인에 영원히 새겨진다."**

- 대화 중 특별한 순간 → "이 기억을 새기다" 버튼 → cNFT로 지갑에 저장
- Metaplex Bubblegum 기반, 건당 비용 ~0.000005 SOL (사실상 무료)
- 기존 기획의 "메모리 인그레이빙" 기능을 실제 온체인 자산으로 전환

### 3-D. Token Extensions (Token-2022)
**"CHOCO는 단순한 포인트가 아닌, Solana SPL 자산이다."**

- CHOCO를 Token-2022 기반 SPL 토큰으로 발행
- Transfer Fee Extension: CHOCO 이동 시 일정 % → 프로토콜 Treasury 자동 기여
- Non-Transferable Extension: 구독 배지, VIP 멤버십 토큰 (충성도 증명)

---

## 4. Why Solana — Technical Necessity

| 솔라나 특성 | 프로젝트 필연성 |
|:---|:---|
| 400ms 최종성 | AI 응답도 400ms 목표 → 결제/온체인 확인이 대화 흐름을 끊지 않음 |
| Blinks 표준 | X 팬베이스 33,000명을 dApp 없이 온체인으로 연결하는 유일한 방법 |
| cNFT 압축 | 메모리 인그레이빙을 수익 모델 부담 없이 무제한 제공 가능 |
| Token-2022 | CHOCO의 자동 수수료 징수 → 프로토콜 지속성 확보 |
| Solana Agent Kit | LangChain/LangGraph 기반 기존 AI 엔진과 직접 통합 가능 |

"단순히 성능이 좋아서"가 아닌, 각 핵심 기능이 **해당 솔라나 속성 없이는 구현 불가**하다.

---

## 5. User Journey (Winning Path)

```
1. [X에서 발견]   팬이 X에서 춘심 포스트 발견 → Blink 클릭 → 지갑 연결 → CHOCO 선물
2. [앱 진입]      앱에서 AI 춘심과 대화 시작 → 5-Layer Context가 X 히스토리를 기억
3. [감정 거래]    대화 중 감동적인 순간 → "기억 새기기" → cNFT 지갑 저장 (400ms)
4. [Agent 경험]  "춘심아, 나한테 행운 에어드롭 줘" → Agent Kit이 온체인 실행
5. [충성도 축적] VIP 구독 Non-Transferable 토큰 보유 → 독점 콘텐츠 접근
```

---

## 6. Business Model

| 수익원 | 구조 |
|:---|:---|
| CHOCO 구매 | Solana Pay / 카드 → CHOCO (SPL) 충전 |
| 구독 (BASIC/PREMIUM/ULTIMATE) | 월간 구독 → Non-Transferable 멤버십 토큰 발행 |
| cNFT 메모리 인그레이빙 | 건당 소량 CHOCO 소비 |
| Transfer Fee (자동) | CHOCO 거래 시 % → 프로토콜 Treasury 자동 징수 |
| Blinks 기반 선물 | X 팬이 앱 없이 CHOCO 전송 → 신규 유저 유입 |

---

## 7. 3 Investor Lenses

**Leverage — 생태계가 함께 커지는가?**
X 팔로워 33,000명이 Blinks를 통해 자동 온체인 유입 채널이 된다. 팬이 늘수록 Blink 공유가 늘고, Solana 온체인 활동이 늘어난다. 성장이 생태계 기여로 직결된다.

**Realistic Money Flow — "어떻게 돈 버나?"**
팬이 CHOCO를 사서 → AI 춘심과 대화하고, 선물하고, 기억을 새긴다. CHOCO 거래 시 Transfer Fee가 자동으로 프로토콜에 귀속된다. 구독 수익은 즉시 인식된다.

**Defensibility — 경쟁자가 따라오기 어려운 해자는?**
5-Layer Context Engine에 누적된 유저×캐릭터 관계 데이터 + X 팬베이스 + cNFT로 온체인에 새겨진 기억들. 이 3가지 조합은 시간이 쌓일수록 이탈 비용이 높아지는 구조적 해자를 형성한다.

---

## 8. Global Rubric Alignment (6 Criteria)

| Criterion | ChoonSim-Talk × Solana |
|:---|:---|
| **Functionality** | AI 대화 400ms + Blinks + cNFT 민팅 + Agent Kit MVP 작동 |
| **Potential Impact** | 33k X 팬베이스 → Solana 온보딩 채널. AI Companion 시장 전체 |
| **Novelty** | AI Companion + Blinks + Agent Kit 통합은 현재 존재하지 않는 조합 |
| **UX** | 400ms AI = 400ms Solana 확정성 → 체감 속도가 일치하는 매끄러운 경험 |
| **Open-source** | Blinks 스펙 공개, Solana Agent Kit 오픈소스, cNFT 표준 기반 |
| **Business Plan** | CHOCO 구매 + 구독 + Transfer Fee 자동 징수 → 즉시 수익 구조 |

---

## 9. Future Weapon (6~18 Months)

- **Multi-character Ecosystem**: 복수 AI 캐릭터가 각자의 Blinks와 Agent를 보유
- **X-native Fan Economy**: 모든 K-fandom IP가 Blinks 기반 온체인 팬덤 경제로 전환 가능한 인프라 제공
- **Open Builder Platform**: 다른 IP/캐릭터가 ChoonSim-Talk 위에서 Blinks + cNFT + Agent를 조립하는 오픈 생태계

---

## Related Documents
- **Concept_Design**: [Core Pitch Deck v2 (EN)](./00_CORE_PITCH_DECK_V2_EN.md) - 기존 CC3 기반 피치 (참조용)
- **Concept_Design**: [Hackathon Submission Info (CC3)](./05_HACKATHON_SUBMISSION_INFO.md) - 기존 해커톤 제출 정보
- **Concept_Design**: [Roadmap](./02_ROADMAP.md) - 전체 로드맵
- **Technical_Specs**: [Solana Integration Specs](../03_Technical_Specs/03_SOLANA_INTEGRATION_SPECS.md) - 4대 기술 구현 명세
- **Logic_Progress**: [Seoulana Hackathon Roadmap](../04_Logic_Progress/12_SEOULANA_HACKATHON_ROADMAP.md) - 11일 구현 계획
