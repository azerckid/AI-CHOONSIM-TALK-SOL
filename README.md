# 춘심 (Choonsim) × Solana

> **AI Virtual Companion powered by Solana** — Seoulana Hackathon 2025

[![Deploy](https://img.shields.io/badge/Vercel-Live-brightgreen?logo=vercel)](https://web-beryl-six.vercel.app)
[![Solana](https://img.shields.io/badge/Solana-Devnet-9945FF?logo=solana)](https://explorer.solana.com/?cluster=devnet)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

**라이브 데모**: https://web-beryl-six.vercel.app

---

## 프로젝트 소개

춘심(Choonsim)은 X(Twitter)에 3.3만 팔로워를 보유한 실제 K-pop 팬덤 IP를 기반으로 한 AI 가상 동반자 앱입니다.

단순한 AI 채팅을 넘어, Solana 블록체인을 통해 팬과 AI 캐릭터 사이의 **관계를 온체인에 기록**합니다:
- 대화 내용을 cNFT로 영구 각인
- X(Twitter)에서 Blinks로 즉시 상호작용
- AI 에이전트가 지갑 잔액을 조회하고 Blink를 제안
- CHOCO SPL Token-2022로 앱 내 경제 운영

---

## Solana 4-Stack

| 기능 | 설명 | 상태 |
|------|------|------|
| **Solana Actions & Blinks** | X(Twitter)에서 Gift / Check-in / Subscribe 액션 직접 실행 | ✅ Live |
| **Token Extensions (Token-2022)** | 1% Transfer Fee + Non-Transferable Extension — CHOCO SPL 토큰 | ✅ Deployed |
| **Compressed NFT (cNFT)** | Metaplex Bubblegum Merkle Tree 기억 각인 (~0.0001 SOL) | ✅ Deployed |
| **Solana AI Agent Kit** | LangGraph 채팅 파이프라인에 Solana 도구 5종 통합 | ✅ Live |

---

## 온체인 주소 (Devnet)

```
CHOCO Token-2022 Mint : E2o1MKpnwh5vELG4FDgiX2NA33L11hXPVfAPD3ai4GWf
cNFT Merkle Tree      : AJxCqbFdWLmQ7xMqBQN3AXja9paZJZ9qrqvwViXVkXGF
Agent Wallet          : CaURTs8NibhmX8kAT9wHAkFv32b4NhuLBEAPxZXkuVyC
Treasury Wallet       : Akfuxv8pQvrLpMyEVEFaBrTfCS4f3y6kQCpYmvYQcxag
```

---

## Blinks Endpoints

| 엔드포인트 | 설명 |
|-----------|------|
| `GET/POST /api/actions/gift` | CHOCO 선물 (100 / 500 / 1,000) |
| `GET/POST /api/actions/checkin` | 일일 체크인 + 50 CHOCO 지급 (Memo on-chain) |
| `GET/POST /api/actions/subscribe` | SOL 구독 (0.01 SOL/월) |
| `POST /api/actions/checkin/verify` | 트랜잭션 확인 + CHOCO DB 반영 |
| `GET /actions.json` | Blinks 레지스트리 (dialect 등록용) |

**Blink 실행 예시:**
```
https://dial.to/?action=solana-action:https://web-beryl-six.vercel.app/api/actions/checkin
https://dial.to/?action=solana-action:https://web-beryl-six.vercel.app/api/actions/gift
```

---

## AI Agent Kit 도구

춘심 AI가 대화 중 자동으로 호출하는 Solana 도구 5종:

| 도구 | 트리거 예시 | 동작 |
|------|------------|------|
| `checkChocoBalance` | "내 초코 얼마야?" | SPL Token-2022 잔액 조회 |
| `getSolBalance` | "지갑 잔액 알려줘" | SOL 잔액 조회 |
| `getCheckinBlink` | "무료 초코 받고 싶어" | Check-in Blink URL 반환 |
| `getGiftBlink` | "선물하고 싶어" | Gift Blink URL 반환 |
| `getMemoryNFTInfo` | "추억을 NFT로 남기고 싶어" | cNFT 각인 안내 + Mint API 안내 |

---

## cNFT 기억 각인

특별한 대화를 Solana Devnet에 cNFT로 영구 기록합니다.

```bash
POST /api/solana/mint-memory
Content-Type: application/json

{
  "ownerAddress": "<user solana wallet>",
  "name": "춘심과의 첫 대화",
  "description": "2026-03-25 특별한 순간",
  "characterId": "chunsim"
}
# 비용: 200 CHOCO / 각인 비용: ~0.0001 SOL
```

각인된 cNFT는 `/profile/memories` 페이지에서 온체인 앨범으로 조회할 수 있습니다.

---

## 주요 페이지

| 경로 | 설명 |
|------|------|
| `/` | 랜딩 페이지 |
| `/chat` | AI 춘심과 1:1 대화 (LangGraph + Gemini 2.5 Flash) |
| `/blinks` | Solana Blinks 데모 페이지 |
| `/profile` | 프로필 + Solana 지갑 섹션 |
| `/profile/memories` | cNFT 기억 앨범 (DAS API `getAssetsByOwner`) |
| `/shop` | CHOCO 아이템 스토어 |
| `/pricing` | 구독 플랜 |
| `/guide` | CHOCO & 아이템 가이드 |

---

## Tech Stack

- **Frontend**: React Router v7, React 19, Tailwind CSS, shadcn/ui, Solana Wallet Adapter
- **AI**: LangGraph + Gemini 2.5 Flash, Solana AI Agent Kit v2
- **Blockchain**: Solana (Devnet), `@solana/web3.js`, `@solana/spl-token`, Metaplex Bubblegum, `@solana/actions`
- **Database**: Turso (libSQL) + Drizzle ORM
- **Auth**: Better Auth (Google / Kakao / Twitter OAuth)
- **Payments**: PayPal, Toss Payments, Coinbase Commerce, Solana Pay
- **Deploy**: Vercel Edge (React Router v7 SSR)

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp apps/web/.env.example apps/web/.env.development
# 필수: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, GEMINI_API_KEY
# Solana: SOLANA_RPC_URL, SOLANA_PRIVATE_KEY, CHOCO_MINT_ADDRESS, MERKLE_TREE_ADDRESS

# 3. Run dev server
npm run dev

# (Optional) Verify Solana stack — 10/10 checks
cd apps/web && npx tsx scripts/verify-solana-stack.ts

# (Optional) Deploy on-chain resources
npx tsx scripts/deploy-choco-token.ts   # CHOCO Token-2022
npx tsx scripts/deploy-merkle-tree.ts   # cNFT Merkle Tree
```

---

## Key Files

```
apps/web/app/
├── lib/solana/
│   ├── connection.server.ts        # RPC connection + CORS headers
│   ├── cnft.server.ts              # Metaplex Bubblegum mintV1 helper
│   └── agent-kit.server.ts         # SolanaAgentKit v2 도구 5종
├── routes/
│   ├── blinks.tsx                  # Blinks 데모 페이지 (/blinks)
│   ├── actions.json.ts             # Blinks 레지스트리
│   ├── profile/
│   │   ├── index.tsx               # 프로필 + Solana 지갑 섹션
│   │   └── memories.tsx            # cNFT 기억 앨범 (/profile/memories)
│   └── api/
│       ├── actions/
│       │   ├── gift.ts             # CHOCO Gift Blink
│       │   ├── checkin.ts          # Daily Check-in Blink
│       │   ├── checkin.verify.ts   # 트랜잭션 검증 + CHOCO 지급
│       │   └── subscribe.ts        # SOL 구독 Blink
│       └── solana/
│           ├── mint-memory.ts      # cNFT 각인 API
│           └── memories.ts         # DAS API 조회 (getAssetsByOwner)
└── scripts/
    ├── deploy-choco-token.ts       # Token-2022 배포
    ├── deploy-merkle-tree.ts       # Merkle Tree 배포
    └── verify-solana-stack.ts      # 스택 전체 검증 (10/10)
```

---

## Seoulana Hackathon 2025

> **WarmUp: Seoulana Hackathon** by SuperTeam Korea
> Prize Pool: $6,000
> Deadline: 2026-04-05 23:59 KST

*Built with love for Seoulana Hackathon 🌸*
