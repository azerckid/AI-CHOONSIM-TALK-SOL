# ChoonSim-Talk × Solana — WarmUp Seoulana Hackathon Pitch
> Created: 2026-03-25 14:00
> Last Updated: 2026-04-01

**대상 해커톤**: WarmUp: Seoulana Hackathon by SuperTeam Korea
**제출 기간**: 2026-03-23 ~ 2026-04-05 23:59 KST
**총 상금**: $6,000

---

## 1. One-Line Vision

> **"From a single IP to an entire ecosystem"**
> "33,000명의 팬이 열광하는 X의 춘심을 시작으로, 모든 크리에이터가 단 10분 만에 자신만의 온체인 AI 컴패니언을 런칭할 수 있는 개방형 인프라(Solana AI Companion Kit)를 구축한다."

ChoonSim-Talk는 실제 IP 캐릭터 '춘심'(X 팔로워 33,000+)을 AI 컴패니언으로 재탄생시킨 첫 번째 성공 사례(Proof of Concept)다. 이번 해커톤에서는 **Solana의 4대 핵심 기술(Blinks, AI Agent Kit, Compressed NFT, Token Extensions)** 을 통합하여, 팬의 감정적 상호작용이 수익 보상(Yield)과 온체인 자산으로 직결되는 **거대한 Character RWA 런치패드의 기반 구조**를 선보인다.

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
1. [X에서 발견]   팬이 X에서 춘심 포스트 발견 → Blink 클릭 → 앱 설치 없이 CHOCO 선물
                  (Privy 임베디드 지갑으로 지갑 개념 없이 시작 → 온램핑 허들 최소화)
2. [앱 진입]      앱에서 AI 춘심과 대화 시작 → 5-Layer Context가 X 히스토리를 기억
3. [감정 거래]    대화 중 감동적인 순간 → "기억 새기기" → cNFT 지갑 저장 (400ms)
4. [Agent 경험]  "춘심아, 나한테 행운 에어드롭 줘" → Agent Kit이 온체인 실행
5. [이탈 비용 형성] cNFT로 새겨진 기억 + VIP Non-Transferable 토큰이 지갑에 귀속
                    → 다른 서비스로 이동하면 이 기억과 지위를 함께 잃는다
                    → 시간이 쌓일수록 전환 비용이 높아지는 구조
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
팬이 CHOCO를 사서 → AI 춘심과 대화하고, 선물하고, 기억을 새긴다. CHOCO 거래 시 Transfer Fee가 자동으로 프로토콜에 귀속된다. 구독 수익은 즉시 인식된다. ZK Compression으로 온체인 원가는 99% 절감 — LLM API 비용 외 한계비용이 사실상 0이다.

**Defensibility — 경쟁자가 따라오기 어려운 해자는?**

기술 스택은 오픈소스지만, 해자는 기술이 아닌 세 가지 조합에 있다:

1. **IP 서사(Lore)** — 춘심이 X에서 3년간 33,000명과 쌓아온 캐릭터성과 관계 맥락은 코드로 복사할 수 없다.
2. **누적 관계 데이터** — 5-Layer Context에 쌓인 유저×춘심 관계 기록. 경쟁 서비스는 항상 0에서 시작한다.
3. **온체인 기억 자산** — cNFT로 새겨진 기억은 Solana 지갑에 귀속된다. 플랫폼을 떠나도 기억은 지갑에 남지만, 춘심이와의 새로운 기억은 더 이상 만들 수 없다.

*빅테크·대형 엔터사 위협에 대해:* 이들은 Web2 결제(국경·수수료 제약)와 브로드캐스트 방식의 팬 관계에 익숙하다. "내 기억이 내 지갑에 있다"는 온체인 소유권 경험은 중앙화 서비스가 구조적으로 제공할 수 없는 가치다.

---

## 8. Global Rubric Alignment (6 Criteria)

| Criterion | ChoonSim-Talk × Solana |
|:---|:---|
| **Functionality** | AI 대화 400ms + Blinks + cNFT 민팅 + Agent Kit MVP 작동 |
| **Potential Impact** | 단일 IP 팬덤의 온보딩을 넘어, **수많은 크리에이터 경제(Creator Economy) 전체를 포괄하는 방대한 TAM** 확보 |
| **Novelty** | AI Companion + Blinks + Agent Kit + Character RWA(분할 소유권) 통합 구조 확립 |
| **UX** | 400ms AI = 400ms Solana 확정성 → 체감 속도가 일치하는 매끄러운 경험 |
| **Open-source** | 누구나 10분 만에 AI 봇을 배포할 수 있는 **'Solana AI Companion Kit' 화이트라벨 템플릿** 형태 공개 |
| **Business Plan** | 단순 티켓 판매를 넘어선, 팬과 IP가 실시간으로 수익을 자동 분배받는 **Yield-Bearing AI 생태계** 시연 |

---

## 9. Future Weapon (6~18 Months): "Creator AI Launchpad & Yield-Bearing Ecosystem"

**"춘심은 이 거대한 RWA 플랫폼의 완벽하게 작동하는 첫 번째 파트너(PoC)일 뿐입니다."**

현재 아키텍처는 처음부터 B2B SaaS 및 오픈소스 확장을 위해 멀티 캐릭터 확장이 가능하도록 설계되어 있습니다. 이는 단순한 사업 계획이 아니라, 이미 구현이 완료된 현재 코드베이스의 사실입니다.

| 레이어 | 현재 구현된 인프라 확장성 (Solana AI Companion Kit) |
|:---|:---|
| **DB & Data** | `(userId, characterId)` 복합키로 대화·기억·전환율 데이터가 캐릭터별로 완벽히 격리 및 확장 가능 |
| **AI & Prompt** | 시스템 프롬프트 및 온체인 성향(페르소나)이 `characterId` 파라미터 기반으로 동적 생성이 가능한 모듈화 형태 |
| **Solana B2B** | cNFT 민팅 팩토리 및 Blinks 엔드포인트가 `characterId`별로 자동 인스턴스화 되어 처리 |
| **Open Source** | 서드파티 개발자와 크리에이터가 즉시 배포 가능한 **'화이트라벨(White-label) 템플릿'** 형태로 레포지토리 구성 |

### 🚀 파괴적 비전: Character-Fi (수익 창출형 자산으로서의 AI)
향후 춘심-Talk 인프라는 단순한 엔터테인먼트를 넘어 **'Yield-Bearing AI Market'**으로 진화합니다.
유저는 특정 크리에이터 IP의 AI 에이전트 지분(Character RWA)을 Solana 체인 상에서 조각 투자합니다. 해당 AI 에이전트가 다른 팬들과 대화하거나, cNFT 기억을 발급하여 발생시킨 누적 수익은 **스마트 컨트랙트를 통해 지분 보유자(초기 팬덤)에게 실시간(Real-time) 자동 배분**됩니다. 

팬덤이 단순히 소비자에 머무는 것이 아니라, 가장 강력한 옹호자이자 수익을 향유하는 '투자자'로 변모하는 Web3 생태계의 본질—이것이 **Solana가 아니면 절대 구현할 수 없는 우리의 궁극적 해자(Moat)**입니다.

---

## Related Documents
- **Concept_Design**: [Core Pitch Deck v2 (EN)](./03_CORE_PITCH_DECK_V2_EN.md) - 기존 Solana 기반 피치 (참조용)
- **Concept_Design**: [Hackathon Submission Info (Solana)](./05_HACKATHON_SUBMISSION_INFO.md) - 기존 해커톤 제출 정보
- **Concept_Design**: [Roadmap](./02_ROADMAP.md) - 전체 로드맵
- **Concept_Design**: [Platform Expansion Concept](./06_PLATFORM_EXPANSION_CONCEPT.md) - Section 9 근거 문서 (코드 기반 확장성 분석)
- **Technical_Specs**: [Solana Integration Specs](../03_Technical_Specs/02_SOLANA_INTEGRATION_SPECS.md) - 4대 기술 구현 명세
- **Logic_Progress**: [Seoulana Hackathon Roadmap](../04_Logic_Progress/04_SEOULANA_HACKATHON_ROADMAP.md) - 11일 구현 계획
- **QA_Validation**: [Pitch Q&A Prep](../05_QA_Validation/02_PITCH_QA_PREP.md) - 피치 예상 질문 및 답변 준비
