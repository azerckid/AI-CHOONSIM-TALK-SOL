# Character Media & Emotion System Expansion Plan (100+ Asset Strategy)
> Created: 2026-02-08
> Last Updated: 2026-02-08

캐릭터별 100장 이상의 고해상도 이미지 자산을 활용하여, 사용자의 대화 맥락과 캐릭터의 감정에 따라 동적인 상호작용을 제공하기 위한 기술 설계 및 단계별 로드맵입니다.

---

## 1. 개요 (Core Objective)

단순한 텍스트 채팅을 넘어, 상황에 맞는 풍부한 시각적 피드백을 제공함으로써 **'살아있는 캐릭터'**로서의 몰입감을 극대화하고 서비스의 프리미엄 가치를 확보합니다.

### 1.1 프로젝트 컨텍스트

이 문서는 **CHAT-BOTS** 프로젝트의 캐릭터 미디어 관리 및 감정 기반 이미지 선택 시스템 구현을 위한 전략 가이드입니다.

**현재 프로젝트 상태**:
- **프레임워크**: React Router v7 (Vite) + TypeScript
- **AI 모델**: Google Gemini API (gemini-2.0-flash-exp) - LangGraph 기반
- **데이터베이스**: Turso (libSQL) with Drizzle ORM
- **미디어 스토리지**: Cloudinary
- **현재 기능**: 
  - 텍스트 기반 채팅, 이미지 업로드, 스트리밍 응답
  - 감정 시스템 (`[EMOTION:CODE]` 마커 기반)
  - CharacterMedia 테이블 존재 (기본 필드만: id, characterId, url, type, sortOrder)
  - Admin 페이지에서 캐릭터 미디어 관리 기능 부분 구현

**기존 감정 시스템과의 통합**:
- 현재 AI 응답에서 `[EMOTION:JOY]`, `[EMOTION:SHY]`, `[EMOTION:EXCITED]` 등의 마커를 사용
- 이 감정 마커를 활용하여 적절한 이미지를 선택하는 로직 구현 필요

## 2. 데이터베이스 스키마 확장 방안

100장 이상의 대량 이미지를 체계적으로 관리하고 AI가 적절히 선택할 수 있도록 하기 위해 기존 `CharacterMedia` 테이블의 확장이 필요합니다.

### 2.1 CharacterMedia 테이블 수정/추가 필드

**현재 스키마** (`app/db/schema.ts`):
```typescript
export const characterMedia = sqliteTable("CharacterMedia", {
    id: text("id").primaryKey(),
    characterId: text("characterId").notNull(),
    url: text("url").notNull(),
    type: text("type").notNull(), // "AVATAR" | "COVER" | "NORMAL" | "SECRET"
    sortOrder: integer("sortOrder").notNull().default(0),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
});
```

**추가할 필드**:
- **`emotionTag` (text)**: 해당 이미지의 주된 감정 (예: JOY, SAD, ANGRY, BLUSH, SURPRISED, EXCITED, LOVING, SHY, THINKING)
  - 기존 감정 시스템(`[EMOTION:CODE]`)과 일치하도록 설계
- **`contextTag` (text)**: 이미지가 사용될 상황 (예: MORNING, DINNER, OUTDOOR, SLEEP, INDOOR, PARTY, TRAVEL)
- **`description` (text)**: AI가 시맨틱 검색에 활용할 수 있는 이미지에 대한 상세 설명
  - 예: "공원에서 아이스크림을 든 춘심", "저녁 식사 중 웃고 있는 춘심"
- **`rarity` (text)**: 이미지의 희귀도 (COMMON, RARE, SECRET)
  - 기본값: "COMMON"
- **`metadata` (text)**: JSON 문자열로 저장되는 향후 확장성을 위한 기타 정보
  - 예: `{"outfit": "casual", "location": "cafe", "mood": "happy"}`

**업데이트된 스키마 예시**:
```typescript
export const characterMedia = sqliteTable("CharacterMedia", {
    id: text("id").primaryKey(),
    characterId: text("characterId").notNull(),
    url: text("url").notNull(),
    type: text("type").notNull(),
    sortOrder: integer("sortOrder").notNull().default(0),
    emotionTag: text("emotionTag"), // 추가
    contextTag: text("contextTag"), // 추가
    description: text("description"), // 추가
    rarity: text("rarity").notNull().default("COMMON"), // 추가
    metadata: text("metadata"), // 추가 (JSON 문자열)
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
}, (table) => {
    return [
        index("CharacterMedia_characterId_type_idx").on(table.characterId, table.type),
        index("CharacterMedia_characterId_emotionTag_idx").on(table.characterId, table.emotionTag), // 추가
        index("CharacterMedia_characterId_contextTag_idx").on(table.characterId, table.contextTag), // 추가
    ];
});
```

### 2.2 UserMediaView 테이블 추가

사용자가 본 이미지를 추적하기 위한 테이블:

```typescript
export const userMediaView = sqliteTable("UserMediaView", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
    mediaId: text("mediaId").notNull().references(() => characterMedia.id, { onDelete: "cascade" }),
    characterId: text("characterId").notNull().references(() => character.id, { onDelete: "cascade" }),
    viewedAt: integer("viewedAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => {
    return [
        unique("UserMediaView_userId_mediaId_unique").on(table.userId, table.mediaId),
        index("UserMediaView_userId_characterId_idx").on(table.userId, table.characterId),
    ];
});
```

### 2.3 UserBadge 테이블 추가 (배지 시스템)

리워드 시스템을 위한 배지 테이블:

```typescript
export const userBadge = sqliteTable("UserBadge", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
    badgeType: text("badgeType").notNull(), // "CHARACTER_FRIEND", "CHARACTER_MASTER", "COLLECTION_25", etc.
    badgeName: text("badgeName").notNull(), // "[캐릭터명]의 친구", "True Master", etc.
    characterId: text("characterId"), // 캐릭터별 배지인 경우
    metadata: text("metadata"), // JSON: { collectionProgress: 75, unlockedAt: "..." }
    earnedAt: integer("earnedAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    isDisplayed: integer("isDisplayed", { mode: "boolean" }).notNull().default(true),
}, (table) => {
    return [
        index("UserBadge_userId_idx").on(table.userId),
        index("UserBadge_userId_characterId_idx").on(table.userId, table.characterId),
    ];
});
```

## 3. 캐릭터-AI 선택 로직 (Selection Strategy)

### Phase 1: 감정 기반 매칭 (Emotion-Driven)

**동작**:
- AI가 메시지 생성 시 자신의 현재 감정 상태를 `[EMOTION:CODE]` 마커로 반환
- 기존 감정 시스템과 통합: `JOY`, `SHY`, `EXCITED`, `LOVING`, `SAD`, `THINKING`
- 예: `"오늘 너무 즐거웠어! [EMOTION:JOY]"`

**구현**:
- `app/lib/media-selector.server.ts` 생성
- AI 응답에서 감정 마커 추출 (`extractEmotionMarker` 함수 활용)
- 해당 캐릭터의 `emotionTag`가 일치하는 이미지 중 랜덤 선택
- 선택된 이미지를 `Message.mediaUrl`에 저장

**코드 예시**:
```typescript
// app/lib/media-selector.server.ts
import { db } from "./db.server";
import * as schema from "../db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function selectMediaByEmotion(
    characterId: string,
    emotion: string
): Promise<string | null> {
    const mediaList = await db.query.characterMedia.findMany({
        where: and(
            eq(schema.characterMedia.characterId, characterId),
            eq(schema.characterMedia.emotionTag, emotion)
        ),
    });

    if (mediaList.length === 0) {
        // Fallback: 감정 태그가 없는 경우 랜덤 선택
        const allMedia = await db.query.characterMedia.findMany({
            where: eq(schema.characterMedia.characterId, characterId),
        });
        if (allMedia.length === 0) return null;
        return allMedia[Math.floor(Math.random() * allMedia.length)].url;
    }

    return mediaList[Math.floor(Math.random() * mediaList.length)].url;
}
```

**결과**: 시스템이 해당 캐릭터의 `JOY` 태그가 붙은 이미지 중 하나를 랜덤 추출하여 사용자에게 전송.

---

### Phase 2: 상황 기반 정밀 매칭 (Context-Aware)

**동작**:
- 현재 시간대나 대화의 주제(예: 저녁 식사)를 감지
- 감정과 상황을 모두 고려하여 이미지 선택

**구현**:
- 시간대 감지: `Luxon`을 사용하여 현재 시간 확인 (MORNING: 6-12시, AFTERNOON: 12-18시, EVENING: 18-22시, NIGHT: 22-6시)
- 대화 주제 감지: AI 응답 또는 사용자 메시지에서 키워드 추출 (예: "저녁", "식사", "밥" → DINNER)

**코드 예시**:
```typescript
export async function selectMediaByEmotionAndContext(
    characterId: string,
    emotion: string,
    contextTag?: string
): Promise<string | null> {
    const conditions = [
        eq(schema.characterMedia.characterId, characterId),
        eq(schema.characterMedia.emotionTag, emotion),
    ];

    if (contextTag) {
        conditions.push(eq(schema.characterMedia.contextTag, contextTag));
    }

    let mediaList = await db.query.characterMedia.findMany({
        where: and(...conditions),
    });

    // 정확한 매칭이 없으면 감정만으로 검색
    if (mediaList.length === 0 && contextTag) {
        mediaList = await db.query.characterMedia.findMany({
            where: and(
                eq(schema.characterMedia.characterId, characterId),
                eq(schema.characterMedia.emotionTag, emotion)
            ),
        });
    }

    if (mediaList.length === 0) return null;
    return mediaList[Math.floor(Math.random() * mediaList.length)].url;
}
```

**결과**: `JOY` 감정이면서 `DINNER` 상황에 맞는 이미지를 우선적으로 선택.

---

### Phase 3: 시맨틱 검색 (Semantic Retrieval - 고급)

**동작**:
- 대화의 전체 맥락을 벡터화하여 이미지의 `description`과 비교
- 벡터 DB (Pinecone, Weaviate, 또는 FAISS) 활용

**구현**:
- 이미지 `description`을 임베딩으로 변환하여 저장
- 대화 맥락을 임베딩으로 변환하여 유사도 검색
- 가장 유사한 이미지 선택

**결과**: "공원에서 아이스크림을 든 춘심"과 같은 구체적인 상황 묘사에 가장 가까운 사진을 매칭.

**참고**: Phase 3는 향후 확장 기능으로, Phase 1, 2가 안정화된 후 구현 권장.

## 4. 관리 도구 고도화 (Admin Tools)

### 4.1 대량 업로드 (Bulk Upload)

**구현 위치**: `app/routes/admin/characters/edit.tsx` 확장

**기능**:
- Cloudinary API를 활용하여 여러 장의 사진을 한 번에 업로드
- 업로드 시 공통 태그(예: 캐릭터명, 의상)를 일괄 적용하는 기능
- 드래그 앤 드롭 또는 파일 선택 다중 업로드 지원

**API 엔드포인트**:
```
POST /admin/characters/:id/media/bulk
- Request: FormData (files: File[], emotionTag?: string, contextTag?: string, rarity?: string)
- Response: { success: boolean, uploaded: number, mediaIds: string[] }
```

**구현 예시**:
```typescript
// app/routes/admin/characters/edit.tsx
if (actionType === "bulk_upload_media") {
    const characterId = params.id;
    const files = formData.getAll("files") as File[];
    const emotionTag = formData.get("emotionTag") as string;
    const contextTag = formData.get("contextTag") as string;
    const rarity = (formData.get("rarity") as string) || "COMMON";

    const uploadedMedia = [];
    for (const file of files) {
        const url = await uploadImageToCloudinary(file);
        const [media] = await db.insert(schema.characterMedia).values({
            id: crypto.randomUUID(),
            characterId,
            url,
            type: "NORMAL",
            emotionTag: emotionTag || null,
            contextTag: contextTag || null,
            rarity,
            sortOrder: 0,
            createdAt: new Date(),
        }).returning();
        uploadedMedia.push(media);
    }

    return Response.json({ success: true, uploaded: uploadedMedia.length, mediaIds: uploadedMedia.map(m => m.id) });
}
```

### 4.2 필터링 및 그리드 편집

**구현 위치**: `app/routes/admin/characters/:id/media.tsx` (신규 생성)

**기능**:
- 감정/상황 태그별로 업로드된 사진을 필터링하여 확인
- 업로드된 100개 이상의 자산을 한눈에 보고 태그를 즉시 수정할 수 있는 효율적인 UI
- 그리드 레이아웃으로 썸네일 표시
- 드래그 앤 드롭으로 순서 변경 (`sortOrder` 업데이트)
- 일괄 태그 수정 기능

**UI 컴포넌트**:
- `app/components/admin/MediaGrid.tsx`: 미디어 그리드 표시
- `app/components/admin/MediaTagEditor.tsx`: 태그 편집 모달

**API 엔드포인트**:
```
GET /admin/characters/:id/media?emotionTag=JOY&contextTag=DINNER
- Response: { media: CharacterMedia[] }

PATCH /admin/characters/:id/media/:mediaId
- Request: { emotionTag?: string, contextTag?: string, description?: string, rarity?: string }
- Response: { success: boolean, media: CharacterMedia }

PATCH /admin/characters/:id/media/reorder
- Request: { mediaIds: string[] } // 새로운 순서
- Response: { success: boolean }
```

## 5. 비용 및 성능 최적화 (Infrastructure)

### 5.1 Cloudinary 최적화

- **Transformation**: 모든 이미지는 실시간으로 WebP/AVIF 포맷으로 자동 변환하여 대역폭 절감
- **썸네일 생성**: 그리드 뷰에서는 자동으로 썸네일 생성 (`w_300,h_300,c_fill`)
- **CDN Caching**: 전 세계 사용자에게 빠른 속도로 이미지를 제공하기 위한 엣지 캐싱 활성화

**구현 예시** (`app/lib/cloudinary.server.ts` 확장):
```typescript
export function getOptimizedImageUrl(originalUrl: string, width?: number, height?: number, format?: "webp" | "avif"): string {
    if (!originalUrl.includes("cloudinary.com")) return originalUrl;
    
    const transformations = [];
    if (width) transformations.push(`w_${width}`);
    if (height) transformations.push(`h_${height}`);
    if (format) transformations.push(`f_${format}`);
    transformations.push("q_auto"); // 자동 품질 조절
    
    const separator = originalUrl.includes("?") ? "&" : "?";
    return `${originalUrl}${separator}${transformations.join(",")}`;
}
```

### 5.2 프론트엔드 최적화

- **Lazy Loading**: 갤러리나 채팅 리스트에서 대량의 사진을 불러올 때 브라우저 성능 최적화
- **Virtual Scrolling**: 100개 이상의 이미지를 표시할 때 가상 스크롤링 적용
- **이미지 프리로딩**: 다음에 보여질 이미지를 미리 로드

**구현 예시**:
```typescript
// app/components/admin/MediaGrid.tsx
<img
    src={getOptimizedImageUrl(media.url, 300, 300, "webp")}
    loading="lazy"
    alt={media.description || media.id}
/>
```

### 5.3 비용 분석

**Cloudinary 비용** (Free Tier 기준):
- **Storage**: 25GB 무료
- **Bandwidth**: 25GB/월 무료
- **Transformations**: 무제한

**예상 사용량** (캐릭터당 100장, 5개 캐릭터):
- 이미지당 평균 2MB 가정: 100장 × 5캐릭터 × 2MB = 1GB
- 월간 트래픽: 사용자 1,000명, 평균 10장/사용자/월 = 10,000장 × 2MB = 20GB
- **결론**: 초기에는 Free Tier로 충분, 사용자 증가 시 유료 플랜 고려 필요

**최적화 효과**:
- WebP 변환으로 파일 크기 30-50% 감소
- 썸네일 사용으로 대역폭 80% 절감 (원본 대비)

## 6. 수집 및 리워드 시스템 (Collection & Reward System)

유저가 캐릭터의 다양한 모습을 수집하도록 유도하여 리텐션과 충성도를 높이는 게이미피카이션 요소입니다.

### 6.1 포토 도감 (Photo Album)

**구현 위치**: `app/routes/character/:id/album.tsx` (신규 생성)

**기능**:
- 유저별로 '확인한 이미지'와 '미확인 이미지'를 구분하여 표시
- 미확인 이미지는 실루엣이나 자물쇠 아이콘으로 처리하여 호기심 자극
- 수집 진행률 표시 (예: "45/100 수집 완료")

**API 엔드포인트**:
```
GET /api/character/:id/album
- Response: { 
    totalMedia: number,
    viewedMedia: number,
    progress: number, // 0-100
    media: Array<{
        id: string,
        url: string,
        emotionTag: string,
        contextTag: string,
        rarity: string,
        isViewed: boolean,
        viewedAt?: string
    }>
}
```

**구현 로직**:
```typescript
// app/routes/api/character/$id/album.ts
export async function loader({ params, request }: LoaderFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new Response("Unauthorized", { status: 401 });

    const characterId = params.id;
    const allMedia = await db.query.characterMedia.findMany({
        where: eq(schema.characterMedia.characterId, characterId),
    });

    const viewedMediaIds = await db.query.userMediaView.findMany({
        where: and(
            eq(schema.userMediaView.userId, session.user.id),
            eq(schema.userMediaView.characterId, characterId)
        ),
    }).then(views => new Set(views.map(v => v.mediaId)));

    const mediaWithViewStatus = allMedia.map(media => ({
        ...media,
        isViewed: viewedMediaIds.has(media.id),
    }));

    return {
        totalMedia: allMedia.length,
        viewedMedia: viewedMediaIds.size,
        progress: Math.round((viewedMediaIds.size / allMedia.length) * 100),
        media: mediaWithViewStatus,
    };
}
```

### 6.2 단계별 달성 보상 (Tiered Rewards)

**리워드 레벨**:
1. **Level 1 (25% 달성)**: `[캐릭터명]의 친구` 배지 지급
   - 배지 타입: `CHARACTER_FRIEND_${characterId}`
   - 배지명: `${characterName}의 친구`

2. **Level 2 (50% 달성)**: 해당 캐릭터 전용 채팅방 테마/스킨 해금
   - `User` 테이블에 `unlockedThemes` JSON 필드 추가 또는 별도 테이블
   - 테마 ID: `theme_${characterId}_50`

3. **Level 3 (75% 달성)**: 미공개 보이스 메시지 또는 특별 대본(Secret Script) 1종 해금
   - `SecretContent` 테이블 추가 또는 `CharacterMedia`의 `type: "SECRET"` 활용

4. **Level 4 (100% 완독)**:
   - **'True Master' 한정판 배지** 프로필 부여
     - 배지 타입: `CHARACTER_MASTER_${characterId}`
     - 배지명: `${characterName}의 True Master`
   - 채팅 목록 내 골드 테두리 효과 또는 닉네임 옆 전용 심볼 표시
     - `User` 테이블에 `masterCharacters` JSON 필드 추가
   - 해당 캐릭터 대화 시 크레딧 소모량 10% 영구 할인
     - `app/lib/credit-policy.ts`에 할인 로직 추가

**구현 로직** (`app/lib/reward-system.server.ts`):
```typescript
export async function checkAndGrantCollectionRewards(
    userId: string,
    characterId: string
) {
    const { totalMedia, viewedMedia, progress } = await getCollectionProgress(userId, characterId);
    
    const rewards = [];
    
    if (progress >= 25 && progress < 50) {
        await grantBadge(userId, `CHARACTER_FRIEND_${characterId}`, `${characterName}의 친구`, characterId);
        rewards.push("LEVEL_1");
    }
    
    if (progress >= 50 && progress < 75) {
        await unlockTheme(userId, characterId, "50");
        rewards.push("LEVEL_2");
    }
    
    if (progress >= 75 && progress < 100) {
        await unlockSecretContent(userId, characterId);
        rewards.push("LEVEL_3");
    }
    
    if (progress >= 100) {
        await grantBadge(userId, `CHARACTER_MASTER_${characterId}`, `${characterName}의 True Master`, characterId);
        await markAsMaster(userId, characterId);
        rewards.push("LEVEL_4");
    }
    
    return rewards;
}
```

### 6.3 시스템 구현 고려사항

- **`UserMediaView` 테이블**: 유저 ID, 미디어 ID, 확인 일시 기록 (2.2절 참조)
- **이미지 해금 트리거**: AI가 특정 이미지를 전송하는 순간 유저의 도감에 자동으로 기록
  - `app/routes/api/chat/index.ts`에서 메시지 저장 시 `UserMediaView` 기록
- **배지 시스템 연동**: 100% 달성 시 백엔드에서 실시간으로 배지 테이블에 데이터 삽입 및 유저 알림 전송
  - `app/lib/reward-system.server.ts`에서 처리
  - 알림은 기존 푸시 알림 시스템 활용

## 7. 단계별 로드맵 (Execution Roadmap)

### Phase 1: 스키마 및 마이그레이션 (1주차)

**작업 내용**:
1. `CharacterMedia` 테이블에 필드 추가 (`emotionTag`, `contextTag`, `description`, `rarity`, `metadata`)
2. `UserMediaView` 테이블 생성
3. `UserBadge` 테이블 생성
4. 인덱스 추가 (성능 최적화)
5. 기존 데이터 마이그레이션 스크립트 작성

**마이그레이션 스크립트**:
```bash
npx drizzle-kit generate
npx drizzle-kit push
```

**기존 데이터 처리**:
- 기존 `CharacterMedia` 레코드의 `emotionTag`는 `null`로 유지
- Admin 페이지에서 수동으로 태그 추가 가능하도록 UI 제공

---

### Phase 2: 어드민 고도화 (2주차)

**작업 내용**:
1. 대량 업로드 UI 개발 (`app/routes/admin/characters/:id/media.tsx`)
2. 태그 관리 화면 개발 (필터링, 그리드 편집)
3. 일괄 태그 수정 기능
4. 드래그 앤 드롭으로 순서 변경

**파일 구조**:
```
app/routes/admin/characters/:id/media.tsx
app/components/admin/MediaGrid.tsx
app/components/admin/MediaTagEditor.tsx
app/components/admin/BulkUploadModal.tsx
```

---

### Phase 3: 도감 및 수집 로직 (3주차)

**작업 내용**:
1. `UserMediaView` 기록 시스템 구현
   - AI가 이미지를 전송할 때 자동 기록 (`app/routes/api/chat/index.ts`)
2. 프론트엔드 도감 UI 개발 (`app/routes/character/:id/album.tsx`)
3. 수집 진행률 표시
4. 미확인 이미지 처리 (실루엣/자물쇠 아이콘)

**API 엔드포인트**:
- `GET /api/character/:id/album`
- `POST /api/character/:id/media/:mediaId/view` (수동 확인용, 선택사항)

---

### Phase 4: AI 통합 및 이미지 선택 로직 (4주차)

**작업 내용**:
1. `app/lib/media-selector.server.ts` 생성
2. AI 응답에서 감정 마커 추출 후 이미지 선택 로직 구현
3. `app/routes/api/chat/index.ts`에 이미지 선택 로직 통합
4. 선택된 이미지를 `Message.mediaUrl`에 저장
5. `UserMediaView` 자동 기록

**AI 프롬프트 튜닝**:
- 기존 감정 시스템(`[EMOTION:CODE]`)은 이미 구현되어 있음
- 추가 튜닝 불필요 (기존 시스템 활용)

---

### Phase 5: 리워드 및 배지 통합 (5주차)

**작업 내용**:
1. `app/lib/reward-system.server.ts` 생성
2. 수집 진행률 체크 및 배지 지급 로직 구현
3. 테마 해금 시스템 구현
4. 크레딧 할인 로직 구현 (`app/lib/credit-policy.ts` 확장)
5. 알림 시스템 연동 (푸시 알림)

**테스트 시나리오**:
- 사용자가 이미지를 수집할 때마다 진행률 확인
- 25%, 50%, 75%, 100% 달성 시 자동 리워드 지급 확인

---

## 8. API 엔드포인트 정리

### 8.1 Admin API

```
POST /admin/characters/:id/media/bulk
- 대량 업로드

GET /admin/characters/:id/media?emotionTag=JOY&contextTag=DINNER
- 필터링된 미디어 목록 조회

PATCH /admin/characters/:id/media/:mediaId
- 개별 미디어 태그 수정

PATCH /admin/characters/:id/media/reorder
- 미디어 순서 변경
```

### 8.2 User API

```
GET /api/character/:id/album
- 사용자별 도감 조회

GET /api/user/badges?characterId=chunsim
- 사용자 배지 조회
```

---

## 9. 환경 변수 설정

기존 Cloudinary 환경 변수 활용:
```bash
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

추가 환경 변수 (선택사항):
```bash
# Phase 3 (시맨틱 검색) 사용 시
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=...
```

---

## 10. 테스트 계획

### 10.1 단위 테스트

- `media-selector.server.ts`: 감정 기반 이미지 선택 로직
- `reward-system.server.ts`: 리워드 지급 로직

### 10.2 통합 테스트

- AI 응답 → 이미지 선택 → `UserMediaView` 기록 → 리워드 체크 플로우
- Admin 대량 업로드 → 태그 일괄 적용 플로우

### 10.3 성능 테스트

- 100개 이상의 이미지 조회 성능
- 인덱스 효과 확인

---

**Note**: 이 계획은 캐릭터당 100장이 넘는 자산이 단순한 장식품이 아니라, 사용자에게 **매번 새로운 경험을 주는 강력한 콘텐츠이자 목표 지점**으로 작동하게 함을 목적으로 합니다.


## Related Documents
- **Specs**: [Document Management Plan](../01_Concept_Design/09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
