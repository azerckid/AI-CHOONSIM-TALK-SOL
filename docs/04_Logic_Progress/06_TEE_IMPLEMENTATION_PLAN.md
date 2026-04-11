# 06. TEE (신뢰 실행 환경) 기반 에이전트 키 위임 구현 계획

> 작성일: 2026-04-11  
> 목표 완료: 2026-05-10 (약 4주)  
> 목적: 서버 관리자도 접근 불가한 격리된 환경에서 춘심 에이전트의 프라이빗 키를 관리 — "춘심이 지갑은 춘심이만 제어한다"는 신뢰를 온체인으로 증명

---

## 1. 현재 보안 문제

```
현재:
SOLANA_AGENT_PRIVATE_KEY=[...] → Vercel 환경변수 → 서버 코드에서 직접 사용

문제:
- Vercel 대시보드 접근자 = 키 탈취 가능
- "Choonsim AI가 정말 자율적인가?" 증명 불가
- 사용자가 AI에게 큰 자산을 위임할 근거 없음
```

---

## 2. TEE란 무엇인가

**Trusted Execution Environment (TEE)** 는 CPU 하드웨어 수준에서 격리된 실행 공간입니다.

```
일반 서버 환경:              TEE 환경:
┌──────────────────┐         ┌──────────────────┐
│ OS (관리자 접근)  │         │ OS               │
│  ├── 내 코드      │         │  └── TEE Enclave  │ ← 관리자도 내부 접근 불가
│  └── 환경변수 키  │ ← 노출  │      ├── 내 코드   │
└──────────────────┘         │      └── 프라이빗 키│ ← 하드웨어로 보호
                             └──────────────────┘
```

**Remote Attestation (원격 증명):**  
TEE 내부 코드가 변조되지 않았음을 하드웨어 서명으로 누구나 검증 가능 → "이 AI는 정해진 코드만 실행한다"를 증명

---

## 3. 솔루션 비교 및 선택

| 솔루션 | 방식 | 난이도 | 비용 | 해커톤 적합도 |
|--------|------|--------|------|--------------|
| **Lit Protocol** | MPC (다자 계산) | 🟢 낮음 | 무료(테스트넷) | ⭐⭐⭐⭐⭐ |
| **Phala Network** | Intel SGX TEE | 🔴 높음 | 유료 | ⭐⭐⭐ |
| **Marlin Oyster** | AWS Nitro Enclaves | 🔴 높음 | 유료 | ⭐⭐ |
| **Secret Network** | 브릿지 방식 | 🔴 매우 높음 | 복잡 | ⭐ |

### ✅ 선택: Lit Protocol (1단계) + Phala Network (2단계)

**이유:**
- Lit Protocol은 MPC(Multi-Party Computation) 기반으로 기술적으로 TEE와 동등한 보안 보장
- Solana 네이티브 지원 (`@lit-protocol/lit-node-client`)
- 테스트넷 무료, 코드 변경 최소
- Phala는 해커톤 이후 "진짜 SGX TEE"로 업그레이드용

---

## 4. Lit Protocol 아키텍처

### 개념
```
기존:                         Lit Protocol 적용:
서버 코드                     서버 코드
  └── env에서 키 로드    →      └── Lit 노드 네트워크에 서명 요청
  └── 직접 tx 서명              └── 키는 Lit 노드들이 분산 보관
                                └── 임계값(예: 13/20 노드) 합의 시만 서명
                                └── 서버는 완성된 서명만 받음 (키 비노출)
```

### Lit Action — 핵심 개념
**Lit Action**은 Lit 노드 네트워크에서 실행되는 JavaScript 코드입니다.  
이 코드만 PKP(Programmable Key Pair)를 사용할 수 있습니다.

```
Lit Action (IPFS에 배포된 불변 코드)
  ├── "요청자가 올바른 userId를 가졌는가?" 검증
  ├── "트랜잭션 금액이 설정 한도 이하인가?" 검증  
  └── 조건 충족 시 → PKP로 서명 → 서명된 tx 반환
```

---

## 5. 구현 단계

### Phase A: Lit Protocol 설정 (2일) — 1주차 (4/11~4/17)

- [ ] **A-1.** `@lit-protocol/lit-node-client`, `@lit-protocol/constants`, `@lit-protocol/auth-helpers` 패키지 설치
- [ ] **A-2.** `apps/web/app/lib/solana/lit.server.ts` 파일 작성 — LitNodeClient 싱글턴
- [ ] **A-3.** DatilDev 테스트넷 연결 확인 (`client.connect()` 성공 로그)
- [ ] **A-4.** `.env.development`에 Lit 관련 환경변수 항목 추가 (값은 Phase B 후 채움)
- [ ] **A.** Lit Explorer(`https://explorer.litprotocol.com`)에서 DatilDev 노드 상태 확인

#### A-1. 패키지 설치
```bash
cd apps/web
npm install @lit-protocol/lit-node-client @lit-protocol/constants
npm install @lit-protocol/auth-helpers
```

#### A-2. Lit 클라이언트 초기화
**`apps/web/app/lib/solana/lit.server.ts`** (신규)
```typescript
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LitNetwork } from "@lit-protocol/constants";

let _litClient: LitNodeClient | null = null;

export async function getLitClient(): Promise<LitNodeClient> {
  if (_litClient?.ready) return _litClient;

  _litClient = new LitNodeClient({
    litNetwork: LitNetwork.DatilDev, // 테스트넷 (무료)
    debug: false,
  });

  await _litClient.connect();
  return _litClient;
}
```

---

### Phase B: PKP (Programmable Key Pair) 생성 (1일) — 1주차 (4/11~4/17)

- [ ] **B-1.** `apps/web/scripts/mint-agent-pkp.ts` 스크립트 작성
- [ ] **B-2.** `@lit-protocol/contracts-sdk` 설치 및 PKP 민팅 실행
- [ ] **B-3.** 발급된 `PKP 공개키` + `tokenId` → `.env` 및 Vercel 환경변수에 등록
- [ ] **B-4.** PKP 공개키를 Solana 주소로 변환 확인 (`@lit-protocol/pkp-solana` 사용)
- [ ] **B-5.** Solana Devnet에서 PKP 주소로 SOL 소량 에어드랍 (수수료용)
- [ ] **B.** Solana Explorer에서 PKP 주소 확인 가능한지 검증

PKP는 Lit 노드 네트워크가 공동 관리하는 키 쌍입니다.  
Solana PKP를 생성하면 **기존 `SOLANA_AGENT_PRIVATE_KEY`를 대체**합니다.

#### B-1. PKP 민팅 스크립트
**`apps/web/scripts/mint-agent-pkp.ts`** (신규)
```typescript
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LitNetwork } from "@lit-protocol/constants";

/**
 * 춘심 에이전트용 Solana PKP를 Lit 네트워크에서 민팅합니다.
 * 최초 1회 실행 후 PKP 공개키를 .env에 저장하면 됩니다.
 * 
 * 실행: npx tsx scripts/mint-agent-pkp.ts
 */
async function mintAgentPKP() {
  const client = new LitNodeClient({ litNetwork: LitNetwork.DatilDev });
  await client.connect();

  // PKP 민팅 (Lit Contracts SDK 사용)
  // 결과: { tokenId, publicKey, ethAddress }
  // publicKey를 Solana 주소로 변환해 환경변수에 저장

  console.log("PKP 공개키 (Solana 주소로 변환 필요):", "...");
  console.log(".env에 추가: LIT_PKP_PUBLIC_KEY=<위 값>");
}

mintAgentPKP().catch(console.error);
```

#### B-2. 환경변수 추가
```env
# Lit Protocol
LIT_PKP_PUBLIC_KEY=           # PKP 공개키 (민팅 후 발급)
LIT_PKP_TOKEN_ID=             # PKP NFT 토큰 ID
LIT_CAPACITY_CREDIT_TOKEN_ID= # Rate limit 크레딧 (테스트넷 무료)
```

---

### Phase C: Lit Action 코드 작성 (3일) — 2주차 (4/18~4/24)

- [ ] **C-1.** `apps/web/lit-actions/choonsim-sign-action.js` 파일 작성
- [ ] **C-2.** `ALLOWED_ACTIONS` 목록 및 `MAX_CHOCO_PER_TX` 한도 정의
- [ ] **C-3.** 액션 타입별 조건 검증 로직 구현 (TRANSFER_CHOCO / MINT_CNFT / CHECKIN_REWARD)
- [ ] **C-4.** `LitActions.signEcdsa()` 호출 및 응답 포맷 정의
- [ ] **C-5.** Lit Action 로컬 시뮬레이션 테스트 (`lit-node-client` executeJs)
- [ ] **C-6.** Pinata 또는 web3.storage에 Lit Action JS 파일 IPFS 업로드
- [ ] **C-7.** 발급된 IPFS CID → `.env`의 `LIT_ACTION_IPFS_CID` 등록
- [ ] **C.** IPFS 공개 URL(`https://ipfs.io/ipfs/<CID>`)에서 코드 원문 접근 가능 확인

Lit Action은 IPFS에 배포되는 불변 JavaScript입니다.  
이 코드가 "춘심이의 의사결정 규칙"을 정의합니다.

**`apps/web/lit-actions/choonsim-sign-action.js`** (신규, IPFS 업로드용)
```javascript
/**
 * Choonsim Agent Lit Action
 * 
 * 이 코드는 Lit 노드 네트워크에서 실행됩니다.
 * 조건을 검증하고, 통과 시 PKP로 Solana 트랜잭션에 서명합니다.
 * 
 * 입력 파라미터 (jsParams):
 *   - txBase64: 서명할 트랜잭션 (base64)
 *   - userId: 요청자 ID
 *   - actionType: "TRANSFER_CHOCO" | "MINT_CNFT" | "CHECKIN_REWARD"
 *   - amount: 토큰 수량 (TRANSFER_CHOCO의 경우)
 */

const MAX_CHOCO_PER_TX = 10000; // 단일 트랜잭션 최대 CHOCO
const ALLOWED_ACTIONS = ["TRANSFER_CHOCO", "MINT_CNFT", "CHECKIN_REWARD"];

// 1. 액션 타입 검증
if (!ALLOWED_ACTIONS.includes(actionType)) {
  LitActions.setResponse({ response: JSON.stringify({ error: "허용되지 않은 액션 타입입니다." }) });
  return;
}

// 2. CHOCO 전송 한도 검증
if (actionType === "TRANSFER_CHOCO" && amount > MAX_CHOCO_PER_TX) {
  LitActions.setResponse({ response: JSON.stringify({ error: `단일 전송 한도 초과: ${MAX_CHOCO_PER_TX} CHOCO` }) });
  return;
}

// 3. 트랜잭션 파싱 및 서명 (Solana)
const txBytes = Buffer.from(txBase64, "base64");

// PKP로 서명
const sigShare = await LitActions.signEcdsa({
  toSign: txBytes,
  publicKey: pkpPublicKey,
  sigName: "choonsim-tx-sig",
});

LitActions.setResponse({
  response: JSON.stringify({
    signature: sigShare,
    actionType,
    amount,
    timestamp: Date.now(),
  }),
});
```

---

### Phase D: 기존 agent-kit.server.ts 교체 (2일) — 3주차 (4/25~5/01)

- [ ] **D-1.** `@lit-protocol/pkp-solana` 패키지 설치
- [ ] **D-2.** `apps/web/app/lib/solana/lit-signer.server.ts` 파일 작성
- [ ] **D-3.** `signWithLitPKP()` 함수 구현 — sessionSigs 발급 + executeJs 호출
- [ ] **D-4.** `PKPSolanaWallet` 인스턴스 생성 및 `signTransaction()` 동작 확인
- [ ] **D-5.** `agent-kit.server.ts`에 피처 플래그 `USE_LIT_SIGNER` 추가
- [ ] **D-6.** `USE_LIT_SIGNER=false`로 기존 흐름 정상 동작 확인 (회귀 방지)
- [ ] **D-7.** `USE_LIT_SIGNER=true`로 Lit PKP 서명 흐름 동작 확인
- [ ] **D.** Ed25519 변환 이슈 없는지 실제 Devnet 트랜잭션으로 최종 검증

현재 `getAgentKeypair()` 함수를 Lit 서명으로 교체합니다.

**`apps/web/app/lib/solana/lit-signer.server.ts`** (신규)
```typescript
import { getLitClient } from "./lit.server";
import { LitNetwork, LIT_RPC } from "@lit-protocol/constants";
import type { Transaction } from "@solana/web3.js";

/**
 * Lit Protocol PKP로 Solana 트랜잭션 서명
 * 
 * 기존 Keypair.sign() 대체제.
 * 프라이빗 키가 서버에 존재하지 않음 — Lit 노드가 분산 서명.
 */
export async function signWithLitPKP(
  tx: Transaction,
  actionType: "TRANSFER_CHOCO" | "MINT_CNFT" | "CHECKIN_REWARD",
  amount = 0
): Promise<Transaction> {
  const client = await getLitClient();
  const pkpPublicKey = process.env.LIT_PKP_PUBLIC_KEY!;

  // 세션 서명 (서버 지갑 인증 — Lit 노드에 "나는 이 서비스다" 증명)
  const sessionSigs = await client.getSessionSigs({
    chain: "solana",
    expiration: new Date(Date.now() + 1000 * 60 * 5).toISOString(), // 5분
    resourceAbilityRequests: [
      {
        resource: { resourcePrefix: "lit-litaction://*" },
        ability: "lit-action-execution",
      },
    ],
  });

  // Lit Action 실행 (IPFS CID — Phase C에서 업로드한 코드)
  const litActionCID = process.env.LIT_ACTION_IPFS_CID!;

  const result = await client.executeJs({
    ipfsId: litActionCID,
    sessionSigs,
    jsParams: {
      txBase64: Buffer.from(tx.serialize({ requireAllSignatures: false, verifySignatures: false })).toString("base64"),
      pkpPublicKey,
      actionType,
      amount,
    },
  });

  // 서명 결과를 트랜잭션에 적용
  const sigData = JSON.parse(result.response as string);
  if (sigData.error) throw new Error(sigData.error);

  // TODO: PKP 서명을 Solana tx에 주입 (Ed25519 변환 필요)
  // 현재 Lit은 ECDSA 서명 → Solana Ed25519 변환 어댑터 필요
  // 참고: @lit-protocol/pkp-solana 패키지 사용

  return tx;
}
```

#### Phase D 주의사항: Ed25519 변환

Lit Protocol의 기본 서명은 ECDSA(secp256k1)이지만 Solana는 Ed25519를 사용합니다.  
`@lit-protocol/pkp-solana` 패키지가 이 변환을 처리합니다.

```bash
npm install @lit-protocol/pkp-solana
```

```typescript
import { PKPSolanaWallet } from "@lit-protocol/pkp-solana";

// PKPSolanaWallet은 Solana의 Keypair 인터페이스와 호환됩니다
const pkpWallet = new PKPSolanaWallet({
  pkpPubKey: process.env.LIT_PKP_PUBLIC_KEY!,
  rpc: process.env.SOLANA_RPC_URL!,
  litNodeClient: client,
  sessionSigs,
});

// 기존 코드에서 agentKeypair 대신 pkpWallet 사용
const signature = await pkpWallet.signTransaction(tx);
```

---

### Phase E: transferChocoSPL 함수 교체 (1일) — 3주차 (4/25~5/01)

- [ ] **E-1.** `agent-kit.server.ts`의 `getAgentKeypair()` 함수 옆에 `getAgentWallet()` 함수 추가 (PKPSolanaWallet 반환)
- [ ] **E-2.** `transferChocoSPL()` 함수 내부에서 `USE_LIT_SIGNER` 플래그 분기 추가
- [ ] **E-3.** `Lit PKP` 경로: `pkpWallet.signTransaction(tx)` → `connection.sendRawTransaction()` 흐름 검증
- [ ] **E-4.** Devnet에서 CHOCO SPL 전송 트랜잭션 성공 확인 (실제 잔액 변화)
- [ ] **E-5.** 결제 흐름 (`/api/payment/solana/verify-sig`) 엔드투엔드 테스트 — Lit 서명 버전
- [ ] **E.** 기존 `USE_LIT_SIGNER=false` 경로와 동일 결과 확인 (회귀 없음)

**`apps/web/app/lib/solana/agent-kit.server.ts`** 수정:

```typescript
// 기존 (환경변수에서 직접 키 로드):
function getAgentKeypair(): Keypair {
  const agentKeyRaw = process.env.SOLANA_AGENT_PRIVATE_KEY;
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(agentKeyRaw)));
}

// 변경 후 (Lit PKP 사용):
async function getAgentWallet(sessionSigs: any): Promise<PKPSolanaWallet> {
  const client = await getLitClient();
  return new PKPSolanaWallet({
    pkpPubKey: process.env.LIT_PKP_PUBLIC_KEY!,
    rpc: process.env.SOLANA_RPC_URL!,
    litNodeClient: client,
    sessionSigs,
  });
}

// transferChocoSPL도 동일하게 교체
export async function transferChocoSPL(
  toWalletAddress: string,
  amount: number
): Promise<{ signature: string }> {
  // ... 기존 tx 빌드 코드 동일 ...

  // 서명 방식만 교체:
  // 기존: tx.sign(agentKeypair)
  // 변경: const signedTx = await pkpWallet.signTransaction(tx)
  const signedTx = await pkpWallet.signTransaction(tx);
  const sig = await connection.sendRawTransaction(signedTx.serialize());
  // ...
}
```

---

### Phase F: Remote Attestation 증명 페이지 (2일) — 4주차 (5/02~5/10)

- [ ] **F-1.** `apps/web/app/routes/trust.tsx` 파일 생성 (신뢰 증명 페이지)
- [ ] **F-2.** `app/routes.ts`에 `/trust` 경로 등록
- [ ] **F-3.** loader에서 PKP 주소, Lit Action CID, 최근 트랜잭션 5개 조회 (Helius RPC)
- [ ] **F-4.** Solana Explorer 링크, IPFS 코드 링크, Lit Explorer 링크 UI 구성
- [ ] **F-5.** 헤더 네비게이션에 `/trust` 링크 추가 (Footer 또는 About 섹션)
- [ ] **F-6.** 페이지 내 "에이전트 지갑에서 발생한 최근 트랜잭션" 테이블 렌더링
- [ ] **F.** 심사위원 데모 시나리오 전체 실행 — `/trust` 방문 → Explorer 확인 → IPFS 코드 열람 → "서버 관리자 키 탈취 불가" 증명 완료

**"춘심이 키는 Lit 노드가 관리한다"는 것을 사용자가 직접 검증할 수 있는 페이지 추가.**

**`apps/web/app/routes/trust.tsx`** (신규)
```typescript
/**
 * /trust — 신뢰 증명 페이지
 * 
 * 사용자에게 다음을 보여줍니다:
 * 1. 춘심 에이전트 PKP 공개키 (Solana 주소)
 * 2. Lit Action IPFS CID (검증 가능한 불변 코드)
 * 3. Lit Explorer 링크 (노드 활동 실시간 확인)
 * 4. 에이전트 지갑의 최근 트랜잭션 (Explorer 링크)
 */
export default function TrustPage() {
  const pkpAddress = "..."; // PKP의 Solana 주소
  const litActionCID = process.env.VITE_LIT_ACTION_IPFS_CID;

  return (
    <div>
      <h1>춘심 에이전트 신뢰 증명</h1>

      <section>
        <h2>에이전트 지갑 주소</h2>
        <p>{pkpAddress}</p>
        <a href={`https://explorer.solana.com/address/${pkpAddress}?cluster=devnet`}>
          Solana Explorer에서 확인 →
        </a>
      </section>

      <section>
        <h2>의사결정 코드 (불변)</h2>
        <p>IPFS CID: {litActionCID}</p>
        <a href={`https://ipfs.io/ipfs/${litActionCID}`}>
          코드 원문 확인 →
        </a>
        <p className="text-xs text-white/40">
          이 코드만 춘심의 지갑을 제어할 수 있습니다.
          서버 관리자 포함 누구도 이 코드 없이 서명을 요청할 수 없습니다.
        </p>
      </section>

      <section>
        <h2>Lit 노드 네트워크</h2>
        <a href="https://explorer.litprotocol.com">Lit Explorer →</a>
        <p className="text-xs text-white/40">
          20개 노드 중 13개의 합의가 있어야만 서명이 완성됩니다.
        </p>
      </section>
    </div>
  );
}
```

---

## 6. 구현 타임라인 (4주)

| 주차 | 작업 | 산출물 |
|------|------|--------|
| 1주차 (4/11~4/17) | Phase A+B: Lit 클라이언트 + PKP 민팅 | `lit.server.ts`, PKP 주소 발급 |
| 2주차 (4/18~4/24) | Phase C: Lit Action 작성 + IPFS 업로드 | `choonsim-sign-action.js`, IPFS CID |
| 3주차 (4/25~5/01) | Phase D+E: PKPSolanaWallet으로 기존 코드 교체 | `transferChocoSPL` Lit 버전 동작 확인 |
| 4주차 (5/02~5/10) | Phase F: 신뢰 증명 페이지 + 통합 테스트 | `/trust` 페이지 라이브 |

---

## 7. 예상 난이도 및 리스크

| 항목 | 난이도 | 리스크 | 대응 |
|------|--------|--------|------|
| Lit 클라이언트 초기화 | 🟢 낮음 | 없음 | — |
| PKP 민팅 | 🟡 중간 | Lit 테스트넷 불안정 | Datil 테스트넷 → Chronicle 테스트넷 대안 사용 |
| Lit Action 작성 | 🟡 중간 | IPFS 업로드 지연 | Pinata/web3.storage 사용 |
| Ed25519 변환 (`pkp-solana`) | 🔴 높음 | Solana Ed25519 ↔ Lit ECDSA 변환 버그 가능 | 공식 예제 참고, 이슈 발생 시 Lit 팀 Discord 문의 |
| 기존 transferChocoSPL 교체 | 🟡 중간 | 기존 결제 흐름 중단 위험 | 피처 플래그로 점진적 전환 (`USE_LIT_SIGNER=true`) |
| 신뢰 증명 페이지 | 🟢 낮음 | 없음 | — |

### 피처 플래그 전환 전략 (무중단)
```typescript
// agent-kit.server.ts
const useLit = process.env.USE_LIT_SIGNER === "true";

const agentSigner = useLit
  ? await getAgentWallet(sessionSigs)  // Lit PKP
  : getAgentKeypair();                  // 기존 Keypair (폴백)
```

---

## 8. 성공 기준 (데모 시나리오)

```
1. /trust 페이지에서 PKP 주소 확인
2. Solana Explorer에서 PKP 주소의 최근 CHOCO 전송 트랜잭션 확인
3. "이 트랜잭션은 누가 서명했나?" → Lit Action IPFS CID 코드로 증명
4. IPFS에서 코드 원문 열람 → "조건 없이는 서명 불가" 확인
5. 심사위원: "서버 관리자가 키를 빼낼 수 있나?" → "불가. Lit 노드 13/20 합의 없이는 서명 없음"
```

---

## 9. Eliza + TEE 시너지

Eliza Framework (05 문서)와 TEE를 함께 구현하면:

```
[Discord/X/TG 팬]
      ↓
[Eliza Runtime]  ← 성격·기억 관리
      ↓
[Lit Action]     ← 서명 판단 (규칙 코드, 불변)
      ↓
[PKP Solana Wallet] ← 키 분산 보관 (서버에 없음)
      ↓
[Solana Mainnet/Devnet] ← 온체인 실행
```

**"완전 자율 AI 아이돌"**: 어느 플랫폼에서든 팬과 대화하고, 자체 지갑으로 토큰을 관리하며, 어떤 사람도 그 지갑을 빼앗을 수 없음.

---

## Related Documents
- [09_ADVANCED_ROADMAP](../03_Technical_Specs/09_ADVANCED_ROADMAP.md) — 전체 고도화 로드맵
- [05_ELIZA_INTEGRATION_PLAN](./05_ELIZA_INTEGRATION_PLAN.md) — Eliza 통합 계획 (함께 구현)
- [02_SOLANA_INTEGRATION_SPECS](../03_Technical_Specs/02_SOLANA_INTEGRATION_SPECS.md) — 현재 Solana 온체인 구조
