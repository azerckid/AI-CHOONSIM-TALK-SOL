# NEAR Invisible Wallet Management & Migration Strategy
> Created: 2026-02-08
> Last Updated: 2026-02-08

이 문서는 춘심(CHOONSIM) 프로젝트에서 사용자에게 번거로운 지갑 생성 과정 없이 온체인 자산(CHOCO 토큰)을 제공하기 위한 **임베디드 지갑 생성 및 기존 사용자 마이그레이션 전략**을 정의합니다.

---

## 1. 목적 (Goals)
*   **Zero-UI Onboarding**: 사용자가 Web3 지갑의 존재를 모르더라도 회원가입 즉시 온체인 결제가 가능한 환경 구축.
*   **Retroactive Coverage**: 지갑 없이 가입했던 기존 사용자들에게도 로그인 시 자동으로 지갑을 부여.
*   **Security & Privacy**: 사용자의 개인키를 서버 사이드에서 안전하게 관리하며, 필요한 시점에만 서명(Relayer) 서비스 제공.

---

## 2. 기술 아키텍처 (Technical Architecture)

### 2.1 계정 체계 (Account Structure)
*   **Parent Account**: `rogulus.testnet` (서비스 운영 주체)
*   **User Sub-Account**: `user-[uuid].rogulus.testnet`
    *   사용자의 고유 ID(UUID)를 활용하여 NEAR 네트워크상에 서브 계정 생성.
    *   장점: 서비스 계정의 권한 내에서 계정 생성이 빠르고 저렴함.

### 2.2 키 관리 (Key Management)
*   **Key Pair Generation**: 계정 생성 시 서버에서 비대칭 키 쌍을 생성.
*   **Storage**: 
    *   Public Key: DB의 `User.nearPublicKey` 필드에 저장.
    *   Private Key: 환경 변수로 관리되는 암호화 키를 사용하여 암호화 후 DB 또는 전용 KMS에 보관.
*   **Usage**: 사용자가 결제를 원할 때, 서버가 해당 키를 복호화하여 임시 메모리에서만 사용하고 서명 후 폐기.

---

## 3. 핵심 워크플로우 (Core Workflows)

### 3.1 [신규 유저] 회원가입 즉시 생성 (Active Creation)
1.  사용자가 구글/카카오 등으로 회원가입 수행.
2.  `Better Auth`의 `user.create.after` 훅 트리거.
3.  백엔드:
    *   사용자용 NEAR KeyPair 생성 및 암호화.
    *   `rogulus.testnet` 계정을 호출하여 서브 계정(`[uuid].rogulus.testnet`) 생성 트랜잭션 전송.
    *   **NEP-145 Storage Deposit**: CHOCO 토큰 수령을 위한 스토리지 예치금 대납.
4.  DB 업데이트: `nearAccountId`, `nearPublicKey` 저장.

### 3.2 [기존 유저] 로그인 시 점진적 마이그레이션 (Lazy Migration)
1.  기존 사용자가 로그인 수행.
2.  `Better Auth`의 `session.create.after` 훅 트리거.
3.  백엔드:
    *   해당 유저의 `nearAccountId`가 `null`인지 확인.
    *   `null`이라면 **Active Creation**과 동일한 과정을 수행하여 즉석에서 지갑 생성.
4.  사용자는 다음 페이지 이동 전 또는 결제 시점에 이미 지갑이 준비된 상태가 됨.

### 3.3 [전체 유저] 배치 처리 (Batch Migration)
*   관리자 전용 스크립트(`scripts/migrate-user-wallets.ts`) 제공.
*   로그인하지 않은 휴면 유저들까지 포함하여 모든 대상에게 일괄적으로 NEAR 계정 생성 및 스토리지 예치.

---

## 4. 결제 및 충전 (Payment & Top-up)

### 4.1 X402 결제 흐름 (Internal)
1.  **Requirement**: 사용자가 AI 대화 시도 시 잔액 부족으로 402 에러 발생.
2.  **Silent Sign**: 사용자가 '한도 내 자동 결제'를 승인한 경우, 서버가 보유한 유저 키로 즉시 서명.
3.  **Relay**: 생성된 서명을 릴레이어가 제출하여 가스비 없이 CHOCO 토큰 전송.
4.  **Verification**: 서버는 온체인 결과 확인 후 AI 답변 전송.

### 4.2 충전 (Recharge)
*   **외부 입금**: 사용자가 본인의 `nearAccountId` 주소로 외부 거래소나 지갑에서 CHOCO 토큰을 전송.
*   **Webhook 감지**: 토큰 입금 시 백엔드가 감지하여 DB의 `chocoBalance` 및 `credits`를 즉시 업데이트.
*   **관리자 지급**: 이벤트나 프로모션 시 관리자가 `rogulus.testnet`을 통해 직접 유저 지갑으로 토큰 전송.

---

## 5. 단계별 구현 체크리스트

- [x] **Phase 1: Wallet Engine 개발** ✅ 완료 (2026-01-11)
    - [x] `app/lib/near/wallet.server.ts` 내 `ensureNearWallet` 로직 구현 완료.
    - [x] 서브 계정 생성 로직 구현 완료 (`serviceAccount.createAccount`).
    - [x] Storage Deposit 자동화 통합 완료.
    - [x] AES-256-GCM 기반 키 암호화 모듈 구현 완료 (`app/lib/near/key-encryption.server.ts`).
- [x] **Phase 2: Auth Hook 통합** ✅ 완료 (2026-01-11)
    - [x] `auth.server.ts`에 `user.create.after` 훅 연동 완료.
    - [x] `auth.server.ts`에 `session.create.after` 훅 연동 완료.
- [x] **Phase 3: 가스비 및 보증금 재원 확보** ✅ 완료 (2026-01-11)
    - [x] 서브 계정 생성 시 0.1 NEAR 보증금 포함 완료.
    - [x] Storage Deposit 자동화 완료.
    - [x] 서비스 계정 잔액 모니터링 모듈 구현 완료 (`app/lib/near/balance-monitor.server.ts`).
- [x] **Phase 4: 마이그레이션 도구 제작** ✅ 완료 (2026-01-11)
    - [x] CLI 기반 일괄 생성 스크립트 작성 완료 (`scripts/migrate-user-wallets.ts`).
    - [x] 배치 처리 및 자동 성공/실패 로깅 로직 구현 완료.

---

## 6. 보안 고려사항
*   **Key Isolation**: Private Key는 원문 그대로 DB에 저장되지 않아야 함. 서비스 계정과 사용자 계정의 키 관리를 엄격히 분리.
*   **Rate Limiting**: 계정 생성 요청에 대한 어뷰징 방지 로직 적용.
*   **Audit**: 지갑 생성 및 입출금 내역에 대한 정기적인 시스템 감사 로그 생성.


## Related Documents
- **Specs**: [Document Management Plan](../01_Concept_Design/09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
