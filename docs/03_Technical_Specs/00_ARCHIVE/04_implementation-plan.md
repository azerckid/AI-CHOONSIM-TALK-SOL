# ADMIN_PAGE_IMPLEMENTATION_PLAN: 통합 관리자 시스템 구축 계획
> Created: 2026-02-08
> Last Updated: 2026-02-08

본 문서는 `docs/ADMIN_PAGE_REQUIREMENTS.md`와 `docs/CHATTING_ITEM_PLAN.md`를 통합하여, 캐릭터 관리부터 가상 아이템(하트) 선물 시스템까지 아우르는 어드민 페이지 구현 가이드를 정의합니다.

**프로젝트 컨텍스트:**
- **Framework**: React Router v7 (Vite)
- **Database**: Turso (libSQL) with Prisma ORM
- **Authentication**: Better Auth (session-based)
- **UI Components**: shadcn/ui (Nova Preset) + Tailwind CSS v4
- **Current Status**: Phase 1-5 완료 (2026-01-05)
- **Next Step**: Phase 6 (서비스 통합 및 유저 기능 활성화)
- **Character Data**: DB 및 `app/lib/characters.ts` 연동 완료

---

## 1. 아키텍처 및 보안 (Architecture & Security)

### 1.1 기술 스택
- **Framework**: React Router v7 (Vite)
- **UI Components**: shadcn/ui (Nova Preset) + Tailwind CSS v4
- **Data Persistence**: Prisma + Turso (libSQL)
- **Authentication**: Better Auth (Access Control via Middleware)
- **Validation**: Zod (schema validation)
- **Toast Notifications**: Sonner (shadcn/ui)

### 1.2 접근 제어 (Access Control) - Hybrid Strategy

**현재 상태**: 구현 전. 다음 두 가지 방식을 조합하여 구현 예정.

#### 1.2.1 환경 변수 기반 Super Admin (1단계)
- **환경 변수**: `.env` 파일에 `ADMIN_EMAILS` 추가 (예: `ADMIN_EMAILS=admin@example.com,owner@example.com`)
- **구현 위치**: `app/lib/auth.server.ts`에 `isAdminEmail()` 헬퍼 함수 추가
- **동작 방식**: 해당 이메일로 로그인한 사용자는 DB Role과 무관하게 무조건 Admin 권한 부여
- **용도**: 초기 관리자 설정 및 긴급 접근

#### 1.2.2 DB Role 기반 Admin (2단계)
- **User 모델 확장**: `User` 모델에 `role` 필드 추가 필요 (현재 없음)
- **Role 값**: `"USER"` (기본값), `"ADMIN"`
- **구현 위치**: `app/lib/auth.server.ts`에 `requireAdmin()` 함수 추가
- **동작 방식**: `User.role === "ADMIN"`인 사용자에게 접근 권한 부여
- **용도**: 확장 가능한 관리자 시스템

#### 1.2.3 Middleware 구현
- **파일 경로**: `app/routes/admin/*` 및 `app/routes/api.admin.*.ts` (React Router v7 파일 기반 라우팅)
- **구현 방식**: 각 라우트의 `loader`/`action` 함수 시작 부분에서 `requireAdmin()` 호출
- **예시**:
  ```typescript
  // app/routes/admin/dashboard.tsx
  export async function loader({ request }: LoaderFunctionArgs) {
    await requireAdmin(request);
    // ... admin 로직
  }
  ```

---

## 2. 데이터베이스 스키마 확장 (Schema Expansion)

기존 스키마에 캐릭터와 아이템 시스템을 위한 모델을 추가합니다.

**참고**: 현재 프로젝트에는 별도의 `Character` 테이블이 없으며, `app/lib/characters.ts`에 하드코딩된 CHARACTERS 객체를 사용합니다. 따라서 초기 구현 시 `CharacterStat`의 `characterId`는 문자열 ID로 저장됩니다.

### 2.1 User 모델 확장 (필수)

**현재 상태**: `User` 모델에 `role` 필드가 없음. Phase 1에서 추가 예정.

```prisma
model User {
  // ... 기존 필드들
  role            String?  @default("USER") // "USER", "ADMIN" (Phase 1에서 추가 필요)
  
  // 아이템 시스템 관계 추가 (Phase 3에서 추가)
  UserInventory   UserInventory[]
  GiftLog         GiftLog[]
}
```

**주의**: 현재 스키마에는 `role` 필드가 없으므로, Phase 1에서 마이그레이션을 통해 추가해야 합니다.

### 2.2 Character 모델 (선택사항 - 향후 구현)

**현재 상태**: 하드코딩된 CHARACTERS 객체 사용 중. DB 전환은 선택사항.

```prisma
// Phase 2에서 구현 예정 (캐릭터 CMS 완성 후)
model Character {
  id              String   @id // 기존 characterId 사용 (예: "chunsim")
  name            String
  role            String   // "IDOL", "MODEL" 등
  bio             String
  personaPrompt   String   @db.Text
  greetingMessage String?
  isOnline        Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // 미디어 관계
  media           CharacterMedia[]
  
  stats           CharacterStat?
  gifts           GiftLog[]
  Conversation    Conversation[]
}

// 2.2.1 캐릭터 감정 제어 지침 (Emotion Control Instructions)
model CharacterEmotionInstruction {
  id              String   @id @default(uuid())
  characterId     String
  triggerType     String   // "GIFT_SMALL", "GIFT_MEDIUM", "GIFT_LARGE", "GIFT_MEGA", "CONTINUOUS_GIFT"
  instruction     String   @db.Text // AI에게 전달할 구체적인 행동/말투 지침
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  character       Character @relation(fields: [characterId], references: [id], onDelete: Cascade)
  
  @@unique([characterId, triggerType])
}

// 2.3 캐릭터 미디어 (사진/용도 분류)
model CharacterMedia {
  id          String   @id @default(uuid())
  characterId String
  url         String
  // "AVATAR", "COVER", "NORMAL", "SECRET"
  type        String   
  // AI 호출 순서 또는 노출 순서
  sortOrder   Int      @default(0) 
  createdAt   DateTime @default(now())

  character   Character @relation(fields: [characterId], references: [id], onDelete: Cascade)

  @@index([characterId, type])
}

```

### 2.3 아이템 시스템 모델 (`docs/CHATTING_ITEM_PLAN.md`와 일관성 유지)

```prisma
// 1. 가상 아이템 (하트 등)
model Item {
  id          String   @id @default(uuid())
  name        String   // "하트", "장미" 등
  type        String   // "GIFT", "CONSUMABLE"
  priceCredits Int?   // 크레딧 가격 (null이면 직접 결제만 가능)
  priceUSD    Float?  // USD 가격 (직접 결제)
  priceKRW    Float?  // KRW 가격 (직접 결제)
  iconUrl     String?  // 아이템 이미지/아이콘 경로
  description String?  // 아이템 설명
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  UserInventory UserInventory[]
  GiftLog       GiftLog[]
  
  @@index([isActive])
}

// 2. 캐릭터 선물 통계 (characterId는 문자열 ID)
model CharacterStat {
  id                String   @id @default(uuid())
  characterId       String   // "chunsim", "character2" 등 (CHARACTERS 객체의 키)
  totalHearts       Int      @default(0)
  totalUniqueGivers Int      @default(0)
  lastGiftAt        DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // GiftLog와의 직접 관계 없음 (toCharacterId로 조회)
  // GiftLog에서 CharacterStat을 업데이트할 때는 characterId로 찾아서 업데이트
  
  @@unique([characterId])
  @@index([totalHearts]) // 랭킹 조회용
}

// 3. 선물 로그
model GiftLog {
  id            String   @id @default(uuid())
  fromUserId    String
  toCharacterId String   // CHARACTERS 객체의 키 (문자열 ID)
  itemId        String
  amount        Int      // 보낸 수량
  message       String?  // 선물과 함께 보낸 짧은 메시지
  createdAt     DateTime @default(now())
  
  User          User     @relation(fields: [fromUserId], references: [id], onDelete: Cascade)
  Item          Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)
  // CharacterStat은 toCharacterId로 조회 (직접 관계 없음)
  // CharacterStat을 업데이트할 때는 toCharacterId로 찾아서 업데이트
  
  @@index([fromUserId, createdAt])
  @@index([toCharacterId, createdAt])
  @@index([createdAt]) // 시간대별 통계용
}

// 4. 유저 인벤토리 (보유 하트 수 등)
model UserInventory {
  id        String   @id @default(uuid())
  userId    String
  itemId    String
  quantity  Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  User User @relation(fields: [userId], references: [id], onDelete: Cascade)
  Item Item @relation(fields: [itemId], references: [id], onDelete: Cascade)
  
  @@unique([userId, itemId])
  @@index([userId])
}
```

**초기 구현 전략**:
- `Item` 모델은 초기에 TypeScript 상수로 관리 가능 (`app/lib/items.ts`)
- `CharacterStat`은 `characterId`를 문자열로 저장 (CHARACTERS 객체의 키 사용)
- `GiftLog`와 `CharacterStat`은 직접 관계 없음. `toCharacterId`로 `CharacterStat`을 조회하여 업데이트
- 향후 Character 테이블이 추가되면 `CharacterStat`과 `GiftLog`의 관계를 업데이트

### 2.5 캐릭터 미디어 타입 정의 (Media Categorization)

| 타입 (Type) | 용도 (Purpose) | 설명 |
| :--- | :--- | :--- |
| **AVATAR** | 프로필 용 | 채팅 목록, 헤더, 전역 식별용 메인 사진 (1장 권장) |
| **COVER** | 배경 용 | 캐릭터 상세 페이지의 최상단 배경 이미지 |
| **NORMAL** | 채팅/일상 용 | AI가 대화 중 `[PHOTO:N]` 형태로 호출하는 일반 갤러리 사진 |
| **SECRET** | 고수위/보상 용 | 특정 친밀도 달성 또는 하트 선물 시 해금되는 특별 사진 |

---

## 3. 어드민 페이지 주요 메뉴 (Admin Navigation)

### 3.1 캐릭터 관리 (Character CMS)
- **캐릭터 리스트**: 등록된 캐릭터 목록 및 활성화 상태 관리.
- **캐릭터 카드 편집**: 프롬프트 작성기, 이미지 업로드(Cloudinary 연동), 기본 정보 수정.
- **갤러리 관리**: 캐릭터별 전용 사진/동영상 업로드 및 순서 변경.

### 3.2 아이템 및 경제 관리 (Economy & Items)
- **아이템 스토어 설정**: 판매할 아이템(하트 등)의 크레딧 가격 및 아이콘 설정.
- **선물 통계**: 어떤 캐릭터가 가장 많은 하트를 받았는지에 대한 랭킹 대시보드.
- **로그 추적**: 특정 유저의 비정상적인 아이템 구매/선물 이력 모니터링.

### 3.3 사용자 및 결제 관리 (User & Payment)
- **사용자 조회**: 유저별 보유 크레딧, 보유 아이템, 구독 등급 확인 및 수동 조정.
- **결제 내역**: PayPal/Toss를 통한 결제 시도 및 성공 로그 통합 조회.

---

## 4. 구현 로직 상세 (Implementation Logic)

### 4.1 Admin 인증 헬퍼 함수 구현

**파일**: `app/lib/auth.server.ts`에 추가

```typescript
/**
 * 환경 변수에서 Super Admin 이메일 목록 가져오기
 */
function getAdminEmails(): string[] {
  const emails = process.env.ADMIN_EMAILS || "";
  return emails.split(",").map(e => e.trim()).filter(Boolean);
}

/**
 * 이메일이 Super Admin인지 확인
 */
export function isAdminEmail(email: string): boolean {
  return getAdminEmails().includes(email);
}

/**
 * 사용자가 Admin 권한을 가지고 있는지 확인
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, role: true },
  });
  
  if (!user) return false;
  
  // Super Admin (환경 변수) 또는 DB Role Admin
  return isAdminEmail(user.email) || user.role === "ADMIN";
}

/**
 * Admin 권한이 없으면 에러 반환 (Loader/Action에서 사용)
 */
export async function requireAdmin(request: Request): Promise<void> {
  const userId = await requireUserId(request);
  if (!userId) {
    throw new Response("Unauthorized", { status: 401 });
  }
  
  const hasAdminAccess = await isAdmin(userId);
  if (!hasAdminAccess) {
    throw new Response("Forbidden", { status: 403 });
  }
}
```

### 4.2 캐릭터 데이터 마이그레이션 (Initialization) - 선택사항

**현재 상태**: 하드코딩된 CHARACTERS 객체 사용 중. DB 전환은 Phase 2에서 선택적으로 진행.

- `scripts/seed-characters.mjs` 작성: `app/lib/characters.ts`의 하드코딩 데이터를 `Character` 테이블로 최초 1회 대량 INSERT.
- **주의**: Character 테이블이 추가된 후에만 실행 가능.

### 4.3 인앱 선물(Gifting) 연동

**참고**: `docs/CHATTING_ITEM_PLAN.md` Phase 2와 동일한 로직.

- **Frontend**: 채팅창 하단 바에 `HeartButton` 추가 (`app/components/chat/MessageInput.tsx` 수정)
- **Backend (Transaction)**: `app/routes/api.items.gift.ts`
  1. `UserInventory` 수량 확인 및 차감
  2. `CharacterStat` 조회 (없으면 생성) - `characterId`로 조회
  3. `CharacterStat.totalHearts` 증가
  4. `CharacterStat.totalUniqueGivers` 업데이트 (중복 체크)
  5. `GiftLog` 생성
  6. (Optional) AI에게 선물 이벤트 전달하여 특수 대화 유도

**주의**: `GiftLog`와 `CharacterStat`은 직접 관계가 없으므로, 트랜잭션 내에서 `characterId`로 `CharacterStat`을 조회하여 업데이트해야 합니다.

---

## 5. 구현 우선순위 (Roadmap)

### Phase 1: 인프라 및 인증 (Infrastructure & Authentication) - [완료]
### Phase 2: 캐릭터 CMS (Character Content Management) - [완료]
### Phase 3: 아이템 시스템 (Item & Economy Management) - [완료]
### Phase 4: 사용자 및 결제 관리 (User & Payment Management) - [완료]
### Phase 5: 시스템 모니터링 및 운영 기능 - [완료]

### Phase 6: 서비스 통합 및 유저 기능 활성화 (User Integration)

**목표**: 관리자 도구로 생성한 콘텐츠를 실제 유저가 소비할 수 있도록 프론트엔드 연동

1. **실시간 공지사항 연동**
   - `home.tsx`, `fandom.tsx`의 하드코딩된 뉴스 섹션을 `Notice` DB 데이터로 교체
   - 전체 공지사항 목록(`routes/notices/index.tsx`) 및 상세 페이지 구현

2. **미션 시스템 활성화**
   - `UserMission` 모델 추가 및 유저별 미션 진행도 추적 로직 구현
   - `fandom.tsx` 또는 별도의 `/missions` 페이지에서 실시간 미션 현황 표시
   - 미션 완료 및 보상(크레딧) 수령 기능 구현

3. **팬 피드(Fan Feed) 연동**
   - `FanPost` 모델 추가 및 유저 게시글 작성 기능 구현
   - `fandom.tsx`의 피드를 실시간 DB 데이터로 교체

4. **사용자 경험 고도화**
   - 홈 화면의 'Quick Access' 버튼(Daily Gift 등) 실제 로직 연동
   - 프로필 페이지에 미션 및 공지사항 바로가기 추가

### Phase 7: 동적 감정 제어 및 프롬프트 관리 (Dynamic Emotion Control)

**목표**: 하드코딩된 AI 리액션 지침을 DB로 이전하고, 어드민에서 실시간으로 수정 가능하게 구현

1. **감정 제어 DB 스키마 적용**
   - `CharacterEmotionInstruction` 모델을 통해 선물 규모 및 연속성에 따른 지침 저장
2. **어드민 프롬프트 에디터 구현**
   - 캐릭터 편집 페이지에 '리액션 설정' 탭 추가
   - 선물 등급별(Small/Medium/Large/Mega) 및 연속 선물 보너스 지침 편집 UI 제공
3. **AI 로직 연동 (ai.server.ts)**
   - 하드코딩된 `giftInstruction` 대신 DB에서 해당 캐릭터의 지침을 조회하여 시스템 명령에 동적으로 삽입
   - **감정 분석기(Emotion Analyzer)** 를 가동하여 답변 시 감정 코드(`EMOTION:CODE`)를 함께 출력하도록 강제
   - 캐싱 로직(Redis 또는 메모리)을 적용하여 DB 부하 최소화

---

## 6. API 라우트 구조 (React Router v7 파일 기반 라우팅)

### Admin 페이지 라우트
- `app/routes/admin/dashboard.tsx` → `/admin/dashboard`
- `app/routes/admin/characters/index.tsx` → `/admin/characters`
- `app/routes/admin/characters/$id.tsx` → `/admin/characters/:id`
- `app/routes/admin/items/index.tsx` → `/admin/items`
- `app/routes/admin/users/index.tsx` → `/admin/users`

### Admin API 라우트
- `app/routes/api.admin.characters.index.ts` → `POST /api/admin/characters`
- `app/routes/api.admin.characters.$id.ts` → `GET/PUT/DELETE /api/admin/characters/:id`
- `app/routes/api.admin.items.index.ts` → `POST /api/admin/items`
- `app/routes/api.admin.users.$id.ts` → `GET/PUT /api/admin/users/:id`

**보안**: 모든 Admin API 라우트의 `loader`/`action` 함수 시작 부분에 `await requireAdmin(request)` 호출 필수.

---

## 7. 환경 변수 설정

`.env` 파일에 다음 변수 추가:

```env
# Admin 접근 제어
ADMIN_EMAILS=admin@example.com,owner@example.com
```


## Related Documents
- **Specs**: [Document Management Plan](../01_Concept_Design/09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
