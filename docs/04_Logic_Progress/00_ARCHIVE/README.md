# 문서 아카이브 인덱스

이 폴더는 완료된 문서들을 보관합니다.

---

## 아카이브 기준

다음 조건을 **모두** 만족하는 문서는 아카이브 대상:

1. ✅ **구현 완료**: 문서에 명시된 모든 기능이 구현됨
2. ✅ **검증 완료**: 검증 보고서가 존재하고 모든 항목 통과
3. ✅ **6개월 이상 미수정**: 마지막 수정일로부터 6개월 이상 경과
4. ✅ **참조 빈도 낮음**: 다른 문서에서 참조되지 않거나, 참조되더라도 과거 사례 참조
5. ✅ **대체 문서 존재**: 동일한 내용을 더 최신 문서가 포함하고 있음

---

## 아카이브 구조

```
docs/archive/
├── completed/          # 완료된 구현 문서
│   ├── 2024/
│   ├── 2025/
│   └── 2026/
│       └── consolidated/  # 통합된 문서의 원본
└── deprecated/         # 더 이상 사용하지 않는 문서
```

---

## 최근 아카이브 (2026)

### 통합된 문서 (Consolidated)

다음 문서들은 통합되어 새로운 통합 문서로 대체되었습니다:

#### 1. CHOCO Re-denomination 관련
- **통합 문서**: `docs/reports/CHOCO_RE_DENOMINATION_COMPLETE_VERIFICATION.md`
- **원본 문서**:
  - `completed/2026/consolidated/CHOCO_RE_DENOMINATION_VERIFICATION.md` (플랜 검증)
  - `completed/2026/consolidated/CHOCO_RE_DENOMINATION_IMPLEMENTATION_VERIFICATION.md` (구현 검증)

#### 2. NEAR Chat Balance UI 관련
- **통합 문서**: `docs/reports/NEAR_CHAT_BALANCE_UI_COMPLETE_VERIFICATION.md`
- **원본 문서**:
  - `completed/2026/consolidated/NEAR_CHAT_BALANCE_UI_VERIFICATION.md` (초기 검증)
  - `completed/2026/consolidated/NEAR_CHAT_BALANCE_UI_IMPLEMENTATION_VERIFICATION.md` (구현 검증)
  - `completed/2026/consolidated/NEAR_CHAT_BALANCE_UI_COMPLETION.md` (완료 보고)

#### 3. Phase 검증 보고서 관련
- **통합 문서**: `docs/reports/PHASE_1_TO_5_COMPLETE_VERIFICATION.md`
- **원본 문서**:
  - `completed/2026/consolidated/PHASE_1_2_VERIFICATION.md`
  - `completed/2026/consolidated/PHASE_3_VERIFICATION.md`
  - `completed/2026/consolidated/PHASE_3_UPDATE_VERIFICATION.md`
  - `completed/2026/consolidated/PHASE_4_VERIFICATION.md`
  - `completed/2026/consolidated/PHASE_5_VERIFICATION.md`

#### 4. NEAR UX 검증 관련
- **통합 문서**: `docs/reports/NEAR_UX_COMPLETE_VERIFICATION.md`
- **원본 문서**:
  - `completed/2026/consolidated/NEAR_UX_GAP_ANALYSIS_VERIFICATION.md` (Gap Analysis 검증)
  - `completed/2026/consolidated/NEAR_UX_IMPROVEMENTS_VERIFICATION.md` (개선 권장 사항 검증)
  - `completed/2026/consolidated/NEAR_UX_IMPLEMENTATION_VERIFICATION.md` (구현 검증)

#### 5. Vercel AI SDK 관련
- **통합 문서**: `docs/reports/VERCEL_AI_SDK_ADOPTION_COMPLETE_ANALYSIS.md`
- **원본 문서**:
  - `completed/2026/consolidated/VERCEL_AI_SDK_ADOPTION_RECOMMENDATION.md` (도입 권장 사항)
  - `completed/2026/consolidated/VERCEL_AI_SDK_ADOPTION_VERIFICATION.md` (문서 검증)

---

## 통합 통계

**통합 완료**:
- 총 15개 문서 → 5개 통합 문서로 통합
- 문서 수 감소: 10개 (67% 감소)

**통합 그룹**:
1. CHOCO Re-denomination: 2개 → 1개
2. NEAR Chat Balance UI: 3개 → 1개
3. Phase 검증 보고서: 5개 → 1개
4. NEAR UX 검증: 3개 → 1개
5. Vercel AI SDK: 2개 → 1개

---

## 아카이브된 문서 접근

모든 아카이브된 문서는 다음 정보를 포함합니다:

- **메타데이터**: 문서 헤더에 통합 정보 포함
- **통합 문서 링크**: 최신 통합 문서로 안내
- **원본 위치**: 원래 위치 정보 보존

**참고**: 아카이브된 문서를 참조하는 경우, 통합 문서를 우선 참조하세요.

---

## 전체 목록

### 2026년 아카이브

**통합된 문서 원본** (15개):
- `completed/2026/consolidated/` 폴더 참조

**기타 완료된 문서**:
- `ADMIN_MEMBERSHIP_CHOCO_GRANT_SPEC.md`
- `AUTH_REDIRECT_STANDARDIZATION.md`
- `CHOCO_RE_DENOMINATION_PLAN.md`
- `DATABASE_MIGRATION_GUIDE.md`
- `DRIZZLE_MIGRATION_PLAN.md`
- `KOREA_PAYMENT_LEGAL_REQUIREMENTS.md`
- `PAYMENT_IMPLEMENTATION_PLAN.md`
- `PAYMENT_UI_CLEANUP_SPEC.md`
- `VERCEL_DEPLOYMENT_CHECKLIST.md`
- `VERCEL_DEPLOYMENT_QUICK_CHECK.md`
- `WALLET_CARD_MIGRATION_SPEC.md`
- `WALLET_CARD_MIGRATION_SPEC_VERIFICATION.md`

---

**최종 업데이트**: 2026-01-14  
**관리자**: AI Assistant
