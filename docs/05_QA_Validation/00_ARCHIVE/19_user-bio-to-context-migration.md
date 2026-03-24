# User.bio → 5계층 마이그레이션 가이드 (Phase 9)
> Created: 2026-02-08
> Last Updated: 2026-02-08

명세서: `../03_Specs/21_user-context-layers-spec.md` Section 9  
구현 계획: `../01_Foundation/16_USER_CONTEXT_LAYERS_PLAN.md` Section 11

## 개요

- **목적**: 기존 `User.bio` JSON 내 `memory` 문자열을 5계층(UserContext / UserMemoryItem)으로 이전.
- **기본 캐릭터**: 마이그레이션 시 `chunsim` 한 캐릭터에 대해 1건의 memory 항목으로 저장.
- **읽기**: 채팅 API는 이미 5계층을 우선 로드하고, 없을 때만 `User.bio` fallback 사용.  
  **쓰기**: Phase 9부터 채팅에서 `User.bio`에 memory를 쓰지 않음 (deprecate).

## 사전 준비

- [CRITICAL: DATABASE INTEGRITY RULE] **반드시 DB 백업 후** 실행.
- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`(또는 로컬 `file:./dev.db`) 설정 확인.

## 마이그레이션 실행

```bash
npx tsx scripts/migrate-user-bio-to-context.ts
```

- `User.bio`에 유효한 `memory` 문자열이 있는 유저만 처리.
- 해당 유저가 이미 `chunsim`에 대해 memory 항목을 보유하면 **건너뜀** (중복 미생성).
- 출력: 이전 완료 건수, 건너뜀, 실패 건수.

## 정합성 검증 (9.3)

- 샘플 유저에 대해: `User.bio`의 `memory` 문자열과 `UserMemoryItem`(chunsim) 1건의 `content`가 일치하는지 확인.
- 필요 시 Drizzle Studio 또는 직접 쿼리로 대조.

## 롤백 (필요 시)

새 테이블 기준으로 문제가 있을 때만 사용. **User.bio를 덮어쓰므로** 백업 후 실행.

```bash
npx tsx scripts/rollback-context-to-bio.ts
```

- `chunsim`에 대한 UserMemoryItem을 읽어, content를 합친 뒤 `User.bio.memory`에 기록.
- 기존 `User.bio`의 다른 필드(personaMode 등)는 유지.

## Deprecate 정책

- **User.bio**: 스키마에 deprecation 주석 적용. memory 관련 **쓰기**는 제거됨.  
  읽기 fallback은 마이그레이션·검증 기간 동안 유지 가능.
- **채팅**: memory 갱신은 5계층(`extractAndSaveMemoriesFromConversation`)만 사용.

---

**작성일**: 2026-02-05


## Related Documents
- **Test**: [Document Management Plan](../01_Concept_Design/09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
