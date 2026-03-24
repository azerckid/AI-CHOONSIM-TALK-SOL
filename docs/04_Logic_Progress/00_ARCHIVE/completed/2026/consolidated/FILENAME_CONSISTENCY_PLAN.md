# 파일명 일관성 정리 계획

**작성일**: 2026-01-13  
**목적**: docs 폴더 내 모든 파일명을 일관된 규칙으로 정리  
**기준**: `docs/core/document-management-plan.md`의 명명 규칙

---

## 1. 명명 규칙 결정

### 1.1 폴더별 규칙

**원칙**: 폴더 내에서 일관성을 유지하되, 각 폴더의 주요 패턴을 따름

**규칙**:
- **`docs/reports/`**: 대문자 + 언더바 (`UPPER_SNAKE_CASE`)
  - 이유: 대부분의 verification 파일이 이미 이 규칙 사용
- **`docs/features/`**: 소문자 + 케밥 케이스 (`lower-kebab-case`)
  - 이유: 대부분의 파일이 이미 이 규칙 사용
- **`docs/core/`**: 소문자 + 케밥 케이스 (`lower-kebab-case`)
  - 이유: 대부분의 파일이 이미 이 규칙 사용
- **`docs/guides/`**: 소문자 + 케밥 케이스 (`lower-kebab-case`)
  - 이유: 모든 파일이 이미 이 규칙 사용
- **`docs/roadmap/`**: 소문자 + 케밥 케이스 (`lower-kebab-case`)
  - 이유: 모든 파일이 이미 이 규칙 사용
- **`docs/archive/`**: 대문자 + 언더바 (`UPPER_SNAKE_CASE`)
  - 이유: 대부분의 파일이 이미 이 규칙 사용

---

## 2. 변경 대상 파일

### 2.1 docs/reports/ - 소문자 → 대문자 변경

**변경 대상**:
1. `near-ux-gap-analysis.md` → `NEAR_UX_GAP_ANALYSIS.md`
2. `near-chat-balance-ui-completion.md` → `NEAR_CHAT_BALANCE_UI_COMPLETION.md`

**변경 후**:
- 모든 reports/ 루트 레벨 파일이 대문자 + 언더바로 통일됨

### 2.2 docs/reports/billing/ - 소문자 → 대문자 변경

**변경 대상**:
1. `unification-summary.md` → `UNIFICATION_SUMMARY.md`

**변경 후**:
- reports/ 하위 폴더도 동일한 규칙 적용

### 2.3 docs/features/admin/ - 대문자 → 소문자 변경

**변경 대상**:
1. `ADMIN_CHOCO_ECONOMY_SPEC.md` → `admin-choco-economy-spec.md`

**변경 후**:
- features/ 폴더 내 모든 파일이 소문자 + 케밥 케이스로 통일됨

### 2.4 docs/core/ - 대문자 → 소문자 변경

**변경 대상**:
1. `DOCUMENT_MANAGEMENT_PLAN.md` → `document-management-plan.md`

**변경 후**:
- core/ 폴더 내 모든 파일이 소문자 + 케밥 케이스로 통일됨

### 2.5 docs/features/billing/ - 대문자 → 소문자 변경

**변경 대상**:
1. `CHOCO_EXCHANGE_RATE_POLICY.md` → `choco-exchange-rate-policy.md`

**변경 후**:
- features/billing/ 폴더 내 모든 파일이 소문자 + 케밥 케이스로 통일됨

---

## 3. 변경 영향도 분석

### 3.1 내부 참조 링크

**영향 범위**:
- 다른 문서에서 이 파일들을 참조하는 링크가 있을 수 있음
- 코드 내에서 문서를 참조하는 경우는 없을 것으로 예상

**조치 필요**:
- 파일명 변경 후 모든 문서의 내부 링크 확인 및 수정

### 3.2 Git 히스토리

**영향**:
- Git에서 파일명 변경은 파일 이동으로 인식됨
- 히스토리는 유지되지만, 파일명 변경 이력이 남음

---

## 4. 실행 계획

### Phase 1: 파일명 변경
1. `docs/reports/near-ux-gap-analysis.md` → `NEAR_UX_GAP_ANALYSIS.md`
2. `docs/reports/near-chat-balance-ui-completion.md` → `NEAR_CHAT_BALANCE_UI_COMPLETION.md`
3. `docs/reports/billing/unification-summary.md` → `UNIFICATION_SUMMARY.md`
4. `docs/features/admin/ADMIN_CHOCO_ECONOMY_SPEC.md` → `admin-choco-economy-spec.md`
5. `docs/core/DOCUMENT_MANAGEMENT_PLAN.md` → `document-management-plan.md`
6. `docs/features/billing/CHOCO_EXCHANGE_RATE_POLICY.md` → `choco-exchange-rate-policy.md`

### Phase 2: 내부 링크 수정
- 모든 문서에서 변경된 파일명을 참조하는 링크 검색 및 수정

---

## 5. 최종 명명 규칙 요약

| 폴더 | 규칙 | 예시 |
|------|------|------|
| `docs/reports/` | 대문자 + 언더바 | `CHOCO_RE_DENOMINATION_VERIFICATION.md` |
| `docs/features/` | 소문자 + 케밥 케이스 | `x402-ui-spec.md` |
| `docs/core/` | 소문자 + 케밥 케이스 | `design-system.md` |
| `docs/guides/` | 소문자 + 케밥 케이스 | `wallet-test-guide.md` |
| `docs/roadmap/` | 소문자 + 케밥 케이스 | `voice-interaction-strategy.md` |
| `docs/archive/` | 대문자 + 언더바 | `CHOCO_RE_DENOMINATION_PLAN.md` |

---

## 6. 실행 완료 내역

### Phase 1: 파일명 변경 ✅
1. ✅ `docs/reports/near-ux-gap-analysis.md` → `NEAR_UX_GAP_ANALYSIS.md`
2. ✅ `docs/reports/near-chat-balance-ui-completion.md` → `NEAR_CHAT_BALANCE_UI_COMPLETION.md`
3. ✅ `docs/reports/billing/unification-summary.md` → `UNIFICATION_SUMMARY.md`
4. ✅ `docs/features/admin/ADMIN_CHOCO_ECONOMY_SPEC.md` → `admin-choco-economy-spec.md`
5. ✅ `docs/core/DOCUMENT_MANAGEMENT_PLAN.md` → `document-management-plan.md`
6. ✅ `docs/features/billing/CHOCO_EXCHANGE_RATE_POLICY.md` → `choco-exchange-rate-policy.md`

### Phase 2: 내부 링크 수정 ✅
- ✅ `docs/reports/FILENAME_CONSISTENCY_PLAN.md`: 기준 문서 참조 수정
- ✅ `docs/reports/DOCUMENT_STRUCTURE_VERIFICATION.md`: 모든 파일명 참조 수정
- ✅ `docs/archive/WALLET_CARD_MIGRATION_SPEC.md`: CHOCO_EXCHANGE_RATE_POLICY 참조 수정

---

**상태**: ✅ 완료  
**완료일**: 2026-01-13
