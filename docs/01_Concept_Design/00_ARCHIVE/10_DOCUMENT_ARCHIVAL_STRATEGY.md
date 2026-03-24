# 문서 아카이브 전략 (Document Archival Strategy)
> Created: 2026-02-08
> Last Updated: 2026-02-08

**작성일**: 2026-01-14  
**목적**: 완료된 문서들의 체계적인 정리 및 아카이브 방법론 정의

---

## 1. 문제 정의

### 현재 상황
- **총 문서 수**: 약 76개 마크다운 파일
- **완료된 문서**: 검증 완료, 구현 완료 등 상태가 명확한 문서들
- **활성 문서**: 현재 참조 및 수정이 필요한 문서들
- **문제점**: 
  - 완료된 문서와 활성 문서가 혼재
  - 문서 검색 및 유지보수 어려움
  - 새로운 팀원의 온보딩 어려움

---

## 2. 문서 생명주기 (Document Lifecycle)

### 2.1 문서 상태 분류

```
[생성] → [진행중] → [검증중] → [완료] → [아카이브]
   ↓         ↓          ↓         ↓         ↓
 draft    active    review   completed  archived
```

**상태 정의**:
1. **Draft (초안)**: 작성 중인 문서
2. **Active (활성)**: 현재 참조 및 수정이 필요한 문서
3. **Review (검증중)**: 구현 완료 후 검증 단계
4. **Completed (완료)**: 검증 완료, 더 이상 수정 불필요
5. **Archived (아카이브)**: 완료 후 보관, 참조용으로만 사용

---

## 3. 아카이브 기준 (Archival Criteria)

### 3.1 아카이브 대상 문서

다음 조건을 **모두** 만족하는 문서는 아카이브 대상:

1. ✅ **구현 완료**: 문서에 명시된 모든 기능이 구현됨
2. ✅ **검증 완료**: 검증 보고서가 존재하고 모든 항목 통과
3. ✅ **6개월 이상 미수정**: 마지막 수정일로부터 6개월 이상 경과
4. ✅ **참조 빈도 낮음**: 다른 문서에서 참조되지 않거나, 참조되더라도 과거 사례 참조
5. ✅ **대체 문서 존재**: 동일한 내용을 더 최신 문서가 포함하고 있음

### 3.2 아카이브 제외 문서

다음 문서는 아카이브하지 않음:

- ❌ **Core 문서**: `docs/core/` 폴더의 모든 문서 (시스템 핵심)
- ❌ **활성 Features**: 현재 개발 중이거나 유지보수 중인 기능 문서
- ❌ **Roadmap 문서**: 미래 계획 문서
- ❌ **Guides 문서**: 개발자 가이드 (지속적으로 참조됨)
- ❌ **최근 6개월 내 수정**: 최근 수정된 문서

---

## 4. 아카이브 방법론 (Archival Methodology)

### 4.1 방법론 A: 폴더 기반 아카이브 (권장)

**구조**:
```
docs/
├── archive/
│   ├── completed/          # 완료된 구현 문서
│   │   ├── 2024/
│   │   ├── 2025/
│   │   └── 2026/
│   ├── verification/        # 검증 보고서 (오래된 것)
│   │   ├── 2024/
│   │   ├── 2025/
│   │   └── 2026/
│   └── deprecated/         # 더 이상 사용하지 않는 문서
├── core/                    # 활성 (아카이브 안함)
├── features/                # 활성 (아카이브 안함)
├── roadmap/                 # 활성 (아카이브 안함)
├── reports/                 # 최근 보고서만 유지
├── guides/                  # 활성 (아카이브 안함)
└── stitch/                  # 활성 (아카이브 안함)
```

**장점**:
- ✅ 연도별로 정리되어 시간순 파악 용이
- ✅ 완료/검증/폐기 문서 구분 명확
- ✅ 원본 위치 유지 가능 (심볼릭 링크 또는 README 참조)

**단점**:
- ⚠️ 폴더 구조가 복잡해질 수 있음
- ⚠️ 파일 이동 시 참조 링크 업데이트 필요

---

### 4.2 방법론 B: 메타데이터 기반 아카이브 (대안)

**구조**:
```
docs/
├── archive/                 # 모든 아카이브 문서 (플랫 구조)
├── core/
├── features/
├── roadmap/
├── reports/
├── guides/
└── stitch/
```

**문서 헤더에 메타데이터 추가**:
```../03_Specs/new-spec.md"
tags: [completed, verification, billing]
---
```

**장점**:
- ✅ 파일 이동 없이 상태 관리 가능
- ✅ 검색 및 필터링 용이
- ✅ 자동화 가능 (스크립트로 상태 확인)

**단점**:
- ⚠️ 모든 문서에 메타데이터 추가 필요
- ⚠️ 메타데이터 유지보수 필요

---

### 4.3 방법론 C: 통합 요약 문서 생성 (보완)

**구조**:
```
docs/
├── archive/
│   ├── completed/           # 원본 문서들
│   └── summaries/           # 통합 요약 문서
│       ├── 2024-summary.md
│       ├── 2025-summary.md
│       └── 2026-summary.md
```

**요약 문서 예시**:
```markdown
# 2025년 완료된 작업 요약

## 구현 완료 항목
1. X402 프로토콜 연동 (2025-01-15)
   - 원본: archive/completed/X402_SPEC.md
   - 검증: reports/verification/X402_VERIFICATION.md
   - 상태: ✅ 완료

2. CHOCO 토큰 발행 (2025-02-20)
   - 원본: archive/completed/CHOCO_TOKEN_SPEC.md
   - 검증: reports/verification/CHOCO_VERIFICATION.md
   - 상태: ✅ 완료
```

**장점**:
- ✅ 빠른 개요 파악 가능
- ✅ 원본 문서는 보존하면서 요약 제공
- ✅ 시간순 정리 용이

**단점**:
- ⚠️ 요약 문서 작성 및 유지보수 필요

---

## 5. 권장 방법론: 하이브리드 접근

### 5.1 단계별 전략

**Phase 1: 즉시 적용 (1주일)**
1. ✅ 완료 상태가 명확한 문서 식별
2. ✅ `archive/completed/2026/` 폴더 생성
3. ✅ 완료된 문서 이동 및 README 생성

**Phase 2: 중기 정리 (1개월)**
1. ✅ 검증 보고서 정리 (`archive/verification/`)
2. ✅ 통합 요약 문서 생성 (`archive/summaries/`)
3. ✅ 인덱스 문서 생성 (`archive/README.md`)

**Phase 3: 장기 유지보수 (지속)**
1. ✅ 분기별 아카이브 검토
2. ✅ 6개월 이상 미수정 문서 자동 아카이브
3. ✅ 아카이브 문서 정기 검토 및 정리

---

### 5.2 구체적 실행 계획

#### Step 1: 완료 문서 식별

**식별 기준**:
- 문서 내 "✅ 완료", "✅ 구현 완료", "✅ 검증 완료" 표시
- `reports/verification/` 폴더의 검증 보고서 존재
- 마지막 수정일이 6개월 이상 경과

**대상 문서 예시**:
- `archive/PAYMENT_UI_CLEANUP_SPEC.md` (이미 archive에 있음)
- `archive/WALLET_CARD_MIGRATION_SPEC.md` (이미 archive에 있음)
- `reports/verification/PHASE_1_2_VERIFICATION.md`
- `reports/verification/PHASE_3_VERIFICATION.md`
- `reports/verification/PHASE_4_VERIFICATION.md`
- `reports/verification/PHASE_5_VERIFICATION.md`

#### Step 2: 폴더 구조 생성

```
docs/archive/
├── README.md                    # 아카이브 인덱스
├── completed/
│   ├── 2024/
│   ├── 2025/
│   └── 2026/
│       ├── specs/               # 구현 명세서
│       └── verifications/       # 검증 보고서
└── summaries/
    ├── 2024-summary.md
    ├── 2025-summary.md
    └── 2026-summary.md
```

#### Step 3: 문서 이동 및 메타데이터 추가

**이동 전 문서 헤더에 추가**:
```../05_Test/X402_SPEC.md"
tags: [completed, verification, phase4, x402]
---
```

#### Step 4: 인덱스 문서 생성

**`docs/archive/README.md`**:
```markdown
# 문서 아카이브 인덱스

이 폴더는 완료된 문서들을 보관합니다.

## 아카이브 기준
- 구현 완료
- 검증 완료
- 6개월 이상 미수정
- 참조 빈도 낮음

## 구조
- `completed/`: 완료된 구현 문서
- `summaries/`: 연도별 요약 문서

## 최근 아카이브 (2026)
- [Phase 4 검증 보고서](completed/2026/verifications/PHASE_4_VERIFICATION.md)
- [X402 명세서](completed/2026/specs/X402_SPEC.md)

## 전체 목록
[연도별 목록 보기](summaries/)
```

---

## 6. 자동화 가능한 부분

### 6.1 스크립트 기반 식별

**예시 스크립트** (`scripts/identify-archivable-docs.mjs`):
```javascript
// 완료 상태 표시가 있는 문서 찾기
// 마지막 수정일이 6개월 이상 경과한 문서 찾기
// 검증 보고서가 있는 문서 찾기
```

### 6.2 CI/CD 통합

**GitHub Actions 예시**:
```yaml
# 분기별로 아카이브 검토
# 6개월 이상 미수정 문서 자동 식별
# PR 생성하여 아카이브 제안
```

---

## 7. 아카이브 후 관리

### 7.1 참조 링크 업데이트

**원칙**:
- 아카이브된 문서를 참조하는 다른 문서의 링크는 업데이트
- 또는 "이 문서는 아카이브되었습니다" 안내 추가

### 7.2 정기 검토

**주기**:
- **분기별**: 아카이브 대상 문서 검토
- **연간**: 아카이브된 문서 중 삭제 가능한 문서 검토

**검토 항목**:
- 아직 참조되는 문서인지 확인
- 더 이상 필요 없는 문서인지 확인
- 통합 요약 문서 업데이트

---

## 8. 예시: Phase 문서 아카이브

### 8.1 현재 상태
- `reports/verification/PHASE_1_2_VERIFICATION.md`
- `reports/verification/PHASE_3_VERIFICATION.md`
- `reports/verification/PHASE_4_VERIFICATION.md`
- `reports/verification/PHASE_5_VERIFICATION.md`

### 8.2 아카이브 후
```
docs/archive/completed/2026/verifications/
├── PHASE_1_2_VERIFICATION.md
├── PHASE_3_VERIFICATION.md
├── PHASE_4_VERIFICATION.md
└── PHASE_5_VERIFICATION.md
```

### 8.3 요약 문서 생성
```markdown
# 2026년 Phase 검증 보고서 요약

## Phase 1-2: 기본 인프라
- 완료일: 2026-01-10
- 주요 내용: NEAR 지갑 연동, 기본 토큰 시스템
- 상태: ✅ 완료

## Phase 3: 토큰 시스템
- 완료일: 2026-01-11
- 주요 내용: CHOCO 토큰 발행, 잔액 동기화
- 상태: ✅ 완료

...
```

---

## 9. 권장 사항

### 9.1 즉시 적용 가능한 조치

1. ✅ **완료 상태 명확화**: 모든 문서에 상태 표시 추가
2. ✅ **아카이브 폴더 구조 생성**: `archive/completed/2026/` 구조 생성
3. ✅ **인덱스 문서 생성**: `archive/README.md` 생성

### 9.2 중기 개선 사항

1. ⚠️ **자동화 스크립트**: 아카이브 대상 문서 자동 식별
2. ⚠️ **통합 요약 문서**: 연도별 요약 문서 생성
3. ⚠️ **CI/CD 통합**: 분기별 자동 검토

### 9.3 장기 유지보수

1. 🔮 **문서 생명주기 관리**: 문서 생성부터 아카이브까지 전체 프로세스 정의
2. 🔮 **검색 시스템**: 아카이브된 문서도 검색 가능하도록 인덱싱
3. 🔮 **문서 의존성 관리**: 문서 간 참조 관계 시각화

---

## 10. 결론

**권장 방법론**: **하이브리드 접근 (폴더 기반 + 메타데이터 + 요약 문서)**

**즉시 실행 가능한 단계**:
1. 완료 문서 식별 및 이동
2. 아카이브 폴더 구조 생성
3. 인덱스 문서 생성

**예상 효과**:
- ✅ 활성 문서와 완료 문서 구분 명확화
- ✅ 문서 검색 및 유지보수 효율성 향상
- ✅ 새로운 팀원의 온보딩 시간 단축

---

**상태**: 📋 제안 완료  
**작성일**: 2026-01-14  
**다음 단계**: 사용자 승인 후 실행


## Related Documents
- **Foundation**: [Document Management Plan](./09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
