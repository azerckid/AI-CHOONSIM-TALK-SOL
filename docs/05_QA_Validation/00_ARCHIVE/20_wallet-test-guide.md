# NEAR 지갑 생성 로그 확인 가이드
> Created: 2026-02-08
> Last Updated: 2026-02-08

**작성일**: 2026-01-11
**목적**: 지갑 생성 실패 원인 파악을 위한 로그 확인 방법

---

## 로그가 생성되는 상황

지갑 생성은 다음 상황에서 자동으로 트리거됩니다:

1. **신규 회원가입 시**: 사용자가 회원가입하면 `user.create.after` 훅이 실행됩니다
2. **기존 유저 로그인 시**: 지갑이 없는 기존 유저가 로그인하면 `session.create.after` 훅이 실행됩니다
3. **수동 테스트**: `/api/test-wallet` API를 호출하여 수동으로 테스트할 수 있습니다

---

## 로그 확인 방법

### 방법 1: 서버 터미널에서 확인 (가장 중요!)

**1단계: 개발 서버 실행**
```bash
npm run dev
```

**2단계: 지갑 생성 트리거**
- 방법 A: 새 계정으로 회원가입
- 방법 B: 지갑이 없는 기존 계정으로 로그인
- 방법 C: 테스트 API 호출 (아래 참고)

**3단계: 터미널에서 로그 확인**

다음과 같은 로그 메시지들이 나타납니다:

**성공 시**:
```
[Wallet] Creating invisible wallet for user: {userId}
[Wallet] Successfully created wallet: {accountId}
```

**실패 시**:
```
[Wallet] Creating invisible wallet for user: {userId}
[Wallet] Failed to create wallet for {userId}: {
  error: "...",
  stack: "...",
  userId: "...",
  serviceAccountId: "...",
  networkId: "...",
  nodeUrl: "..."
}
```

**특정 에러 타입**:
```
[Wallet] Service account rogulus.testnet has insufficient balance. Please add more NEAR.
[Wallet] Account {accountId} already exists. This should not happen.
[Wallet] Invalid account ID format: {accountId}
```

---

### 방법 2: 테스트 API 사용 (권장)

**브라우저에서 테스트**:

1. **로그인 상태 확인**: 먼저 로그인되어 있어야 합니다

2. **지갑 상태 확인**:
   ```
   GET http://localhost:5173/api/test-wallet
   ```
   또는 브라우저에서 직접 접속:
   ```
   http://localhost:5173/api/test-wallet
   ```

3. **지갑 생성 테스트**:
   브라우저 개발자 도구 콘솔에서:
   ```javascript
   fetch('/api/test-wallet', { method: 'POST' })
     .then(res => res.json())
     .then(data => console.log(data));
   ```

   또는 curl 사용:
   ```bash
   curl -X POST http://localhost:5173/api/test-wallet \
     -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN"
   ```

**응답 예시**:
```json
{
  "success": true,
  "accountId": "abc123.rogulus.testnet",
  "message": "지갑이 성공적으로 생성되었습니다."
}
```

또는 실패 시:
```json
{
  "success": false,
  "error": "지갑 생성에 실패했습니다. 서버 로그를 확인하세요.",
  "message": "서버 터미널에서 '[Wallet] Failed to create wallet' 메시지를 확인하세요."
}
```

---

### 방법 3: 브라우저 개발자 도구 확인

**네트워크 탭**:
1. 브라우저 개발자 도구 열기 (F12)
2. Network 탭 선택
3. 회원가입 또는 로그인 수행
4. `/api/test-wallet` 또는 관련 API 요청 확인
5. Response에서 에러 메시지 확인

**콘솔 탭**:
- 클라이언트 사이드 에러가 있는 경우 콘솔에 표시됩니다
- 하지만 지갑 생성은 서버 사이드에서 실행되므로, 서버 터미널 로그가 더 중요합니다

---

## 빠른 테스트 방법

### 1. 가장 빠른 방법: 테스트 API 사용

**터미널 1**: 개발 서버 실행
```bash
npm run dev
```

**터미널 2**: curl로 테스트 (로그인된 상태)
```bash
# 세션 토큰은 브라우저 개발자 도구 > Application > Cookies에서 확인
curl -X POST http://localhost:5173/api/test-wallet \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN" \
  -v
```

**터미널 1에서 로그 확인**: 실시간으로 로그가 출력됩니다

### 2. 브라우저에서 테스트

1. **로그인**: 기존 계정으로 로그인 (또는 새 계정 가입)
2. **브라우저 콘솔 열기**: F12 > Console 탭
3. **테스트 코드 실행**:
   ```javascript
   // 지갑 상태 확인
   fetch('/api/test-wallet')
     .then(r => r.json())
     .then(d => console.log('현재 상태:', d));

   // 지갑 생성 시도
   fetch('/api/test-wallet', { method: 'POST' })
     .then(r => r.json())
     .then(d => console.log('생성 결과:', d));
   ```
4. **서버 터미널 확인**: 로그 메시지 확인

---

## 로그에서 확인해야 할 정보

### 성공적인 로그 예시:
```
[Wallet] Creating invisible wallet for user: abc123-def456-ghi789
[Wallet] Successfully created wallet: abc123def456.rogulus.testnet
```

### 실패 로그 예시 (잔액 부족):
```
[Wallet] Creating invisible wallet for user: abc123-def456-ghi789
[Wallet] Account creation failed for abc123def456.rogulus.testnet: Error: ...
[Wallet] Failed to create wallet for abc123-def456-ghi789: {
  error: "insufficient balance",
  stack: "...",
  userId: "abc123-def456-ghi789",
  serviceAccountId: "rogulus.testnet",
  networkId: "testnet",
  nodeUrl: "https://rpc.testnet.near.org"
}
[Wallet] Service account rogulus.testnet has insufficient balance. Please add more NEAR.
```

### 실패 로그 예시 (계정 중복):
```
[Wallet] Creating invisible wallet for user: abc123-def456-ghi789
[Wallet] Account creation failed for abc123def456.rogulus.testnet: Error: Account already exists
[Wallet] Account abc123def456.rogulus.testnet already exists. This should not happen.
```

---

## 문제 해결 체크리스트

로그를 확인한 후 다음을 체크하세요:

1. **에러 메시지 확인**: `error` 필드의 내용 확인
2. **서비스 계정 잔액 확인**: "insufficient balance" 에러인지 확인
3. **계정 ID 형식 확인**: "Invalid account ID" 에러인지 확인
4. **네트워크 연결 확인**: 네트워크 타임아웃 에러인지 확인
5. **환경 변수 확인**: "NEAR_SERVICE_PRIVATE_KEY is missing" 에러인지 확인

---

## 다음 단계

로그를 확인한 후:
1. 에러 메시지를 복사하여 공유해주시면 더 정확한 해결 방법을 제시할 수 있습니다
2. `docs/specs/WALLET_CREATION_TROUBLESHOOTING.md` 문서를 참고하여 해결 방법을 확인하세요

---

**중요**: 지갑 생성 로그는 **서버 터미널**에서만 확인할 수 있습니다. 브라우저 콘솔에는 나타나지 않습니다!


## Related Documents
- **Test**: [Document Management Plan](../01_Concept_Design/09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
