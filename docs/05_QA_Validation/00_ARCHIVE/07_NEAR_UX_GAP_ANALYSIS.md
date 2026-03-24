# NEAR Zero-Friction UX 흐름 및 필수 UI 분석 보고서
> Created: 2026-02-08
> Last Updated: 2026-02-08

이 문서는 사용자가 NEAR 기반의 결제 및 서비스를 이용하는 전체 흐름(User Journey)을 정의하고, 각 단계에서 필수적으로 요구되는 UI와 현재 구현 상태를 분석하여 누락된 요소(Gap)를 도출합니다.

## 1. 전체 사용자 흐름 (User Journey Overview)

1.  **진입 (Entry)**: 앱 실행 및 자동 지갑 생성 (Invisible Wallet).
2.  **입금 (Deposit)**: 외부 지갑에서 NEAR를 앱 내 지갑으로 전송.
3.  **환전 (Swap)**: 입금된 NEAR를 서비스 재화(CHOCO)로 변환.
4.  **사용 (Payment)**: 유료 기능(채팅 등) 사용 시 402 에러 처리 및 가스리스 결제.
5.  **확인 (Verify)**: 잔액 차감 내역 및 가스비 무료 확인.

---

## 2. 단계별 상세 분석

### 단계 1: 진입 (Entry & Wallet Check)
*   **사용자 행동**: 로그인 후 "내 지갑"이 어디 있는지 확인하고 싶어함.
*   **필수 UI**:
    *   [x] **지갑 주소 표시**: 메인 화면이나 설정 진입 직후 눈에 띄는 곳에 배치. (✅ 완료)
    *   [x] **복사 버튼**: 주소를 쉽게 복사할 수 있는 버튼. (✅ 완료)
*   **현재 상태 (As-Is)**:
    *   `/settings` 하단 "지갑 관리" > "지갑 내보내기" 다이얼로그 내부에 숨겨져 있음.
    *   사용자가 찾기 매우 어려움.
*   **개선 완료 (Done)**:
    *   설정 메인 화면 상단(프로필 아래)에 **Wallet Status Card** 배치 완료.
    *   카드 내 지갑 주소 표시 및 복사 기능 구현 완료.

### 단계 2: 입금 (Deposit)
*   **사용자 행동**: "돈을 넣고 싶어" -> 입금 버튼을 누름 -> QR코드나 주소를 보고 송금함.
*   **필수 UI**:
    *   [x] **[입금] 버튼**: 직관적인 액션 버튼 (Deposit / Receive). (✅ 완료)
    *   [x] **QR 코드**: 모바일 지갑 스캔용 QR. (✅ 완료)
    *   [x] **입금 가이드**: "NEAR 네트워크로 전송하세요" 등의 문구. (✅ 완료)
*   **현재 상태 (As-Is)**:
    *   전무함. 입금 버튼도 없고, QR 코드도 없음.
*   **개선 완료 (Done)**:
    *   **입금 전용 모달(Dialog)** 구현 완료 (QR 코드 포함).
    *   지갑 잔액 표시 화면 내 `[입금]` 버튼 배치 완료.

### 단계 3: 환전 (Swap / Exchange)
*   **사용자 행동**: "NEAR는 있는데 CHOCO가 없네?" -> NEAR를 CHOCO로 바꾸고 싶음.
*   **필수 UI**:
    *   [x] **잔액 현황판**: `NEAR: 5.2` / `CHOCO: 0` 등 이중 잔액 표시. (✅ 완료)
    *   [x] **[환전] 버튼**: 스왑 UI 진입점. (✅ 완료)
    *   [x] **환전 인터페이스**:
        *   환율 표시: `1 NEAR = 5,000 CHOCO`.
        *   **[입금 확인 및 환전] 버튼**: 실행 액션. (✅ 완료)
*   **현재 상태 (As-Is)**:
    *   백엔드 자동 환전은 있으나, 사용자가 인지하거나 수동으로 실행할 UI가 없음.
*   **개선 완료 (Done)**:
    *   **Swap UI** 및 다이얼로그 구현 완료.
    *   `/api/wallet/check-deposit` 연동으로 수동 환전 트리거 기능 구현.

### 단계 4: 사용 (Usage & 402 Payment)
*   **사용자 행동**: 유료 채팅 시도 -> "Credit 부족" 경고 -> "결제하시겠습니까?" 팝업 -> 승인.
*   **필수 UI**:
    *   [x] **402 결제 시트(Payment Sheet)**: ✅ 구현 완료
        *   청구 금액 표시 (예: "10 CHOCO").
        *   보유 잔액 및 차감 후 잔액 표시.
        *   **[결제 승인] 버튼**.
    *   [x] **자동 결제**: ✅ 구현 완료 (백엔드 Allowance 기반)
*   **현재 상태 (As-Is)**:
    *   402 인터셉터 및 Payment Sheet 완벽 동작.

### 단계 5: 잔액 및 내역 확인 (History)
*   **사용자 행동**: "방금 얼마 빠져나갔지?" -> 내역 확인.
*   **필수 UI**:
    *   [x] **Transaction History**: 최근 사용/충전 내역 리스트. (✅ 완료)
    *   [x] **가스비 무료 표시**: "수수료: 0 NEAR (대납됨)" 등을 명시. (✅ 완료)
*   **현재 상태 (As-Is)**:
    *   없음.
*   **개선 완료 (Done)**:
    *   **History 다이얼로그** 추가 완료. (Wallet Card 우측 상단 시계 아이콘)
    *   `ExchangeLog` 데이터 기반 사용 내역 리스트 표시 구현.

---

## 3. 요약 및 우선순위 (To-Do List)

> **Status Update (2026-01-11)**: UI v1.2.0 배포로 모든 [최우선] 및 [권장] 항목이 구현되었습니다.

### 구현 완료된 기능 ✅
- ✅ **402 결제 시스템**: Global Payment Modal 연동 완료 (`root.tsx`)
- ✅ **자동 환전**: 입금 시 자동으로 CHOCO로 환전됨 (`deposit-engine.server.ts`)
- ✅ **자동 결제**: 한도 내 자동 결제 로직 구현됨 (`use-x402.ts`)
- ✅ **[최우선] 입금 UI (QR)**: QR 코드 및 입금 버튼 구현 완료 (`settings.tsx`)
- ✅ **[최우선] 환전(Swap) UI**: 수동 환전/확인 UI 구현 완료 (`settings.tsx`)
- ✅ **[필수] 잔액 표시**: Wallet Status Card 구현 완료 (`settings.tsx`)
- ✅ **[권장] 결제 내역**: Transaction History UI 구현 완료 (`settings.tsx`)

### 구현 완료된 기능 ✅
1.  **[신규] 채팅방 실시간 잔액 표시**: 돈을 쓰고 있다는 감각을 제공함.
    *   [x] 채팅방 헤더에 Credit/CHOCO 잔액 뱃지 추가 완료. (✅ 완료)
    *   [x] 사용 시 숫자가 실시간으로 차감되는 애니메이션(Optimistic UI) 구현 완료. (✅ 완료)
    *   [x] 카운터 애니메이션 (Rolling Counter) 구현 완료. (✅ 완료)
    *   [x] 시각적 피드백 (차감 시 붉은색 점멸, 충전 시 녹색 점멸) 구현 완료. (✅ 완료)
    *   **구현 완료 상태**: 전체 구현 완성도 100%. 채팅방 헤더 잔액 뱃지, Optimistic UI, Rolling Counter 애니메이션, 변동량 표시 모두 구현 완료.
    *   **구현 파일**: 
        *   `app/components/chat/ChatHeader.tsx`: 잔액 뱃지 및 변동량 표시
        *   `app/components/ui/RollingCounter.tsx`: 카운터 애니메이션 컴포넌트
        *   `app/components/ui/BalanceChangeIndicator.tsx`: 변동량 텍스트 표시 컴포넌트
        *   `app/routes/chat/$id.tsx`: Optimistic UI 및 실제 비용 조정 로직
    *   **관련 스펙**: `NEAR_X402_UI_SPEC.md`의 4.5절 참조.
    *   **확인 보고서**: `NEAR_CHAT_BALANCE_UI_COMPLETION_REPORT.md` 참조.

### 남은 과제
- **UAT (사용자 인수 테스트)**: 실제 입금 및 사용 시나리오 검증 필요.


## Related Documents
- **Test**: [Document Management Plan](../01_Concept_Design/09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
