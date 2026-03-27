# Solana Integration Technical Specs — ChoonSim-Talk
> Created: 2026-03-25 14:00
> Last Updated: 2026-03-25 14:00

4대 Solana 기술(Blinks, AI Agent Kit, Compressed NFT, Token Extensions)의 구현 명세.

---

## 1. 기술 스택 전제

| 항목 | 현재 | 추가/변경 |
|:---|:---|:---|
| AI 엔진 | LangGraph + Gemini API | + Solana Agent Kit (LangChain 플러그인) |
| 결제 | Solana Pay (기존 구현) | + Blinks Actions API |
| NFT | 없음 | Metaplex Bubblegum (cNFT) |
| 토큰 | CHOCO (DB 포인트) | CHOCO → SPL Token-2022 |
| 지갑 | EVM wallet (Solana용) | Solana wallet (Phantom, Solflare) |
| SDK | @solana/web3.js (기존) | + @metaplex-foundation/mpl-bubblegum, @solana/spl-token |

---

## 2. Solana Actions & Blinks

### 2.1 개념
Actions API는 `/api/actions/` 하위 엔드포인트로 구현한다. Blink는 해당 URL을 포함한 링크다. X(Twitter) 등에서 공유 시 Blink-aware 클라이언트(Phantom 브라우저 확장 등)가 인터랙티브 UI로 렌더링한다.

### 2.2 구현할 Actions

| Action | 엔드포인트 | 설명 |
|:---|:---|:---|
| Gift CHOCO | `GET/POST /api/actions/gift` | 선택한 CHOCO 수량만큼 춘심에게 선물 |
| Subscribe | `GET/POST /api/actions/subscribe` | 구독 플랜 선택 후 결제 |
| Daily Check-in | `GET/POST /api/actions/checkin` | 데일리 미션 체크인 (온체인 서명) |

### 2.3 Actions API 응답 형식

```typescript
// GET /api/actions/gift — 메타데이터 반환
{
  title: "춘심에게 CHOCO 선물하기",
  description: "X에서 바로 선물을 보내세요. 지갑 연결 한 번이면 충분합니다.",
  icon: "https://cdn.example.com/choonsim-gift.png",
  label: "선물하기",
  links: {
    actions: [
      { label: "100 CHOCO", href: "/api/actions/gift?amount=100" },
      { label: "500 CHOCO", href: "/api/actions/gift?amount=500" },
      { label: "직접 입력", href: "/api/actions/gift?amount={amount}", parameters: [...] }
    ]
  }
}

// POST /api/actions/gift — 트랜잭션 반환
{
  transaction: "<base64-encoded-solana-transaction>",
  message: "춘심이 선물을 기다리고 있어요!"
}
```

### 2.4 필요한 신규 파일

```
apps/web/app/routes/api/actions/
  gift.ts          — Gift Action
  subscribe.ts     — Subscribe Action
  checkin.ts       — Daily Check-in Action
apps/web/app/lib/solana/
  actions.server.ts — Actions 공통 유틸 (트랜잭션 생성)
  blinks.ts         — Blink URL 생성 헬퍼
```

### 2.5 CORS 설정 (필수)
Actions API는 외부 클라이언트에서 호출되므로 반드시 허용해야 함:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

---

## 3. Solana AI Agent Kit (SendAI)

### 3.1 개념
LangChain 기반의 Solana Agent Kit을 기존 LangGraph 워크플로우에 통합한다. 대화 중 특정 인텐트가 감지되면 AI가 온체인 액션을 직접 실행한다.

### 3.2 설치
```bash
npm install solana-agent-kit
```

### 3.3 기존 LangGraph 통합 포인트
`apps/web/app/lib/ai/graph.ts`의 기존 4-node 워크플로우에 Agent node를 추가한다.

```
[기존 노드]
1. analyzePersona → 2. retrieveContext → 3. callGemini → 4. extractMarkers

[추가]
2.5. detectOnchainIntent (새 노드)
  — 인텐트 감지 시 SolanaAgentKit 실행
  — 결과를 callGemini 입력에 컨텍스트로 삽입
```

### 3.4 지원할 온체인 인텐트

| 인텐트 키워드 | 실행 액션 | Agent Kit 메서드 |
|:---|:---|:---|
| "잔액 확인" / "얼마 있어" | SOL/CHOCO 잔액 조회 | `getBalance()` |
| "에어드롭" / "선물 줄게" | SPL Transfer 실행 | `transfer()` |
| "민팅해줘" / "기억 새겨줘" | cNFT 민팅 트리거 | 내부 호출 |
| "지갑 주소" | 유저 지갑 주소 반환 | `getWalletAddress()` |

### 3.5 필요한 신규 파일

```
apps/web/app/lib/ai/
  solana-agent.server.ts  — SolanaAgentKit 초기화 및 인텐트 핸들러
  intent-classifier.ts    — 온체인 인텐트 감지 로직 (키워드 + Gemini 분류)
```

### 3.6 환경 변수 추가
```
SOLANA_RPC_URL=           # Mainnet/Devnet RPC
SOLANA_AGENT_PRIVATE_KEY= # 에이전트용 SOL 지갑 (서버 보관, 암호화 필수)
OPENAI_API_KEY=           # Agent Kit이 OpenAI 기본 사용 (또는 Gemini 대체 설정)
```

---

## 4. Compressed NFTs (cNFT) — 메모리 인그레이빙

### 4.1 개념
Metaplex Bubblegum 프로그램 + Merkle Tree를 사용한다. NFT 데이터는 오프체인(Arweave/IPFS)에 저장하고, 머클 루트만 온체인에 기록한다.

### 4.2 비용
| 항목 | 비용 |
|:---|:---|
| Merkle Tree 생성 (14 depth, 최대 16,384개 NFT) | ~0.1 SOL (1회) |
| cNFT 1개 민팅 | ~0.000005 SOL |
| 10,000개 민팅 | ~0.05 SOL |

### 4.3 민팅 플로우

```
1. 유저가 대화 중 "기억 새기기" 클릭
2. 해당 메시지 + 타임스탬프 + 감정 상태 → 메타데이터 구성
3. 메타데이터를 Cloudinary(기존 사용 중)에 JSON 업로드
4. Bubblegum mintV1 호출 → cNFT를 유저 지갑에 발행
5. DB message 테이블에 nftMintAddress 기록
6. UI에 "기억이 새겨졌습니다" + Solana Explorer 링크 표시
```

### 4.4 메타데이터 구조

```json
{
  "name": "춘심과의 기억 #001",
  "description": "2026-03-25, 첫 번째 대화의 기억",
  "image": "<cloudinary-message-thumbnail-url>",
  "attributes": [
    { "trait_type": "character", "value": "ChoonSim" },
    { "trait_type": "emotion", "value": "happy" },
    { "trait_type": "date", "value": "2026-03-25" }
  ],
  "properties": {
    "category": "memory",
    "conversationId": "<uuid>"
  }
}
```

### 4.5 필요한 신규 파일

```
apps/web/app/lib/solana/
  cnft.server.ts          — Bubblegum 민팅 로직
  merkle-tree.server.ts   — Merkle Tree 관리 (생성/재사용)
apps/web/app/routes/api/memory/
  engrave.ts              — cNFT 민팅 API 엔드포인트
```

### 4.6 DB 스키마 변경

```sql
-- message 테이블에 컬럼 추가
ALTER TABLE message ADD COLUMN nft_mint_address TEXT;
ALTER TABLE message ADD COLUMN nft_engraved_at INTEGER; -- Unix timestamp
```

---

## 5. Token Extensions (Token-2022) — CHOCO SPL 토큰

### 5.1 현재 vs 목표

| | 현재 | 목표 |
|:---|:---|:---|
| CHOCO | DB의 정수 컬럼 | Solana SPL Token-2022 |
| 전송 | DB 업데이트 | 온체인 SPL Transfer |
| 수수료 | 없음 | Transfer Fee Extension (자동 징수) |

### 5.2 Token-2022 Extension 선택

| Extension | 적용 | 설정값 |
|:---|:---|:---|
| Transfer Fees | CHOCO 전송 시 2% → Treasury 자동 귀속 | feeBasisPoints: 200 |
| Non-Transferable | VIP 멤버십 배지 (별도 토큰) | 양도 불가 |
| Metadata Pointer | 토큰 메타데이터 온체인 저장 | 토큰명, 심볼, 아이콘 |

### 5.3 전환 전략 (단계적)

MVP 범위 (해커톤):
- CHOCO SPL Token-2022 Devnet 발행 및 데모
- Transfer Fee 작동 확인
- 기존 DB CHOCO는 유지 (완전 마이그레이션은 해커톤 이후)

Post-hackathon:
- DB CHOCO ↔ SPL CHOCO 브리지 로직 구현
- 유저 지갑 연동하여 실제 온체인 잔액으로 전환

### 5.4 필요한 신규 파일

```
apps/web/app/lib/solana/
  choco-token.server.ts   — CHOCO Token-2022 발행, 전송, 잔액 조회
scripts/
  deploy-choco-token.ts   — 토큰 최초 배포 스크립트 (일회성)
```

### 5.5 환경 변수 추가
```
CHOCO_TOKEN_MINT_ADDRESS=  # CHOCO SPL 토큰 mint 주소 (배포 후 고정)
CHOCO_TREASURY_ADDRESS=    # Transfer Fee 수취 주소
```

---

## 6. 공통 인프라

### 6.1 Solana 지갑 연동 (프론트엔드)

현재 EVM 지갑(MetaMask 계열) → Solana 지갑(Phantom, Solflare) 추가.

```bash
npm install @solana/wallet-adapter-react @solana/wallet-adapter-phantom
```

`apps/web/App.tsx`에 `WalletProvider` 추가. 기존 EVM 지갑은 유지하되, Solana 지갑을 선택적으로 연결 가능하게 한다.

### 6.2 RPC 설정
```
SOLANA_RPC_URL=https://api.devnet.solana.com  # 해커톤 데모용 Devnet
# 운영: Helius, QuickNode 등 유료 RPC로 전환
```

### 6.3 테스트 환경
- 네트워크: Solana Devnet
- 지갑: Phantom Devnet 모드
- SOL 충전: `solana airdrop 2 <address> --url devnet`

---

## 7. 구현 우선순위 (해커톤 MVP 기준)

| 우선순위 | 기능 | 이유 |
|:---|:---|:---|
| 1 | Blinks (Gift + Subscribe) | 데모 임팩트 최대, 구현 난이도 중 |
| 2 | cNFT 메모리 인그레이빙 | UX 스토리 강력, 비용 제로 |
| 3 | AI Agent Kit (잔액 조회 + 에어드롭) | AI×Solana 통합 핵심 데모 |
| 4 | CHOCO Token-2022 | Devnet 데모 수준으로 완성 |

---

## 8. 현재 구현 현황 및 아키텍처

> Last Updated: 2026-03-27

### 8.1 Solana 용어 — Program

Solana에서는 Ethereum의 "스마트컨트랙트(Smart Contract)"에 해당하는 개념을 **Program** 이라고 부른다. 온체인에 배포되어 실행되는 코드 단위를 지칭하는 Solana 공식 용어다.

### 8.2 현재 구현된 Solana 기능

| 기능 | 구현 파일 | 설명 |
|:---|:---|:---|
| 지갑 연결 | `components/solana/SolanaWalletProvider.tsx` | Phantom 지갑 연결 (wallet-adapter) |
| Solana Pay | `components/payment/SolanaPayButton.tsx` | QR 코드 결제 → CHOCO 충전 |
| Blinks/Actions | `routes/admin/blinks.tsx` | 체크인, CHOCO 선물, 구독 (온체인 트랜잭션) — 어드민 전용 페이지 |
| cNFT 메모리 앨범 | `lib/solana/cnft.server.ts` | Bubblegum으로 특별한 순간을 cNFT로 발행 |

### 8.3 사용 중인 공인 Program

현재 프로젝트에는 **직접 작성한 온체인 Program이 없다.** 클라이언트 레이어만 존재하며, Solana 생태계에서 공인된 표준 Program들을 호출하는 방식으로 구현되어 있다.

| Program | 운영 주체 | 위상 | 사용 목적 |
|:---|:---|:---|:---|
| **System Program** | Solana Labs (내장) | Solana 네이티브 프로그램 | SOL 전송 기반 |
| **SPL Token Program** | Solana Labs | Solana 공식 토큰 표준 | CHOCO 토큰 처리 |
| **Memo Program** | Solana Labs | Solana 공식 내장 프로그램 | 체크인 온체인 기록 |
| **Metaplex Bubblegum** | Metaplex Foundation | Solana cNFT 표준 제정 기관 | cNFT 메모리 발행 |

Ethereum에서 ERC-20 표준 컨트랙트를 사용하는 것과 동일한 맥락이다. System Program / SPL Token / Memo는 Solana 프로토콜에 내장된 수준이며, Metaplex는 Solana Foundation과 협력하는 NFT 표준 재단이다.

### 8.4 아키텍처 요약

```
[클라이언트 레이어] — 직접 작성한 코드
  ├── React UI (wallet-adapter, SolanaPayButton, AdminBlinksPage)
  └── Server API (cnft.server.ts, actions/*)

[온체인 레이어] — 남의 공인 Program 호출
  ├── Metaplex Bubblegum → cNFT 발행
  ├── System Program      → SOL 전송
  ├── SPL Token Program   → 토큰 처리
  └── Memo Program        → 온체인 기록
```

자체 Anchor Program 개발 계획은 없으며, 현재 기능 세트로 완결된 상태다.

---

## Related Documents
- **Concept_Design**: [Seoulana Pitch](../01_Concept_Design/03_SEOULANA_PITCH.md) - 전략 및 비즈니스 모델
- **Logic_Progress**: [Seoulana Hackathon Roadmap](../04_Logic_Progress/04_SEOULANA_HACKATHON_ROADMAP.md) - 11일 구현 일정
- **Technical_Specs**: [Admin CHOCO Economy Spec](./01_admin-choco-economy-spec.md) - 기존 CHOCO 정책
