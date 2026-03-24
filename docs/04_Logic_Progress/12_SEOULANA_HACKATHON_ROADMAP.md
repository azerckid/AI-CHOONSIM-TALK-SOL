# Seoulana Hackathon — 11일 구현 로드맵
> Created: 2026-03-25 14:00
> Last Updated: 2026-03-25 14:00

**기간**: 2026-03-25(수) ~ 2026-04-05(일) 23:59 KST
**남은 일수**: 11일
**목표**: WarmUp Seoulana Hackathon MVP 제출

---

## 전략 원칙

1. **Demo First**: 심사위원이 3분 안에 체험 가능한 데모를 최우선으로 완성한다.
2. **Devnet OK**: 온체인 기능은 Solana Devnet에서 작동하면 충분하다.
3. **기존 코드 최대 활용**: AI 엔진, 채팅 UI, DB는 그대로. Solana 레이어를 위에 얹는다.
4. **우선순위 엄수**: Blinks → cNFT → Agent Kit → Token Extensions 순서. 시간 부족 시 뒤에서 제거.

---

## Day-by-Day 계획

### Day 1 (3/25, 수) — 환경 셋업
**목표**: Solana 개발 환경 완성 및 기존 코드 영향도 파악

- [ ] Solana Devnet 지갑 생성 및 SOL 에어드롭
- [ ] 필수 패키지 설치:
  ```bash
  npm install @solana/web3.js @solana/spl-token @solana/wallet-adapter-react
  npm install @metaplex-foundation/mpl-bubblegum solana-agent-kit
  ```
- [ ] `apps/web/App.tsx`에 Solana `WalletProvider` 추가 (기존 EVM 유지)
- [ ] `.env` 에 `SOLANA_RPC_URL`, `SOLANA_AGENT_PRIVATE_KEY` 추가
- [ ] 기존 Solana Pay 코드 검토 → 재사용 가능 부분 파악

**완료 기준**: `solana balance` DevNet 지갑 확인, WalletProvider 렌더 에러 없음

---

### Day 2 (3/26, 목) — Blinks 기반 셋업
**목표**: Actions API 엔드포인트 기본 골격 완성

- [ ] `apps/web/app/routes/api/actions/` 디렉토리 생성
- [ ] `GET /api/actions/gift` — 메타데이터 반환 (JSON)
- [ ] CORS 헤더 설정 (Actions 표준 필수)
- [ ] Blink URL 로컬 테스트: `https://dial.to/?action=solana-action:<url>`
- [ ] `apps/web/app/lib/solana/actions.server.ts` 공통 유틸 작성

**완료 기준**: dial.to에서 Gift Blink 메타데이터 렌더링 확인

---

### Day 3 (3/27, 금) — Gift Blink 완성
**목표**: Gift Action POST — 실제 트랜잭션 생성 및 서명 흐름 완성

- [ ] `POST /api/actions/gift` — Solana Transfer 트랜잭션 생성
- [ ] 유저 지갑 → 춘심 Treasury로 SOL(또는 CHOCO SPL) 전송 트랜잭션 반환
- [ ] Phantom 지갑에서 Blink 서명 E2E 테스트
- [ ] DB에 선물 기록 (`giftLog` 테이블 재사용)

**완료 기준**: Phantom에서 Gift Blink 실행 → Devnet 트랜잭션 확인

---

### Day 4 (3/28, 토) — Subscribe Blink + Check-in Blink
**목표**: 2개 추가 Action 완성

- [ ] `GET/POST /api/actions/subscribe` — 구독 플랜 선택 Action
- [ ] `GET/POST /api/actions/checkin` — 데일리 체크인 Action (메시지 서명)
- [ ] 3개 Blink URL을 X 포스트에서 테스트
- [ ] `apps/web/app/lib/solana/blinks.ts` — Blink URL 공유 헬퍼 완성

**완료 기준**: 3종 Blink가 X(트위터) 포스트에서 인터랙티브 UI로 렌더링

---

### Day 5 (3/29, 일) — cNFT 인프라 셋업
**목표**: Metaplex Bubblegum Merkle Tree 배포

- [ ] `scripts/deploy-merkle-tree.ts` 작성 및 Devnet 배포
  - depth: 14 (최대 16,384개 NFT)
  - 비용: ~0.1 SOL
- [ ] Tree 주소를 `.env`에 저장: `MERKLE_TREE_ADDRESS=`
- [ ] `apps/web/app/lib/solana/merkle-tree.server.ts` 작성
- [ ] `apps/web/app/lib/solana/cnft.server.ts` 민팅 함수 초안 작성

**완료 기준**: Devnet에 Merkle Tree 배포 완료, 주소 확인

---

### Day 6 (3/30, 월) — cNFT 민팅 API 완성
**목표**: "기억 새기기" 기능 E2E 작동

- [ ] `POST /api/memory/engrave` API 엔드포인트 작성
- [ ] 메타데이터 JSON → Cloudinary 업로드 (기존 Cloudinary 재사용)
- [ ] Bubblegum `mintV1` 호출 → 유저 지갑에 cNFT 발행
- [ ] DB `message` 테이블에 `nft_mint_address` 컬럼 추가 (Drizzle migration)
- [ ] 채팅 UI에 "기억 새기기" 버튼 추가 (기존 메시지 버블 컴포넌트)

**완료 기준**: 채팅 메시지 → "기억 새기기" → Devnet cNFT 민팅 → Solana Explorer 확인

---

### Day 7 (3/31, 화) — cNFT UI 완성 + 앨범 페이지
**목표**: 유저가 보유한 메모리 cNFT를 앱에서 확인

- [ ] `/profile/memories` 또는 기존 Album 페이지에 cNFT 목록 표시
- [ ] Solana RPC `getAssetsByOwner` (Metaplex DAS API) 호출로 보유 cNFT 조회
- [ ] cNFT 카드 컴포넌트 (이미지, 날짜, 감정 표시)
- [ ] Solana Explorer 링크 연결

**완료 기준**: 민팅한 cNFT가 앱 내 메모리 앨범에 표시됨

---

### Day 8 (4/1, 수) — AI Agent Kit 통합
**목표**: LangGraph에 Solana 인텐트 노드 추가

- [ ] `apps/web/app/lib/solana/solana-agent.server.ts` 작성
  - SolanaAgentKit 초기화
  - `getBalance()`, `transfer()` 메서드 래핑
- [ ] `apps/web/app/lib/ai/intent-classifier.ts` 작성
  - 온체인 인텐트 키워드 감지 (잔액/에어드롭/지갑)
- [ ] `graph.ts` 에 `detectOnchainIntent` 노드 삽입 (노드 2.5)
- [ ] Devnet에서 "잔액 확인해줘" 대화 테스트

**완료 기준**: 채팅에서 "내 SOL 잔액 확인해줘" → 춘심이 온체인 조회 후 실제 잔액 응답

---

### Day 9 (4/2, 목) — CHOCO Token-2022 (데모용)
**목표**: CHOCO SPL Token-2022 Devnet 발행 + Transfer Fee 데모

- [ ] `scripts/deploy-choco-token.ts` 작성
  - Token-2022 프로그램으로 CHOCO mint 생성
  - Transfer Fee: 2% (feeBasisPoints: 200)
  - Metadata Pointer 설정
- [ ] Devnet 배포 → mint 주소 `.env`에 저장
- [ ] 소량 CHOCO 민팅 후 Phantom에서 확인
- [ ] Transfer Fee 작동 Devnet 검증

**완료 기준**: Solana Explorer에서 CHOCO Token-2022 확인, Transfer Fee 작동 확인

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
- **Logic_Progress**: [Backlog](./00_BACKLOG.md) - 전체 프로젝트 백로그
- **Logic_Progress**: [Operations Readiness Checklist](./09_OPERATIONS_READINESS_CHECKLIST.md) - 운영 체크리스트
