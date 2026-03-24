# CHOCO 환율 계산 정책 사양서
> Created: 2026-02-08
> Last Updated: 2026-02-08

**작성일**: 2026-01-11  
**목적**: CHOCO 환율 계산 기준 및 정책 정의  
**상태**: ✅ 구현 완료 (Phase 1)

---

## 1. 기본 원칙

### 1.1 USD 기준 통일 정책

**핵심 원칙**: USD를 기준으로 모든 통화를 CHOCO로 변환합니다.

**이유**:
1. **일관성**: 모든 결제 수단(토스, 페이팔, NEAR)이 동일한 가치를 가짐.
2. **미래 확장성**: 그림/영상 생성 등 고비용 기능 도입 시 직관적인 과금 단위 제공.
3. **안정성**: API 원가 대비 약 80%의 운영 마진 확보.

### 1.2 CHOCO 가격 고정

**CHOCO 가격**: `CHOCO_PRICE_USD = 0.001`
- 1 CHOCO = $0.001 (한화 약 1.4원)
- $1 = 1,000 CHOCO

---

## 2. 환율 계산 방식

### 2.1 USD → CHOCO
**공식**: `CHOCO = USD / 0.001`
- $1 = 1,000 CHOCO
- $5 = 5,000 CHOCO

### 2.2 KRW → CHOCO
**공식**: `CHOCO = (KRW / 실시간 USD_KRW_환율) / 0.001`
- ₩1,400 (환율 1,400원 가정) = 1,000 CHOCO

### 2.3 NEAR → CHOCO
**공식**: `CHOCO = (NEAR × 실시간 NEAR_PRICE_USD) / 0.001`
- 1 NEAR (NEAR $5 가정) = 5,000 CHOCO
- 1 NEAR (NEAR $10 가정) = 10,000 CHOCO

---

## 3. 서비스 과금 기준 (안)

| 서비스 항목 | 차감량 | 가치 (USD) |
| :--- | :--- | :--- |
| 채팅 1회 (Flash) | 5 CHOCO | $0.005 |
| 이미지 생성 (1장) | 200 CHOCO | $0.200 |
| 영상 생성 (5초) | 2,000 CHOCO | $2.000 |

---

**최종 수정일**: 2026-01-13 (V1.1)


## Related Documents
- **Specs**: [Document Management Plan](../01_Concept_Design/09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
