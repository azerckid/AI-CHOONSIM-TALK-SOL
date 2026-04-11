# 09. 춘심 고도화 로드맵 — 우승 전략 기술 분석

> 작성일: 2026-04-11  
> 기준: 2026년 3월 Solana Agent Hackathon 우승작 트렌드 분석  
> 목적: 현재 구현 상태 분류 + 다음 Phase 우선순위 정의

---

## 전체 상태 요약

| # | 기능 | 현재 상태 | 구현 분류 |
|---|------|-----------|-----------|
| 1 | Jupiter Swap 채팅 내 직접 스왑 | 임시 구현 (SOL→서버 중앙화 결제) | Phase 2 (메인넷 출시 후) |
| 2 | Eliza Framework 멀티플랫폼 페르소나 | 미구현 | Phase 3 (장기) |
| 3 | TEE 기반 에이전트 키 위임 | 미구현 | Phase 3 (장기) |
| 4 | Meta-Blinks & Rich Actions | 부분 구현 (기본 Blinks) | Phase 2 (단기, 즉시 가능) |

---

## 1. Jupiter Swap — 채팅 내 직접 스왑

### 현재 상태: 임시 구현 (⚠️ 중앙화 방식)

**구현된 것:**
- `buyChoco` AI 도구가 서버에서 트랜잭션을 미리 빌드 → `[SWAP_TX:paymentId:base64tx]` 마커 반환
- `SwapTxCard` 컴포넌트: 프리빌드 tx를 역직렬화 → Phantom 서명만 요청
- `/api/payment/solana/verify-sig`: SOL 수신 확인 → DB CHOCO 증가 + SPL CHOCO 전송
- UX는 Jupiter Swap과 동일 (서명 한 번으로 즉시 충전)

**임시 구현의 한계:**
```
유저 지갑 → (SOL) → 서버 지갑 → (CHOCO SPL) → 유저 지갑
              ↑ 중앙화 결제              ↑ 서버가 수동 전송
```
- CHOCO 토큰이 DEX 유동성 풀에 없음 (Devnet 커스텀 토큰)
- 서버가 SOL을 수령하고 CHOCO를 수동 전송 → 탈중앙화 아님
- Jupiter API 미사용 (solana-agent-kit의 `trade()` 함수 미사용)

**진짜 Jupiter Swap 조건:**
```
유저 지갑 → Jupiter 라우터 → (SOL→CHOCO 온체인 스왑) → 유저 지갑
              ↑ 완전 탈중앙화, 서버 중개 없음
```

### Phase 2 구현 계획 (메인넷 출시 후)

**사전 조건:**
1. CHOCO 메인넷 SPL Token-2022 발행
2. Orca 또는 Raydium에 SOL/CHOCO 유동성 풀 생성
3. Jupiter 인덱싱 확인 (`GET /quote?inputMint=SOL&outputMint=CHOCO`)

**코드 변경 범위:**

```typescript
// apps/web/app/lib/solana/agent-kit.server.ts
// buyChoco 도구 — Phase 2 교체 예정

// 현재 (임시):
const tx = new Transaction().add(
  SystemProgram.transfer({ fromPubkey, toPubkey: serverWallet, lamports })
);

// Phase 2 (실제 Jupiter):
const quoteResponse = await fetch(
  `https://quote-api.jup.ag/v6/quote?inputMint=So11111...&outputMint=${CHOCO_MINT}&amount=${lamports}&slippageBps=50`
);
const { swapTransaction } = await fetch("https://quote-api.jup.ag/v6/swap", {
  method: "POST",
  body: JSON.stringify({ quoteResponse, userPublicKey: user.solanaWallet })
}).then(r => r.json());
// swapTransaction이 이미 base64 직렬화 완료 → SwapTxCard에 그대로 전달
```

**프론트엔드 변경:** `SwapTxCard`는 그대로 사용 가능 (이미 base64 tx 서명 패턴)

---

## 2. Eliza Framework — 멀티플랫폼 페르소나

### 현재 상태: 미구현

**현재 아키텍처:**
- LangGraph 기반 멀티노드 AI (페르소나 분석 → 도구 호출 → 응답 생성)
- 메모리: Turso DB (5계층 UserContext 시스템)
- 채널: 웹 앱 단독

**Eliza 연동의 가치:**
- Discord, X(트위터), 텔레그램에서 동일 춘심 페르소나 + 메모리 공유
- Eliza의 Character JSON 형식이 표준 페르소나 교환 포맷으로 부상
- 해커톤에서 가장 많이 채택된 에이전트 프레임워크

**브릿징 설계안 (Phase 3):**

```
[웹앱 LangGraph] ←→ [Context API (Turso)] ←→ [Eliza Runtime]
                          ↑
                   공유 메모리 레이어
                   /api/context/:characterId
```

- 현재 `/api/context/*` REST API가 이미 Eliza 연동 브릿지로 활용 가능
- Eliza 플러그인으로 `choonsim-context-plugin` 개발 필요
- 각 플랫폼(Discord/X)에서 발생한 대화가 Turso에 기록 → 웹에서도 동일 기억 유지

**현실적 평가:**
- LangGraph ↔ Eliza 브릿지 개발 공수: 2~3주
- 해커톤 내 구현 불가, Phase 3 장기 목표로 분류

---

## 3. TEE (Trusted Execution Environment) — 에이전트 키 위임

### 현재 상태: 미구현 (⚠️ 보안 취약점 존재)

**현재 위험:**
```
SOLANA_AGENT_PRIVATE_KEY=[ ... ] # Vercel 환경변수
→ 서버 관리자가 키에 접근 가능
→ "신뢰할 수 없는 에이전트" 문제
```

**TEE 구현 목표:**
- 에이전트 프라이빗 키를 TEE(Intel SGX / AWS Nitro Enclaves) 내에 격리
- 서버 관리자조차 키를 볼 수 없음을 원격 증명(Remote Attestation)으로 증명
- "춘심이 지갑은 춘심이만 제어한다" — 사용자 신뢰 극대화

**솔라나 생태계 TEE 옵션:**

| 솔루션 | 난이도 | 비용 |
|--------|--------|------|
| Marlin Oyster (AWS Nitro) | 중 | 유료 |
| Phala Network (Intel SGX) | 중 | 유료 |
| Lit Protocol (MPC 기반) | 하 | 유료 |
| Secret Network 브릿지 | 상 | 복잡 |

**현실적 평가:**
- 인프라 비용 및 구현 복잡도 높음
- 해커톤 후 실제 서비스화 시 필수 검토 항목
- Phase 3 보안 고도화 단계에서 구현

---

## 4. Meta-Blinks & Rich Actions

### 현재 상태: 기본 구현 완료, 고도화 가능

**현재 구현된 Blinks:**

| 엔드포인트 | 기능 | 상태 |
|-----------|------|------|
| `/api/actions/checkin` | 일일 출석 체크인 (ZK Compression) | ✅ 완료 |
| `/api/actions/gift` | CHOCO 선물하기 | ✅ 완료 |
| `/api/actions/subscribe` | 구독 결제 | ✅ 완료 |
| `/.well-known/solana-actions.json` | Actions 레지스트리 | ✅ 완료 |

**고도화 가능한 것 (즉시 구현 가능):**

### 4-1. cNFT 이미지 미리보기 Blink

```typescript
// GET /api/actions/gift 응답에 icon 동적 생성 추가
{
  "icon": "https://res.cloudinary.com/.../choonsim_nft_preview.jpg", // 실제 cNFT 이미지
  "title": "💝 춘심에게 초코 선물하기",
  "description": `현재 춘심 NFT 보유자: ${holderCount}명`,
  "label": "선물하기"
}
```

### 4-2. 실시간 CHOCO 가격 반영

```typescript
// Blink 응답에 동적 데이터 삽입
{
  "description": `1 SOL = ${chocoPerSol.toLocaleString()} CHOCO (실시간)`,
  "parameters": [{
    "name": "amount",
    "label": `CHOCO 수량 (최소 100, 현재 잔액: ${userBalance})`
  }]
}
```

### 4-3. Interoperable Blinks (링크드 액션)

```typescript
// 체크인 완료 후 → 자동으로 선물 Blink로 연결
{
  "links": {
    "next": {
      "type": "post",
      "href": "/api/actions/gift?auto=true"
    }
  }
}
```

**예상 구현 시간:** 각 항목 2~4시간, 해커톤 내 즉시 가능

---

## Phase별 구현 로드맵

```
Phase 1 (현재 — 해커톤)           Phase 2 (메인넷 출시)        Phase 3 (서비스화)
────────────────────────           ─────────────────────        ──────────────────
✅ SwapTxCard (임시 Jupiter UX)    Jupiter API 실제 연동         TEE 키 위임
✅ ZK Compression 체크인           메인넷 CHOCO 발행             Eliza 멀티플랫폼
✅ cNFT 각인                       DEX 유동성 풀 등록            DAO 거버넌스
✅ 기본 Blinks (3종)               Meta-Blinks 고도화            모바일 앱 (SMS)
✅ Privy 임베디드 지갑             Solana Pay QR 실물 결제
✅ SIWS 인증
```

---

## 즉시 실행 가능한 항목 (해커톤 잔여 기간)

우선순위 순:

1. **Meta-Blinks 고도화** (4시간)
   - cNFT 이미지 동적 미리보기
   - 실시간 CHOCO 가격 표시
   - Linked Actions 체인

2. **Blinks 페이지 UI 개선** (2시간)
   - `/blinks` 페이지에 인터랙티브 데모 추가
   - X(트위터) 공유 버튼 + 실제 Blink URL 프리뷰

3. **채팅 내 스왑 UX 개선** (1시간)
   - `SwapTxCard`에 "AI가 최적 경로를 찾았습니다" 뱃지 강화
   - 트랜잭션 완료 후 Solana Explorer 링크 표시

---

## 결론

> **해커톤 심사위원이 가장 주목할 포인트:**
> - "AI 에이전트가 채팅 안에서 트랜잭션을 직접 생성하고 실행" → 현재 구현됨 ✅
> - "서버 중개 없는 완전 탈중앙화 스왑" → Phase 2 (메인넷 후)
> - "멀티플랫폼 온체인 아이돌" → Phase 3 (장기)
>
> 현재 춘심의 기술 스택은 해커톤 우승에 충분한 수준입니다.
> 남은 기간은 **Meta-Blinks 고도화**와 **데모 시나리오 완성**에 집중하는 것을 권장합니다.
