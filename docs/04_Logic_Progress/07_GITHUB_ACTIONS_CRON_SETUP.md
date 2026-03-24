# GitHub Actions 외부 크론 스케줄러 설정
> Created: 2026-03-03 22:30
> Last Updated: 2026-03-03 22:30

## 1. 배경 및 목적

Vercel Hobby 플랜은 하루 1회 크론만 허용한다. 기존 `vercel.json` 크론 설정이 이 제한을 초과해 배포가 전면 차단되어 크론 설정을 제거하였다 (2026-02-26). 이후 두 엔드포인트는 수동 호출만 가능한 상태.

GitHub Actions `schedule` 트리거를 사용하여 외부에서 주기적으로 각 크론 엔드포인트를 호출하도록 설정한다. 별도 서비스 가입 없이 기존 GitHub 레포를 활용한다.

---

## 2. 대상 엔드포인트

| 엔드포인트 | 주기 | 역할 |
|-----------|------|------|
| `GET /api/cron/bondbase-sync` | 매시간 (`0 * * * *`) | BondBase 수익·지표 동기화 |
| `GET /api/cron/ctc-sweep` | 10분마다 (`*/10 * * * *`) | CTC EVM 스윕 — 유저 지갑 입금 수집 |

인증 방식: 두 엔드포인트 모두 `Authorization: Bearer {CRON_SECRET}` 헤더 필요.

---

## 3. 구현 계획

### 3.1 파일 구조

```
.github/
  workflows/
    bondbase-sync.yml      # BondBase 수익 동기화 (매시간)
    ctc-sweep.yml          # CTC EVM 스윕 (10분마다)
```

### 3.2 bondbase-sync.yml

```yaml
name: BondBase Sync

on:
  schedule:
    - cron: '0 * * * *'   # 매시간 정각 (UTC 기준)
  workflow_dispatch:       # 수동 트리거 (테스트용)

jobs:
  sync:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: Call bondbase-sync
        run: |
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
            -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            "${{ secrets.APP_URL }}/api/cron/bondbase-sync")
          echo "HTTP Status: $STATUS"
          if [ "$STATUS" != "200" ]; then
            echo "Cron failed with status $STATUS"
            exit 1
          fi
```

### 3.3 ctc-sweep.yml

```yaml
name: CTC EVM Sweep

on:
  schedule:
    - cron: '*/10 * * * *'  # 10분마다
  workflow_dispatch:

jobs:
  sweep:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: Call ctc-sweep
        run: |
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
            -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            "${{ secrets.APP_URL }}/api/cron/ctc-sweep")
          echo "HTTP Status: $STATUS"
          if [ "$STATUS" != "200" ]; then
            echo "Cron failed with status $STATUS"
            exit 1
          fi
```

---

## 4. GitHub Secrets 설정

GitHub 레포 → Settings → Secrets and variables → Actions → New repository secret

| Secret 이름 | 값 | 비고 |
|------------|---|------|
| `CRON_SECRET` | `.env.production`의 `CRON_SECRET` 값 | 엔드포인트 인증 토큰 |
| `APP_URL` | `https://[프로젝트명].vercel.app` | 운영 서버 URL (trailing slash 없이) |

---

## 5. 주의 사항

- **UTC 기준**: GitHub Actions 스케줄은 UTC 기준. 한국 시간(KST)과 9시간 차이.
- **최소 주기 제한**: GitHub Actions 무료 티어에서 `*/10 * * * *` (10분) 이하는 실제로 10분 간격으로 실행되지 않을 수 있음. 최소 5분 권장하나, 10분은 안정적으로 동작.
- **Private 레포 사용량**: 월 2,000분 무료 제공. 계산:
  - bondbase-sync: 60회/일 × 30일 = 1,800분 (실행당 ~1초 이하, 실질 ~30분 소모)
  - ctc-sweep: 144회/일 × 30일 = 4,320회 (실질 ~72분 소모)
  - 합계 월 ~102분 소모 → 무료 한도(2,000분) 내 여유 있음.
- **실패 알림**: 기본적으로 워크플로 실패 시 GitHub이 이메일 알림 발송.

---

## 6. 검증 절차

### 6.1 수동 트리거 테스트
1. GitHub 레포 → Actions 탭 → `BondBase Sync` 워크플로 선택
2. `Run workflow` 버튼 클릭
3. 실행 로그에서 `HTTP Status: 200` 확인
4. Turso DB `ChocoConsumptionLog` 테이블에서 `isSynced=true` 업데이트 확인

### 6.2 자동 트리거 확인
- 첫 번째 자동 실행 후 Actions 탭 실행 내역 확인
- 서버 로그(`[BondBase] REVENUE 전송 완료` 또는 `METRICS 전송 완료`) 확인

---

## 7. 체크리스트

- [ ] `.github/workflows/bondbase-sync.yml` 파일 생성
- [ ] `.github/workflows/ctc-sweep.yml` 파일 생성
- [ ] GitHub Secrets에 `CRON_SECRET` 등록
- [ ] GitHub Secrets에 `APP_URL` 등록
- [ ] `workflow_dispatch`로 bondbase-sync 수동 트리거 → 200 응답 확인
- [ ] `workflow_dispatch`로 ctc-sweep 수동 트리거 → 200 응답 확인
- [ ] 다음날 자동 실행 내역 확인
- [ ] 백로그 `0-a` 항목 완료 처리

---

## X. Related Documents
- **Logic**: [BondBase Bridge Plan](./06_BONDBASE_BRIDGE_PLAN.md) - BondBase 연동 전체 구현 계획
- **Logic**: [Backlog](./00_BACKLOG.md) - 항목 0-a (크론 외부 스케줄러 마이그레이션)
- **Specs**: [CTC Deposit Engine](./05_CTC_DEPOSIT_ENGINE_SETUP_AND_TEST.md) - ctc-sweep 엔드포인트 배경
