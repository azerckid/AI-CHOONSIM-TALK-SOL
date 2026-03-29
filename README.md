# 춘심 (Choonsim) × Solana

> **AI Virtual Companion powered by Solana** — Seoulana Hackathon 2026

[![Deploy](https://img.shields.io/badge/Vercel-Live-brightgreen?logo=vercel)](https://web-beryl-six.vercel.app)
[![Solana](https://img.shields.io/badge/Solana-Devnet-9945FF?logo=solana)](https://explorer.solana.com/?cluster=devnet)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

**라이브 데모**: https://web-beryl-six.vercel.app

---

## 프로젝트 소개

춘심(Choonsim)은 X(Twitter)에 3.3만 팔로워를 보유한 실제 K-pop 팬덤 IP를 기반으로 한 AI 가상 동반자 앱입니다.

단순한 AI 채팅을 넘어, Solana 블록체인을 통해 팬과 AI 캐릭터 사이의 **관계를 온체인에 기록**합니다:

- 대화 내용을 cNFT로 영구 각인 → `/profile/memories` 앨범에서 확인
- X(Twitter)에서 Blinks로 즉시 상호작용 (Gift / Check-in / Subscribe)
- AI 에이전트가 지갑 잔액을 조회하고 Blink를 자동 제안
- CHOCO SPL Token-2022로 앱 내 경제 운영
- 이메일/소셜 로그인만으로 자동 지갑 생성 (Privy Embedded Wallet)
- Phantom 지갑 서명으로 로그인 (SIWS)
- ZK Compression으로 CHOCO 보상 비용 최대 99% 절감

---

## Solana 기능 전체

| 기능 | 설명 | 상태 |
|------|------|------|
| **Solana Actions & Blinks** | X(Twitter)에서 Gift / Check-in / Subscribe 액션 직접 실행 | ✅ Live |
| **Token Extensions (Token-2022)** | 1% Transfer Fee · CHOCO SPL 토큰 (1B supply) | ✅ Deployed |
| **Compressed NFT (cNFT)** | Metaplex Bubblegum Merkle Tree 기억 각인 (~0.0001 SOL) | ✅ Deployed |
| **Solana AI Agent Kit** | LangGraph 채팅 파이프라인에 Solana 도구 5종 통합 | ✅ Live |
| **Embedded Wallet (Privy)** | 이메일/소셜 로그인 → 자동 지갑 생성, Phantom 없이 결제 | ✅ Live |
| **Sign In With Solana (SIWS)** | Phantom 서명으로 로그인, 기존 소셜 계정 통합 지원 | ✅ Live |
| **ZK Compression** | Light Protocol Compressed Token — 체크인 보상 배포 비용 최대 99% 절감 | ✅ Deployed |

---

## 온체인 주소 (Devnet)

```
CHOCO Token-2022 Mint        : E2o1MKpnwh5vELG4FDgiX2NA33L11hXPVfAPD3ai4GWf
cNFT Merkle Tree             : AJxCqbFdWLmQ7xMqBQN3AXja9paZJZ9qrqvwViXVkXGF
Compressed CHOCO Mint (ZK)   : ATHJdhUxqek9hJjfobda6sdGjLEZSmFhZoniRnsxMmEJ
Agent Wallet                 : CaURTs8NibhmX8kAT9wHAkFv32b4NhuLBEAPxZXkuVyC
Treasury Wallet              : Akfuxv8pQvrLpMyEVEFaBrTfCS4f3y6kQCpYmvYQcxag
```

---

## Solana Actions & Blinks

| 엔드포인트 | 설명 |
|-----------|------|
| `GET/POST /api/actions/gift` | CHOCO 선물 (100 / 500 / 1,000) |
| `GET/POST /api/actions/checkin` | 일일 체크인 + 50 CHOCO 지급 (Memo on-chain) |
| `GET/POST /api/actions/subscribe` | SOL 구독 (0.01 SOL/월) |
| `POST /api/actions/checkin/verify` | 트랜잭션 확인 + CHOCO DB 반영 + ZK Compressed CHOCO 민팅 |
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

각인된 cNFT는 `/profile/memories` 페이지에서 DAS API(`getAssetsByOwner`)로 조회할 수 있습니다.

---

## Embedded Wallet (Privy)

이메일 또는 소셜 로그인만으로 Solana 지갑이 자동 생성됩니다. Phantom 설치 없이 결제 가능.

- 채팅 중 CHOCO 결제 카드 → Privy 임베디드 지갑 또는 Phantom 자동 선택
- `signTransaction` + `sendRawTransaction` + 서명 상태 폴링 (60초, 2.5초 간격)

---

## Sign In With Solana (SIWS)

Phantom 지갑 서명으로 로그인. 기존 소셜/이메일 계정과 같은 지갑 주소를 가진 경우 자동으로 기존 계정으로 로그인됩니다.

- Ed25519 서명 검증 (tweetnacl)
- nonce → DB 저장 (5분 TTL)
- Better Auth 쿠키 직접 발급 (HMAC-SHA256 Web Crypto API)

---

## ZK Compression (Light Protocol)

체크인 보상 배포 시 Light Protocol Compressed Token을 사용합니다.

- 일반 SPL Transfer 비용 ~0.002 SOL → Compressed Transfer ~0.00001 SOL (**99% 절감**)
- ATA(Associated Token Account) 불필요
- Helius Photon 인덱서 RPC 연동 (`ZK_COMPRESSION_RPC_URL`)

---

## 주요 페이지

| 경로 | 설명 |
|------|------|
| `/` | 랜딩 페이지 |
| `/login` | 소셜 로그인 + Sign In With Solana (Phantom) |
| `/chat/:id` | AI 춘심과 1:1 대화 (LangGraph + Gemini 2.5 Flash) |
| `/chats` | 대화 목록 |
| `/blinks` | Solana Blinks 데모 페이지 |
| `/profile` | 프로필 + Solana 지갑 섹션 |
| `/profile/memories` | cNFT 기억 앨범 (DAS API `getAssetsByOwner`) |
| `/shop` | CHOCO 아이템 스토어 |
| `/buy-choco` | CHOCO 구매 전용 페이지 |
| `/fandom` | 팬덤 피드 |
| `/missions` | 일일 미션 |
| `/pricing` | 구독 플랜 |
| `/guide` | CHOCO & 아이템 가이드 |

---

## Tech Stack

- **Frontend**: React Router v7, React 19, Tailwind CSS v4, shadcn/ui
- **AI**: LangGraph + Gemini 2.5 Flash, Solana AI Agent Kit v2
- **Blockchain**: Solana (Devnet), `@solana/web3.js`, `@solana/spl-token`, Metaplex Bubblegum, `@solana/actions`, `@lightprotocol/stateless.js`, `@lightprotocol/compressed-token`
- **Wallet**: Solana Wallet Adapter, Privy Embedded Wallet (`@privy-io/react-auth`)
- **Auth**: Better Auth (Google / Kakao / Twitter OAuth) + SIWS (tweetnacl Ed25519)
- **Database**: Turso (libSQL) + Drizzle ORM
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
# Solana: SOLANA_RPC_URL, SOLANA_AGENT_PRIVATE_KEY, CHOCO_MINT_ADDRESS, MERKLE_TREE_ADDRESS
# ZK Compression: ZK_COMPRESSION_RPC_URL, CHOCO_COMPRESSED_MINT_ADDRESS
# Privy: VITE_PRIVY_APP_ID

# 3. Run dev server
npm run dev

# (Optional) Verify Solana stack — 10/10 checks
cd apps/web && npx tsx scripts/verify-solana-stack.ts
```

---

## Key Files

```
apps/web/app/
├── lib/solana/
│   ├── connection.server.ts        # RPC connection + CORS headers
│   ├── cnft.server.ts              # Metaplex Bubblegum mintV1 helper
│   ├── agent-kit.server.ts         # SolanaAgentKit v2 도구 5종
│   ├── siws.server.ts              # SIWS 서명 검증 + 세션 생성
│   └── zk-compression.server.ts    # Light Protocol Compressed Token
├── components/
│   ├── auth/SiwsButton.tsx          # Sign In With Solana 버튼
│   ├── payment/PrivyChocoPayCard.tsx # Privy 임베디드 지갑 결제 카드
│   └── solana/PrivyWalletProvider.tsx
├── routes/
│   ├── blinks.tsx                  # Blinks 데모 페이지
│   ├── actions.json.ts             # Blinks 레지스트리
│   ├── login.tsx                   # 로그인 (소셜 + SIWS)
│   ├── profile/
│   │   ├── index.tsx               # 프로필 + Solana 지갑 섹션
│   │   └── memories.tsx            # cNFT 기억 앨범
│   └── api/
│       ├── actions/
│       │   ├── gift.ts             # CHOCO Gift Blink
│       │   ├── checkin.ts          # Daily Check-in Blink
│       │   ├── checkin.verify.ts   # 트랜잭션 검증 + CHOCO 지급 + ZK mint
│       │   └── subscribe.ts        # SOL 구독 Blink
│       ├── auth/siws/
│       │   ├── nonce.ts            # SIWS nonce 발급
│       │   └── verify.ts           # SIWS 서명 검증 + 세션 발급
│       └── solana/
│           ├── mint-memory.ts      # cNFT 각인 API
│           └── memories.ts         # DAS API 조회
```

---

## Seoulana Hackathon 2026

> **WarmUp: Seoulana Hackathon** by SuperTeam Korea
> Prize Pool: $6,000
> Deadline: 2026-04-05 23:59 KST

*Built with love for Seoulana Hackathon 🌸*
