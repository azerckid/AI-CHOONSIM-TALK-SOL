# 춘심 (Choonsim) × Solana

> **AI Virtual Companion powered by Solana** — Seoulana Hackathon 2025

춘심은 K-pop 팬덤 문화에서 영감을 받은 AI 가상 동반자 앱입니다.
Solana의 핵심 기술 4가지를 통합하여 팬-아티스트 관계를 온체인으로 확장합니다.

---

## 🌟 Solana 4-Stack

| 기능 | 설명 | 상태 |
|------|------|------|
| **Solana Actions & Blinks** | X(Twitter)에서 Gift/Checkin/Subscribe 액션 직접 실행 | ✅ Live |
| **Token Extensions (Token-2022)** | 1% Transfer Fee + CHOCO SPL 토큰 | ✅ Deployed |
| **Compressed NFT (cNFT)** | Bubblegum Merkle Tree 메모리 각인 (~0.0001 SOL) | ✅ Deployed |
| **Solana AI Agent Kit** | LangGraph 채팅 파이프라인에 Solana 도구 5종 통합 | ✅ Live |

---

## 🔗 온체인 주소 (Devnet)

```
CHOCO Token-2022 Mint : E2o1MKpnwh5vELG4FDgiX2NA33L11hXPVfAPD3ai4GWf
cNFT Merkle Tree      : AJxCqbFdWLmQ7xMqBQN3AXja9paZJZ9qrqvwViXVkXGF
Agent Wallet          : CaURTs8NibhmX8kAT9wHAkFv32b4NhuLBEAPxZXkuVyC
Treasury Wallet       : Akfuxv8pQvrLpMyEVEFaBrTfCS4f3y6kQCpYmvYQcxag
```

---

## 🎯 Blinks Endpoints

| 엔드포인트 | 설명 |
|-----------|------|
| `GET/POST /api/actions/gift` | CHOCO 선물 (100/500/1000) |
| `GET/POST /api/actions/checkin` | 일일 체크인 + 50 CHOCO (Memo on-chain) |
| `GET/POST /api/actions/subscribe` | SOL 구독 (0.01 SOL/월) |
| `POST /api/actions/checkin/verify` | 트랜잭션 확인 + CHOCO 지급 |
| `GET /actions.json` | Blinks 레지스트리 |

**Blink URL 예시:**
```
https://dial.to/?action=solana-action:https://<host>/api/actions/checkin
```

---

## 🤖 AI Agent Kit 도구

춘심 AI가 채팅 중 자동 호출하는 Solana 도구:

| 도구 | 트리거 예시 |
|------|------------|
| `checkChocoBalance` | "내 초코 얼마야?" |
| `getSolBalance` | "내 지갑 잔액 알려줘" |
| `getCheckinBlink` | "무료 초코 받고 싶어" |
| `getGiftBlink` | "선물하고 싶어" |
| `getMemoryNFTInfo` | "추억을 NFT로 남기고 싶어" |

---

## 🎖️ cNFT 메모리 각인

```bash
POST /api/solana/mint-memory
{
  "ownerAddress": "<user solana wallet>",
  "name": "춘심과의 첫 대화",
  "description": "2025-03-25 특별한 기록",
  "characterId": "chunsim"
}
# 비용: 200 CHOCO
```

---

## 🛠 Tech Stack

- **Frontend**: React Router v7, React 19, Tailwind CSS, Solana Wallet Adapter
- **AI**: LangGraph + Gemini 2.5 Flash, Solana AI Agent Kit v2
- **Blockchain**: Solana (Devnet), `@solana/web3.js`, `@solana/spl-token`, Metaplex Bubblegum, `@solana/actions`
- **Database**: Turso (libSQL) + Drizzle ORM
- **Auth**: Better Auth (Google/Kakao/Twitter OAuth)
- **Payments**: PayPal, Toss Payments, Coinbase Commerce, Solana Pay

---

## 🚀 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp apps/web/.env.example apps/web/.env.development
# Fill in TURSO_*, GEMINI_API_KEY, SOLANA_*, etc.

# 3. Run dev server
npm run dev

# (Optional) Deploy on-chain resources
cd apps/web
npx tsx scripts/deploy-choco-token.ts   # CHOCO Token-2022
npx tsx scripts/deploy-merkle-tree.ts   # cNFT Merkle Tree
```

---

## 📁 Key Files

```
apps/web/app/
├── lib/solana/
│   ├── connection.server.ts   # RPC connection + CORS headers
│   ├── cnft.server.ts         # Bubblegum mintV1 helper
│   └── agent-kit.server.ts    # SolanaAgentKit v2 tools
├── routes/
│   ├── blinks.tsx             # Blinks demo page (/blinks)
│   ├── actions.json.ts        # Blinks registry (/actions.json)
│   └── api/actions/
│       ├── gift.ts            # CHOCO gift Action
│       ├── checkin.ts         # Daily check-in Action
│       ├── checkin.verify.ts  # On-chain verification + reward
│       └── subscribe.ts       # SOL subscription Action
└── scripts/
    ├── deploy-choco-token.ts  # Token-2022 deployment
    └── deploy-merkle-tree.ts  # Merkle tree deployment
```

---

## 🏆 Seoulana Hackathon 2025

> WarmUp: Seoulana Hackathon by SuperTeam Korea  
> Prize Pool: $6,000  
> Deadline: 2025-04-05 23:59 KST

*Built with love for Seoulana Hackathon 🌸*
