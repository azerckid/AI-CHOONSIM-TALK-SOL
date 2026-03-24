# NEAR Protocol 통합 및 X402 자산 관리 전략
> Created: 2026-02-08
> Last Updated: 2026-02-08

이 문서는 춘심(CHOONSIM) 프로젝트에 NEAR 프로토콜을 도입하여 Web3 기반의 자산 관리(X402) 및 자동화된 결제 시스템을 구축하기 위한 전략을 정의합니다. 특히, 현재 NEAR 생태계의 복잡한 UX 문제를 극복하기 위한 사용자 친화적 접근 방식을 강조합니다.

1. HTTP 표준 프로토콜 준수 (Protocol Alignment)
  X402의 본질: 서버가 "이 자원은 유료다(402 Payment Required)"라고 선언하면, 클라이언트가 이를 해석하고 결제 후 재요청하는 핸드셰이크 규칙입니다.
  부합 여부: 전략 문서의 4.3절(createX402Response, X402Interceptor)에 정의된 코드는 이 표준 흐름을 정확히 따르고 있습니다. 이는 특정 지갑 앱에 종속되지 않는 범용 프로토콜로서의 가치를 가집니다.
2. "사용량 기반 소액 결제"의 실현 (Micro-payment Viability)
  X402의 본질: 매번 팝업을 띄우는 것이 아니라, 한도(Allowance) 내에서 기계 대 기계(Machine-to-Machine) 수준으로 빠르게 결제가 일어나야 합니다.
  부합 여부: 새로 추가된 "한도 내 자동 결제(Silent Payment)" 로직은 X402가 지향하는 **Streaming Money(물 흐르듯 끊김 없는 자산 이동)**를 가능하게 합니다. 질문하셨던 "사용량만큼 즉시 소액 결제"가 바로 이 지점에서 완성됩니다.
3. "Invisible Web3" 철학 (UX Alignment)
  X402의 본질: 기술은 뒤에 숨고 사용자는 서비스에만 집중하게 만드는 것입니다.
  부합 여부:
  As-Is: 유저가 Tx Hash를 따는 '블록체인 노가다' 방식 (X402 아님)
  To-Be: 402 응답 감지 -> 백그라운드 결제 -> 결과 표시 (X402의 정석)
  이 설계는 유저가 블록체인 트랜잭션을 기다리는 지루한 시간을 **'지능형 로딩 인디케이터(캐릭터 애니메이션)'**로 치환하여 감성적 가치까지 더하고 있습니다.

### 4. 자산 동기화 모델 (Asset Synchronization)
*   **CHOCO(온체인)**와 **크레딧(오프체인)**은 실시간으로 연동되어 함께 줄어듭니다.
*   **소모 시나리오**: AI 채팅 발생 → 10 크레딧 소모 결정 → X402를 통해 10 CHOCO 전송 → 확인 시 앱 내 10 크레딧 차감.
*   **격리 원칙**: 하트(Heart)는 선물을 위한 **아이템**이므로 위 결제 흐름(Chat/AI)에 영향을 주지 않으며 독립적으로 관리됩니다.

---

## 1. 개요 및 목표

### 1.1 프로젝트 컨텍스트

이 문서는 **CHAT-BOTS** 프로젝트의 NEAR Protocol 통합 전략 문서입니다.

**관련 문서**:
- `docs/specs/NEAR_X402_UI_SPEC.md`: UI/UX 디자인 사양 (이 문서의 Phase 1-2 구현 가이드)
- `docs/specs/NEAR_TOKEN_ISSUANCE_SPEC.md`: CHOCO 토큰 발행 및 관리 명세 (x402 프로토콜과 통합)
- `docs/specs/CHOCO_TOKEN_CREATION_GUIDE.md`: 실제 토큰 발행 성공 가이드 (Testnet)

**현재 프로젝트 상태**:
- **프레임워크**: React Router v7 (Vite)
- **인증**: Better Auth (Google, Kakao, Twitter)
- **데이터베이스**: Turso (libSQL) with Drizzle ORM
- **AI 엔진**: Google Gemini API (LangChain)
- **현재 구현 상태**: Phase 1 (테스트넷 토큰 발행) 완료
  - **CHOCO 토큰**: `choco.token.primitives.testnet` (발행일: 2026-01-11)
  - **소유자**: `rogulus.testnet`

**현재 구현된 기초 내역 (Refactoring 대상)**:
- NEAR 결제 요청 생성 (`app/routes/api/payment/near/create-request.ts`)
  - USD → NEAR 환율 계산 및 결제 요청 생성
  - Payment 테이블에 PENDING 상태로 저장
- NEAR 트랜잭션 검증 (`app/routes/api/payment/near/verify.ts`)
  - 사용자가 수동으로 입력한 txHash와 accountId로 검증
  - 온체인 트랜잭션 상태 확인 및 크레딧 지급
- NEAR 지갑 연동 UI (`app/components/payment/NearPayButton.tsx`)
  - 수동 트랜잭션 해시 입력 방식 (개선 필요)
  - 지갑 주소 복사 기능 제공
- `near-api-js` 패키지 설치 완료 (v6.5.1)

**현재 UX 문제점**:
- 사용자가 외부 지갑에서 수동으로 송금 후 트랜잭션 해시를 직접 입력해야 함
- NEAR 계정 ID를 수동으로 입력해야 함
- Web3 용어(Transaction Hash, Account ID 등)로 인한 사용자 혼란
- 지갑 연결이 명시적으로 필요함

### 1.2 배경 및 비전: "지갑의 대리인" 모델
- **UX 파편화**: NEAR 공식 사이트(`near.org`) 및 지갑 서비스의 운영 주체 변경으로 인해 이메일 가입(FastAuth) 경로가 불투명하고 UX가 저해된 상태입니다.
- **역할 정의**: 춘심 프로그램은 사용자의 지갑을 대신 관리해 주는 **'지갑의 대리인(Agent)'** 역할을 수행합니다. 사용자는 자기가 블록체인을 쓰고 있다는 사실조차 모르게 하되, 장부는 투명하게 관리합니다.
- **Invisible Wallet**: 사용자의 기기에 어떠한 앱이나 확장 프로그램도 설치하지 않고 프로젝트 내에서 논리적으로 지갑을 생성합니다.

### 1.3 핵심 목표

**Invisible 온보딩**: 
- 사용자가 시드 구문이나 지갑 주소에 고민하지 않도록, 이메일 로그인 시 배경에서 지갑이 자동 생성되는 환경 구축.
- Web2 사용자 경험과 동일한 수준의 편의성 제공.

**X402 표준 준수**: 
- AI 에이전트와 프로젝트 간의 자산 교환을 위한 온체인 프로토콜 구현.
- HTTP 402 (Payment Required) 응답을 통한 자율 결제 시스템 및 원클릭 결제 UX.

**유연한 솔루션 채택**: 
- UX가 검증되지 않은 공식 FastAuth UI보다는 Privy, Meteor Wallet SDK 등 최상의 가입 경험을 제공하는 솔루션을 우선 검토합니다.
- 지갑 기능을 최소화하고 결제와 자산 소유권 보장에 집중합니다.

## 2. 기술 스택 및 대안

### 2.1 현재 기술 스택
- **Blockchain**: NEAR Protocol (Mainnet/Testnet), `near-api-js` v6.5.1 (설치 완료)
- **Auth & Wallet Extraction**: 
  - 기본: Better Auth (Google, Kakao, Twitter) 통합 유지
  - 지갑 연동: 임베디드 지갑 솔루션 도입 (Privy, Magic 등)

### 2.2 임베디드 지갑 솔루션 비교 및 비용

| 솔루션 | UX 품질 | 비용 (Free Tier) | 특징 |
| :--- | :--- | :--- | :--- |
| **Privy** | **최상** (추천) | 499 MAU / 10만건 Tx 무료 | 가장 세련된 UX, 유료 전환 시 비용 높음 ($299~) |
| **Magic Link** | 상 | 1,000 MAU까지 무료 | 이메일/소셜 연동 강점, 초과 시 사용자당 $0.05 |
| **Meteor SDK** | 중 | **무료** | 니어 네이티브, 지갑 선택기 연동 용이 |
| **FastAuth** (직접) | 하 | **무료** | 니어 공식 기술, UX 구현 난이도 높음 |

### 2.3 추천 전략
1. **성장 단계별 대응**: 초기에는 Privy/Magic의 무료 티어 내에서 최상의 UX를 선점합니다.
2. **비용 최적화**: 사용자가 늘어남에 따라 서비스 수익과 솔루션 비용을 비교하여, 유연하게 기술을 전환할 수 있는 추상화 레이어를 유지합니다.

## 3. 구현 로드맵 (UI 우선 + x402 프로토콜 통합)

> **작업 철학**: UI/UX를 먼저 완성하되, x402 프로토콜의 특성상 서버-클라이언트 간 통신이 필요하므로 인터셉터 구조를 함께 설계합니다. 이를 통해 사용자 경험을 먼저 검증하면서도 프로토콜의 핵심 기능을 조기에 검증할 수 있습니다.

> **x402 프로토콜 특성**: 
> - HTTP 402 응답을 통한 서버-클라이언트 통신 프로토콜
> - 클라이언트 인터셉터가 402 응답을 감지하고 자동 결제 처리
> - 한도 내 자동 결제는 UI 변화 없이 백그라운드에서 처리
> - 따라서 UI와 백엔드를 완전히 분리하기 어려움

### Phase 1: UI 컴포넌트 디자인 및 프로토타입 (예상 소요: 1-2주)

**목표**: `docs/specs/NEAR_X402_UI_SPEC.md` 문서 기반으로 모든 UI 컴포넌트를 디자인하고 프로토타입 구현

**참고 문서**: `docs/specs/NEAR_X402_UI_SPEC.md`의 "4. 주요 UI 컴포넌트 사양" 섹션을 상세 구현 가이드로 사용

**작업 항목**:
- [ ] **자산 표시기 (Currency/Balance Indicator)** 구현
  - 컴포넌트: `app/components/wallet/WalletBalance.tsx`
  - UI_SPEC 4.1절 참조: `[하트 아이콘] 1,250` 형식 표시
  - 더미 데이터 사용 (예: `balance: 1250`)
  - 하트 아이콘 및 툴팁 구현 ("온체인 보안 기술로 보호되는 소중한 자산입니다.")
  - 지갑 주소 마스킹 표시 (`near...a2b3`)
- [ ] **하단 결제 시트 (One-Tap Payment Sheet)** 구현
  - 컴포넌트: `app/components/payment/PaymentSheet.tsx`
  - UI_SPEC 4.2절 참조: Bottom Sheet 레이아웃 (shadcn/ui Dialog 활용)
  - 구조: Header (상품명 및 가격), Body (현재 잔액 vs 결제 후 잔액), Action ("원클릭 결제하기")
  - Glassmorphism 스타일 적용
  - 더미 데이터로 결제 플로우 시뮬레이션
  - 애니메이션 효과 (펄스, 파티클 등) - UI_SPEC 6.2절 참조
- [ ] **지능형 로딩 인디케이터 (Progressive Loading)** 구현
  - 컴포넌트: `app/components/payment/PaymentLoading.tsx`
  - UI_SPEC 4.3절 참조: 캐릭터 관련 메시지 표시
    - 예: "춘심이가 하트를 바구니에 담고 있어요...", "온체인 보안 확인 중..."
  - 단계별 피드백 ("보안 연결 중" → "결제 승인 중" → "지급 완료")
  - 애니메이션 효과
- [ ] **자율 결제(Allowance) 설정 UI** 구현
  - 컴포넌트: `app/components/settings/AllowanceSettings.tsx`
  - UI_SPEC 4.4절 참조: "오늘 하루 $10까지는 추가 확인 없이 즉시 결제 승인" 옵션
  - 설정 메뉴에 통합
  - 더미 데이터로 한도 설정 시뮬레이션
- [ ] **지갑 내보내기 UI** 구현
  - 컴포넌트: `app/components/settings/WalletExport.tsx`
  - UI_SPEC 5절 참조: 설정 > 계정 및 보안 > 고급 데이터 관리 > 자산 소유권 확인
  - 2단계 보안 해제 케이스 구현 (2FA → 경고 팝업 → 10초 대기)
  - 더미 데이터로 내보내기 플로우 시뮬레이션

**디자인 가이드라인** (`docs/specs/NEAR_X402_UI_SPEC.md` 참조):
- 색상 팔레트: Primary `#EC4899`, Success `#10B981` (UI_SPEC 6.1절)
- Glassmorphism 스타일 적용 (UI_SPEC 6.1절)
- Micro-animations 구현 (UI_SPEC 6.2절)
- 반응형 디자인 (모바일 우선)
- 용어 추상화: "하트(Hearts)", "초코(Choco)" 사용 (UI_SPEC 1.1절)

**검증** (`docs/specs/NEAR_X402_UI_SPEC.md` 기준):
- [ ] 모든 UI 컴포넌트가 UI_SPEC 문서의 사양을 충족하는지 확인
  - 4.1절: 자산 표시기 (Currency/Balance Indicator)
  - 4.2절: 하단 결제 시트 (One-Tap Payment Sheet)
  - 4.3절: 지능형 로딩 인디케이터 (Progressive Loading)
  - 4.4절: 자율 결제(Allowance) 설정 UI
- [ ] 디자인 시스템 일관성 확인 (UI_SPEC 6절 참조)
- [ ] 사용자 테스트 (프로토타입 단계)

---

### Phase 2: UI 컴포넌트 기능 구현 (예상 소요: 1-2주)

**목표**: UI 컴포넌트에 실제 데이터 연동 및 상태 관리 구현 (백엔드 API는 목업)

**작업 항목**:
- [ ] **상태 관리 구조 설계**
  - React Context 또는 Zustand로 지갑 상태 관리
  - 더미 지갑 데이터 구조 정의
- [ ] **API 클라이언트 목업 구현**
  - `app/lib/api/wallet.mock.ts`: 지갑 관련 API 목업
  - `app/lib/api/payment.mock.ts`: 결제 관련 API 목업
  - MSW (Mock Service Worker) 또는 간단한 함수로 구현
- [ ] **자산 표시기 기능 구현**
  - 더미 잔액 데이터 표시
  - 툴팁 클릭 시 상세 정보 표시
  - 실시간 업데이트 시뮬레이션
- [ ] **결제 시트 기능 구현**
  - 결제 요청 시 시트 열기
  - 잔액 비교 로직 (현재 잔액 vs 결제 후 잔액)
  - 결제 버튼 클릭 시 로딩 상태 전환
  - 성공/실패 시나리오 처리
- [ ] **로딩 인디케이터 기능 구현**
  - 결제 단계별 메시지 표시
  - 프로그레스 바 또는 단계 표시기
  - 완료 시 성공 애니메이션
- [ ] **Allowance 설정 기능 구현**
  - 한도 입력 및 저장 (로컬 스토리지 또는 목업 API)
  - 만료 시간 설정
  - 한도 사용량 표시
- [ ] **X402 인터셉터 기본 구조 구현** (중요: 프로토콜 핵심)
  - `app/lib/x402/interceptor.ts`: 인터셉터 클래스 기본 구조
  - 목업 402 응답 생성 함수 (`createMock402Response`)
  - 인터셉터가 402 응답을 감지하는 로직 (목업)
  - 한도 확인 로직 (더미 데이터)
  - 한도 내 자동 결제 시뮬레이션 (토스트 메시지)
  - 한도 초과 시 결제 시트 자동 표시 로직
  - **전역 fetch 래퍼 구현** (중요!)
    - `app/lib/api/client.ts`: 모든 API 요청을 가로채는 fetch 래퍼
    - 인터셉터를 자동으로 적용하는 구조 설계
    - React Router의 loader/action과도 호환되도록 설계
    - **SSE 스트리밍 지원**: EventSource 래퍼도 구현하여 SSE 스트림에서 402 감지
  - **참고**: 실제 결제는 Phase 4에서 구현하되, UI 플로우는 여기서 완성

**검증**:
- [ ] 모든 UI 컴포넌트가 목업 데이터와 정상 연동되는지 확인
- [ ] 사용자 플로우가 자연스러운지 확인
- [ ] 에러 처리 및 로딩 상태가 적절한지 확인

---

### Phase 3: 백엔드 인프라 구축 (예상 소요: 1-2주)

**목표**: 데이터베이스 스키마 확장 및 기본 API 엔드포인트 구현

**작업 항목**:
- [ ] **솔루션 선정**: 임베디드 지갑 솔루션 벤치마킹 및 선정 (Privy 우선 검토)
  - Privy POC 구현 및 테스트
  - Magic Link 테스트 (NEAR 지원 확인)
  - Meteor Wallet SDK 테스트
  - 비교 분석 및 최종 선정
- [ ] **데이터베이스 스키마 확장**
  - User 테이블에 NEAR 계정 정보 필드 추가
    - `nearAccountId`: NEAR 계정 ID (예: user.near)
    - `nearPublicKey`: NEAR 공개키
    - `allowanceAmount`: 자율 결제 한도 (USD)
    - `allowanceCurrency`: 한도 통화 (기본값: USD)
    - `allowanceExpiresAt`: 한도 만료 시간
  - X402Invoice 테이블 생성 (Phase 4에서 사용)
  - 마이그레이션 생성 및 적용
- [ ] **환경 변수 설정**
  - `.env.development` 내 NEAR 테스트넷 환경 변수 설정
  - 선정된 솔루션의 API 키 설정
- [ ] **기본 API 엔드포인트 구현**
  - `GET /api/wallet/balance`: 지갑 잔액 조회 (더미 데이터 반환)
  - `GET /api/wallet/info`: 지갑 정보 조회
  - `POST /api/payment/near/create-request`: 결제 요청 생성 (기존 코드 활용)
  - `POST /api/payment/near/verify`: 결제 검증 (기존 코드 활용)
  - `GET /api/settings/allowance`: Allowance 설정 조회
  - `POST /api/settings/allowance`: Allowance 설정 저장
- [ ] **X402 프로토콜 서버 사이드 구현** (중요: 프로토콜 핵심)
  - `app/lib/x402/gatekeeper.server.ts`: 402 응답 생성 로직 구현
  - `POST /api/x402/create-invoice`: 인보이스 생성 API (더미 데이터 가능)
  - `POST /api/x402/verify`: 결제 검증 API (더미 데이터 가능)
  - X402Invoice 테이블 생성 및 마이그레이션
  - **실제 API 엔드포인트에 402 응답 통합** (중요!)
    - **일반 HTTP API**: `app/routes/api/items/purchase.ts`에서 잔액 부족 시 402 응답 반환
    - **SSE 스트리밍 API**: `app/routes/api/chat/index.ts`에서 크레딧 부족 시 처리
      - 현재는 SSE 스트림 내에 `{ error: "Insufficient credits", code: 402 }` 전송
      - x402 프로토콜 적용 시: 스트림을 중단하고 실제 HTTP 402 응답 반환
      - 또는: 스트림 내에 x402 인보이스 정보 포함 (`data: {"x402": {...}}`)
    - 기존 에러 응답을 402 응답으로 변경하는 미들웨어 구현
  - **목적**: Phase 2의 인터셉터와 연동하여 전체 플로우 검증

**검증**:
- [ ] 데이터베이스 마이그레이션 정상 적용 확인
- [ ] API 엔드포인트가 정상 작동하는지 확인
- [ ] 환경 변수 설정 확인

---

### Phase 4: UI와 백엔드 연동 (예상 소요: 2-3주)

**목표**: UI 컴포넌트를 실제 백엔드 API와 연결

**작업 항목**:
- [ ] **임베디드 지갑 통합**
  - 선정된 솔루션 (Privy/Magic 등) 통합
  - Better Auth와 지갑 매핑 로직 구현
  - 로그인 시 자동 지갑 생성 또는 연결
- [ ] **지갑 상태 관리 연동**
  - 실제 지갑 데이터를 React Context/Zustand에 저장
  - 잔액 실시간 조회 및 업데이트
- [ ] **결제 플로우 연동**
  - 결제 시트에서 실제 API 호출
  - 임베디드 지갑을 통한 트랜잭션 서명
  - 트랜잭션 상태 실시간 모니터링
  - 성공/실패 처리
- [ ] **기존 코드 리팩토링**
  - `NearPayButton.tsx`: 새 결제 시트로 교체
  - `create-request.ts`: 사용자 지갑 주소 자동 조회 추가
  - `verify.ts`: 트랜잭션 자동 감지 로직 추가
- [ ] **Allowance 시스템 연동**
  - 한도 설정 및 저장 기능 연동
  - 한도 내 자동 결제 로직 구현
- [ ] **X402 인터셉터 실제 연동**
  - Phase 2에서 만든 인터셉터를 실제 API와 연결
  - 실제 402 응답 처리 로직 구현
  - 실제 임베디드 지갑을 통한 자동 결제 구현
  - 한도 내 자동 결제 플로우 완성
  - 한도 초과 시 사용자 승인 플로우 완성
  - **전역 API 인터셉터 설정**
    - 모든 API 요청에 인터셉터 적용 (fetch 래퍼 또는 axios 인터셉터)
    - React Router의 loader/action에서 발생하는 402 응답도 처리
  - **참고**: Phase 2에서 UI 플로우는 이미 완성되어 있으므로, 여기서는 실제 결제 로직만 연결

**검증**:
- [ ] 전체 결제 플로우가 정상 작동하는지 확인
- [ ] 지갑 자동 생성이 정상 작동하는지 확인
- [ ] X402 인터셉터가 정상 작동하는지 확인
- [ ] 사용자 테스트를 통한 UX 검증

---

### Phase 5: 통합 및 최적화 (예상 소요: 1-2주)

**목표**: 전체 시스템 통합 및 성능 최적화

**작업 항목**:
- [ ] **전체 플로우 통합 테스트**
  - 모든 기능이 정상 작동하는지 확인
  - 엣지 케이스 테스트
  - 에러 처리 테스트
- [ ] **성능 최적화**
  - API 호출 최적화 (캐싱, 배치 처리 등)
  - UI 렌더링 최적화
  - 트랜잭션 모니터링 최적화
- [ ] **지갑 내보내기 기능 완성**
  - 실제 프라이빗 키 내보내기 구현
  - 보안 검증 강화
- [ ] **보안 감사**
  - 보안 취약점 점검
  - 개인키 관리 보안 확인
  - 트랜잭션 검증 로직 확인
- [ ] **문서화 완료**
  - 사용자 가이드 작성
  - 개발자 문서 업데이트
  - API 문서 작성

**환경 변수 설정 예시**:
```env
# NEAR 설정
NEAR_NETWORK_ID=testnet  # 또는 mainnet
NEAR_NODE_URL=https://rpc.testnet.near.org
NEAR_RECEIVER_WALLET=merchant.testnet  # 또는 mainnet 주소

# Privy 설정 (선택)
PRIVY_APP_ID=your_app_id
PRIVY_APP_SECRET=your_app_secret

# Magic Link 설정 (선택)
MAGIC_PUBLISHABLE_KEY=your_publishable_key
MAGIC_SECRET_KEY=your_secret_key
```

**데이터베이스 마이그레이션**:
```bash
# 1. 스키마 수정 후 마이그레이션 생성
npx drizzle-kit generate

# 2. 데이터베이스에 적용
npx drizzle-kit push
```

**검증**:
- [ ] 테스트넷에서 지갑 생성 테스트
- [ ] Better Auth 세션과 지갑 주소 매핑 확인
- [ ] POC에서 이메일 기반 가입 플로우 검증


## 4. 상세 구현 가이드

### 4.1 Privy 통합 예시
```typescript
import { PrivyProvider } from '@privy-io/react-auth';

export default function App() {
  return (
    <PrivyProvider
      appId={process.env.PRIVY_APP_ID!}
      config={{
        loginMethods: ['email', 'google'],
        embeddedWallets: { createOnLogin: 'users-without-wallets' },
        appearance: { theme: 'dark', accentColor: '#ec4899' },
      }}
    >
      {/* 앱 컴포넌트 */}
    </PrivyProvider>
  );
}
```

### 4.2 Better Auth와 NEAR 지갑 매핑

**데이터베이스 스키마 확장** (`app/db/schema.ts`):
```typescript
export const user = sqliteTable("User", {
    // ... 기존 필드들 ...
    nearAccountId: text("nearAccountId").unique(),
    nearPublicKey: text("nearPublicKey"),
    allowanceAmount: real("allowanceAmount").default(0),
    allowanceCurrency: text("allowanceCurrency").default("USD"),
    allowanceExpiresAt: integer("allowanceExpiresAt", { mode: "timestamp" }),
});
```

**마이그레이션 생성 및 적용**:
```bash
# 마이그레이션 생성
npx drizzle-kit generate

# 데이터베이스에 적용
npx drizzle-kit push
```

**지갑 매핑 로직** (`app/lib/auth/near-mapping.server.ts`):
```typescript
import { db } from "../db.server";
import * as schema from "../../db/schema";
import { eq } from "drizzle-orm";

export async function linkNearWallet(
    userId: string,
    nearAccountId: string,
    publicKey: string
) {
    await db.update(schema.user)
        .set({
            nearAccountId,
            nearPublicKey: publicKey,
            updatedAt: new Date(),
        })
        .where(eq(schema.user.id, userId));
}

export async function getUserNearWallet(userId: string) {
    const user = await db.query.user.findFirst({
        where: eq(schema.user.id, userId),
        columns: {
            nearAccountId: true,
            nearPublicKey: true,
            allowanceAmount: true,
            allowanceExpiresAt: true,
        },
    });
    return user;
}
```

**로그인 시 자동 지갑 생성** (`app/routes/login.tsx` 또는 `app/lib/auth/wallet-init.server.ts`):
```typescript
import { usePrivy } from '@privy-io/react-auth';

// 클라이언트 사이드에서 지갑 자동 생성
export function useAutoWallet() {
    const { ready, authenticated, user, createWallet } = usePrivy();

    useEffect(() => {
        if (ready && authenticated && !user?.wallet) {
            // 지갑이 없으면 자동 생성
            createWallet().then(() => {
                // 서버에 지갑 정보 전송
                fetch("/api/auth/link-wallet", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        accountId: user?.wallet?.address,
                        publicKey: user?.wallet?.publicKey,
                    }),
                });
            });
        }
    }, [ready, authenticated, user]);
}
```

### 4.3 X402 프로토콜 구현 예시

**서버 사이드: 402 응답 생성** (`app/lib/x402/gatekeeper.server.ts`):
```typescript
import { db } from "../db.server";
import * as schema from "../../db/schema";
import crypto from "crypto";

export async function createX402Invoice(
    userId: string,
    recipientAddress: string,
    amount: number // USD
): Promise<{ token: string; invoice: any }> {
    // 1. 고유 토큰 생성
    const token = crypto.randomBytes(32).toString("hex");

    // 2. CHOCO 토큰 금액 계산 (NEAR 네이티브 코인 대신 CHOCO 토큰 사용)
    // 참고: docs/specs/NEAR_TOKEN_ISSUANCE_SPEC.md의 토크노믹스 전략 참조
    const chocoPrice = await getChocoPrice(); // USD per CHOCO
    const chocoAmount = amount / chocoPrice;

    // 3. 인보이스 생성 (DB 저장)
    const invoiceId = crypto.randomUUID();
    await db.insert(schema.x402Invoice).values({
        id: invoiceId,
        token,
        userId,
        amount,
        nearAmount,
        recipientAddress,
        status: "PENDING",
        createdAt: new Date(),
    });

    return {
        token,
        invoice: {
            recipient: recipientAddress,
            amount: chocoAmount,
            currency: "CHOCO", // CHOCO 토큰 사용 (NEP-141)
            tokenContract: process.env.CHOCO_TOKEN_CONTRACT!, // CHOCO 토큰 컨트랙트 주소
        },
    };
}

export function createX402Response(token: string, invoice: any): Response {
    return new Response(
        JSON.stringify({ 
            error: "Payment Required",
            code: "X402_PAYMENT_REQUIRED",
        }),
        {
            status: 402,
            headers: {
                "Content-Type": "application/json",
                "X-x402-Token": token,
                "X-x402-Invoice": JSON.stringify(invoice),
            },
        }
    );
}
```

**클라이언트 사이드: 402 인터셉터** (`app/lib/x402/interceptor.ts`):
```typescript
export class X402Interceptor {
    private allowance: number;
    private nearAccountId: string;

    constructor(allowance: number, nearAccountId: string) {
        this.allowance = allowance;
        this.nearAccountId = nearAccountId;
    }

    async intercept(request: Request): Promise<Response> {
        const response = await fetch(request);

        if (response.status === 402) {
            const token = response.headers.get("X-x402-Token");
            const invoice = JSON.parse(
                response.headers.get("X-x402-Invoice") || "{}"
            );

            // 한도 확인 (USD 기준)
            const invoiceAmountUSD = invoice.amount * (await getChocoPrice());
            if (invoiceAmountUSD > this.allowance) {
                throw new Error("Allowance exceeded");
            }

            // 자동 결제 (임베디드 지갑 사용)
            // CHOCO 토큰 전송: ft_transfer_call 사용
            const txHash = await this.payInvoice(invoice);

            // 결제 검증
            await this.verifyPayment(token, txHash);

            // 원래 요청 재시도
            return fetch(request, {
                headers: {
                    ...Object.fromEntries(request.headers.entries()),
                    "Authorization": `x402 ${txHash}`,
                },
            });
        }

        return response;
    }

    private async payInvoice(invoice: any): Promise<string> {
        // 임베디드 지갑을 통한 자동 결제
        // CHOCO 토큰 전송: ft_transfer_call 사용 (NEP-141 표준)
        // 참고: docs/specs/NEAR_TOKEN_ISSUANCE_SPEC.md의 4.3절 참조
        // Privy 또는 선택된 솔루션의 API 사용
        // ...
        return "tx_hash_here";
    }

    private async verifyPayment(token: string, txHash: string): Promise<boolean> {
        const response = await fetch("/api/x402/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, txHash }),
        });
        const data = await response.json();
        return data.verified === true;
    }
}
```

**X402Invoice 테이블 생성** (`app/db/schema.ts`):
```typescript
export const x402Invoice = sqliteTable("X402Invoice", {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    userId: text("userId").notNull(),
    amount: real("amount").notNull(), // USD
    currency: text("currency").notNull().default("USD"),
    nearAmount: real("nearAmount"), // NEAR
    recipientAddress: text("recipientAddress").notNull(),
    network: text("network").notNull().default("mainnet"),
    status: text("status").notNull().default("PENDING"), // PENDING, PAID, EXPIRED
    txHash: text("txHash").unique(),
    expiresAt: integer("expiresAt", { mode: "timestamp" }),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    paidAt: integer("paidAt", { mode: "timestamp" }),
}, (table) => {
    return [
        index("X402Invoice_token_idx").on(table.token),
        index("X402Invoice_userId_status_idx").on(table.userId, table.status),
    ];
});
```

## 5. 보안 및 리스크 관리

### 5.1 MPC (Multi-Party Computation) 기반 보안
- 유저의 프라이빗 키 전체를 서버에 보관하지 않습니다. 키는 '조각(Shard)'으로 나뉘어 **서버, 솔루션 업체, 사용자 기기**에 분산 보관됩니다.
- 오직 사용자가 로그인한 상태에서만 조각들이 합쳐져 거래를 승인할 수 있으므로, 단일 서버 해킹으로부터 자산을 보호합니다.

### 5.2 지갑 내보내기 (Export Wallet)

**목적**: 사용자가 서비스를 떠나거나 다른 지갑에서 직접 관리하고 싶을 때를 대비하여 완벽한 자산 소유권을 보장합니다.

**구현 위치**: 설정 메뉴 내 깊은 곳 (예: `app/routes/settings.tsx` 또는 `app/routes/profile/settings.tsx`)

**보안 요구사항**:
- 2FA 인증 필수
- 비밀번호 재확인
- 일회성 토큰 생성 (24시간 유효)

**구현 예시** (`app/routes/api/wallet/export.ts`):
```typescript
import type { ActionFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { z } from "zod";

const exportSchema = z.object({
    password: z.string().min(1), // 비밀번호 재확인
    twoFactorCode: z.string().optional(), // 2FA 코드 (있는 경우)
});

export async function action({ request }: ActionFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = exportSchema.safeParse(body);

    if (!result.success) {
        return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    // 1. 비밀번호 및 2FA 검증
    // ...

    // 2. 임베디드 지갑 솔루션에서 프라이빗 키 또는 니모닉 조회
    // Privy의 경우: exportWallet() 메서드 사용
    // Magic의 경우: exportPrivateKey() 메서드 사용

    // 3. 일회성 토큰 생성 (24시간 유효)
    const exportToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // 4. DB에 토큰 저장 (암호화된 키와 함께)
    // ...

    // 5. 사용자에게 토큰 전달 (이메일 또는 안전한 방식)
    return Response.json({
        exportToken,
        expiresAt: expiresAt.toISOString(),
        // 실제 키는 이메일로 전송하거나 별도 보안 채널 사용
    });
}
```

**UI 컴포넌트** (`app/components/settings/WalletExport.tsx`):
```typescript
export function WalletExport() {
    const [showExport, setShowExport] = useState(false);
    const [password, setPassword] = useState("");
    const [exportedKey, setExportedKey] = useState<string | null>(null);

    const handleExport = async () => {
        // 보안 경고 표시
        if (!confirm("지갑 내보내기는 위험할 수 있습니다. 계속하시겠습니까?")) {
            return;
        }

        // API 호출
        const response = await fetch("/api/wallet/export", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
        });

        const data = await response.json();
        setExportedKey(data.privateKey);
    };

    return (
        <div>
            <button onClick={() => setShowExport(true)}>
                지갑 내보내기
            </button>
            {showExport && (
                <div>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="비밀번호 확인"
                    />
                    <button onClick={handleExport}>내보내기</button>
                    {exportedKey && (
                        <div>
                            <p>프라이빗 키 (안전하게 보관하세요):</p>
                            <code>{exportedKey}</code>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
```

### 5.3 트랜잭션 검증
- 모든 결제는 온체인 검증 필수, 중복 결제 방지 로직 및 수신 주소와 금액 검증을 수행합니다.

## 6. 단계별 실행 계획 (Immediate Actions)

### 6.1 즉시 실행 가능한 작업 (UI 우선)

**1. UI 컴포넌트 프로토타입 구현** (예상 소요: 1주)
- UI_SPEC 문서 기반으로 모든 UI 컴포넌트 디자인
- 더미 데이터로 프로토타입 구현
- 디자인 시스템 일관성 확인
- 사용자 테스트 (프로토타입 단계)

**2. UI 컴포넌트 기능 구현** (예상 소요: 1주)
- 목업 API 구현 (MSW 또는 간단한 함수)
- 상태 관리 구조 설계
- 모든 UI 컴포넌트에 기능 연결
- 사용자 플로우 검증

**3. 백엔드 인프라 구축** (예상 소요: 1주)
- 솔루션 벤치마킹 및 선정
- 데이터베이스 스키마 확장
- 기본 API 엔드포인트 구현
- 환경 변수 설정

### 6.2 단기 목표 (1-2개월)

- Phase 1-2 완료: UI 컴포넌트 완성
- Phase 3-4 완료: 백엔드 연동 및 전체 플로우 구현
- 사용자 테스트 및 피드백 수집
- X402 프로토콜 기본 구현

### 6.3 중장기 목표 (3-6개월)

- Phase 5 완료: 통합 및 최적화
- 자율 결제 시스템 완성
- 지갑 내보내기 기능 완성
- 멀티 체인 확장 (Chain Signatures) 검토

## 7. 리팩토링 계획 상세

### 7.1 현재 코드 분석

**`NearPayButton.tsx` 현재 구조**:
- 수동 트랜잭션 해시 입력 (`txHash`, `accountId` state)
- 사용자가 외부 지갑에서 송금 후 정보 입력 필요
- Web3 용어 노출 (Transaction Hash, Account ID)

**리팩토링 방향**:
- 임베디드 지갑 연동으로 전환
- 자동 트랜잭션 서명 및 전송
- 실시간 트랜잭션 감지 및 검증
- Web3 용어 제거

### 7.2 리팩토링 단계

**Step 1: 임베디드 지갑 통합**
- Privy 또는 선정된 솔루션 통합
- 지갑 자동 생성 로직 추가
- 지갑 연결 상태 관리

**Step 2: 결제 플로우 개선**
- 수동 입력 제거
- 자동 트랜잭션 생성 및 서명
- 트랜잭션 상태 실시간 모니터링

**Step 3: 검증 로직 개선**
- 트랜잭션 자동 감지
- 폴링 방식에서 이벤트 기반으로 전환 (가능한 경우)
- 에러 처리 강화

### 7.3 마이그레이션 전략

**기존 사용자 대응**:
- 기존 수동 입력 방식은 일정 기간 유지 (하위 호환성)
- 점진적으로 새 방식으로 전환 유도
- 마이그레이션 가이드 제공

## 8. 참고 자료

### 8.1 NEAR Protocol 문서
- [NEAR 공식 문서](https://docs.near.org/)
- [NEAR Wallet Selector](https://github.com/near/wallet-selector)
- [NEAR API JS](https://docs.near.org/tools/near-api-js)
- [FastAuth 가이드](https://docs.near.org/develop/integrate/fast-auth)

### 8.2 임베디드 지갑 솔루션
- [Privy 문서](https://docs.privy.io/)
- [Privy NEAR 지원](https://docs.privy.io/guide/react/supported-chains/near)
- [Magic Link 문서](https://magic.link/docs)
- [Meteor Wallet](https://www.meteorwallet.app/)

### 8.3 X402 프로토콜
- [HTTP 402 Payment Required](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/402)
- [x402 프로토콜 스펙](https://x402.dev/) (참고)

### 8.4 프로젝트 내 관련 파일
- `app/routes/api/payment/near/create-request.ts`: NEAR 결제 요청 생성 (리팩토링 대상)
- `app/routes/api/payment/near/verify.ts`: NEAR 트랜잭션 검증 (리팩토링 대상)
- `app/components/payment/NearPayButton.tsx`: NEAR 지갑 연동 UI (리팩토링 대상)
- `app/lib/auth.server.ts`: Better Auth 설정
- `app/db/schema.ts`: 데이터베이스 스키마 (확장 필요)

---

---

## 9. 작업 순서 요약

### UI 우선 접근 방식의 장점

1. **사용자 경험 우선**: UI를 먼저 완성하여 사용자 경험을 조기에 검증할 수 있습니다.
2. **기술적 복잡성 분리**: UI와 백엔드를 분리하여 각각에 집중할 수 있습니다.
3. **빠른 프로토타이핑**: 더미 데이터로 빠르게 프로토타입을 만들고 피드백을 받을 수 있습니다.
4. **점진적 통합**: UI가 완성된 후 백엔드를 점진적으로 연결할 수 있습니다.

### 작업 순서 다이어그램

```
Phase 1: UI 디자인 및 프로토타입
    ↓
Phase 2: UI 기능 구현 + x402 인터셉터 기본 구조
    ↓ (목업 API + 목업 402 응답)
Phase 3: 백엔드 인프라 구축 + x402 서버 사이드 구현
    ↓ (실제 API + 실제 402 응답 생성)
Phase 4: UI와 백엔드 연동 (x402 인터셉터 실제 연동)
    ↓
Phase 5: 통합 및 최적화
```

### x402 프로토콜 통합 전략

**핵심 원칙**: x402는 서버-클라이언트 프로토콜이므로, UI와 백엔드를 완전히 분리할 수 없습니다. 또한 **실제 API 요청 중간에 발생**하는 프로토콜이므로 전역 인터셉터가 필수입니다.

**x402 프로토콜의 핵심 흐름**:
```
1. 사용자가 API 요청 (예: AI 채팅)
   ↓
2. 서버가 크레딧 부족 감지 → 402 응답 반환
   - 일반 HTTP API: HTTP 402 상태 코드 + 헤더 (X-x402-Token, X-x402-Invoice)
   - SSE 스트리밍: 스트림 중단 후 HTTP 402 응답 또는 스트림 내 x402 데이터
   ↓
3. 클라이언트 인터셉터가 402 감지
   - fetch 래퍼: HTTP 응답 상태 코드 확인
   - EventSource 래퍼: SSE 스트림 내 x402 데이터 확인
   ↓
4. 한도 확인
   ├─ 한도 내: 자동 결제 (백그라운드) → 토스트만 표시
   └─ 한도 초과: 결제 시트 표시 → 사용자 승인
   ↓
5. 결제 완료 후 원래 요청 자동 재시도
   - Authorization 헤더에 txHash 포함: `Authorization: x402 <txHash>`
   ↓
6. 사용자는 중단 없이 서비스 사용 계속
```

**SSE 스트리밍과 x402 통합 전략**:
- **옵션 1**: 스트림 시작 전 크레딧 확인 → 부족 시 HTTP 402 반환 (권장)
- **옵션 2**: 스트림 중 크레딧 부족 감지 → 스트림 중단 후 HTTP 402 반환
- **옵션 3**: 스트림 내 x402 데이터 전송 → 클라이언트가 처리 후 재연결

**작업 순서**:

1. **Phase 2**: 인터셉터의 기본 구조와 UI 플로우를 목업으로 완성
   - 402 응답 감지 로직
   - 한도 확인 로직
   - UI 표시 로직 (토스트, 결제 시트)
   - **전역 fetch 래퍼 구조 설계** (중요!)
   - 실제 결제는 목업으로 시뮬레이션

2. **Phase 3**: 서버 사이드 402 응답 생성 로직 구현
   - 실제 402 응답 생성
   - 인보이스 생성 및 검증
   - **실제 API 엔드포인트에 402 응답 통합** (중요!)
     - 예: `/api/chat`에서 크레딧 부족 시 402 반환
     - 예: `/api/items/purchase`에서 잔액 부족 시 402 반환
   - Phase 2의 인터셉터와 연동하여 전체 플로우 검증 가능

3. **Phase 4**: 실제 결제 로직 연결
   - 임베디드 지갑을 통한 실제 결제
   - 온체인 검증
   - **전역 인터셉터 활성화** (모든 API 요청에 적용)
   - UI 플로우는 이미 완성되어 있으므로 결제 로직만 교체

### 각 Phase별 산출물

- **Phase 1**: UI 컴포넌트 프로토타입 (더미 데이터)
- **Phase 2**: 완전히 작동하는 UI + x402 인터셉터 기본 구조 (목업 API + 목업 402 응답)
- **Phase 3**: 데이터베이스 스키마 + 기본 API + x402 서버 사이드 구현 (실제 402 응답 생성 가능)
- **Phase 4**: 실제 작동하는 전체 시스템 (실제 결제 로직 연결)
- **Phase 5**: 최적화 및 문서화 완료

### x402 프로토콜 검증 체크리스트

**Phase 2 완료 시점**:
- [ ] 인터셉터가 목업 402 응답을 정상 감지하는가?
- [ ] 한도 확인 로직이 정상 작동하는가?
- [ ] 한도 내 자동 결제 UI 플로우가 자연스러운가?
- [ ] 한도 초과 시 결제 시트가 자동으로 표시되는가?

**Phase 3 완료 시점**:
- [ ] 서버가 실제 402 응답을 생성하는가?
- [ ] 실제 API 엔드포인트(예: `/api/chat`)에서 402 응답을 반환하는가?
- [ ] 인터셉터가 실제 402 응답을 정상 처리하는가?
- [ ] 전체 플로우가 목업 결제로 정상 작동하는가?
- [ ] 원래 요청이 자동으로 재시도되는가?

**Phase 4 완료 시점**:
- [ ] 실제 임베디드 지갑을 통한 결제가 정상 작동하는가?
- [ ] 한도 내 자동 결제가 백그라운드에서 정상 처리되는가?
- [ ] 한도 초과 시 사용자 승인 플로우가 정상 작동하는가?
- [ ] AI 채팅 중 크레딧 부족 시 자동 충전 후 재시도되는가?
- [ ] 사용자가 중단 없이 서비스를 사용할 수 있는가? (핵심!)

---

**문서 버전**: 3.0  
**최종 업데이트**: 2026-01-20  
**업데이트 내용**: 
- UI 우선 작업 순서로 로드맵 재구성
- Phase 1-2를 UI 컴포넌트 구현으로 변경
- Phase 3을 백엔드 인프라 구축으로 변경
- Phase 4를 UI와 백엔드 연동으로 변경
- 작업 순서 요약 및 다이어그램 추가

**담당**: Antigravity AI Assistant


## Related Documents
- **Specs**: [Document Management Plan](../01_Concept_Design/09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
