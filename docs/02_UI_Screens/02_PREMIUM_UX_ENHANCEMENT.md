# 프리미엄 디자인 고도화 계획 (Premium UI/UX Enhancement Plan)
> Created: 2026-04-11
> Status: In Progress (Phase 1: Success Feedback & Wallet UI)

춘심(Choonsim) 프로젝트의 브랜드 가치를 높이고 사용자에게 '멋진(WOW)' 첫인상을 주기 위한 디자인 고도화 전략입니다.

---

## 1. 고도화 로드맵 (Roadmap)

### Phase 1: 즉시 로열티 강화 (Current)
- [ ] **체크인 성공 연출**: 미션 완료 시 화려한 시각적 보상 제공
- [ ] **지갑 프리미엄 카드**: 블록체인 자산 가시성을 높이는 Glassmorphism UI

### Phase 2: 상호작용 깊이감 (Planned)
- [ ] **동적 메쉬 그라데이션**: 춘심 브랜드 컬러 기반의 살아있는 배경 애니메이션
- [ ] **커스텀 온체인 로더**: 트랜잭션 대기 시간을 브랜드 경험으로 전환

---

## 2. 상세 구현 명세 (Technical Specs)

### 2.1 체크인 성공 연출 (Mission Success Visuals)
- **핵심 목표**: 사용자가 미션 완료 후 '초코'를 획득했을 때 강력한 긍정적 피드백 제공
- **구축 요소**:
  - **Confetti Effect**: 미션 완료 버튼 클릭 후 성공 응답 시 `canvas-confetti` 실행
  - **Success Modal**: CHOCO 획득량과 민팅된 NFT를 강조하는 팝업 애니메이션
  - **Haptic Feedback**: 모바일 브라우저에서 미세한 진동 효과 (Vibration API)

### 2.2 지갑 프리미엄 카드 (Premium Wallet Dashboard)
- **핵심 목표**: 단순 텍스트 위주의 지갑 정보를 '자산'처럼 느껴지게 디자인
- **디자인 토큰**:
  - **Glassmorphism**: `background: rgba(45, 27, 36, 0.4)`, `backdrop-filter: blur(20px)`
  - **Border**: `1px solid rgba(255, 255, 255, 0.1)` (상단 및 왼쪽 강조)
  - **Glow**: 브랜드 컬러(`#ee2b8c`) 소스 광원을 카드 뒷면에 배치하여 은은한 네온 효과
  - **Interactive**: 가속도계/마우스 움직임에 따라 카드가 미세하게 기울어지는 시차(Parallax) 효과

---

## 3. 디자인 시스템 업데이트 (CSS Utilities)

고도화를 위해 `app.css` 또는 Tailwind 설정에 추가될 유틸리티입니다.

```css
/* Glassmorphism Utility */
.glass-panel {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}

/* Pink Neon Glow */
.neon-glow-primary {
  box-shadow: 0 0 20px rgba(238, 43, 140, 0.3),
              0 0 40px rgba(238, 43, 140, 0.1);
}
```

---

## Related Documents
- **Design System**: [01_UI_DESIGN.md](./01_UI_DESIGN.md) - 기본 디자인 가이드라인
- **Technical Specs**: [03_Technical_Specs/01_DATABASE_SCHEMA.md](../03_Technical_Specs/01_DATABASE_SCHEMA.md) - 관련 데이터 구조
