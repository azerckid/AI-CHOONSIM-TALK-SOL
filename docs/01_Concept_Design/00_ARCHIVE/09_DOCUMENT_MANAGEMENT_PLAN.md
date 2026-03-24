# 문서 관리 및 체계화 플랜 (5-Layer Standard)
> Created: 2026-02-08 17:58
> Last Updated: 2026-02-11 01:06

**목적**: 프로젝트 규모 확장에 따른 문서 관리 체계화 및 "Vision to Test" 맥락 보존을 위한 5계층 표준 도입.

---

## 1. 5계층 문서 구조 (5-Layer Structure)

모든 문서는 아토믹(Atomic)한 단위로 관리되며, 아래의 5가지 핵심 디렉토리에 배치됩니다.

### 📂 `docs/01_Concept_Design/` (기회 & 디자인)
- **정의**: 프로젝트의 비전, 목적, 전략, 디자인 원칙을 정의하는 "상위 헌법".
- **포함 문서**: 비전/로드맵, 가격 정책, UI 디자인 가이드, 문서 관리 규정.

### 📂 `docs/02_UI_Screens/` (UI 스크린 & 리뷰)
- **정의**: UI 구현 결과물 및 사용자 플로우 검증을 위한 "시각적 증빙".
- **포함 문서**: 화면별 프로토타입 리뷰, 사용자 여정 지도(User Journey), UI 피드백 로그.

### 📂 `docs/03_Technical_Specs/` (상세 명세)
- **정의**: 기술적 구현을 위한 상세 설계 및 가이드라인. "설계 도면".
- **포함 문서**: DB 스키마, API 명세, 기술 도입 전략, 특정 기능 명세서.

### 📂 `docs/04_Logic_Progress/` (비즈니스 로직 & 백로그)
- **정의**: 실제 동작 규칙, 상태 관리, 알고리즘 및 실행 관리. "두뇌 & 엔진".
- **포함 문서**: `00_BACKLOG.md`(칸반), 상태 머신 설계, 정산/포인트 로직 설계.

### 📂 `docs/05_QA_Validation/` (QA & 검증)
- **정의**: 테스트 케이스, QA 결과, 버그 리포트. "품질 감사".
- **포함 문서**: 단계별 검증 리포트(Verification), E2E 테스트 가이드, QA 체크리스트.

---

## 2. 문서 관리 수칙 (Standard Rules)

1.  **파일명 컨벤션**: `2자리숫자_이름.md` 형식을 기본으로 한다. (예: `01_VISION.md`)
2.  **메타데이터 필수**: 모든 문서는 상단에 `Created` 및 `Last Updated` 타임스탬프를 포함해야 한다.
3.  **교차 참조 (Context Linking)**: 문서 하단에 `## Related Documents` 섹션을 두어 레이어 간 맥락을 연결한다.
4.  **Incremental Update**: 기존 내용을 전면 덮어쓰기보다, 변경 이력을 보존하며 점진적으로 업데이트한다.

---

## 3. 문서 상태 관리 (Maintenance)

- **Active**: 현재 시스템의 진실(Source of Truth)을 담고 있는 문서.
- **Archive**: 모든 완료/폐기 문서는 `docs/04_Logic_Progress/00_ARCHIVE/` 경로로 이동하여 관리한다.

---

## Related Documents
- **Concept_Design**: [Roadmap](./02_ROADMAP.md) - 프로젝트 전체 일정 및 실행 전략
- **Logic_Progress**: [Backlog](../04_Logic_Progress/00_BACKLOG.md) - 현재 진행 중인 구현 작업 리스트
- **Concept_Design**: [Document Consolidation](./11_DOCUMENT_CONSOLIDATION_STRATEGY.md) - 문서 통합 및 정리 전략
