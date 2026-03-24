# NEAR X402 & Relayer 사용자 가이드 (User & Admin Guide)
> Created: 2026-02-08
> Last Updated: 2026-02-08

이 문서는 춘심(CHOONSIM) 프로젝트에 적용된 NEAR Protocol 기반 X402 결제 시스템과 가스비 대납(Relayer) 서비스의 작동 방식 및 확인 방법을 설명합니다.

---

## 1. 사용자 통합 시나리오 (User Journey)

### Step 1: 지갑 연결 (Wallet Connection)
*   **시점**: 사용자가 AI 채팅 중 하트(크레딧)가 부족해져서 결제 시트(`PaymentSheet`)가 뜨거나, 프로필 페이지에서 '지갑 연결' 버튼을 클릭할 때.
*   **방식**: 현재는 외부 지갑(MyNearWallet 등)을 브라우저 브릿지로 연결합니다. 
*   **핵심 경험**: 사용자는 복잡한 가스비 개념 없이도 자신의 지갑을 서비스에 연결하여 CHOCO 토큰 잔액을 즉시 확인할 수 있습니다.

### Step 2: CHOCO 토큰 획득 및 충전
*   **입금(Deposit)**: 사용자가 자신의 NEAR 지갑에서 서비스의 CHOCO 토큰 컨트랙트로 토큰을 전송합니다.
*   **자동 감지**: 서버의 웹훅(`token-deposit.ts`)이 온체인 트랜잭션을 실시간으로 감지하여 사용자의 DB 잔액(`chocoBalance`)을 업데이트합니다.
*   **확인**: 지갑 대시보드나 결제 시트에서 실시간으로 업데이트된 잔액을 볼 수 있습니다.

### Step 3: 가스리스(Gasless) 결제 프로세스
*   **결제 요청**: AI 채팅 시작 시 크레딧이 부족하면 서버가 `402 Payment Required` 응답을 보냅니다.
*   **인터셉터 작동**: 클라이언트의 `useX402` 훅이 이를 가로채 결제 시트를 띄우거나 자동 결제(Silent Payment)를 시도합니다.
*   **가스비 대납**: 사용자는 트랜잭션에 서명만 하며, 실제 가스비(NEAR)는 서버의 **릴레이어 계정**이 대납합니다.
*   **최종 결과**: 사용자는 NEAR 코인이 0개여도 CHOCO 토큰만으로 유료 서비스를 즉시 결제하고 이용할 수 있습니다.

---

## 2. 관리자 점검 가이드 (Admin/Operator Setup)

### 릴레이어 계정 관리 (Relayer Monitoring)
*   **서비스 계정**: `rogulus.testnet` (또는 환경 변수 `NEAR_SERVICE_ACCOUNT_ID`에 설정된 계정)
*   **잔액 점검**: 릴레이어 계정에는 항상 가스비를 지불할 수 있는 충분한 NEAR가 있어야 합니다. (최소 0.5 NEAR 이상 유지 권장)
*   **로그 확인**: `RelayerLog` 테이블을 통해 어떤 사용자가 언제 가스비 대납을 사용했는지, 성공/실패 여부는 무엇인지 추적할 수 있습니다.

### 보안 및 제한 정책 (Security Policy)
*   **Rate Limiting**: 동일 사용자는 **시간당 최대 10회**의 릴레이 서비스만 이용 가능합니다. (남용 방지)
*   **Allowance**: 사용자가 설정한 '자동 결제 한도' 내에서는 별도의 서명 팝업 없이 결제가 처리됩니다.

---

## 3. 기능 검증 방법 (How to Verify)

| 검증 항목 | 방법 | 기대 결과 |
| :--- | :--- | :--- |
| **가스리스 결제** | NEAR가 0개인 계정으로 결제 시도 | 결제 성공 및 TX Hash 생성 |
| **남용 방지** | 1시간 내 11회 이상 릴레이 요청 | `429 Too Many Requests` 발생 |
| **자동 충전** | 외부 지갑에서 토큰 전송 후 1분 대기 | DB의 `chocoBalance` 자동 증가 |
| **자동 결제** | 한도 설정 후 AI 채팅 요청 | 결제창 없이 채팅 즉시 시작 |
| **운영 로그** | DB의 `RelayerLog` 조회 | 요청자 IP, 유저 ID, TX Hash 기록 확인 |

---

**최종 수정일**: 2026-01-11
**버전**: 1.0 (X402 & Relayer 통합 가이드)
**상태**: Phase 5 구현 완료 반영


## Related Documents
- **Test**: [Document Management Plan](../01_Concept_Design/09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
