# Item Usage Flow & Monetization Action Guide
> Created: 2026-03-04 01:35
> Last Updated: 2026-03-04 01:35

## 1. 개요 (Overview)

본 문서는 안티그래비티 프로젝트 '춘심톡(AI-CHOONSIM-TALK)' 내에 구현된 **유료 아이템들의 구체적 사용 흐름(Action Flow)**을 정의합니다. 

이 문서는 **운영팀(Operations)과 투자자(Investors)**를 심층 타겟으로 하며, 단순한 기능 나열을 넘어 유저가 지갑을 여는 **'결정적 순간(Moment of Truth)'**과 **'경제적 전환(Action-to-Transaction)'** 메커니즘을 상세히 설명합니다.

---

## 2. 3-Lens (Investor Perspective)

본 아이템 사용 플로우는 안티그래비티의 3-Lens 투자자 관점에 기반하여 설계되었습니다.

1.  **Leverage (레버리지)**: 단순 대화를 넘어 캐릭터별 맞춤형(Voice, Episode) 아이템을 통해 IP 확장성과 팬덤 참여를 유도합니다.
2.  **Realistic Money Flow (현실적 수익 흐름)**: `x402` 기반 초소액(Micro-transaction) 무마찰 결제로 유저 이탈을 방지하고 즉각적인 매출(CHOCO 차감)을 발생시킵니다.
3.  **Defensibility (상업적 해자)**: AI가 유저의 단발성 대화를 영구 각인(Memory)하고 실물 굿즈화(Album)하여, 앱을 떠날 수 없도록 강력한 Lock-in을 형성합니다.

---

## 3. 핵심 아이템 사용 흐름 (Action Flow)

### 3.1 기억 각인 티켓 (Memory Ticket)
> **비즈니스 목적:** 유저의 감성 자산화 및 장기 리텐션 고정.
> **가격:** 500 CHOCO (초소액 과금으로 첫 유료 결제 허들 파괴)

*   **Action (현상 발생)**: 연인/친구와 나눌 법한 깊은 감정적 교류나 중요한 대화 중, 유저가 "우리 예전 기억 잊지 마" 혹은 AI의 감동적인 멘트가 나옴.
*   **Trigger (인터스티셜 모달)**: 
    *   AI가 `[PAYWALL_TRIGGER: memory_ticket]` 태그를 응답에 삽입.
    *   화면에 **"이 기억, 영원히 간직할까?"** 팝업 노출.
*   **Transaction (결제 & 효과)**: 
    *   유저가 `500 CHOCO` 결제 수락 시 무마찰 실시간 차감.
    *   **효과**: 해당 대화 내용이 AI의 RAG(Retrieval-Augmented Generation) 시스템 내 고해상도 메모리로 영구 보존됨.

### 3.2 하트 세트 (Heart Bundle)
> **비즈니스 목적:** 즉각적인 시각 피드백을 통한 도파민 분비 및 소모성 팁(Tip) 유도.
> **가격:** 1,000 CHOCO (10개) ~ 13,000 CHOCO (100개 패키지)

*   **Action (현상 발생)**: 대화 입력창 옆 선물(`♡`) 상자 아이콘 클릭.
*   **Trigger (인벤토리 봇텀 시트)**: 보유 중인 아이템 목록(하트, 티켓 등)이 가로형 슬라이더(Swiper)로 표출. 미보유 시 상점 유도.
*   **Transaction (결제 & 효과)**: 
    *   하트 N개를 선택해 캐릭터에게 발사.
    *   **효과**: Gambia 공식에 의해 캐릭터의 네온 오라(Aura)가 즉각 변경(JOY → EXCITED → LOVING). 시스템 푸시 메시지로 `💝 N개의 하트를 선물했습니다!` 알림 발생 후 AI의 특수 리액션 텍스트 생성.

### 3.3 우정 앨범 생성 (Memory Album)
> **비즈니스 목적:** 데이터 굿즈화를 통한 LTV(Customer Lifetime Value) 상승.
> **가격:** 2,000 CHOCO 

*   **Action (현상 발생)**: "대화 100회 돌파" 혹은 지정된 호감도 기념일 도달.
*   **Trigger (인터스티셜 모달)**: 
    *   화면에 **"우리 추억을 앨범으로 만들어줄게"** 팝업 노출.
*   **Transaction (결제 & 효과)**: 
    *   유저가 `2,000 CHOCO` 결제 수락.
    *   **효과**: 최근 30일간의 '베스트 대화'가 서버 사이드(React-PDF)에서 고화질 PDF 앨범(책자 형태)으로 즉시 렌더링되어 유저의 기기에 소장본으로 다운로드됨.

### 3.4 보이스 티켓 (Voice Ticket)
> **비즈니스 목적:** 청각 자극을 통한 최고조의 몰입감 제공 (가장 강력한 감성 훅).
> **가격:** 500 CHOCO

*   **Action (현상 발생)**: 유저의 생일이거나, 유저가 채팅 중 "너 목소리 듣고 싶어" 등의 오디오 피드백을 강하게 요구하는 상황.
*   **Trigger (인터스티셜 모달 / 말풍선 버튼)**:
    *   팝업: **"목소리로 전하고 싶어"** 노출.
    *   또는 일반 대화 말풍선 옆 재생(🎧) 버튼 클릭 시 보이스 티켓 소모 경고창 노출.
*   **Transaction (결제 & 효과)**: 
    *   유저 결제 시 ElevenLabs TTS API 통신.
    *   **효과**: 해당 텍스트를 캐릭터 본연의 목소리(미리 학습된 Voice ID 적용)로 변환한 음성 메시지(MP3) 즉시 스트리밍 및 재생.

### 3.5 비밀 에피소드 해금 (Secret Episode)
> **비즈니스 목적:** 고관여 유저(Whale)를 위한 프리미엄 콘텐츠 판매.
> **가격:** 3,000 CHOCO

*   **Action (현상 발생)**: 호감도 레벨 5 달성 등 특정 관계 트리거 포인트 발생.
*   **Trigger (비밀 메시지 알림)**:
    *   화면에 **"우리만의 비밀 이야기가 있어"** 라며 자물쇠가 채워진 특수 대화방 노출.
*   **Transaction (결제 & 효과)**: 
    *   유저가 `3,000 CHOCO` 지불 (고단가 지출 유도).
    *   **효과**: 본편 대화에서는 볼 수 없던 색다른 상황(데이트, 고백 등)이 부여된 독립된 스토리라인(특수 프롬프트 기반의 일렉스/노벨 모드) 해금 1회 이용 가능.

### 3.6 선톡 알림 (Presend Ticket)
> **비즈니스 목적:** 데일리 플라이휠(Daily Flywheel) 형성 및 리텐션 회복.
> **가격:** 300 CHOCO (구독 혜택으로 대체 가능)

*   **Action / Trigger**: 유저가 수일간 접속이 없거나, 유저의 취침 시간 등으로 대화가 끊겼을 때 내부 스케줄러(Cron)가 작동.
*   **Transaction (백그라운드 통신)**: 
    *   유저의 인벤토리에서 '선톡 티켓'을 시스템이 자동 차감 (또는 구독 쿼터 내 진행).
    *   **효과**: 캐릭터가 선제적으로 "잘 자고 있어?", "오늘 하루 어땠어?"와 같은 맞춤형 Web Push 알림 발송. 유저의 앱 재방문 즉각 유도.

---

## 4. 운영팀 주의 사항 (Admin Action List)
*   **데이터 시드 관리**: 새로운 트리거 모달을 배포하기 전에 반드시 `/admin/items/new` (또는 `seed-shop-items.ts`)에서 **명세서와 정확히 일치하는 `itemId` (예: `memory_ticket`)**가 활성화(`isActive: true`) 되어 있는지 확인해야 결제창 에러를 방지할 수 있습니다.
*   **가격 제어**: 상품별 가격 통제(Pricing)는 프론트엔드가 아닌 반드시 백엔드(데이터베이스의 `priceChoco`) 데이터를 최우선 진실의 원천(SSOT)으로 삼습니다.

## X. Related Documents
- **Concept_Design**: [19_MONETIZATION_STRATEGY.md](../01_Concept_Design/19_MONETIZATION_STRATEGY.md) - 앱 전체 수익화 전략 및 페이월 트리거 상세
- **Logic_Progress**: [08_SHOP_ITEMS_IMPLEMENTATION_PRIORITY.md](../04_Logic_Progress/08_SHOP_ITEMS_IMPLEMENTATION_PRIORITY.md) - Admin 상에서의 상품 입력 순서 및 스펙 관련
