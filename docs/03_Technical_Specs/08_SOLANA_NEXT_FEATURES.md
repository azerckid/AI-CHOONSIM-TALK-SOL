# 08. Solana 차세대 기능 구현 계획

> 해커톤 마감: 2026-04-05 23:59 KST
> 작성일: 2026-03-28
> 최종 업데이트: 2026-03-29

---

## 우선순위 요약

| 순위 | 기능 | 난이도 | 임팩트 | 상태 |
|------|------|--------|--------|------|
| 1 | Embedded Wallet (Privy) | 중 | 최고 | ✅ 완료 |
| 2 | Sign In With Solana (SIWS) | 하 | 중 | ✅ 완료 |
| 3 | ZK Compression | 상 | 중 | 🔨 구현 중 |
| 4 | Solana Mobile (SMS) | 상 | 낮음 | 해커톤 후 |

---

## 1. ✅ Embedded Wallet (Privy) — 완료 (2026-03-29)

### 해결책
**Privy Embedded Wallet** — 이메일/소셜 로그인만으로 자동으로 지갑 생성. Phantom 설치 불필요.

### 구현 결과
- `@privy-io/react-auth` SDK + `PrivyWalletProvider` 래핑
- 채팅 인라인 결제 카드(`ChocoPayCard`) — Phantom 없으면 Privy 임베디드 지갑으로 결제
- Privy `signTransaction` + `sendRawTransaction` (Privy 백엔드 우회)
- Buffer 폴리필 (`root.tsx`), `solana:devnet` RPC 설정

### 관련 파일
- `app/components/solana/PrivyWalletProvider.tsx`
- `app/components/payment/PrivyChocoPayCard.tsx`
- `app/components/payment/ChocoPayCard.tsx`

---

## 2. ✅ Sign In With Solana (SIWS) — 완료 (2026-03-29)

### 해결책
SIWS — 지갑 서명으로 로그인. 지갑이 곧 신원.

### 구현 결과
- `tweetnacl` Ed25519 서명 검증 (외부 라이브러리 추가 없음)
- nonce → `verification` 테이블 저장 (5분 TTL)
- `solanaWallet`로 기존 계정 조회 → 소셜/이메일 계정도 Phantom 하나로 로그인
- 신규 지갑 → `siws_<wallet>@choonsim.wallet` 자동 계정 생성
- Better Auth 쿠키 서명 알고리즘 재현 (HMAC-SHA256 Web Crypto API)

### 관련 파일
- `app/lib/solana/siws.server.ts`
- `app/routes/api/auth/siws/nonce.ts`
- `app/routes/api/auth/siws/verify.ts`
- `app/components/auth/SiwsButton.tsx`

---

## 3. 🔨 ZK Compression — 구현 중

### 배경
Solana Foundation이 가장 강하게 추진 중인 기술.
계정/토큰 상태를 압축해 비용을 최대 99% 절감.

이미 사용 중: cNFT (Merkle Tree 기반 압축)

### 추가 적용 가능 영역
- **Compressed Token** — CHOCO 토큰을 ZK Compression으로 발행 시 대량 에어드랍 비용 절감
- **Compressed State** — 대화 기록, 사용자 상태 온체인 저장 비용 절감

### 구현 계획
- `@lightprotocol/stateless.js` SDK 사용
- CHOCO 에어드랍(체크인 보상) → Compressed Token Transfer 전환
- 기존 SPL Token-2022 방식과 병행 운영

### 주의사항
- Light Protocol Devnet 안정성 확인 필요
- Token-2022와 혼용 시 호환성 검토 필요

---

## 4. Solana Mobile (SMS) — 해커톤 후

### 배경
Solana Saga (Chapter 2) 전용 모바일 dApp 스토어.
Mobile Blinks 지원으로 네이티브 모바일 UX 제공.

### 구현 계획 (포스트 해커톤)
- Android APK 빌드 (Capacitor 또는 React Native)
- Solana dApp Store 등록
- Mobile Wallet Adapter 통합
- Push notification → Blinks 연동

### 이유
현재 Web 기반 앱을 모바일 네이티브로 전환하는 작업이 필요해 해커톤 기간 내 불가.

---

## 구현 순서

```
Day 1-2: Embedded Wallet (Privy) 통합
Day 3:   SIWS 추가 (로그인 페이지)
Day 4-5: ZK Compression 검토 및 적용
Day 6-7: 테스트 및 데모 준비
Day 8:   해커톤 제출 (2026-04-05)
```
