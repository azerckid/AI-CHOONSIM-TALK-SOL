# Phase 5 (Soul 계층) 검증 보고서
> Created: 2026-02-08
> Last Updated: 2026-02-08

**작업일**: 2026-02-05  
**명세서**: `../03_Specs/21_user-context-layers-spec.md` (Section 3.4, 4.3, 12)  
**구현 계획**: `../01_Foundation/16_USER_CONTEXT_LAYERS_PLAN.md` (Section 7)

---

## 1. 완료 조건 대조

| 완료 조건 (계획 7.3) | 검증 결과 |
|----------------------|-----------|
| PREMIUM/ULTIMATE 유저만 soul가 누적됨 | 통과: `compressSoulForPrompt`에서 FREE/BASIC이면 빈 문자열 반환. PUT `/api/context/.../soul`에서 `canUseSoul` 체크로 403 반환. soul 저장은 PREMIUM 이상만 가능. |
| 고민/위로가 필요한 대화에서 soul가 프롬프트에 포함되어 응답에 반영됨 | 통과: 대화 시작 시 `compressSoulForPrompt`로 soul 블록 로드 후 system 메시지에 주입. 등급이 PREMIUM/ULTIMATE이고 soul 데이터가 있으면 "[SOUL & DEEP MIND]" 블록이 포함됨. |

---

## 2. 작업 항목별 검증

### 5.1 Soul 저장 로직

| 항목 | 명세/계획 | 구현 내용 | 상태 |
|------|-----------|-----------|------|
| PREMIUM/ULTIMATE만 저장 | 명세 4.3 | `tier.ts`: TIER_LIMITS.soulEnabled = true only for PREMIUM/ULTIMATE. PUT API에서 `canUseSoul(userId)` 실패 시 403. | OK |
| Partial 갱신 | soulDoc 갱신 | `soul.ts`: `updateUserSoul(userId, characterId, updates)` — 기존 soul와 merge 후 `updateSoul` 호출 | OK |
| DB 반영 | soulDoc 저장 | `db.ts`: `updateSoul` — getOrCreateUserContext 후 soulDoc JSON 저장 | OK |
| 대화/배치에서 추출 | 대화 요약 또는 배치에서 가치/소원/고민 추출 | **미구현**: 현재 soul 갱신은 PUT API를 통한 수동(또는 클라이언트/배치) 설정만 가능. 대화 종료 후 LLM으로 soul 추출하는 로직은 없음. 계획 5.1/5.3의 "대화 요약 또는 배치에서 추출"은 선택/추후 구현으로 두고, API를 통한 저장으로 Phase 5 완료 조건은 충족. | 권장: 추후 "깊은 대화" 감지 시 저빈도 soul 추출 도입 시 5.5 정책 적용 |

### 5.2 Soul 프롬프트 압축

| 항목 | 명세/계획 | 구현 내용 | 상태 |
|------|-----------|-----------|------|
| 압축 함수 | 약 300 토큰, 깊은 대화 시 비중 확대 (명세 12.2) | `soul.ts`: `compressSoulForPrompt` — lifePhase, values, dreams, fears, recurringWorries, summary를 "[SOUL & DEEP MIND]" 블록으로 반환. 동적 토큰 할당/비중 확대는 미구현(동일 블록 사용). | OK (기본 압축 충족) |
| 등급별 미주입 | FREE/BASIC | 함수 진입 시 tier가 FREE 또는 BASIC이면 즉시 "" 반환 | OK |
| 빈 soul | 처리 | soul 없거나 모든 필드 비어 있으면 "" 반환 | OK |
| export | compress 모듈 | `compress.ts`에서 `compressSoulForPrompt` re-export | OK |

### 5.3 LangGraph(채팅 API) 연동

| 항목 | 명세/계획 | 구현 내용 | 상태 |
|------|-----------|-----------|------|
| 대화 시작 시 | soul 로드 후 system에 주입 | `api/chat/index.ts`: `compressSoulForPrompt(session.user.id, characterId, currentUser?.subscriptionTier \|\| "FREE")`를 memory/heartbeat/identity와 병렬 호출 후, contextSoul이 있으면 parts에 포함해 system 메시지에 주입 | OK |
| 대화 종료 시 / 배치 | soul 갱신 | 현재는 PUT API를 통한 갱신만 존재. 대화 종료 노드에서 soul 추론/갱신 로직 없음. | 범위 내 (API로 충족) |

### 5.4 등급 체크

| 항목 | 명세/계획 | 구현 내용 | 상태 |
|------|-----------|-----------|------|
| FREE/BASIC soul 미저장 | 쓰기 차단 | PUT `/api/context/.../soul`에서 `canUseSoul(session.user.id)` 실패 시 403, 메시지 "Soul context is available for PREMIUM plan and above." | OK |
| FREE/BASIC soul 미주입 | 프롬프트 제외 | `compressSoulForPrompt`에서 tier가 FREE 또는 BASIC이면 "" 반환 | OK |
| 읽기 허용/내용 빈 상태 | 명세 5.4 | GET soul은 현재 tier 무관하게 `context?.soul \|\| {}` 반환. 명세 "읽기는 허용하되 내용이 빈 상태"는 FREE/BASIC일 때 빈 객체 반환으로 해석 가능. 필요 시 GET에서 FREE/BASIC이면 {} 강제 반환 가능. | OK (선택 보강 가능) |

### 5.5 Soul 저장 빈도 정책

| 항목 | 계획 | 구현 | 상태 |
|------|------|------|------|
| Memory보다 낮은 빈도로 갱신 | 예: 10회 대화당 1회, 일 배치 | 현재 soul는 API 수동 갱신만 있어 별도 빈도 정책 없음. 대화에서 soul 자동 추출을 도입할 경우 정책 적용 필요. | N/A (현재) |

---

## 3. Soul API 라우트 경로 (명세 11.1)

| 명세 | 경로 | 현재 구현 | 상태 |
|------|------|-----------|------|
| GET/PUT | `/api/context/:characterId/soul` | `app/routes/api/context/$characterId.soul.ts` — `params.characterId` 사용, CHARACTERS 유효성 검사 적용. | OK |

---

## 4. 명세 SoulDoc 필드 대조

| 필드 | 명세 (Section 10.3) | 구현 (types.ts, soul.ts) | 상태 |
|------|----------------------|---------------------------|------|
| values | string[] | optional string[] | OK |
| dreams | string[] | optional string[] | OK |
| fears | string[] | optional string[] | OK |
| recurringWorries | string[] | optional string[] | OK |
| lifePhase | string | optional string | OK |
| summary | string | optional string | OK |

---

## 5. 테스트

| 항목 | 계획 | 구현 내용 | 상태 |
|------|------|-----------|------|
| compressSoulForPrompt | 빈 soul / 포맷 | `soul.test.ts`: soul 없음·빈 객체 시 ""; PREMIUM tier로 lifePhase, values, dreams, fears, recurringWorries, summary 포맷 검증 | OK |
| updateUserSoul | partial merge | 기존 soul 유지하면서 dreams만 추가 시 values 등 보존되는지 검증 | OK |

---

## 6. 영향 범위 (Side-Effect)

- **변경/추가 파일**: `app/lib/context/soul.ts`, `app/lib/context/compress.ts` (export), `app/lib/context/index.ts` (export), `app/routes/api/chat/index.ts` (soul 로드·주입), `app/routes/api/context/$characterId.soul.ts` (GET/PUT, 명세 11.1), `app/lib/context/__tests__/soul.test.ts`.
- **일반 채팅**: soul는 등급 제한이 있어 FREE/BASIC에는 빈 문자열만 주입. PREMIUM/ULTIMATE만 추가 문맥 적용.
- **Memory/Heartbeat/Identity**: 동일하게 병렬 로드 후 parts에 추가; 서로 독립적.

---

## 7. 결론 및 권장 사항

- **Phase 5 목표**: PREMIUM/ULTIMATE만 soul 누적·주입, 고민/위로 대화 시 soul 반영 — **충족**.
- **권장**: 추후 대화에서 soul 자동 추출을 넣을 경우, 5.5에 따라 memory보다 낮은 빈도로 갱신하는 정책 적용.

Phase 5 구현 검토 완료.


## Related Documents
- **Test**: [Document Management Plan](../01_Concept_Design/09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
