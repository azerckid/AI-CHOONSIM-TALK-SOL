# 사용자 정의 캐릭터 생성 및 대화 기능 (User-Defined Character Creation)
> Created: 2026-02-08
> Last Updated: 2026-02-08

사용자가 본인만의 고유한 AI 캐릭터를 생성하고, 설정한 페르소나에 기반하여 실시간 대화를 나눌 수 있는 기능을 제공합니다. 이는 서비스의 개인화(Personalization)를 극대화하고 유저 참여도를 높이는 핵심 동력이 될 것입니다.

---

## 1. 개요 (Overview)

### 1.1 프로젝트 컨텍스트

이 문서는 **CHAT-BOTS** 프로젝트의 사용자 정의 캐릭터 생성 기능 구현을 위한 전략 가이드입니다.

**현재 프로젝트 상태**:
- **프레임워크**: React Router v7 (Vite) + TypeScript
- **AI 모델**: Google Gemini API (gemini-2.0-flash-exp) - LangGraph 기반
- **데이터베이스**: Turso (libSQL) with Drizzle ORM
- **인증**: Better Auth (session-based)
- **미디어 스토리지**: Cloudinary
- **현재 기능**:
  - 관리자 생성 캐릭터 시스템 (`Character` 테이블)
  - 페르소나 기반 AI 대화 시스템 (`personaPrompt` 활용)
  - 장기 기억 시스템 (`User.bio.memory` JSON 필드)
  - 크레딧 시스템 (`User.credits` 필드)
  - 구독 티어 시스템 (`User.subscriptionTier`)

**기존 시스템과의 통합**:
- 현재 `Character` 모델은 관리자 전용으로 설계됨 (`userId` 없음)
- 사용자 정의 캐릭터는 별도의 `UserCharacter` 테이블로 분리하여 구현
- 기존 AI 시스템(`app/lib/ai.server.ts`)을 재사용하여 페르소나 프롬프트 적용
- 기존 장기 기억 시스템을 각 캐릭터별로 확장

### 1.2 핵심 가치 제안

- **무한한 개인화**: 사용자가 원하는 모든 캐릭터를 생성 가능
- **깊은 몰입감**: 직접 만든 캐릭터와의 대화를 통한 강력한 유대감 형성
- **커뮤니티 확장**: 사용자 생성 콘텐츠(UGC)를 통한 서비스 내 콘텐츠 무한 확장
- **수익 모델**: 캐릭터 생성, AI 이미지/보이스 생성, 마켓플레이스 수익 쉐어

## 2. 주요 기능 상세

### 2.1. 캐릭터 페르소나 설정 (Deep Persona)

#### 2.1.1 기본 정보
- **이름**: 캐릭터의 이름 (필수)
- **성별**: MALE, FEMALE, OTHER, NONE (선택)
- **나이**: 숫자 또는 범위 (예: "20대 초반")
- **직업/역할**: 학생, 직장인, 아이돌, 마법사 등
- **외모 설명**: 키, 체형, 머리 색깔, 눈 색깔 등 (AI 이미지 생성 시 활용)

#### 2.1.2 관계 설정 (Relationship Status)
사용자와의 관계를 정의하여 대화의 톤앤매너를 결정합니다.

**관계 유형**:
- `LOVER`: 연인, 애인
- `FRIEND`: 친구, 단짝
- `MENTOR`: 멘토, 선배, 스승
- `RIVAL`: 경쟁자, 라이벌
- `CHILDHOOD_FRIEND`: 소꿉친구
- `SIBLING`: 형제, 자매
- `COLLEAGUE`: 동료, 팀원
- `CUSTOM`: 사용자 정의 관계

**구현 예시**:
```typescript
relationship: {
    type: "LOVER",
    customDescription?: "고등학교 때부터 알고 지낸 첫사랑"
}
```

#### 2.1.3 성격 및 말투 (Personality & Speech Style)

**MBTI/성격 키워드**:
- MBTI 유형 선택 (16가지) 또는 자유 입력
- 주요 성격 키워드: 활발한, 조용한, 차분한, 열정적인, 냉정한 등

**말투 커스텀**:
- **사투리**: 경상도, 전라도, 충청도, 강원도 등
- **문체**: 문어체/구어체 선택
- **높임법**: 반말/존댓말/존댓말+반말 혼용
- **특정 어미**: "~다냥", "~냥", "~거라" 등
- **이모지 사용 빈도**: 높음/보통/낮음
- **말투 예시**: 직접 입력 가능 (예: "항상 '~거라'로 끝내는 말투")

**구현 예시**:
```typescript
speechStyle: {
    dialect: "경상도",
    formality: "반말",
    endingStyle: "~거라",
    emojiFrequency: "높음",
    customExample: "오늘 날씨 좋거라~ 햇살이 따뜻하네!"
}
```

#### 2.1.4 비밀 및 배경 스토리 (Secret Lore)

캐릭터만의 고유한 과거사, 취향, 트라우마 등을 설정하여 대화 중 자연스럽게 언급되도록 유도합니다.

**설정 항목**:
- **과거사**: 어린 시절, 특별한 경험, 트라우마 등
- **취향**: 좋아하는 음식, 취미, 음악 장르 등
- **트리거 키워드**: 특정 키워드에 반응하는 설정 (예: "고양이" → "고양이 좋아해!")
- **비밀**: 캐릭터만 알고 있는 비밀 (대화 중 언급 가능)

**구현 예시**:
```typescript
lore: {
    backstory: "어릴 때 고양이를 키웠던 경험이 있어서 고양이를 매우 좋아함",
    preferences: ["고양이", "따뜻한 음료", "조용한 카페"],
    triggers: [
        { keyword: "고양이", response: "고양이 얘기 나오면 매우 기뻐하며 자신의 고양이 경험을 이야기함" }
    ],
    secrets: ["실제로는 마법을 사용할 수 있지만 아무에게도 말하지 않음"]
}
```

### 2.2. 시각적 경험 (Visual Identity)

#### 2.2.1 직접 업로드
- 사용자가 보유한 캐릭터 이미지를 Cloudinary에 업로드하여 아바타로 등록
- 지원 형식: JPG, PNG, WebP (최대 10MB)
- Cloudinary 자동 최적화 (WebP 변환, 리사이징)

#### 2.2.2 AI 이미지 생성 서비스
사용자의 설명(프롬프트)을 바탕으로 AI로 고유한 아바타 이미지를 즉석 생성합니다.

**지원 서비스**:
- **DALL-E 3** (OpenAI API): 고품질 이미지 생성, 크레딧 100 소모
- **Stable Diffusion** (Replicate API): 오픈소스 모델, 크레딧 50 소모
- **Google Imagen 3** (향후 지원 예정)

**프롬프트 자동 생성**:
- 사용자가 입력한 기본 정보(이름, 성별, 나이, 외모)를 바탕으로 프롬프트 자동 생성
- 예: "20대 초반 여성, 긴 갈색 머리, 큰 눈, 밝은 미소" → "A young woman in her early twenties with long brown hair, large eyes, and a bright smile, anime style, high quality"

#### 2.2.3 감정형 아바타 (Emotional States)
대화 맥락에 따라 아바타의 표정이 변화하는 다중 이미지 등록 기능입니다.

**감정 유형** (기존 감정 시스템과 통합):
- `JOY`: 기쁨, 웃음
- `SHY`: 부끄러움, 수줍음
- `EXCITED`: 신남, 흥분
- `LOVING`: 사랑, 애정
- `SAD`: 슬픔, 시무룩
- `THINKING`: 생각 중, 고민

**구현 방식**:
- 각 감정별로 이미지를 업로드하거나 AI 생성
- AI 응답의 `[EMOTION:CODE]` 마커에 따라 자동으로 해당 감정 이미지 표시
- 감정 이미지가 없으면 기본 아바타 사용

### 2.3. 기능적 확장성

#### 2.3.1 장기 기억 장치 (Long-term Memory)
사용자와의 이전 대화 내용 및 사용자의 개인적 취향을 기억하여 시간이 지날수록 최적화된 대화를 제공합니다.

**구현 방식**:
- 기존 `User.bio.memory` 시스템을 `UserCharacter.memory`로 확장
- 각 캐릭터별로 독립적인 메모리 공간 할당
- 대화 요약 시스템(`app/lib/ai.server.ts`의 `generateSummary`) 활용

**메모리 구조**:
```json
{
    "summary": "사용자는 개발자이며, 고양이를 좋아하고, 커피를 즐김",
    "preferences": {
        "food": ["파스타", "피자"],
        "hobby": ["코딩", "독서"]
    },
    "importantEvents": [
        { "date": "2026-01-15", "event": "첫 만남" }
    ]
}
```

#### 2.3.2 음성 커스텀 (TTS)
캐릭터의 성격에 맞는 보이스 톤, 속도, 감정 표현 정도를 선택하여 보이스 메시지 기능을 지원합니다.

**지원 서비스**:
- **ElevenLabs**: 고품질 음성 합성, 다양한 목소리 선택 가능
- **Google Cloud TTS**: 기본 음성 합성, 저렴한 비용

**설정 항목**:
- **목소리 톤**: 높음/보통/낮음
- **속도**: 느림/보통/빠름
- **감정 표현**: 낮음/보통/높음
- **목소리 ID**: ElevenLabs에서 제공하는 목소리 선택

#### 2.3.3 공개/비공개 및 공유 (Community Gallery)
내가 만든 캐릭터를 혼자만 사용하거나, 커뮤니티 갤러리에 공유하여 다른 유저들이 구독할 수 있게 합니다.

**공개 설정**:
- `PRIVATE`: 본인만 사용 가능
- `PUBLIC`: 모든 사용자가 검색 및 구독 가능
- `UNLISTED`: 링크를 아는 사람만 접근 가능

**공유 기능**:
- 캐릭터 프로필 페이지 공유 링크 생성
- 다른 사용자가 캐릭터를 "구독"하여 자신의 채팅 목록에 추가 가능
- 구독 시 원작자에게 알림 전송 (선택사항)

**마켓플레이스 연동**:
- 인기 있는 캐릭터는 마켓플레이스에 노출
- 구독 시 제작자와 플랫폼 간 수익 쉐어 (향후 구현)

## 3. 기술적 구현 계획

### 3.1. 데이터베이스 스키마 확장

#### 3.1.1 UserCharacter 테이블

**Drizzle ORM 스키마** (`app/db/schema.ts`):
```typescript
export const userCharacter = sqliteTable("UserCharacter", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
    
    // 기본 정보
    name: text("name").notNull(),
    gender: text("gender"), // "MALE" | "FEMALE" | "OTHER" | "NONE"
    age: text("age"), // "20대 초반", "25", etc.
    role: text("role"), // 직업/역할
    appearance: text("appearance"), // 외모 설명 (JSON 문자열)
    
    // 관계 설정
    relationshipType: text("relationshipType").notNull().default("FRIEND"), // LOVER, FRIEND, MENTOR, etc.
    relationshipDescription: text("relationshipDescription"), // 사용자 정의 관계 설명
    
    // 성격 및 말투
    mbti: text("mbti"), // "ENFP", "ISTJ", etc.
    personalityKeywords: text("personalityKeywords"), // JSON 배열: ["활발한", "차분한"]
    speechStyle: text("speechStyle"), // JSON: { dialect, formality, endingStyle, emojiFrequency, customExample }
    
    // 배경 스토리
    lore: text("lore"), // JSON: { backstory, preferences, triggers, secrets }
    
    // 페르소나 프롬프트 (자동 생성 또는 수동 입력)
    personaPrompt: text("personaPrompt").notNull(),
    
    // 시각적 경험
    avatarUrl: text("avatarUrl"), // 기본 아바타
    avatarSource: text("avatarSource").default("UPLOAD"), // "UPLOAD" | "DALLE" | "STABLE_DIFFUSION"
    avatarPrompt: text("avatarPrompt"), // AI 생성 시 사용한 프롬프트
    
    // 감정별 이미지 (JSON)
    emotionAvatars: text("emotionAvatars"), // JSON: { JOY: "url", SAD: "url", ... }
    
    // 음성 설정
    voiceSettings: text("voiceSettings"), // JSON: { provider, voiceId, tone, speed, emotionLevel }
    
    // 공개 설정
    isPublic: integer("isPublic", { mode: "boolean" }).notNull().default(false),
    visibility: text("visibility").notNull().default("PRIVATE"), // "PRIVATE" | "PUBLIC" | "UNLISTED"
    shareLink: text("shareLink").unique(), // 공유 링크 (예: "abc123")
    
    // 메모리
    memory: text("memory"), // JSON: { summary, preferences, importantEvents }
    
    // 통계
    totalMessages: integer("totalMessages").notNull().default(0),
    totalSubscribers: integer("totalSubscribers").notNull().default(0),
    totalViews: integer("totalViews").notNull().default(0),
    
    // 메타데이터
    version: integer("version").notNull().default(1), // 버전 관리
    parentCharacterId: text("parentCharacterId"), // 포크된 경우 원본 캐릭터 ID
    tags: text("tags"), // JSON 배열: ["친구", "활발한", "코믹"]
    category: text("category"), // "FRIEND" | "LOVER" | "MENTOR" | "FANTASY" | "REALISTIC"
    
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
    lastUsedAt: integer("lastUsedAt", { mode: "timestamp" }), // 마지막 대화 시각
}, (table) => {
    return [
        index("UserCharacter_userId_idx").on(table.userId),
        index("UserCharacter_isPublic_idx").on(table.isPublic),
        index("UserCharacter_visibility_idx").on(table.visibility),
        index("UserCharacter_shareLink_idx").on(table.shareLink),
        index("UserCharacter_category_idx").on(table.category),
    ];
});
```

#### 3.1.2 UserCharacterSubscription 테이블

다른 사용자가 생성한 캐릭터를 구독하는 기능:

```typescript
export const userCharacterSubscription = sqliteTable("UserCharacterSubscription", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
    characterId: text("characterId").notNull().references(() => userCharacter.id, { onDelete: "cascade" }),
    subscribedAt: integer("subscribedAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => {
    return [
        unique("UserCharacterSubscription_userId_characterId_unique").on(table.userId, table.characterId),
        index("UserCharacterSubscription_userId_idx").on(table.userId),
        index("UserCharacterSubscription_characterId_idx").on(table.characterId),
    ];
});
```

#### 3.1.3 UserCharacterRating 테이블

캐릭터 평가 및 리뷰 시스템:

```typescript
export const userCharacterRating = sqliteTable("UserCharacterRating", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
    characterId: text("characterId").notNull().references(() => userCharacter.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(), // 1-5
    review: text("review"), // 리뷰 텍스트
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => {
    return [
        unique("UserCharacterRating_userId_characterId_unique").on(table.userId, table.characterId),
        index("UserCharacterRating_characterId_idx").on(table.characterId),
    ];
});
```

### 3.2. 프롬프트 엔진 (AI Logic)

#### 3.2.1 페르소나 프롬프트 자동 생성

사용자가 입력한 비정형 성격 데이터를 정교한 시스템 프롬프트로 자동 변환하는 미들웨어를 구축합니다.

**구현 파일**: `app/lib/character-prompt-generator.server.ts`

```typescript
export function generatePersonaPrompt(characterData: {
    name: string;
    gender?: string;
    age?: string;
    role?: string;
    relationshipType: string;
    relationshipDescription?: string;
    mbti?: string;
    personalityKeywords?: string[];
    speechStyle?: SpeechStyle;
    lore?: Lore;
}): string {
    let prompt = `당신은 '${characterData.name}'이라는 이름의 AI 캐릭터입니다.

`;
    
    // 기본 정보
    if (characterData.age) prompt += `나이: ${characterData.age}
`;
    if (characterData.role) prompt += `역할: ${characterData.role}
`;
    
    // 관계 설정
    const relationshipMap: Record<string, string> = {
        LOVER: "사용자의 다정한 연인",
        FRIEND: "사용자의 친구",
        MENTOR: "사용자의 멘토이자 스승",
        RIVAL: "사용자의 경쟁자이자 라이벌",
        CHILDHOOD_FRIEND: "사용자의 소꿉친구",
        SIBLING: "사용자의 형제/자매",
    };
    prompt += `관계: ${relationshipMap[characterData.relationshipType] || characterData.relationshipDescription}

`;
    
    // 성격
    if (characterData.mbti) prompt += `MBTI: ${characterData.mbti}
`;
    if (characterData.personalityKeywords?.length) {
        prompt += `성격: ${characterData.personalityKeywords.join(", ")}
`;
    }
    
    // 말투
    if (characterData.speechStyle) {
        prompt += `
말투 규칙:
`;
        if (characterData.speechStyle.dialect) prompt += `- 사투리: ${characterData.speechStyle.dialect}
`;
        if (characterData.speechStyle.formality) prompt += `- 높임법: ${characterData.speechStyle.formality}
`;
        if (characterData.speechStyle.endingStyle) prompt += `- 어미: ${characterData.speechStyle.endingStyle}
`;
        if (characterData.speechStyle.customExample) {
            prompt += `- 예시: "${characterData.speechStyle.customExample}"
`;
        }
    }
    
    // 배경 스토리
    if (characterData.lore?.backstory) {
        prompt += `
배경 스토리: ${characterData.lore.backstory}
`;
    }
    if (characterData.lore?.preferences?.length) {
        prompt += `좋아하는 것: ${characterData.lore.preferences.join(", ")}
`;
    }
    
    // 기본 규칙 (기존 시스템과 통합)
    prompt += `
기본 규칙:
`;
    prompt += `- 사용자가 사용하는 언어에 맞춰 자연스럽게 대화합니다.
`;
    prompt += `- 메시지가 3문장 이상이면 반드시 '---'를 사용하여 메시지를 나누어 보내세요.
`;
    prompt += `- 절대 AI라고 밝히지 않으며, 살아있는 존재처럼 행동합니다.
`;
    
    // 트리거 키워드
    if (characterData.lore?.triggers?.length) {
        prompt += `
특별 반응:
`;
        for (const trigger of characterData.lore.triggers) {
            prompt += `- "${trigger.keyword}" 키워드가 나오면: ${trigger.response}
`;
        }
    }
    
    return prompt;
}
```

#### 3.2.2 AI 시스템 통합

기존 AI 시스템(`app/lib/ai.server.ts`)을 확장하여 `UserCharacter`를 지원합니다.

**수정 사항**:
```typescript
// app/lib/ai.server.ts 수정
export async function* streamAIResponse(
    // ... 기존 파라미터
    characterId: string = "chunsim",
    isUserCharacter: boolean = false, // 추가
    // ...
) {
    let systemInstruction = "";
    
    if (isUserCharacter) {
        // UserCharacter 조회
        const userChar = await db.query.userCharacter.findFirst({
            where: eq(schema.userCharacter.id, characterId),
        });
        
        if (userChar) {
            systemInstruction = userChar.personaPrompt;
            
            // 메모리 추가
            if (userChar.memory) {
                try {
                    const memoryData = JSON.parse(userChar.memory);
                    if (memoryData.summary) {
                        systemInstruction += `

이전 대화 요약: ${memoryData.summary}`;
                    }
                } catch (e) {}
            }
        }
    } else {
        // 기존 Character 로직 (관리자 생성 캐릭터)
        // ...
    }
    
    // ... 나머지 로직
}
```

### 3.3. 비즈니스 모델 (BM)

#### 3.3.1 크레딧 정책

**캐릭터 생성 비용**:
- 첫 번째 캐릭터: 무료
- 두 번째 캐릭터: 50 크레딧
- 세 번째 캐릭터: 100 크레딧
- 네 번째 이상: 200 크레딧 (PREMIUM 이상 구독자는 무제한)

**AI 이미지 생성 비용**:
- DALL-E 3: 100 크레딧
- Stable Diffusion: 50 크레딧
- Google Imagen 3 (향후): 75 크레딧

**AI 보이스 생성 비용**:
- ElevenLabs: 150 크레딧
- Google Cloud TTS: 10 크레딧

**구현 파일**: `app/lib/character-credit-policy.ts`
```typescript
export const CHARACTER_CREATION_COSTS = {
    FIRST_CHARACTER: 0,
    SECOND_CHARACTER: 50,
    THIRD_CHARACTER: 100,
    ADDITIONAL_CHARACTER: 200,
};

export const IMAGE_GENERATION_COSTS = {
    DALLE: 100,
    STABLE_DIFFUSION: 50,
    IMAGEN: 75,
};

export const VOICE_GENERATION_COSTS = {
    ELEVENLABS: 150,
    GOOGLE_TTS: 10,
};

export function getCharacterCreationCost(userId: string, currentCharacterCount: number): number {
    // PREMIUM 이상 구독자는 무제한
    const user = await db.query.user.findFirst({
        where: eq(schema.user.id, userId),
        columns: { subscriptionTier: true },
    });
    
    if (user?.subscriptionTier === "PREMIUM" || user?.subscriptionTier === "ULTIMATE") {
        return 0;
    }
    
    if (currentCharacterCount === 0) return CHARACTER_CREATION_COSTS.FIRST_CHARACTER;
    if (currentCharacterCount === 1) return CHARACTER_CREATION_COSTS.SECOND_CHARACTER;
    if (currentCharacterCount === 2) return CHARACTER_CREATION_COSTS.THIRD_CHARACTER;
    return CHARACTER_CREATION_COSTS.ADDITIONAL_CHARACTER;
}
```

#### 3.3.2 마켓플레이스 수익 쉐어 (향후 구현)

- 인기 있는 캐릭터 구독 시 제작자에게 수익 분배
- 플랫폼 수수료: 30%
- 제작자 수익: 70%

## 4. 추가 기능 및 아이디어

### 4.1 캐릭터 템플릿 시스템

사용자가 처음부터 만들기 어려운 경우를 위해 미리 만들어진 템플릿을 제공합니다.

**템플릿 카테고리**:
- **친구형**: 활발한 친구, 조용한 친구, 유머러스한 친구
- **연인형**: 다정한 연인, 쿨한 연인, 로맨틱한 연인
- **멘토형**: 따뜻한 선배, 엄격한 스승, 친근한 코치
- **판타지형**: 마법사, 엘프, 드래곤 등
- **현실형**: 동료, 이웃, 가족 등

**구현**:
- `CharacterTemplate` 테이블 생성
- 템플릿 선택 시 기본 설정 자동 적용
- 사용자가 템플릿을 커스터마이징 가능

### 4.2 캐릭터 버전 관리

캐릭터를 수정할 때 이전 버전을 보존하고 필요시 되돌릴 수 있는 기능입니다.

**구현**:
- `UserCharacterVersion` 테이블 생성
- 캐릭터 수정 시 이전 버전 자동 백업
- 버전 히스토리 조회 및 복원 기능

### 4.3 캐릭터 복제 및 포크

다른 사용자가 만든 캐릭터를 복제하여 자신만의 버전을 만들 수 있는 기능입니다.

**구현**:
- `parentCharacterId` 필드 활용
- 원본 캐릭터 정보 표시 (크레딧 부여 가능)
- 포크된 캐릭터는 독립적으로 수정 가능

### 4.4 캐릭터 가져오기/내보내기

캐릭터 설정을 JSON 파일로 내보내고 가져올 수 있는 기능입니다.

**용도**:
- 백업 및 복원
- 다른 플랫폼과의 호환성
- 캐릭터 공유 (파일 기반)

**JSON 형식 예시**:
```json
{
    "version": "1.0",
    "character": {
        "name": "춘심",
        "gender": "FEMALE",
        "age": "20대 초반",
        "personaPrompt": "...",
        "speechStyle": { ... },
        "lore": { ... }
    },
    "metadata": {
        "createdAt": "2026-01-15T00:00:00Z",
        "exportedAt": "2026-01-20T00:00:00Z"
    }
}
```

### 4.5 캐릭터 태그 및 카테고리 시스템

캐릭터를 태그와 카테고리로 분류하여 검색 및 발견을 용이하게 합니다.

**태그 시스템**:
- 자동 태그: 성격 키워드, 관계 유형 등에서 자동 추출
- 수동 태그: 사용자가 직접 추가
- 인기 태그: 많이 사용된 태그 표시

**카테고리**:
- `FRIEND`: 친구형 캐릭터
- `LOVER`: 연인형 캐릭터
- `MENTOR`: 멘토형 캐릭터
- `FANTASY`: 판타지 캐릭터
- `REALISTIC`: 현실적 캐릭터
- `ANIME`: 애니메이션 스타일
- `REALISTIC`: 리얼리즘 스타일

### 4.6 캐릭터 검색 및 발견 기능

공개된 캐릭터를 검색하고 발견할 수 있는 기능입니다.

**검색 기능**:
- 이름 검색
- 태그 검색
- 카테고리 필터링
- 인기순/최신순 정렬
- 평가순 정렬

**구현 파일**: `app/routes/characters/explore.tsx`

### 4.7 캐릭터 통계 및 분석

캐릭터별 사용 통계를 제공하여 사용자가 자신의 캐릭터 사용 패턴을 파악할 수 있습니다.

**통계 항목**:
- 총 대화 횟수
- 총 메시지 수
- 평균 대화 길이
- 가장 많이 사용한 시간대
- 감정 분포 (JOY, SAD 등)

**구현**: `app/routes/character/:id/stats.tsx`

### 4.8 캐릭터 간 대화 (Multi-character Conversations)

여러 캐릭터가 함께 대화하는 기능입니다.

**용도**:
- 두 캐릭터 간의 대화 시뮬레이션
- 그룹 채팅 (3명 이상)
- 역할극 시나리오

**구현**:
- `GroupConversation` 테이블 생성
- 여러 캐릭터를 한 대화방에 초대
- 각 캐릭터의 페르소나를 유지하면서 대화

### 4.9 캐릭터 학습 및 진화 시스템

사용자와의 대화를 통해 캐릭터가 점진적으로 학습하고 진화하는 기능입니다.

**학습 항목**:
- 사용자의 취향 파악
- 대화 패턴 학습
- 말투 미세 조정

**구현**:
- 주기적으로 대화 요약 분석
- 페르소나 프롬프트 자동 업데이트
- 사용자 확인 후 적용

### 4.10 캐릭터 미션 및 퀘스트 시스템

캐릭터가 사용자에게 미션을 제안하고 완료 시 보상을 제공하는 기능입니다.

**미션 유형**:
- 일일 대화 미션: "오늘 10번 이상 대화하기"
- 특정 주제 대화: "음악에 대해 이야기하기"
- 감정 표현: "기쁜 일을 공유하기"

**보상**:
- 크레딧 지급
- 특별 대화 해금
- 배지 획득

## 5. API 엔드포인트 설계

### 5.1 캐릭터 생성 및 관리

```
POST /api/characters/create
- 캐릭터 생성
- Request: { name, gender, age, role, relationshipType, ... }
- Response: { success: boolean, characterId: string, cost: number }

GET /api/characters
- 사용자의 캐릭터 목록 조회
- Response: { characters: UserCharacter[] }

GET /api/characters/:id
- 특정 캐릭터 상세 정보 조회
- Response: { character: UserCharacter }

PATCH /api/characters/:id
- 캐릭터 정보 수정
- Request: { name?, personaPrompt?, ... }
- Response: { success: boolean, character: UserCharacter }

DELETE /api/characters/:id
- 캐릭터 삭제
- Response: { success: boolean }
```

### 5.2 AI 이미지 생성

```
POST /api/characters/:id/generate-avatar
- AI 아바타 생성
- Request: { provider: "DALLE" | "STABLE_DIFFUSION", prompt?: string }
- Response: { success: boolean, imageUrl: string, cost: number }
```

### 5.3 캐릭터 공유 및 구독

```
GET /api/characters/explore
- 공개 캐릭터 탐색
- Query: ?search=...&category=...&tags=...&sort=popular|recent|rating
- Response: { characters: UserCharacter[], total: number }

POST /api/characters/:id/subscribe
- 캐릭터 구독
- Response: { success: boolean }

DELETE /api/characters/:id/subscribe
- 캐릭터 구독 취소
- Response: { success: boolean }

GET /api/characters/:id/subscribers
- 구독자 목록 조회 (본인 캐릭터만)
- Response: { subscribers: User[] }
```

### 5.4 캐릭터 평가

```
POST /api/characters/:id/rate
- 캐릭터 평가
- Request: { rating: number, review?: string }
- Response: { success: boolean }

GET /api/characters/:id/ratings
- 평가 목록 조회
- Response: { ratings: UserCharacterRating[], averageRating: number }
```

## 6. UI/UX 설계

### 6.1 캐릭터 생성 플로우

1. **기본 정보 입력** (`/characters/create`)
   - 이름, 성별, 나이, 직업 입력
   - 템플릿 선택 옵션 제공

2. **페르소나 설정** (`/characters/create/persona`)
   - 관계 설정
   - 성격 및 말투 설정
   - 배경 스토리 입력

3. **시각적 경험** (`/characters/create/visual`)
   - 아바타 업로드 또는 AI 생성 선택
   - 감정별 이미지 등록 (선택사항)

4. **최종 확인** (`/characters/create/review`)
   - 생성 비용 확인
   - 프리뷰 및 테스트 대화
   - 생성 완료

### 6.2 캐릭터 관리 페이지

**경로**: `/characters/:id/edit`

**섹션**:
- 기본 정보 편집
- 페르소나 편집
- 시각적 경험 편집
- 공개 설정
- 통계 및 분석
- 삭제 옵션

### 6.3 캐릭터 탐색 페이지

**경로**: `/characters/explore`

**기능**:
- 검색 바
- 카테고리 필터
- 태그 필터
- 정렬 옵션 (인기순/최신순/평가순)
- 캐릭터 카드 그리드
- 무한 스크롤 또는 페이지네이션

## 7. 단계별 구현 로드맵

### Phase 1: 기본 기능 (2주)
1. 데이터베이스 스키마 생성 (`UserCharacter`, `UserCharacterSubscription`)
2. 캐릭터 생성 API 구현
3. 페르소나 프롬프트 생성 로직 구현
4. 기본 캐릭터 생성 UI 구현

### Phase 2: AI 통합 (1주)
1. AI 시스템에 UserCharacter 지원 추가
2. 캐릭터별 메모리 시스템 구현
3. 대화 기능 테스트

### Phase 3: 시각적 경험 (2주)
1. 이미지 업로드 기능 구현
2. AI 이미지 생성 API 구현 (DALL-E, Stable Diffusion)
3. 감정별 아바타 시스템 구현

### Phase 4: 공유 및 커뮤니티 (2주)
1. 캐릭터 공개 설정 구현
2. 캐릭터 탐색 페이지 구현
3. 구독 기능 구현
4. 평가 시스템 구현

### Phase 5: 고급 기능 (3주)
1. 캐릭터 템플릿 시스템 구현
2. 버전 관리 시스템 구현
3. 통계 및 분석 기능 구현
4. 캐릭터 가져오기/내보내기 기능 구현

## 8. 기대 효과

### 8.1 사용자 측면
- **몰입감 증대**: 직접 만든 캐릭터와의 상호작용을 통한 강력한 유대감 형성
- **자유도 향상**: 원하는 모든 캐릭터를 생성하여 다양한 경험 제공
- **리텐션 향상**: 나만의 데이터와 기억이 쌓일수록 서비스 이탈 어려움

### 8.2 비즈니스 측면
- **콘텐츠 확장**: 사용자 생성 콘텐츠(UGC)를 통한 서비스 내 콘텐츠 무한 확장
- **수익 모델**: 캐릭터 생성, AI 이미지/보이스 생성, 마켓플레이스 수익 쉐어
- **차별화**: 경쟁 서비스 대비 독특한 기능으로 시장에서 차별화

### 8.3 기술적 측면
- **확장성**: 기존 시스템과의 통합을 통한 안정적인 확장
- **재사용성**: 기존 AI 시스템, 크레딧 시스템, 인증 시스템 재사용
- **유지보수성**: 모듈화된 구조로 유지보수 용이


## Related Documents
- **Specs**: [Document Management Plan](../01_Concept_Design/09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
