# UI 정리 대상 목록 (준비 중/불필요 메뉴)

> Created: 2026-02-11
> Last Updated: 2026-02-22 (계정 탈퇴 구현 반영)

본 문서는 현재 UI에서 "준비 중"으로 표시되거나 불필요/미구현 메뉴를 정리한 목록입니다.

---

## 1. "준비 중" 화면 (ComingSoon 컴포넌트 사용)

| 경로 | 메뉴/위치 | 표시 문구 |
|------|-----------|-----------|
| `/profile/edit` | 프로필 > 프로필 수정 | "준비 중이에요! / 닉네임과 상태메시지를 변경할 수 있는 기능이 곧 추가됩니다." |
| `/profile/saved` | 프로필 > 저장된 순간들 | "준비 중이에요! / 좋아요한 대화와 사진을 모아볼 수 있는 기능이 곧 추가됩니다." |

---

## 2. 캐릭터 상세 내 Placeholder 탭

| 위치 | 탭 | 표시 문구 |
|------|-----|-----------|
| `/character/:id` | Voice | "Voice samples coming soon..." |
| `/character/:id` | Gallery | "Gallery coming soon..." |

---

## 3. 라우트 미등록 / 의심 구간

| 경로 | 사용처 | 비고 |
|------|--------|------|
| ~~`/search`~~ | ~~채팅 목록(`/chats`) 상단 검색 버튼~~ | ✅ 404 방지를 위해 검색 버튼 제거 완료 (2026-02-22) |

---

## 4. 미구현 기능 (TODO)

| 위치 | 기능 | 상태 |
|------|------|------|
| ~~`/settings`~~ | ~~계정 탈퇴~~ | ✅ 완료 (2026-02-22) - `POST /api/account/delete` 연동 |

---

## 5. 요약

| 구분 | 항목 수 | 비고 |
|------|---------|------|
| ComingSoon 전체 페이지 | 0 | Phase 1~3에서 구현 완료 |
| 탭 내부 placeholder | 0 | Phase 1~3에서 구현 완료 |
| 라우트 미등록 | 0 | /search 버튼 제거 완료 |
| TODO 미구현 | 0 | 계정 탈퇴 구현 완료 |

---

## Related Documents

- **Backlog**: [00_BACKLOG.md](./00_BACKLOG.md) - 프로젝트 백로그
- **Voice 전략**: [04_VOICE_INTERACTION_STRATEGY.md](../01_Concept_Design/04_VOICE_INTERACTION_STRATEGY.md) - Voice 탭 구현 시 참조
