# CHOCO Payment Flow — Technical Documentation

> **Created:** 2026-05-04
> **Updated:** 2026-05-04
> **Category:** Technical Spec — Payment Architecture

---

## Overview

CHOCO is the in-app token (SPL Token-2022, Devnet). There are two ways to acquire CHOCO:
1. **In-chat purchase** — AI detects intent → SwapTxCard
2. **Direct purchase** — `/buy-choco` page → BuyChocoPayCard

---

## Auth Architecture (Two Separate Systems)

```
┌─────────────────────────────────────────────────────────┐
│  Better Auth  (app login)                               │
│  Google / Kakao / Twitter / SIWS (Phantom)              │
│  → Creates session + Turso DB user record              │
└────────────────────────┬────────────────────────────────┘
                         │ (separate)
┌────────────────────────▼────────────────────────────────┐
│  Privy  (embedded wallet only)                         │
│  Google / Twitter / Email OTP                          │
│  → Creates embedded Solana wallet (auto on login)     │
│  → Required ONLY for embedded wallet payments          │
└─────────────────────────────────────────────────────────┘
```

**Key point:** A user may be logged into Better Auth but NOT into Privy.
Phantom users do NOT need Privy at all.

---

## Flow 1 — In-Chat CHOCO Purchase (SwapTxCard)

```
User says "I want 100 CHOCO"
           ↓
executeNaturalLanguageCommand() in stream.ts
  → Detects buy intent
  → Calls buyChoco tool (agent-kit.server.ts)
           ↓
buyChoco tool (server-side)
  → Calls /api/payment/solana/create-tx
  → Returns [SWAP_TX:paymentId:base64tx] marker
           ↓
MessageBubble detects [SWAP_TX:...] marker
  → Renders SwapTxCard component
           ↓
SwapTxCard (client-side)
  ├── Phantom detected?
  │     YES → "Sign with Phantom" button
  │            → phantom.signAndSendTransaction(tx)
  │            → /api/payment/solana/verify-sig
  │            → CHOCO credited
  └── No Phantom → PrivyChocoPayCard (compact mode)
                    → Privy embedded wallet
```

**Files:**
- `app/lib/ai/stream.ts` — `executeNaturalLanguageCommand()`
- `app/lib/solana/agent-kit.server.ts` — `buyChoco` tool
- `app/routes/api/payment/solana/create-tx.ts` — builds tx params
- `app/components/payment/SwapTxCard.tsx` — UI + Phantom signing
- `app/routes/api/payment/solana/verify-sig.ts` — verifies + credits CHOCO

---

## Flow 2 — /buy-choco Page (BuyChocoPayCard)

```
User goes to /buy-choco
  → Selects CHOCO amount (100 / 500 / 1,000 / 5,000)
           ↓
BuyChocoPayCard renders:

  ┌─── Phantom installed? ──────────────────────────────┐
  │  YES → "Pay with Phantom" button (PRIMARY)          │
  │         1. fetch /api/payment/solana/create-tx      │
  │         2. Build VersionedTransaction (client)      │
  │         3. phantom.signAndSendTransaction()         │
  │         4. /api/payment/solana/verify-sig           │
  │         5. CHOCO credited ✅                        │
  └─────────────────────────────────────────────────────┘

  ┌─── Embedded Wallet (always shown) ─────────────────┐
  │  Privy NOT authenticated:                          │
  │    → "Continue with Google" → initOAuth('google') │
  │    → "Continue with X"      → initOAuth('twitter')│
  │    → Email OTP              → sendCode + verify   │
  │                                                    │
  │  Privy authenticated, wallet being created:        │
  │    → "Creating embedded wallet..." (auto)          │
  │                                                    │
  │  Wallet created, SOL sufficient:                   │
  │    → "Pay with Embedded Wallet (X.XXXX SOL)"      │
  │                                                    │
  │  Wallet created, SOL insufficient:                 │
  │    → QR code of embedded wallet address           │
  │    → "Send SOL to this address"                   │
  │    → [Refresh Balance] button                     │
  └─────────────────────────────────────────────────────┘

  ┌─── QR / Solana Pay (mobile only) ──────────────────┐
  │  → Generates Solana Pay URL                        │
  │  → User scans with Phantom mobile                  │
  │  → Polls /api/payment/solana/verify every 3s      │
  │  → 5min timeout                                    │
  └─────────────────────────────────────────────────────┘
```

**Files:**
- `app/routes/buy-choco.tsx` — page layout + amount selection
- `app/components/payment/BuyChocoPayCard.tsx` — Phantom + Privy router
- `app/components/payment/PrivyChocoPayCard.tsx` — embedded wallet
- `app/components/payment/SolanaPayButton.tsx` — QR / Solana Pay

---

## Flow 3 — 402 Insufficient Balance (Auto Modal)

```
User sends chat message
  → Chat API checks CHOCO balance
  → Balance < MIN_REQUIRED_CHOCO (5 CHOCO)
  → Returns 402 + { error, code: 402 }
           ↓
use-chat-stream.ts detects 402
  → Rolls back optimistic CHOCO deduction
  → Calls onInsufficientChoco()
           ↓
chat/$id.tsx
  → setIsItemStoreOpen(true)
  → ItemStoreModal opens
           ↓
User purchases CHOCO via modal
  → revalidator.revalidate()
  → Balance updated
  → User re-sends message
```

**Files:**
- `app/routes/api/chat/index.ts` — 402 response
- `app/hooks/use-chat-stream.ts` — 402 detection + callback
- `app/routes/chat/$id.tsx` — `onInsufficientChoco` → modal open

---

## Payment Verification APIs

| Endpoint | Used By | Description |
|----------|---------|-------------|
| `POST /api/payment/solana/create-tx` | SwapTxCard, BuyChocoPayCard, PrivyChocoPayCard | Returns tx params (recipient, lamports, paymentId) |
| `POST /api/payment/solana/verify-sig` | SwapTxCard, BuyChocoPayCard, PrivyChocoPayCard | Verifies signed tx signature → credits CHOCO |
| `POST /api/payment/solana/create-request` | SolanaPayButton | Creates Solana Pay URL + reference key |
| `POST /api/payment/solana/verify` | SolanaPayButton | Polls for reference tx on-chain → credits CHOCO |

---

## SOL Pricing (Devnet)

```
1 CHOCO = 0.00001 SOL
100 CHOCO = 0.001 SOL  ($0.10)
500 CHOCO = 0.005 SOL  ($0.50)
1,000 CHOCO = 0.01 SOL ($1.00)
5,000 CHOCO = 0.05 SOL ($5.00)
```

---

## Decision Tree: Which Payment Method to Use?

```
Do you have Phantom extension?
  YES → Sign with Phantom (fastest, recommended)
  NO  →
    Do you want an embedded wallet?
      YES → Connect Embedded Wallet
              → Log in with Google / X / Email
              → Wallet auto-created
              → Fund with SOL via QR (if needed)
              → Pay with Embedded Wallet
      NO  → Solana Pay QR (requires Phantom mobile app)
```

---

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| "Waiting for payment..." stuck | Phantom on wrong network | Enable Devnet in Phantom → Developer Settings |
| "No Wallet Connected" warning | User's Solana wallet not linked to Better Auth account | Use embedded wallet or go to Profile → Wallet |
| Embedded wallet "not activated" | Privy wallet created but no SOL | Send SOL to embedded wallet address (shown as QR) |
| Google/X button no response | Privy dashboard not configured | Enable social login in Privy Dashboard → Authentication → Social |

---

## Related Documents

- [NeuroLimbic Memory System](./10_NEUROLIMBIC_MEMORY_SYSTEM.md)
- [AI Agent Transformation](./05_AI_AGENT_TRANSFORMATION.md)
- [Master Roadmap](../04_Logic_Progress/07_MASTER_ROADMAP.md)
