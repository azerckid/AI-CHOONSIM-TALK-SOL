# Prisma to Drizzle 전환 계획서 (Migration Plan)

## 1. 개요 (Introduction)
현재 프로젝트에서 사용 중인 **Prisma ORM**을 **Drizzle ORM**으로 전환하여, **Turso(libSQL)** 데이터베이스와의 궁합을 최적화하고 에지(Edge) 환경에서의 성능을 극대화하는 것을 목표로 합니다.

**현재 상태:**
- Prisma 사용 파일: **48개**
- 주요 사용 영역: API 라우트, 인증 시스템, 크론 잡, 로거 시스템
- Prisma 트랜잭션: 다수 사용 (`$transaction`)
- 복잡한 관계 쿼리: `include`, `select` 등 광범위하게 사용

---

## 2. 전환 사유 (Rationale)
*   **Turso 최적화**: Drizzle은 libSQL 드라이버를 네이티브하게 지원하여 불필요한 어댑터 계층을 줄입니다.
*   **마이그레이션 편의성**: Prisma의 복잡한 마이그레이션 워크플로우를 단순화하여 원격 Turso DB 관리를 용이하게 합니다.
*   **런타임 성능**: Rust 바이너리 엔진이 없는 가벼운 아키텍처로 Cold Start 시간을 단축하고 메모리 사용량을 절감합니다.
*   **공유 데이터베이스 호환성**: 기존 Prisma 기반의 다른 프로젝트들에 영향을 주지 않으면서 독립적으로 운영 가능합니다.
*   **타입 안정성**: Drizzle의 강력한 타입 추론으로 개발 생산성 향상.

---

## 3. 기술 스택 (Tech Stack)
*   **ORM**: `drizzle-orm` (최신 버전)
*   **CLI/Migration**: `drizzle-kit` (최신 버전)
*   **Driver**: `@libsql/client` (이미 설치됨, v0.15.15)
*   **추가 패키지**: `drizzle-orm` (libSQL 어댑터 포함)

---

## 4. 마이그레이션 전략 (Migration Strategy)
현재 데이터베이스의 구조를 그대로 유지하면서 **코드 계층(ORM)만 교체**하는 방식을 채택합니다.

### 4.1 스키마 매핑 (Schema Mapping)
*   `prisma/schema.prisma`의 모든 모델(약 20개 이상)을 `app/db/schema.ts`에 일대일로 정의합니다.
*   기존 테이블명, 컬럼명, 관계 설정을 그대로 유지하여 데이터 무결성을 보장합니다.
*   Prisma의 `@default(uuid())` → Drizzle의 `default(sql`uuid()`())`로 변환.
*   Prisma의 `@updatedAt` → Drizzle의 `updatedAt: timestamp().$onUpdate(() => new Date())`로 변환.

### 4.2 데이터베이스 연결 (DB Connection)
*   `app/lib/db.server.ts`를 수정하여 `PrismaClient` 대신 Drizzle의 `db` 인스턴스를 내보냅니다.
*   기타 프로젝트 파이프라인(Zod 스키마 등)과의 호환성을 유지합니다.
*   점진적 전환을 위해 `prisma`와 `db` 객체를 병행 사용 가능하도록 임시 구성.

### 4.3 Better Auth 통합 고려사항
*   Better Auth가 Prisma를 직접 사용하는 경우, Drizzle 어댑터 또는 커스텀 어댑터 필요 여부 확인.
*   Better Auth 설정 파일(`app/lib/auth.server.ts`)에서 데이터베이스 연결 부분 수정 필요.

---

## 5. Prisma → Drizzle 문법 매핑 가이드

### 5.1 기본 쿼리

#### Find Unique
```typescript
// Prisma
const user = await prisma.user.findUnique({
  where: { id: userId }
});

// Drizzle
const user = await db.query.user.findFirst({
  where: eq(user.id, userId)
});
```

#### Find Many
```typescript
// Prisma
const users = await prisma.user.findMany({
  where: { subscriptionTier: "PREMIUM" },
  orderBy: { createdAt: "desc" },
  take: 10
});

// Drizzle
const users = await db.query.user.findMany({
  where: eq(user.subscriptionTier, "PREMIUM"),
  orderBy: [desc(user.createdAt)],
  limit: 10
});
```

### 5.2 관계 쿼리 (Include → With)

#### 단일 관계
```typescript
// Prisma
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: { UserInventory: true }
});

// Drizzle
const user = await db.query.user.findFirst({
  where: eq(user.id, userId),
  with: { userInventory: true }
});
```

#### 중첩 관계
```typescript
// Prisma
const conversation = await prisma.conversation.findUnique({
  where: { id: conversationId },
  include: {
    Message: {
      include: { MessageLike: true }
    },
    User: true
  }
});

// Drizzle
const conversation = await db.query.conversation.findFirst({
  where: eq(conversation.id, conversationId),
  with: {
    message: {
      with: { messageLike: true }
    },
    user: true
  }
});
```

### 5.3 Select 쿼리

```typescript
// Prisma
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    name: true,
    credits: true,
    UserInventory: {
      select: { itemId: true, quantity: true }
    }
  }
});

// Drizzle
const user = await db.query.user.findFirst({
  where: eq(user.id, userId),
  columns: {
    id: true,
    name: true,
    credits: true
  },
  with: {
    userInventory: {
      columns: { itemId: true, quantity: true }
    }
  }
});
```

### 5.4 트랜잭션

#### 단순 트랜잭션
```typescript
// Prisma
await prisma.$transaction(async (tx) => {
  await tx.user.update({
    where: { id: userId },
    data: { credits: { increment: 100 } }
  });
  await tx.payment.create({
    data: { userId, amount: 10, status: "COMPLETED" }
  });
});

// Drizzle
await db.transaction(async (tx) => {
  await tx.update(user)
    .set({ credits: sql`${user.credits} + 100` })
    .where(eq(user.id, userId));
  
  await tx.insert(payment).values({
    userId,
    amount: 10,
    status: "COMPLETED"
  });
});
```

#### 복잡한 트랜잭션 (조건부 업데이트)
```typescript
// Prisma
await prisma.$transaction(async (tx) => {
  const inventory = await tx.userInventory.findUnique({
    where: { userId_itemId: { userId, itemId } }
  });
  
  if (inventory && inventory.quantity >= amount) {
    await tx.userInventory.update({
      where: { userId_itemId: { userId, itemId } },
      data: { quantity: { decrement: amount } }
    });
  } else {
    throw new Error("Insufficient quantity");
  }
});

// Drizzle
await db.transaction(async (tx) => {
  const inventory = await tx.query.userInventory.findFirst({
    where: and(
      eq(userInventory.userId, userId),
      eq(userInventory.itemId, itemId)
    )
  });
  
  if (inventory && inventory.quantity >= amount) {
    await tx.update(userInventory)
      .set({ quantity: sql`${userInventory.quantity} - ${amount}` })
      .where(and(
        eq(userInventory.userId, userId),
        eq(userInventory.itemId, itemId)
      ));
  } else {
    throw new Error("Insufficient quantity");
  }
});
```

### 5.5 Upsert

```typescript
// Prisma
await prisma.userInventory.upsert({
  where: { userId_itemId: { userId, itemId } },
  create: { userId, itemId, quantity: 10 },
  update: { quantity: { increment: 10 } }
});

// Drizzle
await db.insert(userInventory)
  .values({ userId, itemId, quantity: 10 })
  .onConflictDoUpdate({
    target: [userInventory.userId, userInventory.itemId],
    set: { quantity: sql`${userInventory.quantity} + 10` }
  });
```

### 5.6 집계 (Aggregate)

```typescript
// Prisma
const stats = await prisma.payment.aggregate({
  where: { status: "COMPLETED" },
  _sum: { amount: true },
  _count: { id: true }
});

// Drizzle
const stats = await db
  .select({
    totalAmount: sum(payment.amount),
    count: count(payment.id)
  })
  .from(payment)
  .where(eq(payment.status, "COMPLETED"));
```

### 5.7 복잡한 조건 (OR, AND, IN)

```typescript
// Prisma
const users = await prisma.user.findMany({
  where: {
    OR: [
      { subscriptionTier: "PREMIUM" },
      { subscriptionTier: "ULTIMATE" }
    ],
    credits: { gte: 100 }
  }
});

// Drizzle
const users = await db.query.user.findMany({
  where: and(
    or(
      eq(user.subscriptionTier, "PREMIUM"),
      eq(user.subscriptionTier, "ULTIMATE")
    ),
    gte(user.credits, 100)
  )
});
```

---

## 6. 단계별 실행 계획 (Step-by-Step Plan)

### **Phase 1: 인프라 설정 (Infrastructure)** - 예상 소요: 2-3일

#### 1.1 패키지 설치
- [x] `drizzle-orm` 설치 (`npm install drizzle-orm`)
- [x] `drizzle-kit` 설치 (`npm install -D drizzle-kit`)
- [x] 버전 확인 및 호환성 검증

#### 1.2 Drizzle 설정 파일 생성
- [x] `drizzle.config.ts` 생성 (Turso 접속 정보 포함)
  ```typescript
  import { defineConfig } from "drizzle-kit";
  
  export default defineConfig({
    schema: "./app/db/schema.ts",
    out: "./drizzle",
    dialect: "sqlite",
    driver: "turso",
    dbCredentials: {
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    },
  });
  ```

#### 1.3 스키마 파일 생성
- [x] `app/db/schema.ts` 작성
  - Prisma 스키마의 모든 모델을 Drizzle 스키마로 변환
  - 관계(relations) 정의
  - 인덱스 및 제약조건 매핑
  - 예상 작업량: 약 20개 모델 × 평균 30분 = 10시간

#### 1.4 초기 마이그레이션 생성
- [x] `drizzle-kit generate` 실행하여 스키마 검증
- [x] 기존 Prisma 마이그레이션과 충돌 없는지 확인

---

### **Phase 2: 연결 설정 (Connection)** - 예상 소요: 1일

#### 2.1 데이터베이스 연결 리팩토링
- [x] `app/lib/db.server.ts` 수정
  - Drizzle 인스턴스 초기화
  - Prisma와 Drizzle 병행 사용 가능하도록 구성
  ```typescript
  import { drizzle } from "drizzle-orm/libsql";
  import { createClient } from "@libsql/client";
  import * as schema from "~/db/schema";
  
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  
  export const db = drizzle(client, { schema });
  
  // 임시: Prisma와 병행 사용
  export { prisma } from "./prisma.server";
  ```

#### 2.2 타입 정의 확인
- [x] Drizzle 스키마에서 생성된 타입이 올바르게 추론되는지 확인
- [x] TypeScript 컴파일 오류 없음 확인

---

### **Phase 3: 코드 리팩토링 (Refactoring)** - 예상 소요: 10-15일

**전체 파일 수: 48개**  
**우선순위별 분류:**

#### 3.1 Critical (핵심 기능) - 우선순위 1 - 예상 소요: 4-5일

**파일 목록:**
1. `app/routes/api/items/gift.ts` ✅ (전환 완료)
2. `app/routes/api/chat/index.ts` ✅ (전환 완료)
3. `app/routes/api/items/purchase.ts` ✅ (전환 완료)
4. `app/lib/auth.server.ts` ✅ (전환 완료)
5. `app/routes/api.payment.item.capture-order.ts` ✅ (전환 완료)
6. `app/lib/toss.server.ts` (전환 보류 - Toss Payments 연동 로직 확인 필요)

**소계: 핵심 기능 전환 완료**

#### 3.2 High (중요 기능) - 우선순위 2 - 예상 소요: 3-4일

**파일 목록:**
7. `app/routes/api/chat/create.ts` ✅ (전환 완료)
8. `app/routes/api/chat/delete.ts` ✅ (전환 완료)
9. `app/routes/api/messages/index.ts` ✅ (전환 완료)
10. `app/routes/api/messages/$id.like.ts` ✅ (전환 완료)
11. `app/routes/api.payment.capture-order.ts` ✅ (전환 완료)
12. `app/routes/api.payment.create-order.ts` ✅ (전환 완료)
13. `app/routes/api.payment.activate-subscription.ts` ✅ (전환 완료)
14. `app/routes/api.payment.cancel-subscription.ts` ✅ (전환 완료)
15. `app/routes/api.payment.toss.confirm.ts` ✅ (전환 완료)
16. `app/routes/api.webhooks.paypal.ts`
17. `app/routes/api/items/purchase.ts`
18. `app/routes/api/stats/usage.ts`
19. `app/routes/api/push-subscription.ts`

**예상 작업 시간: 각 1-2시간 × 13개 = 약 20시간 (3일)**

#### 3.3 Medium (일반 기능) - 우선순위 3 - 예상 소요: 2-3일

**파일 목록:**
20. `app/routes/chat/$id.tsx` (Loader) ✅ (전환 완료)
21. `app/routes/chat/index.tsx` (Loader) ✅ (전환 완료)
22. `app/routes/home.tsx` (Loader)
23. `app/routes/fandom.tsx` (Loader) ✅ (전환 완료)
24. `app/routes/pricing.tsx` (Loader)
25. `app/routes/profile/index.tsx` (Loader)
26. `app/routes/profile/subscription.tsx` (Loader)
27. `app/routes/profile/edit.tsx` (Loader)
28. `app/routes/profile/saved.tsx` (Loader)
29. `app/routes/notices/index.tsx` (Loader) ✅ (전환 완료)
30. `app/routes/notices/$id.tsx` (Loader) ✅ (전환 완료)
31. `app/routes/missions.tsx` (Loader) ✅ (전환 완료)
32. `app/routes/character/$id.tsx` (Loader)
33. `app/routes/onboarding/persona.tsx` (Loader) ✅ (전환 완료)
34. `app/routes/settings.tsx` (Loader)

**예상 작업 시간: 각 30분-1시간 × 15개 = 약 12시간 (2일)**

#### 3.4 Low (관리자 기능) - 우선순위 4 - 예상 소요: 2일

**파일 목록:**
35. `app/routes/admin/dashboard.tsx` ✅ (전환 완료)
36. `app/routes/admin/users/index.tsx` ✅ (전환 완료)
37. `app/routes/admin/users/detail.tsx` ✅ (전환 완료)
38. `app/routes/admin/characters/index.tsx` ✅ (전환 완료)
39. `app/routes/admin/characters/edit.tsx` ✅ (전환 완료)
40. `app/routes/admin/items/index.tsx` ✅ (전환 완료)
41. `app/routes/admin/items/edit.tsx` ✅ (전환 완료)
42. `app/routes/admin/items/statistics.tsx` ✅ (전환 완료)
43. `app/routes/admin/payments/index.tsx` ✅ (전환 완료)
44. `app/routes/admin/system.tsx` ✅ (전환 완료)
45. `app/routes/admin/content/feed.tsx` ✅ (전환 완료)
46. `app/routes/admin/content/index.tsx` ✅ (전환 완료)
47. `app/routes/admin/notices/index.tsx` ✅ (전환 완료)
48. `app/routes/admin/notices/edit.tsx` ✅ (전환 완료)
49. `app/routes/admin/missions/index.tsx` ✅ (전환 완료)
50. `app/routes/admin/missions/edit.tsx` ✅ (전환 완료)

**예상 작업 시간: 각 30분-1시간 × 16개 = 약 12시간 (2일)**

#### 3.5 유틸리티 및 서비스 파일 - 예상 소요: 1일

**파일 목록:**
51. `app/lib/cron.server.ts` (크론 잡)
52. `app/lib/logger.server.ts` (로거) ✅ (전환 완료)
53. `app/routes/api/test-cron.ts` ✅ (전환 완료)
54. `app/lib/toss.server.ts` ✅ (전환 완료)
55. `app/lib/ai.server.ts` ✅ (전환 완료)

**예상 작업 시간: 각 2-3시간 × 3개 = 약 8시간 (1일)**

**Phase 3 총 예상 소요 시간: 약 74시간 (10-15일)**

---

### **Phase 4: 검증 및 정리 (Cleanup)** - 예상 소요: 3-5일

#### 4.1 기능 테스트
- [ ] **채팅 시스템 테스트**
  - 메시지 생성/조회
  - AI 응답 스트리밍
  - 감정 상태 업데이트
  - 메시지 좋아요

- [ ] **선물 시스템 테스트**
  - 아이템 구매 (크레딧)
  - 아이템 구매 (PayPal/Toss)
  - 선물 발송
  - 인벤토리 관리
  - 통계 업데이트

- [ ] **결제 시스템 테스트**
  - PayPal 결제 (일회성/구독)
  - Toss Payments 결제
  - 웹훅 처리
  - 구독 관리

- [ ] **인증 시스템 테스트**
  - 로그인/회원가입
  - 소셜 로그인 (Google, Kakao, Twitter)
  - 권한 확인 (Admin)

- [ ] **관리자 시스템 테스트**
  - 캐릭터 관리
  - 아이템 관리
  - 사용자 관리
  - 결제 내역 조회
  - 통계 대시보드

#### 4.2 성능 벤치마크
- [ ] **Cold Start 시간 측정**
  - 목표: Prisma 대비 20% 이상 개선
  - 측정 방법: Vercel Edge Function 배포 후 측정

- [ ] **쿼리 성능 측정**
  - 목표: 복잡한 관계 쿼리에서 Prisma 대비 10% 이상 개선
  - 측정 방법: 주요 API 엔드포인트 응답 시간 비교

- [ ] **메모리 사용량 측정**
  - 목표: Prisma 대비 30% 이상 절감
  - 측정 방법: 프로덕션 환경에서 메모리 프로파일링

#### 4.3 코드 정리
- [x] Prisma 관련 패키지 삭제 ✅ (완료)
  - `@prisma/client`
  - `@prisma/adapter-libsql`
  - `prisma` (devDependencies)
- [x] Prisma 스키마 파일 제거 (`prisma/schema.prisma`) ✅ (완료)
- [x] Prisma 설정 파일 제거 (`prisma.config.ts`) ✅ (완료)
- [x] `postinstall` 스크립트에서 `prisma generate` 제거 ✅ (완료)
- [x] `app/lib/db.server.ts`에서 Prisma 임포트 제거 ✅ (완료)

#### 4.4 마이그레이션 관리
- [x] `_prisma_migrations` 테이블은 그대로 유지 (히스토리 보존) ✅ (완료)
- [x] 이후 마이그레이션은 Drizzle 기반으로 진행 ✅ (완료)
- [x] `drizzle-kit push` 또는 `drizzle-kit migrate` 사용 ✅ (완료)

---

## 7. 안전 조치 (Safety Measures)

### 7.1 백업 전략
*   **전면 백업**: 작업 시작 전 Turso DB의 전체 SQL Dump를 다시 한 번 수행합니다.
  ```bash
  # Turso CLI를 사용한 백업
  turso db dump <database-name> > backup_$(date +%Y%m%d_%H%M%S).sql
  ```
*   **단계별 백업**: 각 Phase 완료 후 백업 수행
*   **롤백 준비**: 백업 파일을 안전한 위치에 보관

### 7.2 점진적 적용
*   **병행 운영**: Prisma와 Drizzle을 병행 사용하며 점진적으로 전환
*   **핵심 기능 우선**: Critical → High → Medium → Low 순서로 전환
*   **단계별 검증**: 각 파일 전환 후 즉시 테스트

### 7.3 기존 프로젝트 보호
*   **테이블 구조 유지**: 테이블 구조를 절대 변경하지 않음
*   **마이그레이션 테이블**: `_prisma_migrations` 테이블은 그대로 유지
*   **Drizzle 마이그레이션**: `__drizzle_migrations` 테이블만 추가

### 7.4 코드 리뷰
*   **각 파일 전환 후 리뷰**: 코드 품질 및 성능 확인
*   **트랜잭션 로직 검증**: 복잡한 트랜잭션이 올바르게 변환되었는지 확인

---

## 8. 리스크 관리 (Risk Management)

### 8.1 기술적 리스크

#### 문법 차이
*   **리스크**: Prisma의 `include`와 Drizzle의 `with` 문법 차이로 인한 리팩토링 누락
*   **대응**: 
  - 문법 매핑 가이드(5장) 참조
  - 각 파일 전환 시 관계 쿼리 검증
  - TypeScript 타입 체크 활용

#### 트랜잭션 복잡도
*   **리스크**: Prisma의 `$transaction`을 Drizzle의 `db.transaction()`으로 정확히 매핑하지 못함
*   **대응**:
  - 복잡한 트랜잭션은 별도 문서화
  - 단위 테스트 작성
  - 롤백 시나리오 테스트

#### Better Auth 통합
*   **리스크**: Better Auth가 Prisma를 직접 사용하는 경우 호환성 문제
*   **대응**:
  - Better Auth 문서 확인
  - 커스텀 어댑터 필요 시 개발
  - 또는 Better Auth 설정에서 Drizzle 연결 사용

### 8.2 운영 리스크

#### 데이터 무결성
*   **리스크**: 전환 과정에서 데이터 손실 또는 불일치 발생
*   **대응**:
  - 백업 필수
  - 각 Phase별 데이터 검증
  - 프로덕션 배포 전 스테이징 환경에서 충분한 테스트

#### 성능 저하
*   **리스크**: Drizzle 전환 후 성능이 오히려 저하될 수 있음
*   **대응**:
  - 성능 벤치마크 수행 (4.2절 참조)
  - 문제 발견 시 즉시 롤백
  - 쿼리 최적화

### 8.3 일정 리스크

#### 예상보다 긴 작업 시간
*   **리스크**: 복잡한 쿼리나 트랜잭션으로 인해 예상보다 오래 걸림
*   **대응**:
  - 버퍼 시간 확보 (예상 시간의 1.5배)
  - 우선순위 조정 가능하도록 유연성 확보

---

## 9. 롤백 계획 (Rollback Plan)

### 9.1 단계별 롤백

#### Phase 1-2 롤백
*   Drizzle 패키지 제거
*   `app/lib/db.server.ts` 원복
*   `app/db/schema.ts` 삭제
*   `drizzle.config.ts` 삭제

#### Phase 3 롤백
*   변경된 파일들을 Git에서 원복
*   Prisma 사용으로 되돌림
*   데이터베이스는 변경 없음 (코드만 롤백)

#### Phase 4 롤백
*   Prisma 패키지 재설치
*   `prisma generate` 실행
*   모든 파일을 Prisma 버전으로 롤백

### 9.2 데이터베이스 롤백
*   백업 파일에서 복원
*   Turso CLI 사용:
  ```bash
  turso db restore <database-name> <backup-file>.sql
  ```

### 9.3 롤백 결정 기준
*   Critical 버그 발생 시 즉시 롤백
*   성능이 20% 이상 저하 시 롤백 검토
*   데이터 무결성 문제 발생 시 즉시 롤백

---

## 10. 테스트 전략 (Testing Strategy)

### 10.1 단위 테스트
*   **범위**: 각 파일의 주요 함수/로직
*   **도구**: Vitest 또는 Jest
*   **목표**: 각 파일 전환 후 단위 테스트 작성

### 10.2 통합 테스트
*   **범위**: API 엔드포인트 전체 플로우
*   **도구**: Playwright 또는 Supertest
*   **목표**: 주요 기능의 E2E 테스트

### 10.3 성능 테스트
*   **범위**: 주요 API 엔드포인트
*   **도구**: k6 또는 Artillery
*   **목표**: Prisma 대비 성능 개선 확인

### 10.4 수동 테스트 체크리스트
*   각 Phase별 수동 테스트 체크리스트 작성
*   주요 사용자 시나리오 테스트
*   에지 케이스 테스트

---

## 11. 타임라인 및 리소스 (Timeline & Resources)

### 11.1 전체 타임라인

| Phase | 작업 내용 | 예상 소요 | 버퍼 포함 |
|-------|----------|----------|----------|
| Phase 1 | 인프라 설정 | 2-3일 | 4일 |
| Phase 2 | 연결 설정 | 1일 | 2일 |
| Phase 3 | 코드 리팩토링 | 10-15일 | 20일 |
| Phase 4 | 검증 및 정리 | 3-5일 | 7일 |
| **총계** | | **16-24일** | **33일** |

### 11.2 리소스 요구사항
*   **개발자**: 1-2명
*   **테스터**: 1명 (Phase 4)
*   **코드 리뷰어**: 1명 (각 Phase별)

### 11.3 마일스톤
1. **M1**: Phase 1 완료 (인프라 설정)
2. **M2**: Phase 2 완료 (연결 설정)
3. **M3**: Phase 3.1 완료 (Critical 기능 전환)
4. **M4**: Phase 3 완료 (전체 코드 리팩토링)
5. **M5**: Phase 4 완료 (검증 및 정리)

---

## 12. 성공 기준 (Success Criteria)

### 12.1 기능적 성공 기준
*   ✅ 모든 기존 기능이 정상 작동
*   ✅ 데이터 무결성 유지
*   ✅ 에러 없이 모든 API 엔드포인트 작동

### 12.2 성능적 성공 기준
*   ✅ Cold Start 시간: Prisma 대비 20% 이상 개선
*   ✅ 쿼리 성능: 복잡한 관계 쿼리에서 10% 이상 개선
*   ✅ 메모리 사용량: Prisma 대비 30% 이상 절감

### 12.3 코드 품질 기준
*   ✅ TypeScript 타입 오류 없음
*   ✅ 린터 오류 없음
*   ✅ 코드 리뷰 통과

---

## 13. 문서화 및 교육 (Documentation & Training)

### 13.1 문서화
*   Drizzle 스키마 문서화 (`app/db/schema.ts` 주석)
*   주요 쿼리 패턴 문서화
*   트랜잭션 사용 가이드 작성

### 13.2 교육
*   팀 내 Drizzle 문법 가이드 공유
*   코드 리뷰 시 Drizzle 패턴 학습
*   문제 해결 경험 공유

---

## 14. 참고 자료 (References)

*   [Drizzle ORM 공식 문서](https://orm.drizzle.team/)
*   [Drizzle Kit 문서](https://orm.drizzle.team/kit-docs/overview)
*   [Turso 문서](https://docs.turso.tech/)
*   [Prisma to Drizzle 마이그레이션 가이드](https://orm.drizzle.team/docs/migrations)

---

**마지막 업데이트**: 2026-01-06  
**작성자**: Antigravity AI  
**버전**: 2.0
