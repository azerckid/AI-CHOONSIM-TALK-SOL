# USER_CONTEXT_LAYERS_SPEC: 유저별 대화 컨텍스트 5계층 설계
> Created: 2026-02-08
> Last Updated: 2026-02-08

본 문서는 춘심 대화 품질 업그레이드를 위해 **유저별로 유지하는 5가지 컨텍스트 계층**(memory, heartbeat, identity, soul, tools)의 개념, 역할, 저장 전략, 그리고 구현 방향을 정의합니다.

---

## 1. 개요

### 1.1 목적

- 유저와 춘심 간의 관계를 "일회성 대화"가 아닌 **지속적 관계**로 다루기 위한 메타 데이터 체계를 정의한다.
- 각 유저에 대해 "무엇을 기억하고, 어떤 리듬으로 접촉하며, 누구로 인식하고, 어떤 가치를 존중하며, 어떤 규칙으로 응답할지"를 구조화하여, 시스템 프롬프트 및 LangGraph 등에 안정적으로 주입할 수 있게 한다.

### 1.2 적용 범위

- **대상**: 춘심(및 향후 확장 시 다른 캐릭터)과 1:1 대화를 하는 로그인 유저.
- **영향**: AI 응답 생성 시 컨텍스트 보강, 개인화 톤/호칭, 기억 기반 언급, 관계 리듬 반영.

### 1.3 문서 계층

이 문서는 `docs/03_Specs/` 하위의 기능 명세에 해당하며, 채팅·AI 파이프라인과 연동되는 설계이다.

---

## 2. 5계층 정의

유저별 컨텍스트를 다음 5가지 "문서 개념"으로 나눈다. 실제 저장은 DB로 하며, 필요 시 .md 형태로 export하거나 에이전트가 문서처럼 읽어가도록 할 수 있다.

| 계층 | 개념 파일명 | 역할 | 갱신 주기 |
|------|-------------|------|------------|
| 1 | memory | 대화·이벤트에서 추출한 기억(선호, 언급한 일, 중요한 날 등) | 대화 단위 또는 배치 |
| 2 | heartbeat | 관계의 리듬(최근 대화 빈도, 마지막 접속, 요약된 감정/상태) | 접속·대화 시 또는 일 단위 |
| 3 | identity | 유저에 대한 춘심의 이해(닉네임, 관계 정의, 말투/호칭 선호) | 설정 변경 또는 대화에서 추론 시 |
| 4 | soul | 가치관, 소원, 두려움, 장기 목표 등 깊은 정체성 | 대화 요약·배치 시 |
| 5 | tools | 해당 유저에 대한 행동 규칙(피할 주제, 특별 대우, 사용 기능 등) | 설정·관리자 또는 유저 설정 시 |

### 2.1 캐릭터별 컨텍스트 격리

프로젝트에는 춘심 외에도 소라, 유나, 미나 등 다중 캐릭터가 존재한다. 따라서 5계층 컨텍스트는 **캐릭터별로 분리**하여 관리한다.

- **격리 원칙**: 유저는 캐릭터마다 별도의 5계층 컨텍스트를 가진다.
- **예시**: 유저 A가 춘심에게는 "오빠"로 불리고, 소라에게는 "선배"로 불릴 수 있음.
- **스키마**: `(user_id, character_id)` 복합키를 사용하여 캐릭터별 컨텍스트 분리.
- **공유 가능 데이터**: heartbeat의 일부 통계(총 접속일 등)는 유저 레벨에서 공유할 수 있으나, memory/identity/soul/tools는 캐릭터별로 완전 분리한다.

---

## 3. 계층별 상세

### 3.1 memory (기억)

- **역할**: 유저가 말한 내용 중 "기억할 만한 것"을 구조화하여 보관. 선호(음식, 취미), 언급한 인물·사건, 중요한 날, 반복적으로 말한 고민 등.
- **사용처**: 프롬프트에 "춘심이 이 유저에 대해 아는 것"으로 주입하여, "전에 말했던 그거 맞아" 수준의 연속성 제공.
- **데이터 특성**: 시간순 또는 주제별 항목 리스트; 각 항목에 요약 문장, 추출 시점(또는 대화 ID), 신뢰도/중요도 등 메타를 둘 수 있음.

### 3.2 heartbeat (심박/리듬)

- **역할**: "이 유저와의 관계가 어떤 리듬인지"를 표현. 예: 최근 7일 대화 횟수, 마지막 대화 시각, 요약된 감정 추이(예: "요즘 피곤하다고 자주 말함").
- **사용처**: "오랜만이야" vs "매일 와줘서 고마워" 같은 맥락 제공. 짧은 휴식 후 복귀 시 위로 메시지 등에 활용.
- **데이터 특성**: 집계 수치(빈도, 마지막 접속) + 짧은 텍스트 요약(선택). 시계열 구간별 통계를 저장할 수 있음.

### 3.3 identity (정체성)

- **역할**: 춘심이 "이 유저를 누구로 부르고, 어떤 관계로 대하는지"에 대한 정의. 닉네임, 호칭 선호(반말/존댓말), 관계 정의(친구/연인/팬 등).
- **사용처**: 톤과 호칭의 일관성, 관계 설정에 따른 말투 조절.
- **데이터 특성**: 키-값 또는 구조화된 필드(닉네임, 호칭_선호, 관계_유형 등). 유저가 설정한 값과 대화에서 추론한 값을 구분해 둘 수 있음.

### 3.4 soul (영혼)

- **역할**: 유저의 가치관, 소원, 두려움, 장기 목표, 반복되는 고민 등 "깊은 레이어" 정보.
- **사용처**: 깊은 위로, 조언, 장기 관계를 의식한 말하기. memory보다 더 추상적·가치 지향적.
- **데이터 특성**: 요약 문단 또는 구조화된 태그/문장 집합. 갱신 빈도는 memory보다 낮게 가져갈 수 있음.

### 3.5 tools (도구/규칙)

- **역할**: 이 유저에 한정된 "행동 규칙". 피할 주제, 특별히 챙길 이벤트(생일 등), 사용할/사용하지 말 기능 등.
- **사용처**: 시스템/에이전트가 주제 회피, 이벤트 언급, 기능 온/오프를 결정할 때 참고.
- **데이터 특성**: 규칙 리스트(조건 + 동작). 관리자/유저 설정 또는 정책에 의해 갱신.

---

## 4. 추천 저장 전략: DB 우선

### 4.1 원칙

- **물리 .md 파일을 기본 저장소로 두지 않는다.** 대신 **동일한 5가지 개념을 DB에 저장**하고, 필요 시 .md로 export하거나 에이전트가 "문서" 형태로 읽어가도록 한다.
- 이유: 이미 메시지·세션 등이 Turso(Drizzle)에 있으므로, 일관된 트랜잭션·백업·다중 인스턴스 환경에서의 동기화를 DB가 담당하는 것이 안전하다.

### 4.2 스키마 방향 (개념)

- **옵션 A – 유저별 단일 테이블 + JSON**
  - 예: `user_context` 테이블에 `user_id`, `memory_doc`, `heartbeat_doc`, `identity_doc`, `soul_doc`, `tools_doc` (TEXT/JSON), `updated_at` 등.
  - 장점: 스키마 단순, 5계층을 한 레코드로 조회. 단점: 계층별 갱신 시 전체 row 터치, 버전/이력 관리가 별도 필요.

- **옵션 B – 계층별 테이블**
  - 예: `user_memory`, `user_heartbeat`, `user_identity`, `user_soul`, `user_tools` (각각 user_id + 내용 + 메타).
  - 장점: 계층별 독립 갱신, 이력/버전 관리 용이. 단점: 조회 시 5테이블 조인 또는 5쿼리.

- **옵션 C – 하이브리드**
  - 자주 바뀌고 항목이 많은 memory는 별도 테이블(`user_memory_items`), 나머지 4계층은 `user_context` 한 row의 JSON 컬럼으로.
  - 균형 잡힌 선택으로, 초기에는 옵션 A로 시작한 뒤 memory가 무거워지면 C로 이전하는 것도 가능.

실제 마이그레이션·스키마 변경 시에는 [CRITICAL: DATABASE INTEGRITY RULE]에 따라 **반드시 백업 후** 적용한다.

### 4.3 구독 등급별 컨텍스트 정책

구독 등급(FREE, BASIC, PREMIUM, ULTIMATE)에 따라 컨텍스트 저장 용량과 기능을 차등 적용한다.

| 등급 | memory 항목 수 | soul 저장 | heartbeat 상세도 | 비고 |
|------|---------------|-----------|-----------------|------|
| FREE | 최대 20개 | 미지원 | 기본 (last_seen만) | 광고 포함 |
| BASIC | 최대 50개 | 미지원 | 기본 | - |
| PREMIUM | 최대 200개 | 지원 | 상세 (감정 추이 포함) | 깊은 개인화 |
| ULTIMATE | 무제한 | 지원 | 상세 + 분석 리포트 | 컨시어지 서비스 |

- **용량 초과 시 정책**: memory 항목이 한도를 초과하면 중요도가 낮고 오래된 항목부터 자동 삭제(또는 아카이브).
- **등급 다운그레이드 시**: 기존 데이터는 유지하되 조회만 가능, 새 항목 추가 불가.

### 4.4 .md export (선택)

- 운영/디버깅 목적으로 "이 유저의 현재 5계층 상태"를 사람이 읽기 좋게 보고 싶을 때, DB 내용을 읽어 `memory.md`, `heartbeat.md`, … 형식으로 파일 또는 API 응답으로 내려주는 기능을 둘 수 있다.
- 에이전트가 파일 시스템의 .md를 직접 읽는 방식은, 단일 인스턴스·개발 환경에서만 보조적으로 사용하고, 프로덕션 데이터 소스는 DB로 유지하는 것을 권장한다.

---

## 5. 갱신 전략

- **memory**: 대화 종료 시 또는 N회 메시지마다, 최근 대화를 LLM으로 요약·추출하여 항목 추가/갱신. 기존 메시지 테이블은 그대로 두고, "기억"만 별도 저장.
- **heartbeat**: 매 접속/대화 시 카운트·last_seen 갱신; 일 단위 배치에서 "최근 7일 요약" 등 텍스트 필드를 생성할 수 있음.
- **identity**: 유저가 프로필/설정에서 닉네임·호칭을 바꾸면 즉시 반영; 대화에서 추론한 identity는 배치 또는 대화 후 처리에서 갱신.
- **soul**: 대화 요약·주기적 배치에서 "가치관/소원/고민" 추출. memory보다 갱신 주기 길게.
- **tools**: 유저 설정 또는 관리자/정책 변경 시에만 갱신.

LangGraph 파이프라인에서는 "대화 후 노드"에서 memory/heartbeat(및 필요 시 identity/soul) 갱신을 호출하고, "대화 시작 시" 노드에서 5계층을 읽어 system/state에 넣는 구조를 권장한다.

---

## 6. 기존 구조와의 관계

- **보조 컨텍스트**: 기존 메시지·세션·캐릭터 DB를 대체하지 않고, "이 유저에 대한 메타 컨텍스트"를 보강하는 역할로만 사용한다.
- **프롬프트 주입**: 최근 N개 메시지 + (선택) RAG 외에, "memory / heartbeat / identity / soul / tools" 요약을 system 또는 별도 컨텍스트 블록으로 넣어, 토큰 상한 내에서 활용한다.
- **영향 범위**: 이 계층은 "춘심(및 캐릭터) 대화 품질·개인화" 전용으로 격리하며, 일반 채팅·비로그인 플로우에는 영향을 주지 않도록 조건으로 분기한다.

---

## 7. 보안 및 프라이버시

- memory, soul에는 민감한 내용이 쌓일 수 있으므로, 접근 권한(본인·관리자만), 보존 기간 정책, 필요 시 암호화(컬럼 또는 애플리케이션 레벨)를 설계 단계에서 함께 정한다.
- 로그 및 모니터링에서 5계층 원문이 불필요하게 남지 않도록 주의한다.

### 7.1 데이터 삭제 요청 처리

GDPR 및 개인정보보호법 준수를 위한 삭제 정책:

| 삭제 유형 | 범위 | 처리 방식 |
|----------|------|----------|
| 전체 기억 삭제 | 해당 user_id의 5계층 전체 | 모든 캐릭터 컨텍스트 삭제 |
| 특정 캐릭터 기억 삭제 | (user_id, character_id) 조합 | 해당 캐릭터 컨텍스트만 삭제 |
| 특정 memory 항목 삭제 | 개별 memory_item | 해당 항목만 삭제 |
| 계정 탈퇴 | 유저 관련 모든 데이터 | 5계층 + 메시지 + 세션 전체 삭제 |

- **복구 불가 고지**: 삭제 전 "삭제된 데이터는 복구할 수 없습니다" 확인 절차 필수.
- **삭제 로그**: 삭제 요청 시각, 삭제 범위는 감사 로그에 기록 (원본 내용은 기록하지 않음).

### 7.2 민감 정보 필터링

memory 저장 전 PII(개인식별정보) 필터링을 적용한다:

- **자동 탐지 대상**: 카드번호, 주민등록번호, 비밀번호, 계좌번호, 전화번호 패턴.
- **처리 방식**: 탐지된 정보는 마스킹(`***-****-****`) 또는 저장 제외.
- **LLM 기반 필터**: 정규식으로 잡히지 않는 민감 정보는 LLM으로 2차 검토 후 저장.

### 7.3 접근 권한 및 감사

- **접근 권한**: 본인 및 관리자(ADMIN 역할)만 5계층 데이터에 접근 가능.
- **관리자 접근 로그**: 관리자가 특정 유저의 컨텍스트를 조회할 경우 감사 로그 기록.
- **API 인증**: 모든 컨텍스트 API는 세션 인증 필수, 타인의 데이터 접근 시 403 반환.

---

## 8. 구현 순서 제안

1. **1단계 – memory**: DB에 user_context(또는 user_memory) 도입 후, "대화 요약 → 기억 항목 추가" 파이프라인을 LangGraph 등에 연결. 프롬프트에 memory만 주입하여 효과 검증.
2. **2단계 – heartbeat**: last_seen, 빈도 집계 저장 및 "오랜만/매일" 등 짧은 문맥 생성 후 프롬프트에 추가.
3. **3단계 – identity**: 닉네임·호칭·관계 필드 저장 및 프롬프트 반영.
4. **4단계 – soul**: 요약·배치로 soul 필드 채우기 및 깊은 대화 시 컨텍스트로 사용.
5. **5단계 – tools**: 유저/관리자 설정 기반 규칙 저장 및 에이전트/시스템에서 참고.

각 단계 적용 후 기존 대화·일반 채팅에 부작용이 없는지 영향 범위를 검증한다.

---

## 9. 기존 데이터 마이그레이션

### 9.1 현재 상태

현재 프로젝트에서는 `User.bio` 필드에 JSON 형태로 memory가 저장되어 있다:

```json
{
  "memory": "유저가 좋아하는 음식은 피자. 최근 회사에서 스트레스를 받고 있음...",
  "updatedAt": "2026-01-15T12:00:00Z"
}
```

### 9.2 마이그레이션 계획

| 단계 | 작업 | 검증 |
|------|------|------|
| 1 | 새 테이블(`UserContext`, `UserMemoryItem`) 생성 | 스키마 적용 확인 |
| 2 | 기존 `User.bio.memory`를 새 테이블로 복사 | 데이터 정합성 확인 |
| 3 | 병행 운영: 양쪽에 쓰기 (듀얼 라이트) | 동기화 검증 |
| 4 | 읽기를 새 테이블로 전환 | 기능 정상 동작 확인 |
| 5 | `User.bio` 필드 deprecate (쓰기 중단) | 영향 범위 확인 |
| 6 | `User.bio` 필드 제거 (선택) | 최종 정리 |

### 9.3 롤백 전략

- 마이그레이션 실패 시 즉시 기존 `User.bio` 기반으로 복귀.
- 병행 운영 기간 동안 양쪽 데이터 동기화 유지.
- 롤백 시 새 테이블 데이터를 `User.bio`로 역마이그레이션하는 스크립트 준비.

---

## 10. 스키마 구현 예시 (Drizzle ORM)

### 10.1 UserContext 테이블

```typescript
// app/db/schema.ts

import { sqliteTable, text, integer, real, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const userContext = sqliteTable("UserContext", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    characterId: text("characterId").notNull(),

    // heartbeat (JSON)
    heartbeatDoc: text("heartbeatDoc"),

    // identity (JSON)
    identityDoc: text("identityDoc"),

    // soul (JSON)
    soulDoc: text("soulDoc"),

    // tools (JSON)
    toolsDoc: text("toolsDoc"),

    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [
    uniqueIndex("userContext_user_character_idx").on(table.userId, table.characterId),
]);
```

### 10.2 UserMemoryItem 테이블

```typescript
export const userMemoryItem = sqliteTable("UserMemoryItem", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    characterId: text("characterId").notNull(),

    // 기억 내용
    content: text("content").notNull(),
    category: text("category"),  // preference, event, person, worry, etc.
    importance: integer("importance").notNull().default(5),  // 1-10

    // 추출 원본 추적
    sourceConversationId: text("sourceConversationId"),
    sourceMessageId: text("sourceMessageId"),

    // 메타데이터
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    expiresAt: integer("expiresAt", { mode: "timestamp" }),  // 만료일 (선택)
    isArchived: integer("isArchived", { mode: "boolean" }).notNull().default(false),
}, (table) => [
    index("userMemoryItem_user_character_idx").on(table.userId, table.characterId),
    index("userMemoryItem_category_idx").on(table.category),
    index("userMemoryItem_importance_idx").on(table.importance),
]);
```

### 10.3 JSON 문서 타입 정의

```typescript
// app/lib/context/types.ts

export interface HeartbeatDoc {
    lastSeenAt: string;              // ISO timestamp
    recentDaysCount: number;         // 최근 7일 대화 횟수
    totalConversations: number;      // 누적 대화 수
    avgSessionDuration?: number;     // 평균 대화 시간 (분)
    emotionTrend?: string;           // "요즘 피곤하다고 자주 말함"
    streakDays: number;              // 연속 접속일
    lastEmotionKeywords?: string[];  // ["피곤", "스트레스", "기대"]
}

export interface IdentityDoc {
    nickname: string;                // 유저가 불리고 싶은 이름
    honorific: "반말" | "존댓말" | "혼합";
    relationshipType: "팬" | "친구" | "연인" | "동생" | "오빠/언니";
    customTitle?: string;            // 유저가 설정한 호칭
    inferredTraits?: string[];       // 대화에서 추론한 특성
}

export interface SoulDoc {
    values?: string[];               // 중요하게 여기는 가치
    dreams?: string[];               // 소원, 목표
    fears?: string[];                // 두려움, 걱정
    recurringWorries?: string[];     // 반복되는 고민
    lifePhase?: string;              // "취준생", "직장인", "학생" 등
    summary?: string;                // 전체 요약 문단
}

export interface ToolsDoc {
    avoidTopics?: string[];          // 피할 주제
    specialDates?: { date: string; description: string }[];  // 생일, 기념일
    enabledFeatures?: string[];      // 활성화된 기능
    disabledFeatures?: string[];     // 비활성화된 기능
    customRules?: { condition: string; action: string }[];
}
```

---

## 11. API 엔드포인트

### 11.1 엔드포인트 목록

| Method | Endpoint | 용도 | 권한 |
|--------|----------|------|------|
| GET | `/api/context/:characterId` | 5계층 전체 조회 | 본인 |
| PUT | `/api/context/:characterId/heartbeat` | heartbeat 갱신 | 시스템 |
| PUT | `/api/context/:characterId/identity` | identity 수정 | 본인 |
| PUT | `/api/context/:characterId/soul` | soul 갱신 | 시스템 |
| PUT | `/api/context/:characterId/tools` | tools 설정 | 본인/관리자 |
| GET | `/api/context/:characterId/memory` | memory 목록 조회 | 본인 |
| POST | `/api/context/:characterId/memory` | memory 항목 추가 | 시스템 |
| DELETE | `/api/context/:characterId/memory/:id` | memory 항목 삭제 | 본인 |
| DELETE | `/api/context/:characterId` | 캐릭터 컨텍스트 전체 삭제 | 본인 |
| POST | `/api/context/:characterId/export` | .md 형태로 export | 본인 |

### 11.2 응답 예시

**GET `/api/context/chunsim`**

```json
{
    "characterId": "chunsim",
    "heartbeat": {
        "lastSeenAt": "2026-02-05T10:30:00Z",
        "recentDaysCount": 5,
        "streakDays": 3,
        "emotionTrend": "최근 기분이 좋아 보임"
    },
    "identity": {
        "nickname": "민수",
        "honorific": "반말",
        "relationshipType": "연인"
    },
    "soul": {
        "values": ["가족", "성장"],
        "dreams": ["해외여행"],
        "recurringWorries": ["취업 걱정"]
    },
    "tools": {
        "avoidTopics": ["정치"],
        "specialDates": [{ "date": "03-15", "description": "생일" }]
    },
    "memoryCount": 42
}
```

---

## 12. 토큰 예산 관리

### 12.1 프롬프트 주입 시 토큰 제한

5계층 전체를 프롬프트에 넣으면 토큰이 과도해질 수 있으므로, 계층별 예산을 할당한다:

| 계층 | 최대 토큰 | 우선순위 | 압축 전략 |
|------|----------|----------|----------|
| memory | 500 | 1 | 최근/중요 항목 5-10개만 선택 |
| heartbeat | 100 | 2 | 핵심 수치와 한 줄 요약만 |
| identity | 100 | 3 | 필수 필드만 (nickname, honorific, relationship) |
| soul | 300 | 4 | 주요 가치/목표 3개씩 + 요약 |
| tools | 100 | 5 | 활성 규칙만 |
| **총합** | **1,100** | - | Gemini 컨텍스트 윈도우의 약 5% |

### 12.2 동적 토큰 할당

대화 상황에 따라 토큰 배분을 조절한다:

- **첫 대화 (오랜만)**: heartbeat 비중 증가 ("오랜만이야" 컨텍스트)
- **깊은 대화 (고민 상담)**: soul 비중 증가
- **일상 대화**: memory 비중 증가 (최근 언급한 것 참조)
- **특별한 날**: tools의 specialDates 체크 우선

### 12.3 LangGraph 통합 지점

```
[대화 시작]
     │
     ▼
[5계층 로드 노드] ─────────────────────────────┐
     │                                          │
     │  1. DB에서 UserContext 조회              │
     │  2. 토큰 예산에 맞게 압축                 │
     │  3. system prompt에 주입                 │
     │                                          │
     ▼                                          │
[analyzePersona 노드]                           │
     │                                          │
     ▼                                          │
[callModel 노드] ◀──────────────────────────────┘
     │
     ▼
[postProcess 노드]
     │
     ▼
[대화 종료]
     │
     ▼
[컨텍스트 갱신 노드] ──────────────────────────┐
     │                                          │
     │  1. memory: LLM으로 새 기억 추출         │
     │  2. heartbeat: 통계 업데이트             │
     │  3. identity/soul: 필요 시 추론 갱신     │
     │                                          │
     ▼                                          │
[DB 저장] ◀────────────────────────────────────┘
```

---

## 13. 참고

- 프로젝트 문서 계층: `docs/01_Foundation/`, `docs/03_Specs/`, `docs/05_Test/` 등에 정의된 5-Layer 구조를 따른다.
- DB/마이그레이션: [CRITICAL: DATABASE INTEGRITY RULE], [MANDATORY BACKUP PROCEDURE]를 준수한다.
- 채팅·AI 파이프라인: `./20_interrupt-strategy.md`, LangGraph·Gemini 연동 명세와 함께 참고하여 통합한다.


## Related Documents
- **Specs**: [Document Management Plan](../01_Concept_Design/09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
