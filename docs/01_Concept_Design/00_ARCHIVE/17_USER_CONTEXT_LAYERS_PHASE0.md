# 유저 컨텍스트 5계층 Phase 0 산출물
> Created: 2026-02-08
> Last Updated: 2026-02-08

구현 계획서(`user-context-layers-implementation-plan.md`) Phase 0 작업 결과를 정리한 문서이다. 5계층 구현 착수 전 사전 준비·의존성·삽입 지점을 기록한다.

---

## 0.1 DB 백업

### 실행 방법 (수동)

- **Turso 사용 시**: `turso db shell <DB_NAME> .dump > backup_$(date +%Y%m%d_%H%M%S).sql` 또는 [Turso 백업 가이드](https://docs.turso.tech/cli/backup) 참고.
- **로컬 SQLite 사용 시**: `sqlite3 <DB_PATH> .dump > backup_$(date +%Y%m%d_%H%M%S).sql`
- 백업 후 복원 테스트 권장: 빈 DB에 `sqlite3 <DB_PATH> < backup_xxx.sql` 등으로 복원 가능한지 확인.

### 완료 조건

- 백업 파일이 생성되었는지 확인.
- 필요 시 복원 절차를 한 번 수행하여 검증.

---

## 0.2 User.bio 사용처

`User.bio` 필드는 **User 테이블**의 `text("bio")` 컬럼이며, JSON 문자열로 저장된다. 사용처는 아래와 같다.

| 파일 | 용도 | 읽기/쓰기 |
|------|------|-----------|
| `app/routes/api/chat/index.ts` | 채팅 시 기억(memory) 로드. `JSON.parse(currentUser.bio)` 후 `bioData.memory`를 `memory` 문자열로 사용. 스트리밍 완료 후 `history.length >= 8`일 때 `generateSummary` 호출 후 `User.bio` 갱신 (memory, lastMemoryUpdate) | 읽기 + 쓰기 |
| `app/lib/cron.server.ts` | 프로액티브 메시지 발송 시 `user.bio` 파싱. `bioData.memory`, `bioData.personaMode` 사용 | 읽기 |
| `app/routes/api/chat/delete.ts` | 대화 삭제 시 해당 유저의 `bio`에서 `memory`, `lastMemoryUpdate` 키만 제거 후 나머지 JSON으로 다시 저장 | 읽기 + 쓰기 |

### 스키마 위치

- `app/db/schema.ts`: `user` 테이블에 `bio: text("bio")` (nullable).
- `drizzle/schema.ts`: 동일.

---

## 0.3 구독 등급 정의 위치

| 항목 | 위치 |
|------|------|
| **상수·타입** | `app/lib/subscription-plans.ts`: `SUBSCRIPTION_PLANS` (FREE, BASIC, PREMIUM, ULTIMATE), `SubscriptionPlan` 타입 |
| **DB 저장** | `app/db/schema.ts`: `user.subscriptionTier` (text, default `"FREE"`), `user.subscriptionStatus`, `user.subscriptionId` |
| **타입 (AI)** | `app/lib/ai.server.ts`: `SubscriptionTier = "FREE" \| "BASIC" \| "PREMIUM" \| "ULTIMATE"`, `GUARDRAIL_BY_TIER` |
| **정책 (크레딧)** | `app/lib/credit-policy.ts`: `canUseModel(tier, modelId)`, `getMonthlyCredits(tier)` — `SUBSCRIPTION_PLANS` 참조 |

5계층 등급별 한도(FREE 20, BASIC 50, PREMIUM 200, ULTIMATE 무제한)는 `app/lib/context/constants.ts`(Phase 2에서 생성 예정)에서 `SUBSCRIPTION_PLANS` 또는 `user.subscriptionTier`를 참조하면 된다.

---

## 0.4 LangGraph 대화 파이프라인 진입·종료

### 그래프 구조 (`app/lib/ai.server.ts`)

- **진입**: `START` → `analyze` (analyzePersonaNode)
- **노드 순서**: `analyze` → `callModel` → `summarize` → `END`
- **호출 위치**: `app/routes/api/chat/index.ts`에서 `streamAIResponse(...)` 내부에서 `generateAIResponse` → `graph.invoke(...)` 호출.

### 현재 "기억" 로드·저장 위치

- **로드**: `app/routes/api/chat/index.ts`에서 `currentUser` 조회 후 `User.bio` 파싱 → `memory` 문자열을 `streamAIResponse(..., memory, ...)`에 전달. `generateAIResponse(..., currentSummary, ...)`를 거쳐 그래프 `state.summary`로 사용됨. `analyzePersonaNode` 내부에서 `state.summary`를 "이전 대화 요약"으로 system instruction에 붙임.
- **저장**: 그래프 자체는 DB에 쓰지 않음. `summarizeNode`는 10개 이상 메시지일 때 요약 텍스트를 생성해 `state.summary`만 갱신. 실제 **User.bio 쓰기**는 `app/routes/api/chat/index.ts`의 스트리밍 완료 콜백에서 `history.length >= 8`일 때 `generateSummary(...)` 호출 후 `db.update(schema.user).set({ bio: JSON.stringify({ ...bioData, memory: newSummary, lastMemoryUpdate: ... }) })` 수행.

### 5계층 연동 시 삽입 후보

| 구분 | 삽입 위치 | 비고 |
|------|-----------|------|
| **5계층 로드** | (1) API 라우트에서 유저 조회 직후 5계층 조회 후 `state` 또는 system 인자로 전달. (2) 또는 그래프에 "loadContext" 노드를 추가해 `START` → `loadContext` → `analyze`로 변경 후, 해당 노드에서 DB 조회·압축·state 주입 | 명세 12.3 "5계층 로드 노드"와 맞추려면 (2) 선택 가능 |
| **컨텍스트 갱신** | (1) 현재와 동일하게 API 라우트 스트리밍 완료 콜백에서 5계층 갱신 함수 호출. (2) 또는 `summarize` 다음에 "updateContext" 노드 추가 후 DB 저장 | 실패 시 대화는 성공 처리하므로 (1)이 단순함. (2)는 그래프 일원화 시 유리 |

---

## 0.5 구현 계획서 리뷰 및 Phase 1 착수

- 구현 계획서: `./16_USER_CONTEXT_LAYERS_PLAN.md` 검토 완료.
- Phase 1 착수 일정은 팀/담당자 판단으로 확정.

---

## 0.6 캐릭터 목록

캐릭터 ID는 `app/lib/characters.ts`의 `CHARACTERS` 키와 동일하다.

| characterId | 이름 |
|-------------|------|
| chunsim | 춘심 |
| mina | Mina |
| yuna | Yuna |
| sora | Sora |
| rina | Rina |
| hana | Hana |

- **기본 캐릭터**: 채팅 API 기본값은 `characterId: "chunsim"` (`app/routes/api/chat/index.ts` 스키마 default).
- 마이그레이션 시 `User.bio` → 5계층 이전 시 캐릭터 미지정이면 `chunsim`을 기본으로 사용하는 것이 계획서와 일치함.

---

## 0.7 기존 메모리 포맷 (User.bio)

### 저장 형식

`User.bio`는 **JSON 문자열**이다. 현재 코드에서 사용·기록되는 키는 아래와 같다.

| 키 | 타입 | 용도 |
|----|------|------|
| memory | string | 대화 요약(기억). 채팅 시 system에 "이전 대화 요약"으로 주입. 8턴 이상 시 `generateSummary` 결과로 갱신됨 |
| lastMemoryUpdate | string | ISO 날짜. 마지막 요약 갱신 시각 (갱신 시에만 기록) |
| personaMode | (선택) | cron에서 프로액티브 메시지 생성 시 사용. 채팅 API에서는 conversation.personaMode 사용 |

### 쓰기 예시 (api/chat/index.ts)

```json
{
  "memory": "유저가 좋아하는 음식은 피자. 최근 회사에서 스트레스를 받고 있음...",
  "lastMemoryUpdate": "2026-02-05T12:00:00.000Z"
}
```

기존에 다른 키가 있으면 `db.update` 시 `...bioData`로 유지되므로, 마이그레이션 시 `bio`에서 `memory`만 추출해 `UserMemoryItem`으로 넣고, `lastMemoryUpdate`는 heartbeat 또는 별도 필드로 옮길지 결정하면 된다.

### 파싱 규칙

- `JSON.parse(currentUser.bio)` 사용. 파싱 실패 시 `try/catch`로 빈 객체 또는 기존 memory 빈 문자열로 fallback.
- 삭제 시(`api/chat/delete.ts`): `bioData`에서 `memory`, `lastMemoryUpdate`만 제거 후 `JSON.stringify(bioData)`로 저장.

---

## Phase 0 완료 체크리스트

- [ ] 0.1 DB 전체 덤프 수행 및 복원 가능 여부 확인
- [ ] 0.2 User.bio 사용처 문서화 (본 문서 반영 완료)
- [ ] 0.3 구독 등급 정의 위치 확인 (본 문서 반영 완료)
- [ ] 0.4 LangGraph 진입·종료 및 5계층 삽입 후보 파악 (본 문서 반영 완료)
- [ ] 0.5 Phase 1 착수 일정 확정
- [ ] 0.6 캐릭터 목록·기본 캐릭터 ID 확정 (본 문서 반영 완료)
- [ ] 0.7 User.bio 저장 형식·파싱 규칙 문서화 (본 문서 반영 완료)

이 문서는 Phase 0 산출물을 모은 것이며, Phase 1 이후 구현 시 참조한다.


## Related Documents
- **Foundation**: [Document Management Plan](./09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
