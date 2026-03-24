# NEAR 잔여 제거 계획 (NEAR Residual Removal Plan)
> Created: 2026-02-11
> Last Updated: 2026-02-11

**목표**: 사용자·관리자 UI, 코드, DB에서 "NEAR" 관련 노출을 전부 제거한다. (Phase 0-3 이후 남은 레거시 정리)

**관련 문서**: `03_BM_IMPLEMENTATION_PLAN.md` (Phase 0), `00_BACKLOG.md`

---

## 1. 범위 요약

| 구분 | 내용 |
|------|------|
| **UI** | 가이드 FAQ, Admin 사용자 목록·시스템 대시보드, 지갑/결제 관련 문구에서 "NEAR" 제거 |
| **코드** | `nearAccountId` 등 fallback 제거, `nearBalance` → `serviceBalance` 등 키/주석 정리, NearPayButton 제거 |
| **DB** | User 테이블 `nearAccountId`, `nearPublicKey`, `nearPrivateKey`, `nearLastBalance` 컬럼 제거 (마이그레이션) |
| **데이터** | ExchangeLog.fromChain / ExchangeRate.tokenPair 등 기존 "NEAR" 문자열을 "LEGACY" 또는 "CTC"로 일괄 변경 (선택) |

---

## 2. 전제 조건

- 모든 실제 NEAR 연동 코드는 이미 제거됨 (Phase 0-3).
- 현재 `evmAddress` 없는 유저 중 `nearAccountId`만 있는 경우: `lib/ctc/wallet.server.ts`에서 fallback으로 `nearAccountId`를 반환 중.
- **제거 전**: 해당 유저들에게 EVM 지갑을 생성해 주거나, 또는 fallback 제거 시 "지갑 없음"으로 처리할지 정책 결정 필요.

---

## 3. 작업 단계

### Phase A. UI·노출 제거 (NEAR 문자열 사용자/관리자 노출 제거)

| 순서 | 파일 | 작업 |
|------|------|------|
| A-1 | `routes/guide.tsx` | FAQ "NEAR 블록체인에 NFT로" → "블록체인에 NFT로" 또는 "CTC 블록체인에 NFT로" 등으로 수정 |
| A-2 | `routes/admin/users/index.tsx` | 테이블 헤더 "NEAR Address" → "Wallet Address" 또는 "EVM Address"로 변경 |
| A-3 | `routes/admin/system.tsx` | `economy.serviceWallet.nearBalance` 표시 시 라벨을 "Service Balance" 등으로 변경 (아래 B-1과 연동) |
| A-4 | `lib/admin/stats.server.ts` | 반환 객체 `nearBalance` → `serviceBalance`로 키 변경. 값은 기존처럼 "N/A" 등 유지 |
| A-5 | `lib/constants/chain-labels.ts` | 주석 내 "NEAR" 설명 정리. `formatChainForDisplay` / `formatChainUnitForDisplay`에서 `"NEAR"` 분기 유지(과거 데이터 표시) 또는 DB 데이터를 LEGACY로 변경 후 "LEGACY" 분기로 대체 |

### Phase B. NEAR 전용 컴포넌트·API 참조 제거

| 순서 | 파일 | 작업 |
|------|------|------|
| B-1 | `components/payment/NearPayButton.tsx` | 컴포넌트 삭제. 사용처가 있으면 제거 후 대체 UI 또는 CTC/기타 결제 버튼으로 교체 |
| B-2 | (사용처 검색) | `NearPayButton`을 import하는 모든 파일에서 제거 |

### Phase C. 코드 내 near* fallback·주석 정리

| 순서 | 파일 | 작업 |
|------|------|------|
| C-1 | `lib/ctc/wallet.server.ts` | `nearAccountId` 조회·fallback 제거. (DB 컬럼 제거 후 진행 권장) evmAddress 없으면 null 반환 또는 EVM 지갑 생성만 수행 |
| C-2 | 주석 | `lib/ctc/*.ts`, `PaymentSheet.tsx`, `cron.server.ts` 등 "NEAR", "lib/near" 언급 주석을 "legacy", "이전 구현" 등으로 완화 또는 삭제 |

### Phase D. DB 스키마·데이터

| 순서 | 작업 | 비고 |
|------|------|------|
| D-1 | **데이터 정책 결정** | `nearAccountId`만 있고 `evmAddress` 없는 유저: (1) 마이그레이션 스크립트로 EVM 지갑 생성 후 evmAddress 채우기, (2) 또는 해당 유저는 "지갑 없음"으로 두고 컬럼만 제거 |
| D-2 | **User 테이블** | `nearAccountId`, `nearPublicKey`, `nearPrivateKey`, `nearLastBalance` 컬럼 DROP 마이그레이션 작성·실행 |
| D-3 | **ExchangeLog / ExchangeRate** | 기존 fromChain="NEAR", tokenPair="NEAR/USD" 등 데이터를 "LEGACY" 또는 "CTC"로 UPDATE (선택). UI에서 "NEAR"가 안 보이게만 할 경우 기존 값 유지하고 chain-labels에서만 "NEAR" → 일반 라벨 매핑 유지 가능 |
| D-4 | **Drizzle** | schema.ts에서 near* 컬럼 제거 후 `drizzle-kit generate` 또는 수동 SQL 마이그레이션 반영 |

### Phase E. 스크립트·기타

| 순서 | 파일 | 작업 |
|------|------|------|
| E-1 | `scripts/check-user-pk.ts` | `nearPublicKey` 참조 제거 또는 스크립트 삭제/폐기 |
| E-2 | `scripts/check-all-failed-logs.ts` | `fromChain === "NEAR"` 필터를 "LEGACY" 등으로 변경하거나 스크립트 목적 재정의 |
| E-3 | `scripts/update-doc-links.ts` | NEAR 관련 문서 매핑은 docs 보관용이므로 유지해도 됨. 필요 시 주석으로 "archived" 표시 |

---

## 4. 실행 순서 권장

1. **Phase A** (UI·노출): 사용자/관리자에게 "NEAR"가 보이지 않도록 먼저 처리.
2. **Phase B** (NearPayButton): 사용처 제거 후 컴포넌트 삭제.
3. **Phase D-1** 정책 확정 후 **D-2** User 컬럼 DROP 마이그레이션 실행.
4. **Phase C** (wallet.server fallback 제거 등) 실행.
5. **Phase D-3, D-4** (ExchangeLog/스키마 정리) 필요 시 진행.
6. **Phase E** (스크립트) 정리.

---

## 5. 체크리스트

- [x] A-1 ~ A-5: UI·관리자 화면·stats에서 NEAR 노출 제거
- [x] B-1, B-2: NearPayButton 제거 및 사용처 정리
- [x] C-1, C-2: wallet.server fallback 제거, 주석 정리
- [x] D-1: nearAccountId만 있는 유저에 대한 데이터 정책 결정 (스크립트: `scripts/migrate-near-users-to-evm.ts`)
- [x] D-2: User 테이블 near* 컬럼 DROP 마이그레이션 작성·실행 (`drizzle/0014_drop_near_columns.sql`, `scripts/run-migration-0014.ts`)
- [x] D-3, D-4: (선택) ExchangeLog/스키마 주석 정리, 선택 스크립트 `scripts/migrate-exchange-log-near-to-legacy.ts`
- [x] E-1 ~ E-3: 스크립트 정리

**DB 마이그레이션 실행 순서**: 1) `npx tsx scripts/migrate-near-users-to-evm.ts` 2) `npx tsx scripts/run-migration-0014.ts` 3) (선택) `npx tsx scripts/migrate-exchange-log-near-to-legacy.ts`

---

## 6. Related Documents

- **Logic_Progress**: [03_BM_IMPLEMENTATION_PLAN.md](./03_BM_IMPLEMENTATION_PLAN.md) - Phase 0 NEAR→CTC
- **Logic_Progress**: [00_BACKLOG.md](./00_BACKLOG.md) - 백로그
