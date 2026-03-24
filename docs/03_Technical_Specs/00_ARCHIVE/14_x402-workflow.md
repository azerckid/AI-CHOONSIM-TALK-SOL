# NEAR X402 System: Internal Workflow & Architecture
> Created: 2026-02-08
> Last Updated: 2026-02-08

이 문서는 사용자가 회원가입부터 결제, 충전까지 진행하는 과정에서 시스템 내부적으로 어떤 기술적 상호작용이 일어나는지 정리한 아키텍처 가이드입니다.

---

## 1. 회원가입 및 지갑 생성 (User Onboarding)

사용자가 이메일 또는 SNS 로그인을 통해 처음 서비스에 가입할 때의 과정입니다.

### 1.1 임베디드 지갑 자동 생성 (Invisible Wallet)
*   **Trigger**: `auth.server.ts`의 `databaseHooks.onRegistration` (또는 첫 로그인 시).
*   **Internal Process**:
    1.  서버 사이드에서 새로운 NEAR 키 페어(Public/Private Key)를 생성합니다.
    2.  사용자의 Email 또는 고유 ID를 기반으로 NEAR Account ID(예: `user_123.choonsim.testnet`)를 결정합니다.
    3.  **Service Account**가 가스비를 지불하여 NEAR 체인상에 해당 계정을 생성하고, 생성된 Public Key를 `FullAccessKey`로 등록합니다.
    4.  Private Key는 서버의 안전한 저장소(KMS 등) 또는 암호화되어 DB에 저장됩니다. (사용자에게는 노출되지 않는 'Invisible' 상태)
*   **Result**: 사용자는 지갑을 만들었다는 인지 없이, DB의 `User` 테이블에 `nearAccountId`와 `nearPublicKey`가 등록됩니다.

---

## 2. 결제 및 대화 (X402 Flow)

사용자가 AI와 대화를 시도할 때 발생하는 **"Pay-per-Message"** 흐름입니다.

### 2.1 HTTP 402 Payment Required 발생
1.  사용자가 `/api/chat`에 메시지를 전송합니다.
2.  서버는 사용자의 `credits` 또는 `chocoBalance`를 확인합니다.
3.  잔액이 부족하거나 유료 메시지인 경우, 서버는 **HTTP 402** 에러를 반환합니다.
    *   **Payload**: `amountUSD`, `recipient`, `tokenContract` 정보가 담긴 `X402Invoice` 객체.

### 2.2 클라이언트 결제 레이어 (PaymentSheet)
1.  프런트엔드 인터셉터가 402 응답을 감지하고 `PaymentSheet`를 띄웁니다.
2.  **Relayer Workflow (가스비 대납)**:
    *   사용자의 지갑에서 `ft_transfer_call` 액션에 대한 서명만 생성합니다. (SignedDelegate)
    *   직렬화된 서명 데이터를 `/api/relayer/submit`으로 전송합니다.
    *   **Relayer Server**가 가스비를 얹어서 네트워크에 최종 제출합니다.
3.  **Verification**: 서버는 `txHash`를 통해 온체인 전송이 완료되었는지 확인하고, 사용자의 `credits`를 업데이트하거나 인보이스 상태를 `PAID`로 변경합니다.

---

## 3. 토큰 충전 (Top-up & Sync)

외부 지갑에서 CHOCO 토큰을 충전하거나 밸런스를 동기화하는 과정입니다.

### 3.1 밸런스 동기화 (On-chain to DB)
*   **Process**:
    1.  사용자가 프로필 페이지에 진입하면 `getChocoBalance` (client-side)가 호출됩니다.
    2.  NEAR RPC를 통해 컨트랙트(`choco.token...`)의 `ft_balance_of` 기능을 호출하여 실제 온체인 잔액을 가져옵니다.
    3.  서버는 이 잔액을 DB의 `chocoBalance` 필드와 주기적으로 동기화하여 빠른 조회를 지원합니다.

### 3.2 자동 승인 설정 (Silent Payment Allowance)
*   **Process**:
    1.  매번 결제 팝업을 띄우지 않기 위해, 사용자는 특정 금액(예: $10)까지 **자동 결제**를 허용할 수 있습니다.
    2.  이 정보는 DB의 `allowanceAmount`에 저장됩니다.
    3.  이후 402 에러 발생 시, `checkSilentPaymentAllowance` 로직에 의해 팝업 없이 백그라운드에서 Relayer 결제가 진행됩니다.

---

## 4. 보안 및 모니터링 (Hardening)

### 4.1 릴레이어 보호 (Anti-Abuse)
*   **Rate Limiting**: `app/routes/api/relayer/submit.ts`에서 사용자 ID당 시간당 요청 횟수를 제한합니다.
*   **Logging**: 모든 대납 요청은 `RelayerLog` 테이블에 기록되어 관리자가 대납 비용 소모 추이를 감시할 수 있습니다.

### 4.2 계정 분리
*   **Relayer Account**: 대납용 가스비만 보유 (최소화된 권한).
*   **Service Account**: 사용자 지갑 생성 및 마스터 권한 관리.

---

## 5. 전체 데이터 흐름 요약 (Sequence)

1.  **User** -> **Server**: API Request
2.  **Server** -> **User**: HTTP 402 (Invoice)
3.  **User (Client)**: Sign Transaction (SignedDelegate)
4.  **User** -> **Relayer API**: Submit Signature
5.  **Relayer** -> **NEAR Chain**: Execute Transaction (Pay Gas)
6.  **NEAR Chain** -> **Relayer**: TX Success (Hash)
7.  **Relayer** -> **User**: Success Message
8.  **User** -> **Server**: Original API Request (w/ TX Hash)
9.  **Server**: Content Delivered!


## Related Documents
- **Specs**: [Document Management Plan](../01_Concept_Design/09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
