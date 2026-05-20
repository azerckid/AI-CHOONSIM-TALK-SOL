# 05. Code Review Plan
> Created: 2026-05-21 07:24
> Last Updated: 2026-05-21 07:24
> Category: QA Validation - 전체 코드 리뷰 실행 계획

---

## 1. 목적

이 문서는 AI-CHOONSIM-TALK-SOL 프로젝트의 전체 코드 리뷰를 빠짐없이 수행하기 위한 실행 계획이다. 리뷰는 단순 코드 스타일 점검이 아니라, 문서-코드 동기화, UI 흐름, 코드 품질, 보안, 성능, DB 스키마, 스킬 검증까지 포함하는 Stage 1 AI Auto-Review 기준으로 진행한다.

이번 리뷰의 기본 원칙은 다음과 같다.

- 전체 코드베이스를 기준으로 하되, `git diff HEAD`가 있으면 변경 파일을 우선 점검한다.
- 결제, 지갑, AI Tool Calling, 인증, DB, 운영 환경, 모바일 UX를 모두 리뷰 대상에 포함한다.
- 자동 명령으로 확인 가능한 항목은 실제 명령을 실행하고 결과를 리뷰 보고서에 기록한다.
- 수동 로그인이 필요한 내부 E2E는 테스트 계정 또는 접속 정보 확보 후 별도 검증한다.
- 발견 이슈는 높음, 중간, 낮음으로 분류하고 배포/PR 차단 여부를 명확히 표시한다.

---

## 2. 리뷰 범위

### 2-1. 전체 대상

- [ ] 루트 설정: `package.json`, `turbo.json`, `.gitignore`, `.github/`, 배포 관련 설정
- [ ] 앱 설정: `apps/web/package.json`, `vite.config.ts`, `drizzle.config.ts`, `tsconfig.json`
- [ ] React Router 라우트: `apps/web/app/routes/`
- [ ] UI 컴포넌트: `apps/web/app/components/`
- [ ] 서버 로직: `apps/web/app/lib/**/*.server.ts`, API route, auth, payment, Solana, AI
- [ ] DB 스키마: `apps/web/app/db/schema.ts`
- [ ] 훅과 클라이언트 상태: `apps/web/app/hooks/`
- [ ] 테스트 코드: `apps/web/app/**/__tests__/`, `*.test.ts`, `*.spec.ts`
- [ ] 문서: `docs/01_Concept_Design/`부터 `docs/05_QA_Validation/`까지 전체 연결성
- [ ] 로컬 스킬: `.agent/skills/verify-*`, `.agent/skills/rules-*`, `.agent/skills/manage-*`

### 2-2. 우선 리스크

| 우선순위 | 영역 | 이유 | 관련 확인 |
|:---:|:---|:---|:---|
| P0 | 402 결제 복구 UX | 잔액 부족 이후 유료 전환 흐름이 끊기면 수익 루프가 실패한다. | 채팅 -> 402 -> CHOCO 충전 -> 모달 닫기 -> 원래 대화 복귀 |
| P0 | 채팅 인라인 결제 | Shop 결제 성공이 채팅 `SWAP_TX` 경로의 안전성을 보장하지 않는다. | reference, payer, amount, signature 중복, reconciliation |
| P0 | 인증/인가/API 보호 | 결제, 지갑, 관리자, 사용자 데이터가 보호되어야 한다. | session guard, role guard, method 제한, 401/403 응답 |
| P0 | 시크릿과 환경 설정 | 운영 전환 전 devnet/mainnet, Privy, RPC 설정 분리가 필요하다. | `VITE_*`, server secret, `.env*` git 제외 |
| P1 | LangGraph Tool Calling | 자연어 도구 호출 안정성과 결제성 액션 안전성에 영향을 준다. | ToolNode, tool schema, fallback, error handling |
| P1 | 로그인 후 모바일 E2E | 핵심 앱 경험은 로그인 이후에 발생한다. | chat, wallet, payment, memory album |
| P1 | DB/온체인 정합성 | DB CHOCO와 SPL CHOCO 불일치가 운영 리스크가 된다. | source of truth, reconciliation, admin visibility |
| P2 | 성능과 번들 | 지갑/AI/결제 라이브러리가 초기 로드를 무겁게 만들 수 있다. | build output, lazy loading, Lighthouse |

---

## 3. 참조 기준

### 3-1. 프로젝트 기준 문서

- [ ] `AGENTS.md` - 승인, 문서, git, 코드 수정 전 Self-Reflection 기준
- [ ] `docs/04_Logic_Progress/07_MASTER_ROADMAP.md` - 현재 Phase, P0/P1/P2 리스크
- [ ] `docs/05_QA_Validation/04_CURRENT_ISSUES_AND_PRIORITIES.md` - 현재 문제점과 우선순위
- [ ] `docs/02_UI_Screens/01_UI_DESIGN.md` - UI-First 기준
- [ ] `docs/03_Technical_Specs/` - API, Solana, AI Agent, 결제 기술 명세

### 3-2. 적용 스킬

| 순서 | 스킬 | 적용 목적 |
|---:|:---|:---|
| 1 | `manage-collaboration` | Stage 1 AI Auto-Review, 승인, 역할 기준 확인 |
| 2 | `rules-docs` / `docs-dev` | QA 문서 구조와 Related Documents 기준 확인 |
| 3 | `verify-docs` | 문서 구조, 메타데이터, Related Documents 검증 |
| 4 | `verify-ui` | 화면 구조, 사용자 동선, 상태별 UI, 접근성 검증 |
| 5 | `verify-code` | 로직, 타입, 중복, 사이드 이펙트, 불필요 코드 검토 |
| 6 | `verify-security` | OWASP 기준 인증, 인가, 입력, 시크릿, API 보안 점검 |
| 7 | `verify-performance` | Core Web Vitals, 번들, 이미지, 렌더링 전략 점검 |
| 8 | `verify-drizzle-schema` | Drizzle 스키마와 기술 명세 정합성 검토 |
| 9 | `verify-skills` | 스킬 메타데이터와 로컬 검증 체계 확인 |

---

## 4. 실행 순서

### 4-1. Phase A - 기준선 확보

- [ ] `git status --short`로 워킹트리 상태 확인
- [ ] `git branch --show-current`로 현재 브랜치 확인
- [ ] `git diff --name-only HEAD`로 최근 변경 파일 확인
- [ ] `npm --version`, `node --version`로 실행 환경 확인
- [ ] 루트와 `apps/web`의 package scripts 확인

### 4-2. Phase B - 문서와 로드맵 정합성 리뷰

- [ ] `docs/` 5-Layer 구조 확인
- [ ] 문서 메타데이터와 `Related Documents` 확인
- [ ] 마스터 로드맵의 `Needs Regression`, `Open Risk` 항목을 리뷰 체크리스트로 변환
- [ ] UI 문서와 현재 라우트/컴포넌트가 어긋나는 부분 식별
- [ ] 문서에 없는 구현 또는 구현에 없는 문서 요구사항 식별

### 4-3. Phase C - 정적 코드 리뷰

- [ ] 라우트별 loader/action/API handler의 인증 및 에러 처리 확인
- [ ] 결제 관련 코드의 transaction 생성, verify, replay 방지, reconciliation 확인
- [ ] Solana/Privy/Phantom 경로의 지갑 선택, 서명, 실패 복구 확인
- [ ] LangGraph, ToolNode, tool schema, fallback 모델, 스트리밍 경로 확인
- [ ] DB write 경로의 의도치 않은 중복 지급, 삭제, 업데이트 누락 확인
- [ ] `any`, 무근거 `as`, 외부 입력 미검증, 하드코딩 설정 탐지
- [ ] `console.*`, dead code, TODO/FIXME, 미사용 코드 식별

### 4-4. Phase D - 자동 검증 명령 실행

아래 명령은 코드 리뷰 중 실제로 실행하고 결과를 보고서에 기록한다. 실패 시 명령, 실패 로그 요약, 영향 범위, 재검증 조건을 함께 남긴다.

```bash
git status --short
git diff --name-only HEAD
node --version
npm --version
npm run typecheck
npm test
npm run build
npm audit --audit-level=high
```

앱 단위 보조 검증이 필요하면 다음 명령도 실행한다.

```bash
npm --prefix apps/web run typecheck
npm --prefix apps/web run test:identity
npm --prefix apps/web run test:context
npm --prefix apps/web run test:context-memory
```

### 4-5. Phase E - 보안 리뷰

- [ ] `.env*`가 git에 포함되지 않는지 확인
- [ ] 클라이언트 공개 env와 서버 secret이 분리되어 있는지 확인
- [ ] 결제, 지갑, 관리자, 사용자 데이터 API에 인증 가드가 있는지 확인
- [ ] 상태 변경 API의 HTTP method 제한과 CSRF/SameSite 위험 확인
- [ ] 외부 입력에 Zod 또는 명확한 런타임 검증이 적용되어 있는지 확인
- [ ] `npm audit --audit-level=high` 결과 high/critical 취약점 확인

### 4-6. Phase F - UI/UX 및 수동 E2E 계획

로그인 이후 내부 흐름은 실제 계정 또는 테스트 세션이 있어야 검증할 수 있다. 접속 정보가 제공되면 다음 경로를 실제 브라우저에서 확인한다.

- [ ] 로그인 -> Home -> Chat 진입
- [ ] 채팅 메시지 전송 -> AI 응답 스트리밍 -> 에러/재시도 UI
- [ ] CHOCO 부족 -> 402 -> BuyChocoPayCard 표시
- [ ] Phantom 결제 -> verify-sig -> 잔액 반영 -> 원래 대화 복귀
- [ ] Privy 임베디드 지갑 결제 -> verify-sig -> 잔액 반영
- [ ] 기억 각인 요청 -> cNFT mint -> Explorer 링크 -> `/profile/memories` 반영
- [ ] Profile wallet/export/private key 관련 UX와 접근 제어 확인
- [ ] 모바일 viewport에서 채팅, 모달, 하단 내비게이션, 결제 카드 겹침 확인

필요 접속 정보:

- [ ] 일반 사용자 테스트 계정
- [ ] CHOCO 잔액이 부족한 테스트 계정
- [ ] CHOCO 잔액이 충분한 테스트 계정
- [ ] Privy 임베디드 지갑이 연결된 테스트 계정
- [ ] Phantom 지갑 테스트 주소 또는 devnet 지갑
- [ ] 관리자 페이지 검증이 필요하면 admin 권한 테스트 계정

### 4-7. Phase G - 보고서 작성

리뷰 완료 후 `docs/05_QA_Validation/06_CODE_REVIEW_REPORT.md`를 작성한다. 보고서는 다음 형식을 따른다.

- [ ] 실행 일시와 환경
- [ ] 실행한 명령과 결과
- [ ] PASS 항목
- [ ] 배포/PR 차단 항목
- [ ] 개선 필요 항목
- [ ] 문서 동기화 필요 항목
- [ ] 수동 E2E 미검증 항목과 필요한 접속 정보
- [ ] 재검증 계획

---

## 5. 심각도 기준

| 심각도 | 의미 | 예시 | 처리 |
|:---:|:---|:---|:---|
| 높음 | 배포 또는 PR 차단 수준 | 결제 중복 지급, 인증 우회, 시크릿 노출, build/typecheck 실패 | 수정 전 머지 금지 |
| 중간 | 품질 저하 또는 회귀 가능성 | 누락된 에러 상태, 일부 E2E 미검증, 타입 단언 남용 | 배포 전 수정 또는 명시적 승인 필요 |
| 낮음 | 개선 권장 | 네이밍, 중복 축소, 문서 표현 보완 | 후속 작업으로 등록 가능 |

---

## 6. Global Rubric Scorecard

| Criterion | Review Goal | Evidence to Collect |
|:---|:---|:---|
| Functionality | 핵심 기능과 회귀 대상이 실제로 동작하는지 확인한다. | typecheck, test, build, 결제/채팅/기억 E2E 결과 |
| Potential Impact | 핵심 사용자 루프가 제품 성장과 제출 품질에 기여하는지 확인한다. | 로드맵 P0/P1 정리, 핵심 루프 화면 반영 여부 |
| Novelty | AI 관계 기억, CHOCO, cNFT, Solana 결합이 구현상 일관적인지 확인한다. | AI Tool Calling, 기억 각인, 온체인 링크 검증 |
| UX | 결제, 채팅, 로그인, 모바일 흐름이 사용자에게 회복 가능한 경험인지 확인한다. | 402 복구, 로딩/빈/오류 상태, 모바일 수동 QA |
| Open-source | 구조와 설정이 재사용 가능하고 환경 의존성이 분리되어 있는지 확인한다. | env 분리, 모듈 경계, 스크립트, 문서화 상태 |
| Business Plan | 결제와 잔액 정합성이 수익 모델을 지탱할 수 있는지 확인한다. | CHOCO 지급, 구독, reconciliation, 운영 모니터링 |

---

## 7. Review Gate

코드 리뷰는 아래 조건을 모두 충족해야 완료로 본다.

- [ ] 전체 리뷰 범위가 보고서에 포함되었다.
- [ ] 자동 검증 명령의 실행 결과가 기록되었다.
- [ ] audit 결과가 기록되었다.
- [ ] 보안, 결제, 인증, AI, DB, UI/UX, 성능 항목이 모두 Pass/Fail/N/A로 분류되었다.
- [ ] N/A 항목은 사유가 기록되었다.
- [ ] 수동 E2E에 필요한 접속 정보가 없으면 `Blocked - 접속 정보 필요`로 표시되었다.
- [ ] 높음 심각도 이슈가 있으면 배포/PR 차단 항목으로 별도 표시되었다.
- [ ] 후속 수정은 사용자 승인 후 별도 작업으로 진행한다.

---

## 8. Related Documents

- **Concept_Design**: [Roadmap](../01_Concept_Design/02_ROADMAP.md) - 제품 단계별 방향과 제출 이후 전략 참고
- **UI_Screens**: [UI Design](../02_UI_Screens/01_UI_DESIGN.md) - 화면 구조와 사용자 경험 검증 기준
- **Technical_Specs**: [CHOCO Payment Flow](../03_Technical_Specs/11_CHOCO_PAYMENT_FLOW.md) - 결제 흐름과 검증 기준
- **Technical_Specs**: [AI Agent Transformation](../03_Technical_Specs/05_AI_AGENT_TRANSFORMATION.md) - AI 도구 호출 구조 검증 기준
- **Logic_Progress**: [Master Roadmap](../04_Logic_Progress/07_MASTER_ROADMAP.md) - 현재 P0/P1/P2 리스크와 회귀 검증 상태
- **QA_Validation**: [Current Issues and Priorities](./04_CURRENT_ISSUES_AND_PRIORITIES.md) - 현재 문제점과 우선순위 기준
