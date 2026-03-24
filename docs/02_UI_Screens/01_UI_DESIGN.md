# UI 디자인 시스템 (UI Design System)
> Created: 2025-12-31
> Last Updated: 2026-02-08 18:01

춘심 AI 챗봇 프로젝트의 디자인 토큰 및 시각 가이드라인입니다.

---

## 1. 디자인 시스템 개요

### 1.1 기본 원칙
- **따뜻하고 친근한 느낌**: 춘심 캐릭터의 성격에 맞는 따뜻한 톤
- **모바일 우선**: 모바일 환경에 최적화된 디자인
- **일관성**: shadcn/ui Nova Preset을 기반으로 한 일관된 UI
- **접근성**: 사용자 친화적이고 접근 가능한 인터페이스

### 1.2 사용 기술
- **Tailwind CSS v4**: 유틸리티 기반 CSS 프레임워크
- **shadcn/ui Nova Preset**: 컴포넌트 라이브러리 및 디자인 시스템
- **커스텀 디자인 토큰**: 춘심 캐릭터에 맞는 색상, 타이포그래피 등

---

## 2. 색상 시스템 (Color System)

### 2.1 기본 색상 팔레트
춘심 캐릭터의 따뜻하고 친근한 느낌을 반영한 색상 팔레트입니다.

#### 2.1.1 Color Palette Overview

| Category | Light Mode (Monochrome) | Dark Mode (Neon Pink) | HEX |
| :--- | :--- | :--- | :--- |
| **Primary (Accent)** | **Slate-900 (Black)** | **Primary Pink** | `#0f172a` / `#ee2b8c` |
| **Secondary Accent**| Slate-500 (Gray) | Pink-400 | - |
| **Background** | Background Light | Background Dark | `#f8f6f7` / `#221019` |
| **Surface** | White | Surface Dark | `#ffffff` / `#2d1b24` |

#### Primary Colors (주요 색상)
- **Primary**: `#ee2b8c` (따뜻한 핑크 - 춘심 캐릭터 컬러)
- **Primary Dark**: `#d61f7a` (어두운 핑크)
- **Primary Light**: Primary 색상의 10% 투명도 (`rgba(238, 43, 140, 0.1)`)

#### Background Colors (배경 색상)
- **Background Light**: `#f8f6f7` (따뜻한 크림 화이트)
- **Background Dark**: `#221019` (따뜻한 다크 톤)
- **Surface Light**: `#ffffff` (순수 화이트)
- **Surface Dark**: `#2d1b24` (카드/컨테이너용 다크 톤)
- **Surface Dark (Alt)**: `#361b2a` (대체 다크 톤)

#### Text Colors (텍스트 색상)
- **Text Primary**: `#0f172a` (slate-900) - 라이트 모드
- **Text Primary Dark**: `#ffffff` (화이트) - 다크 모드
- **Text Muted**: `#c992ad` (연한 핑크 그레이) - 다크 모드에서 사용
- **Text Secondary**: `#64748b` (slate-500) - 라이트 모드
- **Text Secondary Dark**: `#94a3b8` (slate-400) - 다크 모드

#### Border Colors (테두리 색상)
- **Border Light**: `rgba(0, 0, 0, 0.05)` (검은색 5% 투명도)
- **Border Dark**: `rgba(255, 255, 255, 0.05)` (흰색 5% 투명도)

#### Semantic Colors (의미론적 색상)
- **Success**: `#10b981` (emerald-500)
- **Warning**: `#f59e0b` (amber-500)
- **Error**: `#ef4444` (red-500)
- **Info**: `#3b82f6` (blue-500)

### 2.2 다크 모드
- **다크 모드 활성화**: `class="dark"` 속성 사용
- **Tailwind 다크 모드**: `darkMode: "class"` 설정
- **배경 그라데이션**: 다크 모드에서 따뜻한 톤 유지
- **명도 대비**: WCAG AA 기준 준수

### 2.3 Tailwind CSS 설정
```typescript
// tailwind.config.ts
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#ee2b8c",
        "primary-dark": "#d61f7a",
        "background-light": "#f8f6f7",
        "background-dark": "#221019",
        "surface-dark": "#2d1b24",
        "text-muted": "#c992ad",
      },
      fontFamily: {
        "display": ["Plus Jakarta Sans", "Noto Sans KR", "sans-serif"],
        "body": ["Noto Sans KR", "sans-serif"],
      },
      borderRadius: {
        "DEFAULT": "0.5rem",  // 8px
        "lg": "1rem",          // 16px
        "xl": "1.5rem",        // 24px
        "2xl": "2rem",         // 32px
        "full": "9999px",
      },
    },
  },
}
```

---

## 3. 타이포그래피 (Typography)

### 3.1 폰트 패밀리
- **Display Font**: `Plus Jakarta Sans` (영문, 숫자, 제목용)
  - 웨이트: 400, 500, 600, 700, 800
  - Google Fonts에서 로드
- **Body Font**: `Noto Sans KR` (한글 본문용)
  - 웨이트: 400, 500, 700
  - Google Fonts에서 로드
- **Fallback**: `sans-serif` (시스템 폰트)

### 3.2 폰트 스케일
- **Heading 1**: `text-3xl` (30px) - 페이지 타이틀, 프로필 이름
- **Heading 2**: `text-2xl` (24px) - 섹션 타이틀
- **Heading 3**: `text-lg` (18px) - 소제목
- **Body Large**: `text-base` (16px) - 본문 (기본)
- **Body**: `text-[15px]` (15px) - 메시지 본문
- **Body Small**: `text-sm` (14px) - 보조 텍스트
- **Caption**: `text-xs` (12px) - 캡션, 라벨, 타임스탬프
- **Tiny**: `text-[10px]` (10px) - 매우 작은 텍스트

### 3.3 폰트 웨이트
- **Regular (400)**: 기본 텍스트
- **Medium (500)**: 강조 텍스트, 라벨
- **Semibold (600)**: 섹션 제목
- **Bold (700)**: 주요 제목, 사용자 이름
- **Extrabold (800)**: 강한 강조 (선택사항)

### 3.4 폰트 스타일
- **Line Height**: `leading-tight` (1.25) - 제목
- **Line Height**: `leading-relaxed` (1.625) - 본문
- **Letter Spacing**: `tracking-[-0.015em]` - 제목 (약간 좁게)
- **Letter Spacing**: `tracking-wider` - 대문자 라벨

---

## 4. 간격 시스템 (Spacing)

### 4.1 기본 간격 단위
Tailwind CSS의 기본 간격 시스템 사용 (4px 단위)

- **xs**: 4px
- **sm**: 8px
- **md**: 16px
- **lg**: 24px
- **xl**: 32px
- **2xl**: 48px
- **3xl**: 64px

### 4.2 컴포넌트 간격
- **컴포넌트 내부**: sm ~ md
- **컴포넌트 간**: md ~ lg
- **섹션 간**: lg ~ xl

---

## 5. 그림자 및 효과 (Shadows & Effects)

### 5.1 그림자
- **sm**: 작은 그림자 (카드, 버튼)
- **md**: 중간 그림자 (모달, 드롭다운)
- **lg**: 큰 그림자 (오버레이)

### 5.2 둥근 모서리 (Border Radius)
- **DEFAULT**: `0.5rem` (8px) - 기본 요소
- **lg**: `1rem` (16px) - 카드, 버튼
- **xl**: `1.5rem` (24px) - 큰 카드, 입력 필드
- **2xl**: `2rem` (32px) - 모달, 큰 컨테이너
- **full**: `9999px` - 완전한 원형 (아바타, 버튼)
- **특수**: `rounded-2xl rounded-tl-sm` - 메시지 버블 (왼쪽 상단만 작게)

### 5.3 애니메이션
- **부드러운 전환**: 
  - 기본: `transition-colors duration-300`
  - 빠른 전환: `transition-colors duration-200`
  - 전체 전환: `transition-all`
- **메시지 등장**: 새 메시지가 부드럽게 나타남 (그룹 호버 효과)
- **Typing Indicator**: 
  - 애니메이션: `animate-bounce`
  - 지연: `animation-delay: 0ms, 150ms, 300ms`
  - 크기: `w-1.5 h-1.5 rounded-full`
- **버튼 인터랙션**: 
  - 호버: `hover:scale-105`
  - 액티브: `active:scale-95`
- **그림자 펄스**: 
  - Primary 버튼: `animate-glow` (3초 무한 반복)
  - 키프레임: `pulse-glow` (box-shadow 변화)

---

## 6. shadcn/ui 컴포넌트

### 6.1 사용할 주요 컴포넌트
- **Button**: 버튼 (Primary, Secondary, Ghost 등)
- **Input**: 텍스트 입력
- **Card**: 카드 컨테이너
- **Avatar**: 프로필 이미지
- **Dialog/Modal**: 모달 다이얼로그
- **Toast**: 알림 메시지 (Sonner)
- **Select**: 드롭다운 선택
- **ScrollArea**: 스크롤 영역
- **Badge**: 뱃지, 태그

### 6.2 Nova Preset 커스터마이징
- shadcn/ui Nova Preset을 기본으로 사용
- 춘심 캐릭터에 맞게 색상 및 스타일 커스터마이징
- 컴포넌트 variants 추가 (필요 시)

---

## 7. 레이아웃 가이드라인

### 7.1 그리드 시스템
- **모바일**: 단일 컬럼
- **태블릿**: 2 컬럼 (필요 시)
- **데스크톱**: 최대 너비 제한 (`max-w-md mx-auto`)

### 7.2 컨테이너
- **모바일**: 전체 너비, 좌우 패딩 (`px-4`)
- **데스크톱**: 최대 너비 제한 (`max-w-md mx-auto`), 중앙 정렬

### 7.3 채팅 화면 레이아웃
- **상단 헤더**: 
  - 고정 위치: `sticky top-0 z-50`
  - 배경: `bg-background-light/90 dark:bg-background-dark/90`
  - 백드롭 블러: `backdrop-blur-md`
  - 테두리: `border-b border-gray-200 dark:border-white/5`
  - 패딩: `px-4 py-3`
- **메시지 영역**: 
  - 가변 높이: `flex-1 overflow-y-auto`
  - 패딩: `p-4`
  - 배경 그라데이션: `radial-gradient(circle at center, rgba(238, 43, 140, 0.03) 0%, rgba(34, 16, 25, 0) 70%)`
- **입력 영역**: 
  - 고정 위치: `flex-none`
  - 하단 고정: `border-t border-gray-200 dark:border-white/5`
  - 패딩: `pb-8 pt-2 px-3`
  - 안전 영역: iOS Home Indicator 고려

### 7.4 헤더 스타일
- **App Bar**: 
  - 스타일: Material Design 3 스타일
  - 높이: 자동 (`py-3` 또는 `py-4`)
  - 아이콘 버튼: `w-10 h-10 rounded-full`
  - 호버: `hover:bg-black/5 dark:hover:bg-white/10`

---

## 8. 컴포넌트별 디자인 가이드

### 8.1 메시지 버블
- **사용자 메시지**: 
  - 오른쪽 정렬 (`justify-end`)
  - 배경: Primary 색상 (`bg-primary`)
  - 텍스트: 흰색 (`text-white`)
  - 둥근 모서리: `rounded-2xl rounded-tr-sm` (오른쪽 상단만 작게)
  - 그림자: `shadow-md shadow-primary/20`
- **춘심 메시지**: 
  - 왼쪽 정렬 (`justify-start`)
  - 배경: 화이트/다크 서페이스 (`bg-white dark:bg-surface-dark`)
  - 텍스트: `text-slate-800 dark:text-gray-100`
  - 둥근 모서리: `rounded-2xl rounded-tl-sm` (왼쪽 상단만 작게)
  - 그림자: `shadow-sm`
- **타임스탬프**: 
  - 크기: `text-[11px]` 또는 `text-xs`
  - 색상: `text-gray-400 dark:text-white/30`
  - 위치: 메시지 버블 아래
- **아바타**: 
  - 크기: `w-10 h-10` (40px)
  - 둥근 모서리: `rounded-full`
  - 위치: 메시지 옆

### 8.2 입력 필드
- **기본 스타일**: 
  - 배경: `bg-white dark:bg-surface-dark`
  - 둥근 모서리: `rounded-[24px]` (완전히 둥근 형태)
  - 최소 높이: `min-h-[48px]`
  - 패딩: `px-4 py-2`
  - 그림자: `shadow-sm`
- **포커스 상태**: 
  - 테두리: `focus-within:border-primary/50`
  - 전환: `transition-colors`
- **플레이스홀더**: 
  - 색상: `placeholder-gray-400 dark:placeholder-gray-500`
- **에러 상태**: Error 색상 테두리 (필요 시)

### 8.3 버튼
- **Primary 버튼**: 
  - 배경: `bg-primary`
  - 텍스트: `text-white`
  - 호버: `hover:bg-primary/90`
  - 그림자: `shadow-lg shadow-primary/30`
  - 크기: `w-10 h-10` (원형) 또는 `h-14` (직사각형)
  - 둥근 모서리: `rounded-full` 또는 `rounded-2xl`
  - 전환: `transition-all transform active:scale-95`
- **Secondary 버튼**: 
  - 배경: `bg-white dark:bg-surface-dark`
  - 테두리: `border border-gray-200 dark:border-white/10`
  - 호버: `hover:text-primary`
- **Ghost 버튼**: 
  - 배경: 투명 또는 `hover:bg-black/5 dark:hover:bg-white/10`
  - 전환: `transition-colors`
- **Floating Action Button (FAB)**: 
  - 위치: `fixed bottom-24 right-4`
  - 크기: `w-14 h-14`
  - 그림자: `shadow-lg shadow-primary/30`
  - 호버: `hover:scale-105`

### 8.4 카드 (페르소나 모드 선택, 설정 항목)
- **기본 스타일**: 
  - 배경: `bg-surface-light dark:bg-surface-dark`
  - 둥근 모서리: `rounded-2xl`
  - 그림자: `shadow-sm dark:shadow-none`
  - 테두리: `border border-black/5 dark:border-white/5`
- **호버 효과**: 
  - 배경: `hover:bg-black/5 dark:hover:bg-white/5`
  - 전환: `transition-colors`
- **선택 상태**: Primary 색상 테두리 또는 배경
- **내부 항목**: 
  - 패딩: `p-4`
  - 최소 높이: `min-h-14`
  - 구분선: `border-b border-black/5 dark:border-white/5 last:border-0`

---

## 9. 반응형 디자인

### 9.1 브레이크포인트
- **모바일**: < 640px
- **태블릿**: 640px ~ 1024px
- **데스크톱**: > 1024px

### 9.2 모바일 최적화
- **터치 타겟**: 최소 44x44px
- **텍스트 크기**: 모바일에서도 읽기 쉬운 크기
- **간격**: 모바일에서 충분한 간격 유지

---

## 10. 접근성 (Accessibility)

### 10.1 색상 대비
- WCAG AA 기준 준수
- 텍스트와 배경 간 충분한 대비

### 10.2 키보드 네비게이션
- 모든 인터랙티브 요소에 키보드 접근 가능
- 포커스 표시 명확

### 10.3 스크린 리더
- ARIA 레이블 적절히 사용
- 의미론적 HTML 사용

---

## 11. 애니메이션 가이드라인

### 11.1 전환 효과
- **기본 전환**: 200ms ~ 300ms
- **빠른 전환**: 150ms (호버)
- **느린 전환**: 400ms (페이지 전환)

### 11.2 이징 함수
- **기본**: ease-in-out
- **부드러운**: ease-out (등장)
- **자연스러운**: ease-in (사라짐)

---

## 12. 아이콘

### 12.1 아이콘 라이브러리
- **Material Symbols Outlined**: Google Material Symbols 사용
  - Filled 변형 지원 (`font-variation-settings: 'FILL' 1`)
  - Google Fonts에서 로드
- **일관된 스타일**: Outlined 스타일 기본 사용
- **Filled 아이콘**: 선택된 상태, 강조용 (예: favorite, chat_bubble)

### 12.2 아이콘 크기
- **xs**: `text-[10px]` (10px) - 매우 작은 아이콘
- **sm**: `text-sm` (14px) - 작은 아이콘
- **md**: `text-[18px]` (18px) - 기본 아이콘
- **lg**: `text-[20px]` (20px) - 중간 아이콘
- **xl**: `text-[24px]` (24px) - 큰 아이콘
- **2xl**: `text-2xl` (28px) - 매우 큰 아이콘
- **3xl**: `text-3xl` (32px) - 헤더 아이콘

### 12.3 주요 사용 아이콘
- **네비게이션**: `arrow_back_ios_new`, `arrow_back`, `chevron_right`
- **채팅**: `chat_bubble`, `add_comment`, `send`
- **상태**: `favorite`, `done_all`, `mic`, `music_note`
- **설정**: `settings`, `more_horiz`, `notifications`, `dark_mode`
- **기타**: `search`, `person`, `home`, `share`, `edit`

---

## 13. 참고 자료

### 13.1 shadcn/ui 문서
- [shadcn/ui 공식 문서](https://ui.shadcn.com/)
- [Nova Preset 가이드](https://ui.shadcn.com/docs/themes)

### 13.2 Tailwind CSS 문서
- [Tailwind CSS v4 문서](https://tailwindcss.com/docs)

### 13.3 디자인 리소스
- 춘심 캐릭터 이미지 및 에셋
- 브랜드 가이드라인 (있는 경우)

---

## 14. 특수 컴포넌트

### 14.1 온라인 상태 표시
- **온라인 인디케이터**: 
  - 크기: `w-2 h-2` 또는 `w-3.5 h-3.5`
  - 색상: `bg-green-500`
  - 그림자: `shadow-[0_0_8px_rgba(34,197,94,0.6)]`
  - 위치: 아바타 오른쪽 하단
  - 테두리: `border-2 border-background-light dark:border-background-dark`

### 14.2 날짜 구분선
- **스타일**: 
  - 배경: `bg-gray-200/50 dark:bg-white/5`
  - 둥근 모서리: `rounded-full`
  - 패딩: `px-4 py-1.5`
  - 텍스트: `text-xs font-medium text-gray-500 dark:text-white/40`

### 14.3 읽음 상태 표시
- **읽음 아이콘**: `done_all` Material Symbol
- **색상**: `text-gray-400 dark:text-gray-600`
- **미읽음 배지**: 
  - 배경: `bg-primary`
  - 크기: `w-5 h-5`
  - 텍스트: `text-[10px] font-bold text-white`

### 14.4 토글 스위치
- **컨테이너**: 
  - 크기: `h-[30px] w-[50px]`
  - 배경: `bg-slate-200 dark:bg-slate-700`
  - 활성화: `has-[:checked]:bg-primary`
- **스위치**: 
  - 크기: `h-[22px] w-[22px]`
  - 배경: `bg-white`
  - 그림자: `shadow-sm`
  - 전환: `transition-all duration-200`

---

## 15. 업데이트 이력

- **2025.12.31**: 초안 작성
- **2025.12.31**: Stitch 디자인 기반으로 실제 디자인 토큰 반영
  - 색상 값 구체화 (#ee2b8c 등)
  - 폰트 설정 (Plus Jakarta Sans, Noto Sans KR)
  - Material Symbols 아이콘 추가
  - 실제 컴포넌트 스타일 반영



## Related Documents
- **Foundation**: [Document Management Plan](./09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
