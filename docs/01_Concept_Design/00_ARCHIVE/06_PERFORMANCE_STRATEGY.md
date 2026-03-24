# Scalability and Performance Strategy: System Scaling Roadmap
> Created: 2026-02-08
> Last Updated: 2026-02-08

이 문서는 서비스 사용자 및 동시 접속자 증가에 대응하기 위한 단계별 시스템 확장(Scaling) 전략을 정의합니다. 특히 `node-cron` 기반의 작업 지연 문제를 해결한 사례를 바탕으로, 수만 명 이상의 사용자를 수용할 수 있는 아키텍처로의 전환 가이드를 제공합니다.

---

## 0. 프로젝트 컨텍스트

**현재 프로젝트 상태**:
- **프레임워크**: React Router v7 (Vite)
- **인증**: Better Auth (Google, Kakao, Twitter)
- **데이터베이스**: Turso (libSQL) with Drizzle ORM
- **AI 엔진**: Google Gemini API (LangGraph)
- **배포 환경**: Vercel (Serverless)
- **현재 구현 상태**: 
  - Phase 1 (코드 레벨 최적화) 완료
  - 병렬 처리 및 타임아웃 적용 완료 (`cron.server.ts`)
  - 멀티체인 기능 계획 중 (NEAR Chain Signatures)

**관련 문서**:
- `docs/specs/NEAR_MULTICHAIN_SIGNATURE_SPEC.md`: 멀티체인 기능 명세 (성능 고려사항 포함)
- `docs/archive/VERCEL_DEPLOYMENT_CHECKLIST.md`: Vercel 배포 체크리스트 (Cron Jobs 관련)
- `app/lib/cron.server.ts`: 현재 크론 잡 구현

**이 문서의 목적**:
- 현재 시스템의 성능 병목 지점 분석
- 단계별 확장 전략 수립
- 멀티체인 기능 추가 시 성능 영향 고려

---

## 1. 현재 시스템 진단 (As-Is)

*   **구조**: 단일 Node.js 프로세스 내에서 API 핸들링, AI 메시지 생성, 스케줄 작업(`node-cron`)이 동시에 실행됨.
*   **성능 병목 지점**: 
    1.  **AI API 응답 대기**: 유저별로 5~30초 소요되는 AI API 호출 시 이벤트 루프 점유 위험.
    2.  **직렬 배치 처리**: 대량의 유저 처리 시 루프 실행 시간이 스케줄 주기(1분)를 초과함.
    3.  **단일 스레드 제약**: 모든 작업이 메인 스레드에서 돌아가므로 I/O 집약적 작업 시 API 응답 속도 저하.

---

## 2. 단계별 스케일업 로드맵 (Roadmap)

### Phase 1: 코드 레벨 최적화 (✅ 완료 - 2026-01-11)

**구현 내용**:
*   **병렬 처리 (Parallelism)**: `for` 루프를 `Promise.all` 및 배칭(`BATCH_SIZE = 5`)으로 변경하여 처리 속도를 5배 이상 개선.
*   **타임아웃 및 격리**: 각 작업에 엄격한 타임아웃(30s)을 설정하고 개별 `try-catch`로 에러 격리.
*   **에러 핸들링**: 각 사용자 처리를 독립 함수로 분리하여 개별 실패가 전체에 영향 없도록 처리.

**성능 개선 결과**:
*   Before: 순차 처리로 인한 missed execution 발생
*   After: 병렬 처리로 실행 시간 단축, missed execution 해결

**한계**:
*   단일 프로세스의 CPU/메모리 자원을 공유하므로 분당 처리량 약 100~300건 수준.
*   Vercel Serverless 환경에서는 `node-cron`이 작동하지 않으므로 Phase 2로 전환 필요.

**구현 파일**:
*   `app/lib/cron.server.ts`: 병렬 처리 및 타임아웃 적용 완료

### Phase 2: 구조적 워커 분리 (중기 전략)

**필요성**:
*   Vercel Serverless 환경에서는 `node-cron`이 작동하지 않음
*   멀티체인 기능 추가 시 블록체인 RPC 호출, 시세 조회 등 무거운 작업 증가 예상

**구현 방안**:
*   **전용 스케줄러 환경**: 
    *   Vercel Cron Jobs 사용 (권장): `vercel.json`에 cron 설정 추가
    *   또는 외부 스케줄러(GitHub Actions, Upstash QStash) 사용
    *   크론 잡 로직을 API 엔드포인트로 이동 (`/api/cron/check-in`)
*   **Worker Threads 도입**: AI 메시지 생성과 같은 CPU 집약적 작업을 메인 이벤트 루프에서 분리된 워커 스레드로 이관.
*   **데이터베이스 연결 최적화**: Connection Pooling을 강화하여 수천 건의 동시 쿼리 대응.

**멀티체인 기능 고려사항**:
*   블록체인 RPC 호출은 I/O 집약적이므로 비동기 처리 필수
*   시세 조회(Oracle API)는 캐싱 전략 필요
*   입금 감지 인덱서는 별도 워커 프로세스로 분리 고려

### Phase 3: 분산 큐 아키텍처 (장기 전략 / 수만 명 이상)

**필요성**:
*   멀티체인 기능 추가 시 블록체인 트랜잭션 서명, 입금 감지, 자산 회수 등 복잡한 작업 증가
*   AI API Rate Limit 관리 필요
*   수만 명 이상의 사용자 처리 필요

**구현 방안**:
*   **Message Broker 도입**: 
    *   `Redis` 기반의 `BullMQ` 사용
    *   생산자(Producer, 크론/API)와 소비자(Consumer, 워커 서버) 분리
    *   작업 우선순위 및 재시도 로직 구현
*   **수평 확장 (Horizontal Scaling)**: 
    *   사용자가 늘어나면 '워커 서버'의 개수만 늘려 처리량을 무한히 확장 가능.
    *   API 서버는 유저의 요청에만 집중하고, 무거운 백그라운드 작업은 별도 클러스터에서 처리.
*   **Rate Limiting 제어**: 
    *   AI API의 속도 제한(Rate Limit)을 큐 시스템에서 중앙 집중식으로 관리하여 차단 발생 방지.
    *   블록체인 RPC 호출 Rate Limit 관리 (멀티체인 기능)
*   **작업 분류**:
    *   우선순위 큐: 사용자 요청 (높은 우선순위)
    *   일반 큐: 선제적 메시지 생성 (중간 우선순위)
    *   배치 큐: 입금 감지, 자산 회수 등 (낮은 우선순위)

---

## 3. 핵심 컴포넌트 확장 전략

### 3.1 AI 에이전트 스케일링 (Agentic Scaling)
*   **요청 큐잉**: AI 모델별로 처리 속도가 다르므로, 각 에이전트(LLM)별 전용 큐를 운영.
*   **Context Caching**: 반복되는 유저 컨텍스트(Memory)를 캐싱하여 AI API 호출 비용 및 속도 개선.

### 3.2 데이터베이스(Turso) 확장
*   **Read Replicas**: 읽기 작업이 많아질 경우 전 세계 여러 지역에 복제본을 두어 지연 시간(Latency) 단축.
*   **Embedded Replica**: 성능이 아주 중요한 작업은 로컬 SQLite 파일로 데이터를 동기화하여 접근 속도 극대화.

### 3.3 푸시 알림 및 외부 연동
*   **Batch Push**: 수만 명에게 동시에 알림을 보낼 때 외부 서비스(FCM, WebPush)의 제한을 우회하기 위한 배치 전송 엔진 구축.
*   **Webhooks 비동기화**: 
    *   외부 블록체인 입금 감지 시 즉각 처리가 아닌 큐에 적재 후 순차 처리.
    *   멀티체인 기능: 각 체인별 입금 감지 웹훅을 큐에 적재하여 처리량 확보.
*   **멀티체인 인덱서 연동**:
    *   BTC/ETH/SOL 등 각 체인별 인덱서 폴링 작업을 큐 시스템으로 분산.
    *   인덱서 응답 지연 시에도 다른 작업에 영향 없도록 격리.

---

## 4. 모니터링 및 경보 시스템

*   **성능 지표**: 이벤트 루프 지연 시간(Lag), 배기 배치 실행 시간, AI API 성공률 모니터링.
*   **자동 경보**: 
    *   크론 잡이 정해진 시간 내에 끝나지 않을 때 (Missed Execution).
    *   AI API 에러율이 5%를 초과할 때.
    *   DB 응답 시간이 500ms를 초과할 때.

---

## 5. 결론 및 우선순위

현재의 시스템은 **Phase 1**이 적용되어 초기 안정성을 확보했습니다. 사용자 성장 및 멀티체인 기능 추가에 따라 다음과 같은 순서로 업그레이드를 권장합니다:

### 단기 (1-2개월)
1.  **우선순위 1**: Vercel Cron Jobs로 전환하여 Serverless 환경 대응
2.  **우선순위 2**: 멀티체인 기능 추가 시 블록체인 RPC 호출 최적화 및 캐싱 전략

### 중기 (3-6개월)
3.  **우선순위 3**: `Redis` 및 `BullMQ` 도입으로 백그라운드 작업 분리
4.  **우선순위 4**: AI API Rate Limit 관리 로직 고도화
5.  **우선순위 5**: 멀티체인 인덱서 워커 프로세스 분리

### 장기 (6개월 이상)
6.  **우선순위 6**: 인프라 오토스케일링(Auto-scaling) 환경 구축
7.  **우선순위 7**: 데이터베이스 Read Replicas 구축 (글로벌 서비스 확장 시)

---

**작성일**: 2026-01-11
**버전**: 1.0 (Scalability Roadmap)
**작성**: Antigravity AI Assistant


## Related Documents
- **Foundation**: [Document Management Plan](./09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
