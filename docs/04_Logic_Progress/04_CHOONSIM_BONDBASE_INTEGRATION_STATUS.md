# 춘심톡–BondBase 연동 현황

> Created: 2026-02-11  
> Last Updated: 2026-02-11  

**목적**: 춘심톡 측 전송·데이터 생성 상태와 BondBase 측 수신 처리 현황을 정리한다. 전달용·확인용.

---

## 1. 한 줄 요약 (BondBase → 춘심톡 전달용)

**춘심톡 쪽 전송·데이터 생성은 준비돼 있습니다. 이번 BondBase 수정(500 원인 제거)으로 수신 가능해졌으므로, 배포 후 bondbase-sync가 보내는 REVENUE/METRICS가 정상 수신되면 choonsim_revenue에 CHOCO_CONSUMPTION이 쌓입니다.**

---

## 2. 춘심톡 측 연동 현황 (전달 문구)

- **전송 구조**: 배포 환경에서 bondbase-sync가 매시간 실행되며, ChocoConsumptionLog를 characterId별로 합산해 BondBase API(`BONDBASE_API_URL`)로 REVENUE/METRICS를 POST하고 있습니다.
- **데이터 생성**: 배포 DB에 Mock 유저 50명을 두었고, 매시간 mock-activity로 초코 소비를 시뮬레이션해 ChocoConsumptionLog가 쌓이도록 했습니다. **보낼 데이터는 있습니다.**
- **과거 이슈**: REVENUE/METRICS 요청 시 BondBase API에서 **500 Internal Server Error**가 반환되어, 춘심톡에서는 전송을 시도하지만 BondBase 쪽에 CHOCO_CONSUMPTION이 0건으로 보이던 상태였습니다.
- **BondBase 측 조치 후**: 수신 성공 시 2xx를 반환하도록 수정되었으므로, 배포 후에는 **수신 가능해졌다**고 보시면 됩니다.

---

## 3. BondBase 측 조치 요약 (500 원인 제거)

| 항목 | 내용 |
|------|------|
| **원인** | REVENUE 처리 시 `relayDepositYield`(온체인 배당)가 실패하면 예외가 나고, 그때 500을 반환해 춘심톡에서 "실패"로 인식하고 데이터가 쌓이지 않음. |
| **수정** | REVENUE: DB에 `choonsim_revenue` 저장 후 relay 시도. relay가 실패해도 DB 행은 삭제하지 않고 **200 반환**, relay 실패만 로그로 남김. MILESTONE(bonusAmount relay) 실패 시에도 예외를 던지지 않고 로그만 남긴 뒤 200 반환. |
| **결과** | 인증·바디 검증·DB 저장이 성공하면 **항상 2xx** 반환. 배포 후 bondbase-sync가 보내는 REVENUE/METRICS가 정상 수신되면 `choonsim_revenue`에 CHOCO_CONSUMPTION이 쌓임. |

---

## 4. 수신 스펙·엔드포인트·인증 확인용

| 구분 | 내용 |
|------|------|
| **엔드포인트** | BondBase API URL (춘심톡 env: `BONDBASE_API_URL`) |
| **인증** | `Authorization: Bearer {CHOONSIM_API_KEY}` |
| **REVENUE** | POST body: `{ bondId, type: "REVENUE", data: { amount, source: "CHOCO_CONSUMPTION", description } }` |
| **METRICS** | POST body: `{ bondId, type: "METRICS", data: { followers, subscribers } }` |

스펙 상세는 BondBase 측 문서(Revenue Bridge Spec 02, Multi-Character Bond 등 08) 참조.

---

## 5. 관련 문서

- **Logic**: [06_BONDBASE_BRIDGE_PLAN.md](./06_BONDBASE_BRIDGE_PLAN.md) — BondBase 연동 구현 계획·배포 환경 요약
- **Specs (BondBase)**: Revenue Bridge Spec (02), Multi-Character Bond 등 (08) — 수신 스펙·엔드포인트·인증
