# 📄 Vercel AI SDK 도입 분석 및 전략 보고서
> Created: 2026-02-08
> Last Updated: 2026-02-11

## 1. 개요
현재 '춘심(CHOONSIM)' 프로젝트의 AI 채팅 서비스 고도화를 위해 **Vercel AI SDK** 도입을 검토한 결과와 향후 실행 전략을 정리한 문서입니다.

### 🔗 참고 자료 (Reference)
- **공식 홈페이지**: [https://sdk.vercel.ai/](https://sdk.vercel.ai/)
- **시작하기 가이드**: [https://ai-sdk.dev/getting-started](https://ai-sdk.dev/getting-started)
- **GitHub 저장소**: [https://github.com/vercel/ai](https://github.com/vercel/ai)
- **요금제 안내**: [https://vercel.com/pricing](https://vercel.com/pricing)

## 2. 현재 시스템 분석 (`AS-IS`)
- **라이브러리**: `LangChain`, `@langchain/google-genai`, `LangGraph` 기반.
- **스트리밍 방식**: `ReadableStream`과 `TextEncoder`를 이용한 수동 SSE(Server-Sent Events) 구현.
- **UI 연동**: API 응답을 수동으로 파싱하고, 클라이언트에서 `fetch`와 `EventSource` 스타일로 데이터를 처리.
- **페르소나 제어**: `[EMOTION:XXX]`, `[PHOTO:0]` 등 텍스트 기반 마커를 정규표현식으로 수동 추출.
- **타이핑 효과**: 서버나 클라이언트에서 `setTimeout` 등을 이용해 인위적인 지연 시간을 발생시켜 구현.

## 3. Vercel AI SDK 도입 이점 (`TO-BE`)
### 3.1. 개발 생산성 및 코드 최적화
- **내장 스트리밍**: `streamText` 함수를 통해 표준화된 스트리밍 응답을 생성하여 복잡한 `enqueue` 로직을 제거.
- **UI Hooks**: `useChat`을 활용해 메시지 히스토리 관리, 로딩 상태, 자동 스크롤 등을 코드 몇 줄로 구현 가능.

### 3.2. 멀티 프로바이더 확장성
- **모델 교체 용이성**: API 인터페이스가 표준화되어 있어 Gemini에서 GPT-4, Claude 등으로 모델을 변경할 때 서비스 로직 수정이 거의 없음.

### 3.3. 정교한 구조적 데이터 처리
- **Zod 기반 파싱**: `generateObject` 혹은 기능을 통해 답변 텍스트와 함께 감정 상태나 이미지 요청 여부를 객체(Object) 형태로 정확하게 반환받아 파싱 오류 최소화.

## 4. 단계별 도입 로드맵 (Roadmap)

### Phase 1: 기술 검증 및 환경 구축 (완료)
- [x] `ai`, `@ai-sdk/google` 라이브러리 설치.
- [x] `app/lib/ai-v2.server.ts` 프로토타입 생성 (기존 `ai.server.ts`와 병행).

### Phase 2: 핵심 API 전환 (완료)
- [x] `app/routes/api/chat/index.ts`에 Vercel AI SDK 호환 레이어 구축 (`USE_VERCEL_AI_SDK=true` 시 `streamAIResponseV2` 사용).
- [x] `buildStreamSystemInstruction` 추출, `streamText`와 결합.

### Phase 3: 클라이언트 UX 개선 (완료)
- [x] 수동 타이핑 지연 로직 제거 (문자 단위 setTimeout 제거, 즉시 스트리밍).
- [ ] (선택) `useChat` 훅 적용 - 추후 클라이언트 전면 전환 시 검토.

---
**작성일**: 2026-01-14
**작성자**: Antigravity (AI Assistant)


## Related Documents
- **Foundation**: [Document Management Plan](./09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
