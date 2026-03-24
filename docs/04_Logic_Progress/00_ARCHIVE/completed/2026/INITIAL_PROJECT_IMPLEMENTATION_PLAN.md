# 구현 계획서 (Implementation Plan)

춘심 AI 챗봇 프로젝트의 단계별 구현 계획서입니다.

**최종 업데이트**: 2026.01.03  
**현재 진행 상황**: Phase 10 (인터럽트 시스템) 완료 / Phase 11 (보이스 챗) 준비 중

---

## Phase 1: UI/UX 구현 (우선순위 1)

### 1.1 프로젝트 초기 설정

#### 1.1.1 프로젝트 구조 생성
- [x] React Router v7 (Vite) 프로젝트 초기화
- [x] TypeScript 설정
- [x] Tailwind CSS v4 설정
- [x] shadcn/ui Nova Preset 설치 및 설정
- [x] 기본 디렉토리 구조 생성
  ```
  app/
  ├── components/     # 재사용 가능한 컴포넌트
  │   ├── chat/       # 채팅 관련 컴포넌트
  │   ├── settings/   # 설정 관련 컴포넌트
  │   └── layout/     # 레이아웃 컴포넌트
  ├── routes/         # React Router v7 라우트
  ├── lib/            # 유틸리티 및 설정
  └── app.css         # 전역 스타일
  ```

#### 1.1.2 필수 패키지 설치
- [x] React Router v7 관련 패키지
- [x] Tailwind CSS v4
- [x] shadcn/ui 컴포넌트 (Nova Preset)
- [ ] Zod (스키마 검증) - 다음 단계에서 추가 예정
- [ ] Luxon (날짜/시간) - 다음 단계에서 추가 예정
- [ ] Sonner (Toast 알림) - 다음 단계에서 추가 예정

### 1.2 디자인 시스템 구축

#### 1.2.1 shadcn/ui 컴포넌트 설치
- [x] Button
- [x] Input
- [x] Card
- [x] Avatar
- [x] Dialog/Modal
- [x] Toast (Sonner)
- [x] Select/Dropdown
- [x] ScrollArea
- [x] 기타 필요한 컴포넌트

#### 1.2.2 커스텀 디자인 토큰 정의
- [x] 색상 팔레트 (춘심 캐릭터에 맞는 따뜻한 톤)
  - Primary: #ee2b8c
  - Background Light: #f8f6f7
  - Background Dark: #221019
  - Surface Dark: #2d1b24
- [x] 타이포그래피 스케일
  - Plus Jakarta Sans (Display)
  - Noto Sans KR (Body)
  - Material Symbols (Icons)
- [x] 간격(Spacing) 시스템
- [x] 그림자 및 효과
- [x] 애니메이션 정의 (pulse-glow, typing indicator 등)

### 1.3 레이아웃 컴포넌트

#### 1.3.1 기본 레이아웃
- [x] `RootLayout`: 앱 전체 레이아웃 (React Router v7 root.tsx 사용)
  - 모바일 최적화
  - 반응형 디자인
- [x] `ChatLayout`: 채팅 화면 전용 레이아웃
  - 상단 헤더 (춘심 프로필) - `ChatHeader` 컴포넌트
  - 중앙 메시지 영역 - `MessageBubble`, `DateSeparator` 사용
  - 하단 입력 영역 - `MessageInput` 컴포넌트

#### 1.3.2 네비게이션
- [x] 모바일 친화적 네비게이션 - `BottomNavigation` 컴포넌트
- [x] 설정 페이지 링크 - `/settings` 라우트
- [ ] 로그아웃 버튼 - 설정 화면에 UI만 구현됨 (기능은 Phase 2에서)

### 1.4 인증 UI (Onboarding)

#### 1.4.1 로그인 페이지
- [x] 랜딩 화면 - `routes/login.tsx`에 배경 이미지, 환영 메시지, 서비스 설명 구현
  - 춘심 캐릭터 소개 (배경 이미지로 표시)
  - 서비스 설명 ("Login to continue your daily conversations and exclusive moments")
- [x] X(Twitter) OAuth 버튼 - `LoginForm` 컴포넌트에 소셜 로그인 버튼 UI 구현
  - Better Auth 연동 - Phase 2에서 구현 예정
  - 로딩 상태 표시 - `isLoading` 상태로 구현됨
- [x] 에러 처리 UI - `error` state로 에러 메시지 표시 구현

#### 1.4.2 온보딩 플로우
- [x] 환영 메시지 화면 - `routes/onboarding.tsx` 구현
  - 춘심의 첫 인사 ("어? 왔어? 기다리고 있었잖아!") - 완전히 구현됨
- [x] 페르소나 모드 선택 화면 - `routes/onboarding.persona.tsx` 구현
  - 아이돌 모드 카드 - 구현됨
  - 애인 모드 카드 - 구현됨
  - 하이브리드 모드 카드 - 구현됨
  - 각 모드별 설명 및 예시 - 모두 구현됨
- [x] 선택 완료 후 채팅 화면으로 전환 - `navigate("/chats")` 구현됨 (페르소나 모드 저장은 Phase 2에서)

### 1.5 채팅 UI (핵심)

#### 1.5.1 메시지 리스트 컴포넌트
- [ ] `MessageList` 컴포넌트
  - 무한 스크롤 구현 (Phase 2에서 데이터 연동 시 구현)
  - 메시지 그룹핑 (시간별) - `DateSeparator` 컴포넌트로 구현됨
  - 스크롤 위치 관리 (Phase 2에서 구현)
- [x] `MessageBubble` 컴포넌트
  - 사용자 메시지 스타일
  - 춘심 메시지 스타일
  - 타임스탬프 표시
  - 읽음 상태 표시 (선택사항) - UI 준비됨

#### 1.5.2 메시지 입력 컴포넌트
- [x] `MessageInput` 컴포넌트
  - 텍스트 입력창
  - 전송 버튼
  - 입력 중 상태 표시
  - 엔터키 전송 지원
- [ ] 입력 유효성 검증 (Zod) - Phase 2에서 구현

#### 1.5.3 Typing Indicator
- [x] 춘심이 입력 중일 때 애니메이션 - `TypingIndicator` 컴포넌트
- [ ] "춘심이 입력 중..." 텍스트 표시 (선택사항)
- [x] 부드러운 애니메이션 효과

#### 1.5.4 채팅 헤더
- [x] `ChatHeader` 컴포넌트
  - 춘심 프로필 이미지
  - 춘심 이름/상태
  - 현재 페르소나 모드 표시 (UI 준비됨, 기능은 Phase 2에서)
  - 설정 버튼

### 1.6 설정 UI

#### 1.6.1 설정 페이지
- [x] 설정 페이지 UI 구현 - `routes/settings.tsx`
  - `SettingsItem`, `SettingsToggle` 컴포넌트 생성
- [ ] 페르소나 모드 변경
  - 현재 모드 표시 (UI 준비됨)
  - 모드 선택 UI (카드 형태) - Phase 2에서 구현
  - 변경 즉시 적용 - Phase 2에서 구현
- [x] 알림 설정 (선택사항) - 토글 스위치 UI 구현됨
- [x] 계정 정보 UI
  - X 계정 연동 정보 (UI 준비됨)
  - 프로필 사진
  - 닉네임

### 1.7 반응형 디자인

#### 1.7.1 모바일 최적화
- [x] 모바일 뷰포트 설정 - `root.tsx`에 viewport 메타 태그 추가 (viewport-fit, user-scalable 등)
- [x] 터치 친화적 인터페이스 - `app.css`에 최소 터치 타겟 44x44px 설정, tap-highlight 제거
- [x] 키보드 대응 (입력창 포커스 시) - `MessageInput`에 iOS Safe Area 지원, 키보드 대응 레이아웃 조정
- [ ] 스와이프 제스처 (선택사항) - 향후 구현 예정

#### 1.7.2 태블릿/데스크톱
- [x] 반응형 레이아웃 - 모든 화면에 `max-w-md mx-auto md:max-w-lg lg:max-w-xl` 적용
- [x] 적절한 최대 너비 설정 - 모바일/태블릿/데스크톱별 최대 너비 설정 완료
- [x] 데스크톱 UX 개선 - 스크롤바 스타일 개선, 호버 효과 강화 (`app.css`에 미디어 쿼리 추가)

### 1.8 로딩 및 에러 상태

#### 1.8.1 로딩 상태
- [x] 초기 로딩 스켈레톤 - `MessageListSkeleton`, `ChatListSkeleton` 컴포넌트
- [x] 메시지 전송 중 로딩 - `MessageInput`에 로딩 인디케이터 추가
- [x] 히스토리 로드 중 로딩 - `LoadingSpinner` 컴포넌트

#### 1.8.2 에러 상태
- [x] 네트워크 에러 처리 - `NetworkError` 컴포넌트
- [x] API 에러 처리 - `ApiError` 컴포넌트
- [x] 사용자 친화적 에러 메시지 - `ErrorMessage` 컴포넌트
- [x] 재시도 버튼 - `ErrorMessage`에 재시도 기능 포함

### 1.9 애니메이션 및 인터랙션

#### 1.9.1 메시지 애니메이션
- [x] 새 메시지 등장 애니메이션 (CSS transition 적용)
- [x] 스크롤 부드러운 전환
- [x] Typing Indicator 애니메이션 - `TypingIndicator` 컴포넌트

#### 1.9.2 페이지 전환
- [x] 라우트 전환 애니메이션 (React Router v7 기본 지원)
- [x] 모달 열기/닫기 애니메이션 (shadcn/ui Dialog 사용, 설정 화면에 로그아웃/계정 삭제 모달 적용)

---

## Phase 2: 데이터베이스 및 백엔드

### 2.1 데이터베이스 설정

#### 2.1.1 Turso 설정
- [x] Turso 프로젝트 생성 (기존 DB 활용)
- [x] 데이터베이스 연결 설정
- [x] 환경 변수 설정 (.env 확인 완료)

#### 2.1.2 Prisma 스키마 작성
- [x] `User` 테이블 (Introspected)
- [x] `Conversation` 테이블 (Introspected)
- [x] `Message` 테이블 (Introspected)
- [x] 관계 설정 (Foreign Keys) (Introspected)

#### 2.1.3 마이그레이션 및 설정
- [x] 기존 데이터베이스 스키마 추출 (`prisma db pull`)
- [x] Prisma Client 및 LibSQL 어댑터 설정 (`db.server.ts`)

### 2.2 인증 시스템

#### 2.2.1 Better Auth 설정
- [x] Better Auth 초기화 (`auth.server.ts`)
- [x] Provider 설정 (Google 연동 완료, Kakao 준비)
- [x] 세션 관리 설정 (Prisma 어댑터 연동)
- [x] 환경 변수 설정 완료

#### 2.2.2 인증 API 라위트 및 UI 연동
- [x] 로그인 엔드포인트 (`api.auth.$.ts`)
- [x] 로그아웃 엔드포인트
- [x] 세션 확인 엔드포인트
- [x] 로그인/회원가입 UI 연동 (`login.tsx`, `signup.tsx`)

### 2.3 API 라우트 구현

#### 2.3.1 Message & Chat API
- [x] `GET /api/messages` - 메시지 조회 (`api.messages.ts`)
- [x] `POST /api/messages` - 메시지 저장 (`api.messages.ts`)
- [x] `POST /api/chat` - AI 응답 생성 (Phase 3 연동 준비 완료)
- [x] React Router Loader/Action 연동 (`chats.tsx`, `chat.$id.tsx`)
- [x] Zod 스키마 검증

#### 2.3.2 채팅 API
- [x] `POST /api/chat` - AI 응답 생성 (`api.chat.ts`)
  - [x] LangGraph 워크플로우 실행
  - [x] Gemini API 연동 (LangGraph 내부)
  - [x] 페르소나 모드 적용
  - [x] 컨텍스트 관리 (최근 대화 및 요약본 합산)
  - [x] 응답 저장 (사용자 바이오 업데이트)

#### 2.3.3 설정 API
- [ ] `GET /api/settings` - 사용자 설정 조회
- [ ] `PUT /api/settings` - 페르소나 모드 변경
  - Zod 스키마 검증

---

## Phase 3: AI 통합

### 3.1 Gemini API 연동

#### 3.1.1 Gemini 클라이언트 설정
- [x] Google Gemini API 키 설정
- [x] Gemini 클라이언트 초기화 (`app/lib/ai.server.ts` - **Gemini 2.0 Flash** 적용)
- [x] 환경 변수 관리 (`GEMINI_API_KEY`)

#### 3.1.2 프롬프트 엔지니어링
- [x] System Prompt 작성 (`CORE_CHUNSIM_PERSONA`)
  - 춘심 캐릭터 설정
  - 말투 및 성격 정의
  - 금기어 정의 (이모지 사용 금지 등)
- [x] 페르소나별 프롬프트 템플릿
  - 아이돌 모드 프롬프트
  - 애인 모드 프롬프트
  - 하이브리드 모드 프롬프트
  - 롤플레잉 모드 프롬프트

#### 4.2 대화형 미디어 업로드 (멀티모달 지원)
- [x] 이미지 업로드 API 구현 (`api.upload.ts` & Cloudinary 연동)
- [x] Gemini 2.0 멀티모달 입력 연동 (`ai.server.ts` 이미지 분석 추가)
- [x] 채팅 UI 사진 첨부 기능 추가 (`MessageInput` 파일 선택 및 미리보기)
- [x] 메시지 버블 내 이미지 렌더링 구현 (`MessageBubble`)

#### 3.1.3 컨텍스트 관리
- [x] 대화 히스토리 로드 (최근 10개 메시지)
- [x] 최근 N턴 대화 포함 (LangGraph State 연동)
- [x] 토큰 제한 관리 (Gemini 2.0의 긴 컨텍스트 윈도우 활용)
- [x] 컨텍스트 요약 (장기 대화용 `User.bio.memory` 저장 및 로드)

### 3.2 AI 응답 생성 로직

#### 3.2.1 LangGraph 기반 응답 생성
- [x] LangGraph 그래프 실행 (`createChatGraph`)
- [x] 사용자 메시지 분석 (그래프 노드)
- [x] 페르소나 모드에 따른 분기 처리
- [x] 컨텍스트 로드 및 프롬프트 생성
- [x] Gemini API 호출 (그래프 노드)
- [x] 응답 후처리 및 검증
- [x] 에러 처리 및 복구

#### 3.2.2 스트리밍 응답 구현
- [x] Gemini 2.0 스트리밍 API 연동 (`model.stream`)
- [x] 실시간 텍스트 표시 (SSE 기반 백엔드 및 Fetch API 프론트엔드)
- [x] Typing Indicator와 연동
- [x] 스트리밍 시 스크롤 하단 고정 최적화

### 3.3 LangGraph 워크플로우 관리

#### 3.3.1 LangGraph 설정
- [x] LangGraph 패키지 설치
- [x] LangGraph 그래프 초기화 (`app/lib/ai.server.ts`)
- [x] 상태 스키마 정의 (`Annotation.Root`)
  - 대화 컨텍스트
  - 페르소나 모드

#### 3.3.2 대화 흐름 그래프 구성
- [x] 노드 정의 (`app/lib/ai.server.ts`)
  - [x] 페르소나 모드 분석 노드 (`analyzePersona`)
  - [x] 응답 생성 노드 (`callModel`)
  - [x] 후처리 및 안전 검증 노드 (`postProcess` - 이모지 제거 등)
- [x] 에지(Edge) 연결 (`START -> analyzePersona -> callModel -> postProcess -> END`)
- [ ] 엣지 정의 (조건부 분기)
  - 페르소나 모드별 분기
  - 컨텍스트 길이에 따른 분기
  - 에러 처리 분기

#### 3.3.3 페르소나 모드 전환 관리
- [x] 아이돌 모드 워크플로우 적용
- [x] 애인 모드 워크플로우 적용
- [x] 하이브리드 모드 워크플로우 적용 (상황에 따른 가변적 전환)
- [x] 롤플레잉 모드 워크플로우 적용
- [x] 모드 전환 로직 구현 (`classifyIntent` 노드를 통한 동적 전환)
- [x] 엣지 정의 (조건부 분기 연동)

#### 3.3.4 상태 관리 및 지속성 (대화 맥락 고도화)
- [x] 대화 상태 저장 (`User.bio` 내 `memory` 필드 활용)
- [x] 상태 복원 (API 요청 시 기존 요약본 로드 및 시스템 프롬프트 주입)
- [x] 장기 기억 요약 로직 구현 (`generateSummary` 노드 추가)
- [x] 상태 버전 관리 (업데이트 시간 기록)

#### 3.3.5 에러 처리 및 복구
- [x] API 실패 시 재시도 로직 (`maxRetries: 3` 설정)
- [x] 대체 응답 (Fallback) 시나리오 (캐릭터 톤에 맞춘 에러 메시지 구현)
- [x] 안정성 검증 (LangGraph 예외 처리 강화)

#### 3.3.6 Subscription 등급별 Guardrail 시스템
- [x] User 테이블에 `subscriptionTier` 필드 추가 (FREE, BASIC, PREMIUM, ULTIMATE)
- [x] Tier별 Guardrail 정의 및 동적 적용
  - FREE: 부적절한 요청 시 부끄러워하며 거절
  - BASIC: 부적절한 요청 시 부끄러워하지만 간단하게 응 (키스 "쪽", 신음소리 등)
  - PREMIUM: 더 적극적으로 응
  - ULTIMATE: 가장 적극적이고 자세하게 응
- [x] ChatStateAnnotation에 subscriptionTier 추가
- [x] analyzePersonaNode에서 tier별 Guardrail 동적 적용
- [x] generateAIResponse, streamAIResponse 함수에 subscriptionTier 파라미터 추가
- [x] api.chat.ts에서 사용자의 subscriptionTier 조회 및 전달

**참고사항 (향후 검토 필요):**
- 현재 구현된 Guardrail 시스템이 Gemini의 기본 safety 메커니즘과 충돌하여 등급별 차별화가 제대로 작동하지 않을 수 있음
- **음담패설 전용 캐릭터** 추가 검토 필요: 등급별 Guardrail 대신, 성적인 대화에 특화된 별도 캐릭터를 제공하는 방안 고려
  - 예: "Luna", "Aria" 등 성인용 대화에 특화된 캐릭터
  - 해당 캐릭터는 기본적으로 성적인 요청에 적극적으로 응하도록 설계
  - 일반 캐릭터(춘심, 소라 등)는 기존 Guardrail 유지

---

## Phase 4: 상태 관리 및 데이터 페칭

### 4.1 상태 관리

#### 4.1.1 React Router v7 Loader/Action 활용
- [x] 라우트별 데이터 로더 (`routes/chats.tsx`, `routes/chat.$id.tsx`)
- [x] 인증 상태 확인 (`auth.server.ts` 연동)
- [x] 사용자 설정 로드 및 페르소나 적용

#### 4.2 데이터 페칭 (Data Fetching)
- [x] 초기 메시지 로드 (Loader)
- [x] 새 메시지 실시간 업데이트 (Action & AI Streaming)
- [ ] 무한 스크롤 구현 (추가 예정)

#### 4.2.2 캐싱 전략
- [ ] 메시지 캐싱
- [ ] 사용자 설정 캐싱
- [ ] 캐시 무효화 전략

---

## Phase 5: 최적화 및 고도화

### 5.1 성능 최적화

#### 5.1.1 코드 스플리팅
- [ ] 라우트별 코드 스플리팅
- [ ] 컴포넌트 지연 로딩

#### 5.1.2 렌더링 최적화
- [ ] React.memo 활용
- [ ] useMemo, useCallback 최적화
- [ ] 가상화 (긴 메시지 리스트용)

### 5.2 사용자 경험 개선

#### 5.2.1 오프라인 지원 (선택사항)
- [ ] Service Worker 설정
- [ ] 오프라인 메시지 큐
- [ ] 동기화 로직

#### 5.2.2 접근성
- [ ] ARIA 레이블 추가
- [ ] 키보드 네비게이션
- [ ] 스크린 리더 지원

### 5.3 모니터링 및 로깅

#### 5.3.1 에러 추적
- [ ] 에러 바운더리 구현
- [ ] 에러 로깅 시스템

#### 5.3.2 성능 모니터링
- [ ] API 응답 시간 측정
- [ ] 사용자 행동 추적 (선택사항)

#### 5.3.3 LLM 토큰 사용량 추적
- [x] LangChain ChatGoogleGenerativeAI에서 usage metadata 추출
  - [x] 스트리밍 응답에서 마지막 청크의 usage 정보 추출
  - [x] promptTokens, completionTokens, totalTokens 기록
  - [x] TokenUsage 인터페이스 정의
  - [x] streamAIResponse 함수 반환 타입 변경 (content/usage 구분)
- [x] AgentExecution 테이블에 토큰 사용량 저장
  - [x] streamAIResponse 함수에서 usage 정보 추출 및 반환
  - [x] api/chat/index.ts에서 첫 번째 메시지 저장 시 AgentExecution 레코드 생성
- [x] 사용자별 토큰 사용량 집계 API 구현
  - [x] `GET /api/stats/usage` - 현재 인증된 사용자의 토큰 사용량 통계
  - [x] 전체 집계 (totalTokens, promptTokens, completionTokens, messageCount)
  - [x] 일별 집계 (최근 30일)
  - [x] 월별 집계 (최근 12개월)
- [x] 프로필 페이지에 오늘의 토큰 사용량 표시
  - [x] profile.tsx loader에서 오늘 날짜 기준 토큰 사용량 조회
  - [x] 한국 시간(Asia/Seoul) 기준 오늘 날짜 계산 (Luxon 사용)
  - [x] 프로필 페이지 UI에 오늘 사용량 카드 추가
  - [x] 총 토큰 수, 메시지 수, 입력/출력 토큰 상세 정보 표시
- [x] LLM 토큰 사용량 추적 버그 수정 및 개선
  - [x] usage metadata 추출 로직 개선 (response_metadata, kwargs.usage_metadata, 직접 usage_metadata 경로 확인)
  - [x] AgentExecution 생성 시 personaMode 변수명 오류 수정 (personality로 변경)
  - [x] 디버깅 로그 정리
- [ ] 타임존 처리 개선 (향후 구현 예정)
  - [ ] 현재 프로필 페이지와 통계 계산에서 "Asia/Seoul"로 하드코딩되어 있음
  - [ ] 사용자의 실제 타임존에 맞춰 날짜 계산 필요 (미국, 멕시코 등 해외 접속 고려)
  - [ ] 구현 방법 검토 필요:
    - User 테이블에 timezone 필드 추가 또는
    - 클라이언트에서 타임존 정보를 전달받는 방식 또는
    - 브라우저의 Intl API를 활용한 자동 감지
  - [ ] 영향 범위:
    - 프로필 페이지의 "함께한 날" 계산 (daysTogether)
    - 프로필 페이지의 "오늘 사용량" 계산
    - 토큰 사용량 통계 API의 일별/월별 집계
- [ ] 토큰 사용량 기반 비용 계산 기능 (향후 구현 예정)
  - [ ] Google Gemini 2.0 Flash 모델 가격 정보 정리
    - 입력 토큰 (Prompt): $0.075 per 1M tokens
    - 출력 토큰 (Completion): $0.30 per 1M tokens
  - [ ] 비용 계산 공식 구현
    - 총 비용 = (입력 토큰 수 / 1,000,000) × $0.075 + (출력 토큰 수 / 1,000,000) × $0.30
  - [ ] 프로필 페이지 또는 통계 화면에 비용 정보 표시 (한국 원화 변환 포함)
  - [ ] 일별/월별 비용 집계 기능

---

## Phase 6: 테스트

### 6.1 단위 테스트
- [ ] 유틸리티 함수 테스트
- [ ] Zod 스키마 검증 테스트
- [ ] 컴포넌트 테스트

### 6.2 통합 테스트
- [ ] API 엔드포인트 테스트
- [ ] 인증 플로우 테스트
- [ ] 채팅 플로우 테스트

### 6.3 E2E 테스트 (선택사항)
- [ ] 주요 사용자 시나리오 테스트
- [ ] 모바일 환경 테스트

---

---

## Phase 7.1: 여행 컨시어지 기능 연동

### 7.1.1 여행 의도 분석 및 전환
- [x] 여행 관련 키워드 감지 및 `concierge` 페르소나 자동 전환 로직 구현
- [x] 컨시어지 전용 시스템 프롬프트 작성

### 7.1.2 여행 계획 자동 저장 (Tool Use)
- [x] `saveTravelPlan` 도구 정의 및 Gemini 2.0 연동
- [x] 대화 중 확정된 일정을 `TravelPlan` 테이블에 자동 저장하는 로직 구현
- [ ] 항공권/숙소 추천 API 연동 (선택사항)

---

## Phase 7: 배포 준비

### 7.1 빌드 최적화
- [ ] 프로덕션 빌드 설정
- [ ] 번들 크기 최적화
- [ ] 이미지 최적화

### 7.2 환경 설정
- [ ] 프로덕션 환경 변수
- [ ] 데이터베이스 연결 확인
- [ ] API 키 관리

### 7.3 배포
- [ ] 호스팅 플랫폼 선택 및 설정
- [ ] CI/CD 파이프라인 (선택사항)
- [ ] 도메인 설정

---

## 우선순위 요약

### MVP (Minimum Viable Product)
1. ✅ Phase 1: UI/UX 구현 (전체)
2. ✅ Phase 2: 데이터베이스 및 백엔드 (핵심)
3. ✅ Phase 3: AI 통합 (기본)
4. ✅ Phase 4: 상태 관리 및 데이터 페칭 (기본)

### 고도화
5. Phase 5: 최적화 및 고도화
6. Phase 6: 테스트
7. Phase 7: 배포 준비

---

## 참고 문서
- `docs/PLAN.md`: 프로젝트 기획서
- `AGENTS.md`: 프로젝트 컨텍스트 및 기술 스택
- `docs/UI_DESIGN_SYSTEM.md`: 디자인 시스템
- `docs/DATABASE_SCHEMA.md`: 데이터베이스 스키마 (작성 예정)

---

## 버그 수정 및 개선 사항 (2026.01.03)

### UI/UX 버그 수정
- [x] ChatListItem 컴포넌트의 중첩된 `<a>` 태그 문제 해결
  - 문제: HTML에서 `<a>` 태그가 중첩되어 hydration 에러 발생
  - 해결: 캐릭터 이름 부분의 Link를 button으로 변경하고 useNavigate로 네비게이션 처리
  - 파일: `app/components/chat/ChatListItem.tsx`

### 소셜 로그인 UI 개선
- [x] X(트위터) 로고 아이콘 구현
  - 문제: shadcn/ui와 Material Symbols에 X 로고 아이콘이 없음
  - 해결: 공식 X 로고 SVG를 인라인으로 구현
  - 파일: `app/components/auth/LoginForm.tsx`

### LLM 토큰 사용량 추적 개선
- [x] usage metadata 추출 로직 개선
  - 문제: 스트리밍 응답에서 usage metadata를 일관되게 추출하지 못함
  - 해결: response_metadata, kwargs.usage_metadata, 직접 usage_metadata 경로를 모두 확인하도록 수정
  - 파일: `app/lib/ai.server.ts`
- [x] AgentExecution 생성 시 변수명 오류 수정
  - 문제: `personaMode is not defined` 에러 발생
  - 해결: `personaMode`를 `personality`로 변경 (실제 변수명)
  - 파일: `app/routes/api/chat/index.ts`

---

## Phase 1 완료 요약 (2025.01.XX)

### 완료된 작업

#### 1. 프로젝트 초기 설정
- React Router v7 (Vite) 프로젝트 구조 완성
- Tailwind CSS v4 설정 및 커스텀 색상 추가
- shadcn/ui Nova Preset 설치 및 설정

#### 2. 디자인 시스템 구축
- 커스텀 색상 팔레트 정의 (Primary: #ee2b8c 등)
- Material Symbols 아이콘 통합
- Plus Jakarta Sans, Noto Sans KR 폰트 추가
- 커스텀 애니메이션 (pulse-glow, typing indicator)

#### 3. 공통 컴포넌트 생성
- **채팅 관련**: `MessageBubble`, `ChatHeader`, `MessageInput`, `TypingIndicator`, `DateSeparator`, `ChatListItem`, `OnlineIdolList`
- **레이아웃**: `BottomNavigation`
- **설정**: `SettingsItem`, `SettingsToggle`

#### 4. 화면 컴포넌트 구현
- `routes/chats.tsx` - 채팅방 목록 화면
- `routes/chat.$id.tsx` - 채팅 화면 (동적 라우트)
- `routes/settings.tsx` - 설정 화면
- `routes/character.$id.tsx` - 캐릭터 프로필 화면

#### 5. 라우트 설정
- React Router v7 라우트 구성 완료
- 동적 라우트 지원 (`chat/:id`, `character/:id`)

### 다음 단계 (Phase 5~7)
- [ ] 무한 스크롤 및 성능 최적화
- [ ] 테스트 코드 작성 및 검증
- [ ] 프로덕션 배포 환경 설정

---

## Phase 2 완료 요약 (2026.01.01)

### 완료된 작업

#### 1. 데이터베이스 인프라 고도화
- Turso(libSQL) 환경에서 신규 필드(`mediaUrl`, `checkInTime` 등) 스키마 추가 및 동기화 스크립트(`scripts/sync-remote-db.mjs`) 구축
- Prisma Client를 활용한 멀티모달 메시지 저장 및 사용자 바이오 기반 장기 기억 시스템 구현

#### 2. AI 멀티모달 및 지능화 서비스
- **Gemini 2.0 Flash** 연동: 이미지 분석 지원 및 텍스트 데이터 정제 로직 적용
- **여행 컨시어지**: 페르소나 자동 전환 및 도구 호출(Tool Use)을 통한 여행 계획 자동 저장 기능 구현
- **데일리 컴패니언**: `node-cron` 기반 안부 메시지 및 웹 푸시 알림 연동 완료

#### 3. API 및 도구 지원
- `api/upload`: Cloudinary 기반 미디어 업로드 API 구축
- `api/test-cron`: 스케줄링 기능을 위한 수동 검증 엔드포인트 추가
- `api/push-subscription`: 웹 푸시 구독 관리 API 구현

---

## Phase 8: 추가 기능 및 확장 (Advanced Features)

### 8.1 AI 데일리 컴패니언 - 루틴 체크인
- [x] 사용자별 체크인 시간 설정 필드 추가 (DB)
- [x] `node-cron` 기반 선제적 메시지 스케줄러 구현 (`cron.server.ts`)
- [x] 장기 기억(Memory) 연동 개인화 안부 메시지 생성 로직 적용
- [x] 앱 구동 시 크론 잡 자동 초기화 통합 (`db.server.ts`)

### 8.2 웹 푸시 알림 통합 (Web Push)
- [x] `web-push` 라이브러리 설치 및 VAPID 키 보안 설정
- [x] 서비스 워커(`public/sw.js`) 및 푸시 수신 핸들러 구현
- [x] 클라이언트 알림 권한 요청 및 구독 자동화 (`usePushNotifications` hook)
- [x] 크론 잡 메시지 생성 시 실시간 푸시 발송 연동

### 8.3 가독성 및 대화 흐름 개선 (UX Enhancement)
- [x] 긴 AI 응답을 2~3개의 메시지 버블로 분리하는 로직 구현 (`---` 구분자 도입)
- [x] 크론 잡 및 실시간 채팅 응답 시 순차적 버블 전송 및 개별 저장 시스템 구축
- [x] 메시지 간 자연스러운 시간 간격(Delay) 시뮬레이션 적용

### 8.4 채팅방 관리 및 멀티 캐릭터 지원 (Chat Management)
- [x] 채팅 목록 화면의 'Add' (+) 버튼을 통한 새 대화방 생성 기능 구현
- [x] 캐릭터 프로필 선택 시 즉시 1:1 대화방 이동 및 신규 세션 생성 로직
- [x] 대화 삭제 기능: 메시지 DB 레코드와 함께 Cloudinary 원본 미디어 파일 완전 삭제 로직 구현
- [x] 대화 초기화(Reset) 기능: 메시지 내역 삭제 및 AI의 장기 기억(User.bio.memory) 초기화 공정

---

## Phase 9: Profile 및 Fandom 화면 기능 구현 (User Profile & Fandom Features)

### 9.1 데이터베이스 스키마 확장

#### 9.1.0 MessageLike 테이블 설계 (완료)
- [x] MessageLike 테이블 생성
  - `id`, `messageId`, `userId`, `createdAt`
  - Message와 User 테이블과의 관계 설정
  - `messageId`와 `userId`의 복합 유니크 제약 조건으로 중복 좋아요 방지
  - Turso 데이터베이스에 테이블 생성 완료 (`scripts/create-message-like-table.mjs`)

#### 9.1.1 사용자 통계 및 게임화 필드 추가
- [ ] User 테이블에 통계 필드 추가
  - `daysTogether`: 함께한 날 수 (계산 필드 또는 캐시 필드)
  - `totalHearts`: 총 보유 하트 수
  - `affinityLevel`: 친밀도 레벨 (1-100)
  - `fandomLevel`: 팬덤 레벨 (계산 필드)
  - `badges`: 획득한 배지 목록 (JSON 또는 별도 테이블)

#### 9.1.2 Mission 테이블 설계 및 마이그레이션
- [ ] Mission 테이블 생성
  - `id`, `characterId`, `title`, `description`
  - `xpReward`: 보상 XP
  - `type`: 미션 타입 (daily, weekly, achievement 등)
  - `requirements`: 미션 완료 조건 (JSON)
  - `isActive`: 활성화 여부
  - `createdAt`, `updatedAt`

#### 9.1.3 UserMission (미션 진행도) 테이블 설계
- [ ] UserMission 테이블 생성
  - `id`, `userId`, `missionId`
  - `progress`: 진행도 (0-100)
  - `completed`: 완료 여부
  - `completedAt`: 완료 시각
  - `createdAt`, `updatedAt`

#### 9.1.4 News/Event 테이블 설계
- [ ] News 테이블 생성
  - `id`, `characterId`
  - `type`: 뉴스 타입 (Event, Shop, Announcement 등)
  - `title`, `content`, `imageUrl`
  - `publishedAt`: 발행 시각
  - `isActive`: 활성화 여부
  - `linkUrl`: 상세 페이지 링크 (선택사항)

#### 9.1.5 Leaderboard 관련 테이블 설계
- [ ] LeaderboardEntry 테이블 생성 또는 User 테이블 확장
  - 사용자별 캐릭터별 포인트 저장
  - `userId`, `characterId`, `totalPoints`
  - `rank`: 랭킹 (계산 필드 또는 캐시)
  - `updatedAt`: 최종 업데이트 시각

#### 9.1.6 FanPost (팬 피드) 테이블 설계
- [ ] FanPost 테이블 생성
  - `id`, `authorId`, `characterId`
  - `content`: 피드 내용
  - `mediaUrl`: 첨부 이미지 (선택사항)
  - `category`: 피드 카테고리 (All, Art, Text 등)
  - `likesCount`, `commentsCount`
  - `createdAt`, `updatedAt`

#### 9.1.7 FanPostLike, FanPostComment 테이블 설계
- [ ] FanPostLike 테이블 생성
  - `id`, `postId`, `userId`, `createdAt`
- [ ] FanPostComment 테이블 생성
  - `id`, `postId`, `userId`, `content`
  - `createdAt`, `updatedAt`

#### 9.1.8 UserBadge (배지 시스템) 테이블 설계
- [ ] UserBadge 테이블 생성
  - `id`, `userId`, `badgeType`, `badgeName`
  - `earnedAt`: 획득 시각
  - `isDisplayed`: 프로필에 표시 여부

### 9.2 Profile 화면 기능 구현

#### 9.2.1 프로필 통계 데이터 API 구현
- [ ] `GET /api/profile/stats` API 구현
  - 함께한 날 계산 로직 (첫 대화 날짜 기준)
  - 친밀도 레벨 계산 (대화 횟수, 상호작용 등 기반)
  - 보유 하트 수 조회
  - 획득 배지 목록 조회
- [ ] Loader 함수에서 실제 데이터 연동 (`routes/profile.tsx`)
- [ ] Zod 스키마 검증

#### 9.2.2 프로필 편집 기능
- [ ] 프로필 편집 페이지 UI 구현 (`routes/profile.edit.tsx`)
  - 닉네임 변경
  - 상태메시지 변경
  - 프로필 이미지 업로드 (Cloudinary 연동)
- [ ] `PUT /api/profile` API 구현
  - 프로필 정보 업데이트
  - 이미지 업로드 처리
  - Zod 스키마 검증
- [ ] 프로필 이미지 편집 모달/페이지 구현
  - 기존 이미지 표시
  - 새 이미지 업로드
  - 크롭 기능 (선택사항)

#### 9.2.3 저장된 순간들 기능
- [x] MessageLike 테이블 생성 (사용자별 메시지 좋아요 저장)
  - `id`, `messageId`, `userId`, `createdAt`
  - `messageId`와 `userId`의 복합 유니크 제약 조건
- [x] 메시지 좋아요 기능 구현 (채팅 화면에서)
  - [x] `POST /api/messages/:id/like` API - 좋아요 추가
  - [x] `DELETE /api/messages/:id/like` API - 좋아요 제거
  - [x] 좋아요 상태 토글 기능
  - [x] MessageBubble 컴포넌트에 하트 버튼 및 상태 표시
  - [x] chat.$id.tsx loader에서 사용자별 좋아요 상태 조회
- [ ] 저장된 순간들 페이지 UI 구현 (`routes/profile.saved.tsx`)
  - 좋아요한 메시지 목록 표시
  - 좋아요한 이미지 갤러리
  - 삭제 기능
- [ ] `GET /api/profile/saved` API 구현
  - 좋아요한 메시지 조회 (MessageLike 테이블 기반)

#### 9.2.4 구독 및 결제 관리 기능
- [x] User 테이블에 `subscriptionTier` 필드 추가 (기본값: "FREE")
  - 등급: FREE, BASIC, PREMIUM, ULTIMATE
  - AI Guardrail 시스템과 연동하여 등급별 응답 차별화
- [ ] 구독 페이지 UI 구현 (`routes/profile.subscription.tsx`)
  - 현재 구독 상태 표시
  - Premium 멤버십 정보
  - 등급별 혜택 안내
  - 결제 내역 (선택사항)
  - 구독 취소 기능
- [ ] Subscription 테이블 설계 (선택사항)
  - `id`, `userId`, `planType`, `status`
  - `startDate`, `endDate`
  - `paymentMethod`, `amount`
- [ ] 등급별 기능 차별화 API 구현
  - `PUT /api/profile/subscription` - 구독 등급 변경 API

#### 9.2.5 사용자 레벨 및 배지 시스템
- [ ] 레벨 계산 로직 구현
  - 친밀도 레벨 계산 (대화 횟수, 상호작용 기반)
  - 팬덤 레벨 계산 (포인트 기반)
- [ ] 배지 획득 로직 구현
  - 특정 조건 달성 시 배지 자동 부여
  - 배지 표시/숨김 기능

### 9.3 Fandom 화면 기능 구현

#### 9.3.1 캐릭터별 데이터 로딩
- [ ] Loader 함수에서 캐릭터 ID 기반 데이터 로딩 (`routes/fandom.tsx`)
  - 선택된 캐릭터의 미션 목록
  - 캐릭터별 뉴스/이벤트 목록
  - 캐릭터별 리더보드 데이터
  - 캐릭터별 팬 피드 데이터
- [ ] 캐릭터 선택 시 데이터 갱신 로직
  - 클라이언트 상태 업데이트
  - 추가 데이터 로딩 (필요 시)

#### 9.3.2 Daily Missions 기능
- [ ] `GET /api/fandom/missions` API 구현
  - 캐릭터별 미션 목록 조회
  - 사용자의 미션 진행도 포함
- [ ] 미션 진행도 업데이트 로직
  - 사용자 액션에 따른 진행도 증가
  - 미션 완료 시 XP 지급
- [ ] 미션 완료 처리
  - `POST /api/fandom/missions/:id/complete` API
  - 완료 상태 업데이트
  - XP 보상 지급
  - Toast 알림
- [ ] "Go" 버튼 클릭 시 관련 기능으로 이동
  - 미션 타입에 따른 라우팅 (예: "Cheer 3 times" → 채팅 화면)

#### 9.3.3 Official News 기능
- [ ] `GET /api/fandom/news` API 구현
  - 캐릭터별 뉴스 목록 조회
  - 최신순 정렬
  - 페이지네이션 (선택사항)
- [ ] 뉴스 상세 페이지 구현 (`routes/fandom.news.$id.tsx`)
  - 뉴스 내용 전체 표시
  - 이미지 확대 보기
  - 공유 기능 (선택사항)
- [ ] "View All" 링크 구현
  - 전체 뉴스 목록 페이지 (`routes/fandom.news.tsx`)

#### 9.3.4 Leaderboard (Top Stans) 기능
- [ ] `GET /api/fandom/leaderboard` API 구현
  - 캐릭터별 리더보드 데이터 조회
  - 포인트 기준 정렬
  - 상위 5명 조회
- [ ] 리더보드 전체 보기 페이지 구현 (`routes/fandom.leaderboard.tsx`)
  - 전체 순위 목록
  - 사용자 자신의 순위 하이라이트
  - 페이지네이션 또는 무한 스크롤
- [ ] 포인트 계산 로직
  - 대화 횟수, 미션 완료, 좋아요 등 기반 포인트 계산
  - 실시간 또는 배치 업데이트

#### 9.3.5 Community Feed (Fan Feed) 기능
- [ ] `GET /api/fandom/feed` API 구현
  - 캐릭터별 팬 피드 조회
  - 필터링 (All, Art 등)
  - 최신순 정렬
  - 페이지네이션
- [ ] 피드 좋아요 기능
  - `POST /api/fandom/feed/:id/like` API
  - 좋아요 상태 토글
  - 좋아요 수 업데이트
- [ ] 피드 댓글 기능
  - `GET /api/fandom/feed/:id/comments` API
  - `POST /api/fandom/feed/:id/comments` API
  - 댓글 목록 표시
  - 댓글 작성 UI
- [ ] 피드 공유 기능
  - 공유 버튼 클릭 시 공유 옵션 표시
  - URL 복사 또는 소셜 공유 (선택사항)
- [ ] 새 피드 작성 기능
  - Floating Action Button 클릭 시 작성 모달/페이지
  - `POST /api/fandom/feed` API 구현
  - 이미지 업로드 (Cloudinary)
  - 카테고리 선택
  - 피드 작성 UI (`routes/fandom.feed.create.tsx` 또는 모달)

#### 9.3.6 Bias Spotlight 카드 기능
- [ ] 사용자의 선택된 캐릭터 (Bias) 정보 표시
  - User 테이블에 `selectedCharacterId` 필드 추가 또는 별도 테이블
- [ ] Affection Level 계산 로직
  - 대화 횟수, 상호작용 기반 계산
- [ ] "Enter Lounge" 버튼 기능
  - 캐릭터 프로필 화면 또는 채팅 화면으로 이동

#### 9.3.7 Shop Banner 기능
- [ ] Shop 페이지 구현 (`routes/fandom.shop.tsx`) (선택사항)
  - 캐릭터 관련 상품 목록
  - 구매 기능 (실제 결제 연동은 별도)

#### 9.3.8 알림 기능 (Fandom 전용)
- [ ] Fandom 화면 상단 알림 아이콘 기능
  - 새 뉴스/이벤트 알림
  - 미션 완료 알림
  - 리더보드 순위 변동 알림
- [ ] `GET /api/fandom/notifications` API 구현
- [ ] 알림 목록 페이지 구현 (`routes/fandom.notifications.tsx`)

### 9.4 공통 기능 및 최적화

#### 9.4.1 데이터 캐싱 전략
- [ ] 리더보드 데이터 캐싱 (자주 변하지 않는 데이터)
- [ ] 뉴스/이벤트 데이터 캐싱
- [ ] 캐시 무효화 전략 구현

#### 9.4.2 실시간 업데이트 (선택사항)
- [ ] 리더보드 실시간 업데이트 (WebSocket 또는 Polling)
- [ ] 팬 피드 실시간 업데이트
- [ ] 미션 진행도 실시간 동기화

#### 9.4.3 성능 최적화
- [ ] 이미지 지연 로딩 (Lazy Loading)
- [ ] 리스트 가상화 (긴 리스트용)
- [ ] 데이터 프리페칭 (Prefetching)

#### 9.4.4 에러 처리 및 로딩 상태
- [ ] 각 API 호출 에러 처리
- [ ] 로딩 스켈레톤 UI
- [ ] 빈 상태 (Empty State) UI

---

## Phase 10: 인터럽트 기반 실시간 대화 시스템 (Real-time Interrupt System)

### 10.1 데이터베이스 및 백엔드 고도화
- [x] **Message 테이블 스키마 확장**
  - [x] `isInterrupted` (boolean), `interruptedAt` (timestamp) 필드 추가
  - [x] Drizzle 마이그레이션 생성 및 반영
- [x] **인터럽트 전용 API 구현**
  - [x] `POST /api/chat/interrupt` - 중단된 시점의 텍스트를 저장하는 엔드포인트 구현

### 10.2 AI 엔진 및 스트리밍 처리 (Server Side)
- [x] **Gemini API 중단 연동**
  - [x] `app/lib/ai.server.ts` 내 `streamAIResponse` 함수에 `AbortSignal` 전달 및 처리
- [x] **SSE 스트리밍 중단 로직**
  - [x] `app/routes/api/chat/index.ts`에서 클라이언트의 `abort` 신호 감지 및 스트림 종료 처리

### 10.3 채팅 인터페이스 및 입력 제어 (Client Side)
- [x] **메시지 입력 비활성화 정책 변경**
  - [x] AI 답변 중에도 `MessageInput` 활성화 유지 (`app/routes/chat/$id.tsx`)
- [x] **AbortController 기반 스트리밍 제어**
  - [x] `handleSend` 시 기존 스트리밍 `abort()` 호출 및 중단 처리 로직 구현
- [x] **시각적 피드백 및 부분 저장**
  - [x] 중단된 메시지 끝에 `...` 추가 및 로컬/서버 저장 처리
- [x] **레이스 컨디션 및 예외 처리**
  - [x] 컴포넌트 언마운트 시 클린업 및 중단 중 중복 요청 방지
 및 네트워크 오류 대응

### 10.4 대화 문맥 및 기억 최적화
- [x] **중단된 메시지 문맥 보존**
  - [x] `app/lib/ai.server.ts`의 `toBaseMessage`에서 중단된 메시지의 `...` 제거 로직 구현
- [x] **장기 기억(Summary) 반영**
  - [x] 요약 생성 노드(`generateSummary`)에서 부분 답변 내용 반영 및 정제 로직 고도화

---

## 🔍 향후 검증 필요 항목 (Verification Checklist)

현재 환경에서 즉시 확인이 어려운 항목들에 대해 나중에 확인이 필요한 리스트입니다.

### 1. 멀티모달 AI (이미지 분석)
- [ ] **이미지 전송 테스트**: 채팅창에서 사진을 보냈을 때 춘심이가 사진의 내용을 정확히 언급하는지 확인.
- [ ] **이미지-텍스트 복합 메시지**: "이 옷 어때?"라고 물으며 사진을 보낼 때 춘심이가 옷에 대해 분석하는지 확인.

### 2. AI 데일리 컴패니언 (크론 잡)
- [ ] **스케줄링 작동 확인**: 사용자의 `checkInTime`을 현재 시각 1~2분 뒤로 설정하고, 해당 시간에 춘심이가 먼저 안부 메시지를 보내는지 확인.
- [ ] **장기 기억 연동**: 이전 대화에서 "내일 면접이야"라고 말한 적이 있다면, 다음 날 안부 메시지에서 면접 결과를 물어보는지 확인.

### 3. 웹 푸시 알람 (Web Push)
- [ ] **권한 요청 팝업**: 앱 재접속 시 브라우저에서 알림 권한 승인 창이 정상적으로 뜨는지 확인.
- [ ] **백그라운드 수신**: 브라우저 탭이 닫혀 있거나 백그라운드 상태일 때 알림 센터에 메시지가 도착하는지 확인.
- [ ] **알림 클릭 액션**: 도착한 푸시 알림을 클릭했을 때 `/chats` 경로로 정상 이동하는지 확인.

### 4. 테스트용 API 활용 (수동 검증)
- [ ] `POST /api/test-cron` 에 `userId`를 실어 호출하여, 즉시 안부 메시지가 생성되고 푸시가 발송되는지 최종 확인.

