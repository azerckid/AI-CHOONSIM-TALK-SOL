# 플랫폼 확장성 컨셉 — "춘심은 첫 번째 파트너다"
> Created: 2026-04-01
> Last Updated: 2026-04-01

---

## 1. 이 문서의 목적

이 문서는 **새로운 사업 방향을 선언하는 문서가 아니다.**

현재 AI-CHOONSIM-TALK-SOL의 아키텍처가 결과적으로 멀티 IP를 지원하는 구조로 설계되어 있다는 **사실(Fact)을 기록**하고, 이를 피치에서 어떻게 정직하게 표현할 수 있는지를 정의한다.

**핵심 메시지:**
> "춘심은 이 플랫폼의 첫 번째 파트너다. 아키텍처는 처음부터 IP 교체가 가능하도록 설계되었다."

---

## 2. 왜 이 서사가 필요한가

루브릭 평가에서 **Potential Impact(TAM)**와 **Open-source** 두 항목이 '보통'을 받은 이유는 하나다:

> "이 서비스가 춘심 개인의 수익 모델을 넘어 더 큰 생태계로 확장될 수 있는가?"

이 질문에 대한 답은 이미 코드 안에 있다. **단지 말하지 않았을 뿐이다.**

---

## 3. 코드가 증명하는 것 (구현된 사실)

아래는 추정이나 계획이 아닌, 현재 코드베이스에 실제로 존재하는 구조다.

### 데이터 레이어 — 완전한 멀티 캐릭터 격리
- `conversation` 테이블: `characterId` 컬럼으로 캐릭터별 대화 분리
- `userContext` 테이블: `(userId, characterId)` 복합 고유키 → 유저×캐릭터 관계가 독립적으로 존재
- `userMemoryItem` 테이블: 동일한 복합키 구조 → 기억도 캐릭터별 격리
- `character` 테이블: 캐릭터 메타데이터를 DB에서 관리

### AI 레이어 — 파라미터 기반 페르소나
- `applyCharacterName()` 함수: 시스템 프롬프트의 캐릭터명을 동적으로 치환
- LangGraph 그래프: `characterId`, `characterName`, `personaPrompt`를 상태값으로 받음 (하드코딩 아님)
- 음성 맵핑: `CHARACTER_VOICE_MAP`으로 캐릭터별 ElevenLabs 음성 연결

### Solana 레이어 — IP 중립적 구조
- cNFT 민팅: `characterId` 파라미터로 호출 (춘심 전용 로직 아님)
- Blinks 엔드포인트: 캐릭터 파라미터를 URL 쿼리로 수용 가능한 구조
- CHOCO 토큰: 단일 공유 토큰 (IP 공유 경제 모델 적용 가능)

### 어드민 레이어 — 비기술자 운영 가능
- `/admin/characters` UI: 캐릭터 Create/Edit/Delete 및 미디어 관리 인터페이스 존재

---

## 4. 코드가 증명하지 못하는 것 (아직 없는 것)

정직하게 말하기 위해, 없는 것도 명확히 구분한다.

- 화이트라벨 테마 시스템 (IP별 브랜딩/색상) — 없음
- 파트너 온보딩 대시보드 — 없음
- IP별 수익 배분 로직 — 없음
- 멀티테넌트 API 인증 — 없음

→ **따라서 "10분 런칭 툴킷"은 현재 사실이 아니다. 피치에서 이렇게 말하면 안 된다.**

---

## 5. 피치에서 말할 수 있는 것

### 허용되는 표현 (사실 기반)
> "저희 아키텍처는 처음부터 멀티 캐릭터를 지원하도록 설계했습니다. 데이터베이스, AI 페르소나 시스템, 온체인 레이어 모두 `characterId` 기반으로 격리되어 있습니다. 춘심은 이 인프라의 첫 번째 파트너입니다."

### 허용되지 않는 표현 (과장)
> ~~"모든 IP가 10분 만에 런칭 가능한 B2B SaaS 툴킷"~~
> ~~"플랫폼 비즈니스로의 확장"~~

### 피치 슬라이드 표현 (1장)
**제목**: *"춘심 이후 — 아키텍처가 열어두는 가능성"*

- DB, AI, Solana 3개 레이어 모두 캐릭터 교체 가능 구조
- 어드민 UI로 새 IP 캐릭터 즉시 등록 가능
- 향후 K-fandom IP → Solana 온보딩의 인프라 레이어로 성장 가능

---

## 6. 제품 집중도와의 관계

이 서사는 **제품의 집중을 해치지 않는다.**

- 지금 만들고 있는 것: 춘심과의 AI 컴패니언 경험
- 피치에서 추가하는 것: "이 인프라는 다른 IP에도 적용 가능하다" (1문장, 1슬라이드)
- 추가 개발: 없음

B2B SaaS로의 실제 전환은 **춘심 서비스가 검증된 이후의 별도 의사결정**이다. 지금은 서사만 추가하고, 제품은 춘심에 집중한다.

---

## Related Documents
- **Concept_Design**: [Core Pitch Deck](./01_CORE_PITCH_DECK.md) — Slide 8 "Future Weapon"과 연결
- **Concept_Design**: [Seoulana Pitch](./03_SEOULANA_PITCH.md) — Section 9 "Future Weapon"의 상세 근거
- **QA_Validation**: [Hackathon Rubric Evaluation](../05_QA_Validation/01_HACKATHON_RUBRIC_EVALUATION.md) — Potential Impact / Open-source 보통 평가 근거
