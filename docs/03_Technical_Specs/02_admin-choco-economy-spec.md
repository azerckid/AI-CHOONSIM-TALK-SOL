# 어드민 CHOCO 토큰 경제 통합 대시보드 구현 사양서
> Created: 2026-02-08
> Last Updated: 2026-02-08

**작성일**: 2026-01-13  
**목적**: 프로젝트 전체의 CHOCO 토큰 유통량, 서비스 지갑 잔액, 사용자 지급 현황 등을 한눈에 모니터링할 수 있는 대시보드 구축  
**상태**: 📋 설계 단계

---

## 1. 개요

CHOCO 토큰이 프로젝트의 핵심 화폐로 자리 잡음에 따라, 관리자가 토큰의 전체적인 흐름(발행, 유통, 소비, 서비스 지갑 유동성)을 파악하고 비정상적인 흐름을 감지할 수 있는 통합 대시보드가 필요합니다.

---

## 2. 주요 모니터링 지표 (KPI)

### 2.1 서비스 지갑 현황 (Service Wallet)
- **지갑 주소**: `CTC_TREASURY_ADDRESS` (CTC EVM Treasury 지갑 — 스윕 수신 주소)
- **CHOCO 잔액**: DB 내 전체 유저 `chocoBalance` 합계 (오프체인 포인트 기반)
- **CTC 잔액**: Treasury 지갑의 실제 CTC EVM 체인 잔액 (스윕 입금액)
- **유동성 경고**: CHOCO 총량 또는 CTC 잔액이 설정된 임계치 이하로 떨어질 경우 시각적 경고 표시

### 2.2 사용자 경제 지표 (User Economy)
- **총 유통량 (Total Circulating Supply)**: 모든 사용자의 DB `chocoBalance` 합계
- **온체인 실보유량 (Estimated On-chain Supply)**: 온체인에 실제로 전송 완료된 토큰 합계 (TokenTransfer 테이블 기반)
- **미동기화 잔액 (Pending Sync)**: DB 잔액 합계 - 온체인 잔액 합계 (지갑 미생성 유저 등에게 할당된 대기 물량)
- **활성 유저 보유 평균**: 인당 평균 CHOCO 보유량

### 2.3 누적 통계 (Accumulated Stats)
- **총 판매량 (Total Purchased)**: Toss, PayPal 등을 통해 실결제로 충전된 총액
- **총 지급량 (Total Granted)**: 어드민 멤버십 부여, 미션 보상 등으로 시스템에서 지급된 총액
- **총 소비량 (Total Consumed)**: 채팅 사용, 아이템 구매 등으로 소진된 총액

---

## 3. 구현 계획

### 3.1 라우트 구성
- **경로**: `/admin/system/economy` 또는 `/admin/payments/stats`
- **기존 페이지 통합**: `admin/system.tsx`의 하위 탭 또는 별도 메뉴로 추가

### 3.2 데이터 소스 및 계산 로직
1. **DB Aggregation (Drizzle ORM)**:
   - `User` 테이블: `select sum(chocoBalance) from User`
   - `Payment` 테이블: `select sum(amount) from Payment where type='TOPUP' and status='COMPLETED'`
   - `TokenTransfer` 테이블: `select sum(amount) from TokenTransfer where status='COMPLETED'`
2. **CTC EVM On-chain Call**:
   - `provider.getBalance(CTC_TREASURY_ADDRESS)`를 사용하여 Treasury CTC 잔액 조회 (ethers.js)
   - `lib/ctc/deposit-engine.server.ts`의 잔액 조회 로직 재사용

### 3.3 UI/UX 디자인 (Aesthetics)
- **Rich Cards**: 상단에 주요 지표(서비스 잔액, 유통량 등)를 스타일리시한 카드로 배치
- **Charts**: 
  - 최근 30일간의 CHOCO 지급 vs 소비 추세 그래프
  - 결제 수단별 매출 비중 (Pie Chart)
- **Status Indicators**: 서비스 지갑 상태(Healthy / Warning / Critical) 표시

---

## 4. 기술적 세부사항

### 4.1 필요한 API 유틸리티
- `app/lib/ctc/deposit-engine.server.ts`: Treasury 지갑 잔액 조회를 위한 `getServiceWalletStats()` 추가
- `app/lib/admin/stats.server.ts`: DB 집계 로직을 담당하는 서버 유틸리티 생성

### 4.2 보안 사항
- 해당 페이지는 `requireAdmin(request)`를 통한 강력한 권한 제어 적용
- 서비스 지갑의 프라이빗 키는 절대 클라이언트에 노출되지 않도록 서버 사이드 로더에서만 처리

---

## 5. 단계별 구현 로드맵

1. **Step 1**: 사양서 작성 및 관리자 승인 (현재 단계)
2. **Step 2**: 서비스 지갑 및 DB 집계 API 유틸리티 구현
3. **Step 3**: 어드민 통계 페이지 라우트 및 기본 UI 레이아웃 구축
4. **Step 4**: 그래프 및 상세 대시보드 위젯 추가
5. **Step 5**: 임계치 설정 및 관리자 알림 기능 (선택 사항)

---

## 6. 기대 효과
- 토큰 이코노미의 투명성 확보
- 서비스 지갑의 잔액 부족으로 인한 지급 장애 사전 방지
- 사용자들의 토큰 소비 패턴 분석을 통한 서비스 개선 기초 데이터 확보


## Related Documents
- **Specs**: [Document Management Plan](../01_Concept_Design/09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
