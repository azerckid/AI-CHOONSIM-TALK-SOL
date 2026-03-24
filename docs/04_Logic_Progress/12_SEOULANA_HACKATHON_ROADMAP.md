# Seoulana Hackathon — 11일 구현 로드맵
> Created: 2026-03-25 14:00
> Last Updated: 2026-03-25 20:00

**기간**: 2026-03-25(수) ~ 2026-04-05(일) 23:59 KST
**남은 일수**: 11일
**목표**: WarmUp Seoulana Hackathon MVP 제출

## 현재 진행 상황 (2026-03-25 기준)

| 구성요소 | 상태 | 비고 |
|:---|:---|:---|
| Solana 개발 환경 | ✅ 완료 | Devnet 지갑, 패키지, WalletProvider |
| Actions/Blinks API | ✅ 완료 | gift / subscribe / checkin 3종 |
| CHOCO Token-2022 | ✅ 배포 완료 | `E2o1MKpnwh5vELG4FDgiX2NA33L11hXPVfAPD3ai4GWf` (1B supply, 1% fee) |
| Merkle Tree (cNFT) | ✅ 배포 완료 | `AJxCqbFdWLmQ7xMqBQN3AXja9paZJZ9qrqvwViXVkXGF` (depth=14) |
| cNFT 민팅 API | ✅ 완료 | `POST /api/solana/mint-memory` |
| AI Agent Kit | ✅ 완료 | LangGraph 5개 Solana 툴 통합 |
| Blinks 데모 페이지 | ✅ 완료 | `/blinks` 라우트 |
| WalletButton UI | ✅ 완료 | Profile 페이지 Solana 섹션 |
| cNFT 메모리 앨범 UI | 🔲 미구현 | `/profile/memories` — DAS API 조회 |
| Vercel 배포 | 🔲 미완 | 해커톤 제출용 라이브 URL 필요 |
| 데모 영상 | 🔲 미완 | 제출 마감 4/5 23:59 KST |

---

## 전략 원칙

1. **Demo First**: 심사위원이 3분 안에 체험 가능한 데모를 최우선으로 완성한다.
2. **Devnet OK**: 온체인 기능은 Solana Devnet에서 작동하면 충분하다.
3. **기존 코드 최대 활용**: AI 엔진, 채팅 UI, DB는 그대로. Solana 레이어를 위에 얹는다.
4. **우선순위 엄수**: Blinks → cNFT → Agent Kit → Token Extensions 순서. 시간 부족 시 뒤에서 제거.

---

## Day-by-Day 계획

### ✅ Day 1~9 — 완료 (2026-03-25 일괄 완성)

| 작업 | 결과 |
|:---|:---|
| Solana 환경, WalletProvider, .env 설정 | ✅ |
| `connection.server.ts` + CORS 헬퍼 | ✅ |
| Gift / Subscribe / Check-in Blinks (3종) | ✅ |
| `actions.json` Blinks 레지스트리 | ✅ |
| CHOCO Token-2022 Devnet 배포 | ✅ `E2o1MKpnwh5vELG4FDgiX2NA33L11hXPVfAPD3ai4GWf` |
| Merkle Tree Devnet 배포 | ✅ `AJxCqbFdWLmQ7xMqBQN3AXja9paZJZ9qrqvwViXVkXGF` |
| `cnft.server.ts` + `POST /api/solana/mint-memory` | ✅ |
| AI Agent Kit — LangGraph 5개 툴 통합 | ✅ |
| `/blinks` 데모 페이지 + WalletButton | ✅ |
| `verify-solana-stack.ts` 검증 스크립트 | ✅ 10/10 PASS |

---

### Day 10 (4/3, 금) — 통합 테스트 + 데모 시나리오
**목표**: 심사위원이 따라할 수 있는 데모 플로우 완성

**데모 시나리오 (3분)**:
1. X에서 춘심 포스트 확인 → Gift Blink 클릭 → Phantom 서명 → 선물 완료
2. 앱에서 AI 춘심과 대화 → 감동적인 순간 → "기억 새기기" → cNFT 민팅 → Explorer 확인
3. "춘심아, 내 SOL 잔액 얼마야?" → 춘심이 Agent Kit으로 온체인 조회 → 응답
4. CHOCO Token-2022 Solana Explorer 링크 공유

- [ ] 데모 시나리오 E2E 1회 완주 테스트
- [ ] 버그 수정 우선순위화
- [ ] 데모용 Devnet 지갑에 충분한 SOL/CHOCO 확보

---

### Day 11 (4/4, 토) — 제출 준비
**목표**: 제출 서류 + 데모 영상 완성

- [ ] 데모 영상 녹화 (3분 이내, 위 시나리오 기준)
- [ ] GitHub README 업데이트 (Solana 기능 포함)
- [ ] 기존 `05_HACKATHON_SUBMISSION_INFO.md` 기반으로 Seoulana 제출 텍스트 작성
- [ ] Vercel 배포 최종 확인 (Devnet 모드)
- [ ] SuperTeam Korea 슬랙 채널 제출 안내 확인 후 제출

**예비일**: 4/5(일) — 버그 픽스 및 최종 점검

---

## 리스크 관리

| 리스크 | 대응 |
|:---|:---|
| Agent Kit + LangGraph 충돌 | Agent Kit 없이 수동 RPC 호출로 대체 |
| cNFT 민팅 오류 | Metaplex Devnet 상태 확인; 실패 시 Mock NFT로 데모 |
| Blinks X 렌더링 미작동 | dial.to 화면 녹화로 대체 데모 |
| 시간 부족 | Day 9 Token-2022 생략하고 나머지 완성도 높이기 |

---

## 완료 기준 (제출 시점)

| 기능 | 데모 가능 여부 |
|:---|:---|
| Gift Blink (X → 온체인) | 필수 |
| cNFT 메모리 인그레이빙 | 필수 |
| AI Agent Kit 잔액 조회 | 필수 |
| CHOCO Token-2022 | 권장 (Explorer 링크로 증명 가능) |
| Subscribe / Check-in Blink | 권장 |

---

## Related Documents
- **Concept_Design**: [Seoulana Pitch](../01_Concept_Design/06_SEOULANA_PITCH.md) - 해커톤 전략 및 포지셔닝
- **Technical_Specs**: [Solana Integration Specs](../03_Technical_Specs/03_SOLANA_INTEGRATION_SPECS.md) - 기술 구현 명세
- **Logic_Progress**: [Operations Readiness Checklist](./09_OPERATIONS_READINESS_CHECKLIST.md) - 운영 체크리스트
- **Logic_Progress**: [Vercel Deployment Checklist](./10_VERCEL_DEPLOYMENT_404_CHECKLIST.md) - Vercel 배포 점검
