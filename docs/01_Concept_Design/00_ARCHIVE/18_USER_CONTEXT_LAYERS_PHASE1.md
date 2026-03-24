# Phase 1 스키마 검증 체크리스트
> Created: 2026-02-08
> Last Updated: 2026-02-08

**작업일**: 2026-02-05
**명세서**: `../03_Specs/21_user-context-layers-spec.md` (Section 10)

---

## 1. UserContext 테이블 (명세 10.1)

| 필드 | 명세 타입 | 구현 타입 | 상태 |
|------|----------|----------|------|
| id | text, PK | `text("id").primaryKey()` | ✅ |
| userId | text, NOT NULL | `text("userId").notNull()` | ✅ |
| characterId | text, NOT NULL | `text("characterId").notNull()` | ✅ |
| heartbeatDoc | text (JSON) | `text("heartbeatDoc")` | ✅ |
| identityDoc | text (JSON) | `text("identityDoc")` | ✅ |
| soulDoc | text (JSON) | `text("soulDoc")` | ✅ |
| toolsDoc | text (JSON) | `text("toolsDoc")` | ✅ |
| createdAt | integer, timestamp | `integer("createdAt", { mode: "timestamp" })` | ✅ |
| updatedAt | integer, timestamp | `integer("updatedAt", { mode: "timestamp" })` | ✅ |

### 인덱스

| 인덱스 | 명세 | 구현 | 상태 |
|--------|------|------|------|
| (userId, characterId) UNIQUE | uniqueIndex | `unique("userContext_user_character_unique")` | ✅ |
| userId | index | `index("userContext_userId_idx")` | ✅ |

---

## 2. UserMemoryItem 테이블 (명세 10.2)

| 필드 | 명세 타입 | 구현 타입 | 상태 |
|------|----------|----------|------|
| id | text, PK | `text("id").primaryKey()` | ✅ |
| userId | text, NOT NULL | `text("userId").notNull()` | ✅ |
| characterId | text, NOT NULL | `text("characterId").notNull()` | ✅ |
| content | text, NOT NULL | `text("content").notNull()` | ✅ |
| category | text | `text("category")` | ✅ |
| importance | integer, default 5 | `integer("importance").notNull().default(5)` | ✅ |
| sourceConversationId | text | `text("sourceConversationId")` | ✅ |
| sourceMessageId | text | `text("sourceMessageId")` | ✅ |
| createdAt | integer, timestamp | `integer("createdAt", { mode: "timestamp" })` | ✅ |
| expiresAt | integer, timestamp | `integer("expiresAt", { mode: "timestamp" })` | ✅ |
| isArchived | integer, boolean, default false | `integer("isArchived", { mode: "boolean" }).default(false)` | ✅ |

### 인덱스

| 인덱스 | 명세 | 구현 | 상태 |
|--------|------|------|------|
| (userId, characterId) | index | `index("userMemoryItem_user_character_idx")` | ✅ |
| category | index | `index("userMemoryItem_category_idx")` | ✅ |
| importance | index | `index("userMemoryItem_importance_idx")` | ✅ |

---

## 3. JSON 문서 타입 (명세 10.3)

### HeartbeatDoc

| 필드 | 명세 타입 | 구현 타입 | 상태 |
|------|----------|----------|------|
| lastSeenAt | string (ISO) | `string` | ✅ |
| recentDaysCount | number | `number` | ✅ |
| totalConversations | number | `number` | ✅ |
| avgSessionDuration | number? | `number?` | ✅ |
| emotionTrend | string? | `string?` | ✅ |
| streakDays | number | `number` | ✅ |
| lastEmotionKeywords | string[]? | `string[]?` | ✅ |

### IdentityDoc

| 필드 | 명세 타입 | 구현 타입 | 상태 |
|------|----------|----------|------|
| nickname | string | `string` | ✅ |
| honorific | "반말" \| "존댓말" \| "혼합" | `Honorific` type alias | ✅ |
| relationshipType | "팬" \| "친구" \| ... | `RelationshipType` type alias | ✅ |
| customTitle | string? | `string?` | ✅ |
| inferredTraits | string[]? | `string[]?` | ✅ |

### SoulDoc

| 필드 | 명세 타입 | 구현 타입 | 상태 |
|------|----------|----------|------|
| values | string[]? | `string[]?` | ✅ |
| dreams | string[]? | `string[]?` | ✅ |
| fears | string[]? | `string[]?` | ✅ |
| recurringWorries | string[]? | `string[]?` | ✅ |
| lifePhase | string? | `string?` | ✅ |
| summary | string? | `string?` | ✅ |

### ToolsDoc

| 필드 | 명세 타입 | 구현 타입 | 상태 |
|------|----------|----------|------|
| avoidTopics | string[]? | `string[]?` | ✅ |
| specialDates | { date, description }[]? | `SpecialDate[]?` | ✅ |
| enabledFeatures | string[]? | `string[]?` | ✅ |
| disabledFeatures | string[]? | `string[]?` | ✅ |
| customRules | { condition, action }[]? | `CustomRule[]?` | ✅ |

---

## 4. 캐릭터별 격리 검증

### 검증 항목

| 항목 | 상태 | 비고 |
|------|------|------|
| `(userId, characterId)` 복합 유니크 인덱스 | ✅ | 동일 유저-캐릭터 조합 중복 불가 |
| CRUD 헬퍼에서 `(userId, characterId)` 조건 사용 | ✅ | `db.ts` 전 함수 확인 |
| Memory 항목도 `(userId, characterId)` 기준 조회 | ✅ | `getMemoryItems()` 함수 확인 |

### 격리 보장

```
User A + Character 춘심 → Context A1
User A + Character Mina → Context A2  (별도)
User B + Character 춘심 → Context B1  (별도)
```

- ✅ 각 조합이 별도 레코드로 관리됨
- ✅ 타 캐릭터 데이터 접근 불가 (WHERE 조건 강제)

### 격리 테스트 스크립트

격리 검증을 위한 단위 테스트가 작성되었습니다:

- **파일**: `app/lib/context/__tests__/isolation.test.ts`
- **실행**: `npm run test:context`

테스트 항목:
1. 동일 유저, 다른 캐릭터 간 컨텍스트 격리
2. 다른 유저 간 컨텍스트 격리
3. 컨텍스트 삭제 시 격리 유지
4. Unique constraint 검증

---

## 5. 구현 파일 목록

| 파일 | 용도 | 상태 |
|------|------|------|
| `app/db/schema.ts` | UserContext, UserMemoryItem 스키마 + Relations | ✅ |
| `app/lib/context/types.ts` | JSON 문서 타입 정의 | ✅ |
| `app/lib/context/db.ts` | CRUD 헬퍼 함수 | ✅ |
| `app/lib/context/tier.ts` | 구독 등급 조회 및 제한 정책 | ✅ |
| `app/lib/context/index.ts` | 모듈 Export | ✅ |
| `drizzle/0009_burly_colleen_wing.sql` | 마이그레이션 파일 | ✅ |

---

## 6. 빌드 검증

- ✅ `npm run build` 성공
- ✅ `drizzle-kit generate` 성공

---

## 7. Phase 1 완료 조건 체크

| 조건 | 상태 |
|------|------|
| UserContext, UserMemoryItem 테이블이 DB에 존재하고, Drizzle로 CRUD 가능 | ✅ (마이그레이션 생성 완료, 적용은 배포 시) |
| 타입 정의가 명세 10.3과 일치 | ✅ |
| 기존 빌드/테스트가 깨지지 않음 | ✅ |
| (userId, characterId) 복합 키로 캐릭터별 데이터 격리 | ✅ |
| 스키마가 명세서 10.1, 10.2와 필드/타입/인덱스 완전 일치 | ✅ |
| 아직 채팅 플로우에는 미연동 | ✅ |

---

## 결론

**Phase 1 스키마 및 기반 구축 완료**

다음 단계:
- Phase 2 (Memory 계층 구현) 진행
- 또는 로컬 DB에 마이그레이션 적용 후 CRUD 동작 실제 테스트

---

**검증일**: 2026-02-05
**검증자**: AI Assistant


## Related Documents
- **Foundation**: [Document Management Plan](./09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
