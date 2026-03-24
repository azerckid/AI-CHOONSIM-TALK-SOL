# 5계층 컨텍스트 연동 요약 (Phase 10)
> Created: 2026-02-08
> Last Updated: 2026-02-08

유저 컨텍스트 5계층이 채팅 API 및 토큰 예산과 어떻게 연동되는지 요약한다. 상세 명세는 `user-context-layers-spec.md` 참조.

---

## 1. 5계층 주입 위치

채팅은 **LangGraph 노드가 아닌** 단일 API 라우트(`app/routes/api/chat/index.ts`)에서 다음 순서로 처리된다.

| 시점 | 처리 내용 | 코드 위치 |
|------|-----------|-----------|
| **대화 시작 시** | 1) `getFullContextData`로 컨텍스트 조회 → 2) 대화 유형 분류 → 3) 동적 토큰 예산 적용 → 4) 계층별 compress 호출 → 5) 조합 문자열을 system 메시지에 주입 | `api/chat/index.ts` Phase 10 블록, 그 다음 `streamAIResponse` 호출 전 |
| **대화 종료 시** | 1) memory: `extractAndSaveMemoriesFromConversation` 2) heartbeat: `updateHeartbeatContext(..., true)` | 동일 파일, 스트리밍 완료 후 `Promise.all` 내부 |

- **5계층 로드**: 한 번에 5계층 로드 → 예산에 맞게 압축 → system 주입. (명세 12.3 다이어그램의 "5계층 로드 노드"에 해당하는 로직이 채팅 라우트 내에 구현됨.)
- **컨텍스트 갱신**: 스트리밍이 끝난 뒤 memory 추출·저장과 heartbeat 종료 갱신을 수행. **실패 시 대화는 성공으로 두고 로그만 남김** (`logger.error`, 예외는 스트림/응답에 반영하지 않음).

---

## 2. 토큰 예산 정책

- **모듈**: `app/lib/context/token-budget.ts` (계층별 상한·동적 할당), `app/lib/context/conversation-classifier.ts` (대화 유형 분류).
- **기본 상한** (명세 12.1): memory 500, heartbeat 100, identity 100, soul 300, tools 100 (총 1,100 토큰).
- **동적 할당** (명세 12.2): 대화 유형에 따라 비중 조절.
  - **첫 대화**: identity·heartbeat 비중 증가.
  - **깊은 대화**: soul 비중 증가.
  - **일상 대화**: memory 비중 증가.
  - **특별한 날**: tools 비중 증가 (specialDates 우선).
- **적용**: 채팅 요청 시 `classifyConversation` → `getLayerBudgets(type)` → 각 `compress*`에 해당 계층 예산 전달. 압축 함수는 `truncateToTokenLimit` 등으로 예산을 준수한다.

---

## 3. 대화 유형 분류

- **입력**: 현재 대화 메시지 수, 오늘 특별한 날 여부(tools.specialDates), 최근 메시지 텍스트(선택).
- **규칙**: 첫 대화(메시지 0~1) → 특별한 날 → 깊은 대화(고민/상담 키워드) → 일상. `app/lib/context/conversation-classifier.ts` 참조.

---

## 4. 참조

- 명세: `./21_user-context-layers-spec.md` (Section 12)
- 구현 계획: `../01_Foundation/16_USER_CONTEXT_LAYERS_PLAN.md` (Section 12, Phase 10)
- LangGraph·Gemini 연동: `./20_interrupt-strategy.md` 등과 함께 참고.

---

**작성일**: 2026-02-05


## Related Documents
- **Specs**: [Document Management Plan](../01_Concept_Design/09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
