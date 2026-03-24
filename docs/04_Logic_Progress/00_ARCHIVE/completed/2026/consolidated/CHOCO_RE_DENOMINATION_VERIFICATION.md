---
status: archived
archived_reason: "통합됨"
consolidated_into: "docs/reports/CHOCO_RE_DENOMINATION_COMPLETE_VERIFICATION.md"
archived_date: 2026-01-14
original_location: "docs/reports/CHOCO_RE_DENOMINATION_VERIFICATION.md"
tags: [completed, verification, billing, consolidated]
---

# CHOCO 경제 엔진 전면 개편 플랜 검증 보고서

**⚠️ 이 문서는 통합되었습니다. 최신 정보는 `docs/reports/CHOCO_RE_DENOMINATION_COMPLETE_VERIFICATION.md`를 참조하세요.**

**작성일**: 2026-01-13  
**검증 대상**: `docs/roadmap/billing/CHOCO_RE_DENOMINATION_PLAN.md`  
**상태**: ⚠️ 부분 구현 완료 (수정 필요 사항 다수 발견)  
**아카이브일**: 2026-01-14  
**통합 문서**: `docs/reports/CHOCO_RE_DENOMINATION_COMPLETE_VERIFICATION.md`

---

## 1. 검증 개요

CHOCO의 기축 가치를 `$0.0001`에서 `$0.001`로 10배 상향 조정하는 전면 개편 플랜을 검증했습니다. 문서에 명시된 수정 사항 중 일부만 구현되어 있고, 여러 불일치 사항이 발견되었습니다.

---

## 2. 구현 상태 점검

### 2.1 ✅ 완료된 항목

#### exchange-rate.server.ts
- ✅ **기축 가격 수정 완료** (라인 13)
  ```typescript
  const CHOCO_PRICE_USD = 0.001; // 1 CHOCO = $0.001, 즉 $1 = 1,000 CHOCO
  ```
- ✅ **실제 계산 로직은 올바름** (라인 246)
  ```typescript
  const chocoAmount = new BigNumber(usdAmount).dividedBy(CHOCO_PRICE_USD);
  ```

**문제점**:
- ⚠️ **구식 주석이 남아있음** (라인 154, 243-244)
  - 라인 154: `// 3. USD → CHOCO 변환 (1 CHOCO = $0.0001)` ❌
  - 라인 243: `// 1 CHOCO = $0.0001` ❌
  - 라인 244: `// $1 = 10,000 CHOCO` ❌ (실제로는 $1 = 1,000 CHOCO)

---

### 2.2 ❌ 미완료 항목

#### 2.2.1 x402.server.ts - 인보이스 엔진 수정 필요

**현재 상태** (라인 20-23):
```typescript
// 1. CHOCO 환율 계산 (현재 1 Credit = $0.0001, 1 CHOCO = 1 Credit 가정)
// $1 = 10,000 Credits = 10,000 CHOCO
const chocoPriceUSD = 0.0001; // ❌ 구식 가격
const chocoAmount = new BigNumber(amountUSD).dividedBy(chocoPriceUSD);
```

**수정 필요**:
```typescript
// 1. CHOCO 환율 계산 (1 CHOCO = $0.001, 즉 $1 = 1,000 CHOCO)
const chocoPriceUSD = 0.001; // ✅ 신규 가격
const chocoAmount = new BigNumber(amountUSD).dividedBy(chocoPriceUSD);
```

**영향 범위**:
- `createX402Invoice` 함수의 모든 인보이스 생성
- 외부 결제 및 온체인 인보이스 생성 시 가치 산정 오류
- **심각도**: 높음 (외부 결제 시스템과 연동)

---

#### 2.2.2 api/chat/index.ts - 채팅 과금 로직 수정 필요

**현재 상태** (라인 188):
```typescript
const chocoToDeduct = tokenUsage.totalTokens.toString(); // ❌ 1 토큰 = 1 CHOCO
```

**문서 요구사항**:
- `1,000 토큰(채팅 약 1회) = 10 CHOCO` ($0.01) 차감
- 공식: `Deduction = (TotalTokens / 100)`

**수정 필요**:
```typescript
// 1,000 토큰 = 10 CHOCO, 즉 100 토큰 = 1 CHOCO
const { BigNumber } = await import("bignumber.js");
const chocoToDeduct = new BigNumber(tokenUsage.totalTokens)
    .dividedBy(100)
    .toFixed(0); // ✅ 신규 공식
```

**영향 범위**:
- 모든 채팅 메시지의 CHOCO 차감량
- 현재는 1,000배 과다 차감되고 있음 (1,000 토큰 사용 시 1,000 CHOCO 차감 → 10 CHOCO로 변경 필요)
- **심각도**: 매우 높음 (사용자 자산 과다 차감)

**예시**:
- 현재: 1,000 토큰 사용 → 1,000 CHOCO 차감 ($1)
- 수정 후: 1,000 토큰 사용 → 10 CHOCO 차감 ($0.01)

---

#### 2.2.3 api/chat/index.ts - Silent Payment 단위 조정 필요

**현재 상태** (라인 65):
```typescript
const amountToChargeUSD = 0.01; // ❌ $0.01 (10 CHOCO)
```

**문서 요구사항**:
- `$0.1` (100 CHOCO) 단위로 상향
- 이유: 새로운 정책에서 `$0.01`은 채팅 딱 1회 분량에 불과

**수정 필요**:
```typescript
const amountToChargeUSD = 0.1; // ✅ $0.1 (100 CHOCO)
```

**영향 범위**:
- 잔액 부족 시 자동 충전 요청 금액
- 결제 횟수 감소 및 사용자 피로도 개선
- **심각도**: 중간 (사용자 경험 개선)

**비교**:
- 현재: 잔액 부족 시 $0.01 (10 CHOCO) 충전 → 채팅 1회만 가능
- 수정 후: 잔액 부족 시 $0.1 (100 CHOCO) 충전 → 채팅 약 10회 가능
+
+---
+
+#### 2.2.4 api/chat/index.ts - 최소 필요 CHOCO 확인
+
+**현재 상태** (라인 61):
+```typescript
+const MIN_REQUIRED_CHOCO = 10; // 최소 필요 CHOCO
+```
+
+**검토 필요**:
+- 새로운 정책에서 채팅 1회당 10 CHOCO 차감
+- `MIN_REQUIRED_CHOCO = 10`은 채팅 딱 1회만 가능
+- 권장: `MIN_REQUIRED_CHOCO = 20` 또는 `30` (2-3회 대화 가능)
+
+**권장 수정**:
+```typescript
+const MIN_REQUIRED_CHOCO = 20; // 최소 필요 CHOCO (채팅 약 2회 분량)
+```
+
+---
+
+### 2.3 ⚠️ 주석 및 문서화 문제
+
+#### exchange-rate.server.ts
+- 라인 154: 구식 주석 `// 3. USD → CHOCO 변환 (1 CHOCO = $0.0001)` → `// 3. USD → CHOCO 변환 (1 CHOCO = $0.001)`로 수정 필요
+- 라인 243-244: 구식 주석 수정 필요
+  - 변경 전: `// 1 CHOCO = $0.0001` / `// $1 = 10,000 CHOCO`
+  - 변경 후: `// 1 CHOCO = $0.001` / `// $1 = 1,000 CHOCO`
+
+#### x402.server.ts
+- 라인 20-21: 구식 주석 수정 필요
+  - 변경 전: `// 1. CHOCO 환율 계산 (현재 1 Credit = $0.0001, 1 CHOCO = 1 Credit 가정)` / `// $1 = 10,000 Credits = 10,000 CHOCO`
+  - 변경 후: `// 1. CHOCO 환율 계산 (1 CHOCO = $0.001, 즉 $1 = 1,000 CHOCO)`
+
+---
+
+## 3. 마이그레이션 전략 검증
+
+### 3.1 잔액 조정 (Re-denomination) ✅
+
+**문서 내용**:
+- 모든 유저의 `chocoBalance`를 **1/10**로 조정
+- 예: 10,000 CHOCO(기존 가치 $1) → 1,000 CHOCO(신규 가치 $1)
+
+**검증 결과**:
+- ✅ 전략이 논리적으로 올바름
+- ✅ 가치 보존: 기존 $1 가치 → 신규 $1 가치 (동일)
+- ⚠️ 마이그레이션 스크립트가 문서에 없음 (별도 작성 필요)
+
+**권장사항**:
+- 마이그레이션 스크립트를 `scripts/` 폴더에 생성
+- 트랜잭션 사용으로 데이터 무결성 보장
+- 백업 후 실행 확인
+- 마이그레이션 전후 데이터 검증 로직 포함
+
+**예상 마이그레이션 스크립트 구조**:
+```typescript
+// scripts/migrate-choco-denomination.mjs
+// 1. DB 백업 확인
+// 2. 모든 유저의 chocoBalance를 1/10로 조정
+// 3. 마이그레이션 기록 생성
+// 4. 검증 (총 CHOCO 양 확인)
+```
+
+---
+
+## 4. 실행 체크리스트 검증
+
+### 4.1 현재 상태
+
+1. **[ ] DB 백업**: 문서에 명시됨, 실행 필요
+2. **[ ] DB 마이그레이션**: 문서에 명시됨, 스크립트 작성 필요
+3. **[ ] 서버 코드 업데이트**:
+   - ✅ `exchange-rate.server.ts`: 기축 가격 수정 (완료, 주석 수정 필요)
+   - ❌ `x402.server.ts`: 인보이스 계산식 수정 (미완료)
+   - ❌ `api/chat/index.ts`: 차감량 계산식 수정 (미완료)
+   - ❌ `api/chat/index.ts`: Silent Payment 단위 조정 (미완료)
+4. **[ ] UI 일괄 확인**: 문서에 명시됨, 실행 필요
+
+---
+
+## 5. 발견된 추가 이슈
+
+### 5.1 credit-policy.ts
+
+**파일**: `app/lib/credit-policy.ts`
+
+**현재 상태** (라인 9):
+```typescript
+// 1 Credit = $0.0001 (approx. 0.1 KRW)
+```
+
+**문제점**:
+- 구식 주석이 남아있음
+- 파일 전체 검토 필요 (사용 여부 확인)
+- Credit 시스템이 CHOCO로 완전히 전환되었는지 확인 필요
+
+---
+
+### 5.2 일관성 문제
+
+**발견된 불일치**:
+1. `exchange-rate.server.ts`: 가격은 올바르지만 주석이 구식
+2. `x402.server.ts`: 가격과 주석 모두 구식
+3. `api/chat/index.ts`: 차감 로직이 구식
+4. `credit-policy.ts`: 주석이 구식
+
+**권장사항**:
+- 모든 파일에서 CHOCO 가격 관련 상수를 `CHOCO_PRICE_USD = 0.001`로 통일
+- 주석 일괄 업데이트
+- 코드 리뷰 시 일관성 체크리스트 추가
+
+---
+
+## 6. 수정 우선순위
+
+### 높음 (Critical) - 즉시 수정 필요
+
+1. **x402.server.ts**: 인보이스 가격 수정
+   - 이유: 외부 결제 시스템과 연동, 가치 산정 오류
+   - 영향: 모든 X402 인보이스 생성
+
+2. **api/chat/index.ts**: 채팅 과금 로직 수정
+   - 이유: 사용자 자산 1,000배 과다 차감
+   - 영향: 모든 채팅 메시지
+
+### 중간 (Important) - 빠른 시일 내 수정
+
+3. **api/chat/index.ts**: Silent Payment 단위 조정
+   - 이유: 사용자 경험 개선
+   - 영향: 잔액 부족 시 자동 충전
+
+4. **주석 일괄 업데이트**: 모든 파일의 구식 주석 수정
+   - 이유: 개발자 혼란 방지
+   - 영향: 코드 유지보수성
+
+### 낮음 (Nice to have) - 여유 있을 때 수정
+
+5. **MIN_REQUIRED_CHOCO**: 최소 필요 CHOCO 재검토
+   - 이유: 사용자 경험 개선
+   - 영향: 최소 잔액 체크
+
+6. **credit-policy.ts**: 파일 사용 여부 확인 및 업데이트
+   - 이유: 코드 정리
+   - 영향: 미미
+
+---
+
+## 7. 권장 수정 사항 상세
+
+### 7.1 x402.server.ts
+
+**파일**: `app/lib/near/x402.server.ts`
+
+**수정 위치**: 라인 20-23
+
+**변경 전**:
+```typescript
+// 1. CHOCO 환율 계산 (현재 1 Credit = $0.0001, 1 CHOCO = 1 Credit 가정)
+// $1 = 10,000 Credits = 10,000 CHOCO
+const chocoPriceUSD = 0.0001;
+const chocoAmount = new BigNumber(amountUSD).dividedBy(chocoPriceUSD);
+```
+
+**변경 후**:
+```typescript
+// 1. CHOCO 환율 계산 (1 CHOCO = $0.001, 즉 $1 = 1,000 CHOCO)
+const chocoPriceUSD = 0.001;
+const chocoAmount = new BigNumber(amountUSD).dividedBy(chocoPriceUSD);
+```
+
+---
+
+### 7.2 api/chat/index.ts - 채팅 과금 로직
+
+**파일**: `app/routes/api/chat/index.ts`
+
+**수정 위치**: 라인 180-189
+
+**변경 전**:
+```typescript
+const chocoToDeduct = tokenUsage.totalTokens.toString(); // 1 Credit = 1 CHOCO
+const chocoAmountRaw = new BigNumber(chocoToDeduct).multipliedBy(new BigNumber(10).pow(18)).toFixed(0);
+```
+
+**변경 후**:
+```typescript
+// 1,000 토큰 = 10 CHOCO, 즉 100 토큰 = 1 CHOCO
+const chocoToDeduct = new BigNumber(tokenUsage.totalTokens)
+    .dividedBy(100)
+    .toFixed(0);
+const chocoAmountRaw = new BigNumber(chocoToDeduct).multipliedBy(new BigNumber(10).pow(18)).toFixed(0);
+```
+
+---
+
+### 7.3 api/chat/index.ts - Silent Payment 단위
+
+**파일**: `app/routes/api/chat/index.ts`
+
+**수정 위치**: 라인 64-65
+
+**변경 전**:
+```typescript
+// 1. 인보이스 생성 ($0.01 = 약 100 Credits, 마이크로 페이먼트 단위)
+const amountToChargeUSD = 0.01;
+```
+
+**변경 후**:
+```typescript
+// 1. 인보이스 생성 ($0.1 = 100 CHOCO, 채팅 약 10회 분량)
+const amountToChargeUSD = 0.1;
+```
+
+---
+
+### 7.4 api/chat/index.ts - 최소 필요 CHOCO
+
+**파일**: `app/routes/api/chat/index.ts`
+
+**수정 위치**: 라인 61
+
+**변경 전**:
+```typescript
+const MIN_REQUIRED_CHOCO = 10; // 최소 필요 CHOCO (1 Credit = 1 CHOCO)
+```
+
+**변경 후**:
+```typescript
+const MIN_REQUIRED_CHOCO = 20; // 최소 필요 CHOCO (채팅 약 2회 분량)
+```
+
+---
+
+### 7.5 exchange-rate.server.ts - 주석 수정
+
+**파일**: `app/lib/near/exchange-rate.server.ts`
+
+**수정 위치**: 라인 154, 243-244
+
+**변경 전** (라인 154):
+```typescript
+// 3. USD → CHOCO 변환 (1 CHOCO = $0.0001)
+```
+
+**변경 후**:
+```typescript
+// 3. USD → CHOCO 변환 (1 CHOCO = $0.001)
+```
+
+**변경 전** (라인 243-244):
+```typescript
+// 1 CHOCO = $0.0001
+// $1 = 10,000 CHOCO
+```
+
+**변경 후**:
+```typescript
+// 1 CHOCO = $0.001
+// $1 = 1,000 CHOCO
+```
+
+---
+
+## 8. 마이그레이션 스크립트 권장 구조
+
+### 8.1 스크립트 위치
+`scripts/migrate-choco-denomination.mjs`
+
+### 8.2 스크립트 구조
+
+```javascript
+import { createClient } from "@libsql/client";
+import dotenv from "dotenv";
+dotenv.config();
+
+const client = createClient({
+    url: process.env.TURSO_DATABASE_URL || "",
+    authToken: process.env.TURSO_AUTH_TOKEN || "",
+});
+
+async function main() {
+    try {
+        console.log("🚀 Starting CHOCO re-denomination migration...\n");
+
+        // 1. 현재 상태 확인
+        const beforeStats = await client.execute({
+            sql: `SELECT 
+                COUNT(*) as total_users,
+                SUM(CAST(chocoBalance AS REAL)) as total_choco
+            FROM User
+            WHERE chocoBalance IS NOT NULL AND chocoBalance != '0'`,
+        });
+
+        console.log("📊 Before Migration:");
+        console.log(`   Total Users with CHOCO: ${beforeStats.rows[0].total_users}`);
+        console.log(`   Total CHOCO: ${beforeStats.rows[0].total_choco}\n`);
+
+        // 2. 마이그레이션 실행
+        const result = await client.execute({
+            sql: `UPDATE User
+                SET chocoBalance = CAST(CAST(chocoBalance AS REAL) / 10 AS TEXT)
+                WHERE chocoBalance IS NOT NULL AND chocoBalance != '0'`,
+        });
+
+        console.log(`✅ Updated ${result.rowsAffected} users\n`);
+
+        // 3. 마이그레이션 후 검증
+        const afterStats = await client.execute({
+            sql: `SELECT 
+                COUNT(*) as total_users,
+                SUM(CAST(chocoBalance AS REAL)) as total_choco
+            FROM User
+            WHERE chocoBalance IS NOT NULL AND chocoBalance != '0'`,
+        });
+
+        console.log("📊 After Migration:");
+        console.log(`   Total Users with CHOCO: ${afterStats.rows[0].total_users}`);
+        console.log(`   Total CHOCO: ${afterStats.rows[0].total_choco}\n`);
+
+        // 4. 검증 (총 CHOCO 양이 1/10로 줄어들었는지 확인)
+        const beforeTotal = parseFloat(beforeStats.rows[0].total_choco);
+        const afterTotal = parseFloat(afterStats.rows[0].total_choco);
+        const expectedTotal = beforeTotal / 10;
+
+        if (Math.abs(afterTotal - expectedTotal) < 0.01) {
+            console.log("✅ Migration verification passed!");
+            console.log(`   Expected: ${expectedTotal}, Actual: ${afterTotal}\n`);
+        } else {
+            console.error("❌ Migration verification failed!");
+            console.error(`   Expected: ${expectedTotal}, Actual: ${afterTotal}\n`);
+            process.exit(1);
+        }
+
+        console.log("✅ Migration completed successfully!");
+
+    } catch (error) {
+        console.error("❌ Error:", error.message);
+        process.exit(1);
+    }
+
+    process.exit(0);
+}
+
+main();
+```
+
+---
+
+## 9. 테스트 시나리오
+
+### 9.1 채팅 과금 테스트
+
+**시나리오**: 사용자가 1,000 토큰을 사용하는 채팅 메시지 전송
+
+**예상 결과**:
+- 현재 (구식): 1,000 CHOCO 차감
+- 수정 후: 10 CHOCO 차감
+
+### 9.2 X402 인보이스 테스트
+
+**시나리오**: $1 인보이스 생성
+
+**예상 결과**:
+- 현재 (구식): 10,000 CHOCO 인보이스
+- 수정 후: 1,000 CHOCO 인보이스
+
+### 9.3 Silent Payment 테스트
+
+**시나리오**: 잔액 부족 시 자동 충전 요청
+
+**예상 결과**:
+- 현재 (구식): $0.01 (10 CHOCO) 충전 요청
+- 수정 후: $0.1 (100 CHOCO) 충전 요청
+
+---
+
+## 10. 결론
+
+문서의 전면 개편 플랜은 논리적으로 올바르지만, **대부분의 수정 사항이 아직 구현되지 않았습니다**. 특히:
+
+1. ✅ `exchange-rate.server.ts`의 가격은 올바르게 수정됨
+2. ❌ `x402.server.ts`는 여전히 구식 가격 사용 (Critical)
+3. ❌ `api/chat/index.ts`는 여전히 구식 차감 로직 사용 (Critical)
+4. ❌ `api/chat/index.ts`의 Silent Payment 단위가 구식 (Important)
+5. ⚠️ 주석이 구식으로 남아있어 혼란 가능
+
+**즉시 수정이 필요한 항목**:
+- x402 인보이스 엔진 (외부 결제 영향)
+- 채팅 과금 로직 (과다 차감 문제)
+
+**권장 사항**:
+- 모든 수정 사항을 구현한 후 마이그레이션 실행
+- 마이그레이션 스크립트 작성 및 테스트
+- 전체 시스템 통합 테스트 수행
+- 프로덕션 배포 전 스테이징 환경에서 충분한 테스트
+
+---
+
+**검증 완료일**: 2026-01-13  
+**검증자**: AI Assistant  
+**상태**: ⚠️ 부분 구현 완료 (수정 필요)
+
