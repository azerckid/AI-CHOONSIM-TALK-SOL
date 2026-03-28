# 08. Solana 차세대 기능 구현 계획

> 해커톤 마감: 2026-04-05 23:59 KST
> 작성일: 2026-03-28

---

## 우선순위 요약

| 순위 | 기능 | 난이도 | 임팩트 | 상태 |
|------|------|--------|--------|------|
| 1 | Embedded Wallet (Privy) | 중 | 최고 | 구현 예정 |
| 2 | Sign In With Solana (SIWS) | 하 | 중 | 구현 예정 |
| 3 | ZK Compression | 상 | 중 | 검토 중 |
| 4 | Solana Mobile (SMS) | 상 | 낮음 | 해커톤 후 |

---

## 1. Embedded Wallet (Privy) — 최우선

### 배경
현재 신규 유저 온보딩 흐름:
1. 회원가입
2. Phantom 앱 설치
3. 지갑 주소 복사
4. 프로필 → Wallet 메뉴에서 수동 등록

이 4단계 장벽이 일반 유저(non-crypto)의 최대 진입 장벽이다.

### 해결책
**Privy Embedded Wallet** — 이메일/소셜 로그인만으로 자동으로 지갑 생성. Phantom 설치 불필요.

### 구현 계획
- `@privy-io/react-auth` SDK 설치
- PrivyProvider로 앱 래핑
- 로그인 시 embedded wallet 자동 생성 → DB에 지갑 주소 자동 저장
- 기존 Phantom 연결은 외부 지갑 옵션으로 유지

### 기대 효과
- 온보딩 4단계 → 1단계 (소셜 로그인만)
- 일반 유저도 cNFT 발행, CHOCO 거래 가능
- 데모 시 심사위원에게 즉시 체험 가능

### 관련 파일
- `app/root.tsx` — PrivyProvider 추가
- `app/routes/api/user/wallet.ts` — 지갑 자동 등록
- `app/lib/auth/` — 로그인 후크 수정

---

## 2. Sign In With Solana (SIWS) — 2순위

### 배경
현재 인증: 이메일/소셜 로그인 (Better Auth)
지갑 연결: 별도 단계 (프로필에서 수동 등록)

### 해결책
SIWS — 지갑 서명으로 로그인. 지갑이 곧 신원.

### 구현 계획
- `@web3auth/sign-in-with-solana` 또는 직접 구현
- 로그인 페이지에 "Connect Wallet" 버튼 추가
- 지갑 서명 검증 → Better Auth 세션 생성
- 기존 이메일 로그인과 병행 제공

### 기대 효과
- crypto 유저는 지갑 하나로 모든 것 해결
- 별도 지갑 등록 단계 불필요

---

## 3. ZK Compression — 3순위

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
