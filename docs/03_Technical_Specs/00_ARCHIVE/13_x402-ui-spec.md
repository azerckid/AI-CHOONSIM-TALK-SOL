# NEAR Payment UI/UX Design Specification (Invisible Web3)
> Created: 2026-02-08
> Last Updated: 2026-02-08

이 문서는 춘심(CHOONSIM) 프로젝트의 NEAR Protocol 기반 결제 시스템을 위한 UI/UX 디자인 사양을 정의합니다. 본 사양의 핵심 목표는 사용자가 블록체인 기술을 인식하지 못하게 하면서도, 직관적이고 감성적인 결제 경험을 제공하는 **"Invisible Web3"** 구현에 있습니다.

**관련 문서**:
- `docs/plans/NEAR_X402_STRATEGY.md`: 구현 전략 및 로드맵 (이 문서의 Phase 1-2 작업 항목 참조)
- `docs/specs/NEAR_TOKEN_ISSUANCE_SPEC.md`: CHOCO 토큰 발행 및 관리 명세 (결제 수단 상세)

---

## 1. 디자인 원칙 (Core Principles)

*   대신 `초코(Choco)`, `크레딧(Credit)`, `하트 선물`, `보안 결제` 등 친숙한 Web2 용어를 사용합니다.
*   **용어 정의**:
    - **초코(Choco)**: 메인 통화 (온체인 자산). UI상으로는 🍫 또는 전용 심볼로 표기.
    - **크레딧(Credit)**: AI 서비스 이용 한도. 초코와 1:1로 연동되어 표시됨.
    - **하트(Heart)**: 캐릭터에게 주는 **선물 아이템**. 통화가 아닌 소모성 아이템으로 취급.

### 1.2 Emotional Interaction (감성적 상호작용)
*   결제는 단순한 금전 거래가 아닌, 캐릭터와의 관계를 위한 '선물' 또는 '지원'의 행위로 연출합니다.
*   성공적인 결제 시 시각적 보상(애니메이션)을 풍부하게 제공하여 심리적 만족감을 극대화합니다.

### 1.3 Zero-Friction (최소한의 마찰)
*   임베디드 지갑을 활용하여 복잡한 서명 과정을 배경으로 숨깁니다.
*   자율 결제 한도(Allowance) 내에서는 추가 승인 없이 즉시 처리가 이루어지는 'Silent Payment'를 지향합니다.

---

## 2. 결제 아키텍처 및 옵션 (Architecture & Options)

### 2.1 Chain Abstraction 기반 통합 수납 (Omni-chain Receipt)
*   **NEAR Fast Auth 중심 계정**: 사용자는 이메일을 통해 NEAR 계정을 생성하며, 이는 모든 체인 자산을 관리하는 마스터 계정 역할을 합니다.
*   **멀티 체인 주소 제공 (Chain Signatures)**: NEAR MPC 기술을 활용하여 동일한 계정에서 이더리움(ETH), 솔라나(SOL) 등의 입금 주소를 생성하고 관리합니다.
*   **통합 자산 관리**: 사용자는 어떤 코인으로 입금하든 서비스 내에서는 단일한 '크레딧' 또는 '하트'로 변환되어 표시됩니다. (기존의 파편화된 개별 코인 결제 UI를 하나로 통합)

### 2.2 하이브리드 결제 모델
사용자의 이용 패턴에 따라 두 가지 결제 방식을 유연하게 제공합니다.
*   **Pay-as-you-go (실시간 결제)**: 
    *   **적용**: 소규모 AI 대화, 단발성 미디어 생성 등.
    *   **자체 토큰 활용(Custom Token)**: 402 결제 시 NEAR 네이티브 코인이 아닌, 서비스 전용 토큰(예: `CHOCO`, NEP-141 표준)을 기본 결제 수단으로 사용합니다. 이는 서비스 브랜딩 강화와 가격 안정성 확보를 위함입니다.
    *   **UX**: X402 표준을 활용하여 별도의 충전 없이 연결된 지갑에서 즉시 전송합니다. 세션 키(Session Key)를 통해 매번 발생하는 승인 단계를 최소화하여 끊김 없는 경험을 제공합니다.
    *   **가스비 추상화**: NEAR의 메타 트랜잭션(Meta-transaction) 기능을 활용하여 사용자가 NEAR 코인을 보유하지 않아도 자체 토큰만으로 결제가 가능하도록 설계합니다. (운영측 Relayer가 가스비 대납)
*   **크레딧 선충전 (Bulk Recharge)**:
    *   **적용**: 헤비 유저, 보너스 혜택 희망자.
    *   **UX**: 사용 중인 타 체인(ETH, SOL 등) 자산을 전송하여 대량의 크레딧을 미리 충전합니다. 가스비(Gas fee) 절감 및 추가 보상 크레딧을 제공하여 Web2 방식의 사용자 편의성을 유지합니다.

---

## 3. 자산 온보딩 및 자동 전환 흐름 (Asset Lifecycle & Onboarding)

이 섹션은 유저의 자산이 어떻게 유입되고, 서비스 내부 토큰으로 전환되어 최종적으로 결제에 사용되는지의 전체적인 운영 흐름을 정의합니다.

### 3.1 단계별 시나리오
1.  **Step 1: 심리스한 계정 생성 (Fast Auth)**
    *   유저는 **이메일(Fast Auth)**만으로 가입합니다. 이 과정에서 유저는 본인이 블록체인 지갑(NEAR 계정)을 가졌다는 사실을 인지할 필요가 없는 'Invisible 온보딩'을 경험합니다.
2.  **Step 2: 멀티 체인 자산 전송 (Omni-chain Receipt)**
    *   유저가 보유한 기존 자산(이더리움, 솔라나 등)을 춘심 앱에서 제공하는 본인의 **멀티체인 주소**로 전송합니다. 
3.  **Step 3: 자동 감지 및 서비스 토큰 지급 (Settlement & Sweeping)**
    *   **입금 감지**: 앱 백엔드는 유저의 각 체인별 주소에 입금이 완료된 것을 실시간으로 감지합니다.
    *   **즉시 환전 및 지급**: 시스템은 입금된 코인의 가치를 계산하여, 그에 해당하는 양의 **자체 서비스 토큰(예: CHOCO)**을 유저의 NEAR 지갑으로 즉시 전송합니다.
    *   **운영 자산 수거**: 동시에 유저 주소에 입금된 원본 코인(ETH, SOL 등)은 보안 및 자산 관리를 위해 **회사의 통합 관리 지갑**으로 자동 수거(Sweep)됩니다.
4.  **Step 4: 자체 토큰을 이용한 실시간 결제 (X402 flow)**
    *   유저는 본인의 지갑에 지급된 서비스 토큰을 사용하여 AI 답변이나 미디어 생성 기능을 이용합니다.
    *   앱은 **402(Payment Required)**를 발생시키고, 유저의 NEAR 지갑에서 토큰을 실시간 차감합니다. 이때 가스비 대납(Relayer)을 통해 유저는 NEAR 코인 없이도 결제에 성공합니다.

---

## 4. 주요 UI 컴포넌트 사양

*   **Display**: `[초코 아이콘 🍫] 1,250` 식의 표기.
    *   **잔액 동기화**: `1,250 Choco (1,250 Credits)`와 같이 실제 자산과 사용권 단위를 병기하거나 전환하여 표시 가능.
    *   **하트와 구분**: 하트는 통화가 아니므로 여기서 표시하지 않고, '선물 가방' 아이콘 내의 아이템 갯수로 별도 표시.
    *   **참고**: `docs/specs/NEAR_TOKEN_ISSUANCE_SPEC.md`의 0.2절 자산 모델
*   **Interactions**:
    *   클릭 시 작은 팝업(Tooltip/Popover) 노출.
    *   팝업 내용: "온체인 보안 기술로 보호되는 소중한 자산입니다."
    *   지갑 주소는 `near...a2b3` 형태의 마스킹된 형태로 최소한의 신뢰성만 제공.
*   **구현 위치**: `docs/plans/NEAR_X402_STRATEGY.md`의 Phase 1 작업 항목 참조

### 4.2 하단 결제 시트 (One-Tap Payment Sheet)
*   **Context**: 아이템 구매 또는 유료 답변 요청 시.
*   **Design**: Bottom Sheet (Slide-up) 레이아웃.
*   **Structure**:
    *   **Header**: 상품명 및 가격 (예: "하트 50개 충전").
    *   **Body**: 현재 잔액과 결제 후 잔액 비교.
    *   **Action**: "원클릭 결제하기" (Glassmorphism 스타일의 커다란 버튼).
*   **Animation**: 버튼 클릭 시 지문 스캔 애니메이션이나 부드러운 펄스(Pulse) 효과를 주어 '보안 결제'의 신뢰감을 부여.
*   **결제 수단**: CHOCO 토큰 (NEP-141) - `docs/specs/NEAR_TOKEN_ISSUANCE_SPEC.md` 참조
*   **구현 위치**: `docs/plans/NEAR_X402_STRATEGY.md`의 Phase 1 작업 항목 참조

### 4.3 지능형 로딩 인디케이터 (Progressive Loading)
*   **Context**: 트랜잭션 전송 및 온체인 컨펌 대기 시간.
*   **Design**: 단순한 스피너 대신 캐릭터와 관련된 애니메이션 사용.
    *   예: "춘심이가 하트를 바구니에 담고 있어요...", "온체인 보안 확인 중..."
*   **Feedback**: 블록체인 전송 단계별 피드백 대신 "보안 연결 중" -> "결제 승인 중" -> "지급 완료" 순의 인간 친화적 메시지 노출.

### 4.4 자율 결제(Allowance) 설정 UI
*   **Context**: 첫 결제 시 또는 설정 메뉴.
*   **Function**: "오늘 하루 $10까지는 추가 확인 없이 즉시 결제 승인" 옵션 제공.
*   **Benefit**: X402 인터셉터와 결합하여 끊김 없는 대화 흐름(Flow) 유지.
*   **구현 위치**: `docs/plans/NEAR_X402_STRATEGY.md`의 Phase 1 작업 항목 및 4.2절 (Better Auth와 NEAR 지갑 매핑) 참조

### 4.5 실시간 잔액 반응형 UI (Real-time Balance Feedback)
*   **Context**: 채팅방 내 메시지 전송, 답변 수신, 아이템 구매 등 자산 변동이 발생하는 모든 순간.
*   **Requirement (Optimistic UI)**:
    1.  **즉시 차감 표시**: 네트워크 컨펌(Finality)을 기다리지 않고, 사용자 액션(버튼 클릭) 즉시 프론트엔드 잔액을 차감하여 표시합니다. (Optimistic Update)
    2.  **카운터 애니메이션**: 숫자가 줄어들거나 늘어날 때 `Rolling Counter` 애니메이션 적용.
    3.  **시각적 피드백**: 차감 시 붉은색 텍스트 점멸(`-50`), 충전 시 녹색 텍스트 점멸(`+500`) 등으로 변동 내역을 강조.
*   **위치**:
    *   채팅방 헤더(Header): `Credits` / `CHOCO` 잔액 상시 노출.
    *   메시지 입력창(Input): 전송 버튼 근처에 "예상 소모 비용" 표시 (선택 사항).

---

## 5. 고급 설정: 지갑 내보내기 (The Escape Hatch)

### 5.1 은밀한 배치
*   **Location**: 설정 > 계정 및 보안 > 고급 데이터 관리 > 자산 소유권 확인.
*   **Design**: 일반적인 UI보다 더 엄격하고 진지한 톤의 디자인.

### 5.2 2단계 보안 해제 케이스
1.  **단계 1**: 2FA(OTP 또는 이메일) 인증 요청.
2.  **단계 2**: "이 정보는 타인에게 노출될 경우 자산 복구가 불가능합니다"라는 강력한 팝업.
3.  **단계 3**: 10초간의 강제 대기 후 '프라이빗 키 확인' 버튼 활성화.

---

## 6. 비주얼 가이드라인 (Aesthetics)

### 6.1 Color Palette
*   **Primary**: `#EC4899` (Deep Pink - 활기차고 감성적인 톤)
*   **Success**: `#10B981` (Emerald - 안전과 성공의 의미)
*   **Surface**: Semi-transparent Dark (Glassmorphism 스타일의 춘심의 다크모드와 연동)

### 6.2 Micro-Animations
*   **Particle Effect**: 결제 완료 시 버튼 주위에 금색 가루(Gold Dust)가 퍼지는 효과.
*   **Haptic Feedback**: 모바일 환경에서 결제 완료 시 부드러운 진동 피드백.

---

## 7. X402 인터셉터와의 연동 UX

1.  사용자가 유료 기능을 트리거합니다.
2.  프론트엔드 API 클라이언트가 요청을 보냅니다.
3.  서버가 `402 Payment Required`와 함께 인보이스를 응답합니다.
    - 인보이스에는 CHOCO 토큰 수량, 토큰 컨트랙트 주소 포함
    - 참고: `docs/plans/NEAR_X402_STRATEGY.md`의 4.3절 (X402 프로토콜 구현 예시)
4.  **UI 인터셉터** (`docs/plans/NEAR_X402_STRATEGY.md`의 Phase 2 참조):
    *   한도(Allowance) 내인 경우: 화면 변화 없이 하단 토스트로 "-5 Hearts"만 표시.
    *   한도 초과 시: 자동으로 **'4.2 하단 결제 시트'**를 띄워 유저 승인을 받습니다.
5.  결제 완료 후 원래 요청을 자동으로 재시도하여 중단 없는 경험을 제공합니다.

**구현 참고**:
- 클라이언트 인터셉터: `docs/plans/NEAR_X402_STRATEGY.md`의 4.3절 (X402Interceptor 클래스)
- 서버 사이드 402 응답: `docs/plans/NEAR_X402_STRATEGY.md`의 4.3절 (createX402Response 함수)
- CHOCO 토큰 전송: `docs/specs/NEAR_TOKEN_ISSUANCE_SPEC.md`의 4.3절 (ft_transfer_call 사용)

---
**최종 업데이트**: 2026-01-11
**버전**: 1.5 (4.5절 실시간 잔액 반응형 UI 추가)
**작성**: Antigravity AI Assistant


## Related Documents
- **Specs**: [Document Management Plan](../01_Concept_Design/09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
