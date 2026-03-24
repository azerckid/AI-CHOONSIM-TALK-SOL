# NEAR 지갑 생성 실패 원인 분석 및 해결 가이드
> Created: 2026-02-08
> Last Updated: 2026-02-08

**작성일**: 2026-01-11
**목적**: 사용자 NEAR 지갑 생성 실패 원인 파악 및 해결 방법 제시

---

## 발견된 주요 문제점

### 1. `createAccount` 메서드 사용법 문제 ⚠️

**문제**:
- `near-api-js`의 `Account` 클래스에 `createAccount` 메서드가 존재하지 않거나 잘못된 사용법일 수 있습니다.
- 서브 계정 생성은 `functionCall`을 사용하여 `create_account` 액션을 호출해야 합니다.

**해결 방법**:
- 코드를 수정하여 `functionCall` 방식으로 변경했습니다.
- `createAccount` 메서드가 존재하는 경우 fallback 로직 추가했습니다.

### 2. Public Key 형식 문제 ⚠️

**문제**:
- `keyPair.getPublicKey().toString()`이 올바른 형식인지 확인 필요
- NEAR는 `ed25519:` 접두사가 필요할 수 있습니다.

**확인 사항**:
- Public Key가 올바른 형식인지 확인
- `ed25519:` 접두사 포함 여부 확인

### 3. 서비스 계정 잔액 부족 ⚠️

**문제**:
- 서브 계정 생성에는 최소 0.1 NEAR가 필요합니다.
- 서비스 계정(`rogulus.testnet`)에 충분한 잔액이 없으면 실패합니다.

**확인 방법**:
```bash
# NEAR Explorer에서 확인
https://explorer.testnet.near.org/accounts/rogulus.testnet

# 또는 near-cli 사용
near state rogulus.testnet
```

**해결 방법**:
- 서비스 계정에 최소 1-2 NEAR 이상 충전
- 테스트넷 Faucet 사용: https://www.allthatnode.com/near.dsrv

### 4. 계정 ID 형식 문제 ⚠️

**문제**:
- NEAR 계정 ID는 `a-z`, `0-9`, `_`, `-`만 허용 (최대 64자)
- 현재 코드는 `sanitizedId`를 사용하지만, 특수문자나 길이 제한 문제가 있을 수 있습니다.

**확인 사항**:
- `sanitizedId`가 올바르게 생성되는지 확인
- 계정 ID 길이가 64자를 초과하지 않는지 확인
- 특수문자가 제거되는지 확인

### 5. 환경 변수 설정 문제 ⚠️

**필수 환경 변수**:
```env
NEAR_SERVICE_PRIVATE_KEY=ed25519:...
NEAR_SERVICE_ACCOUNT_ID=rogulus.testnet
NEAR_NETWORK_ID=testnet
NEAR_NODE_URL=https://rpc.testnet.near.org
ENCRYPTION_KEY=your-encryption-key-32-chars
```

**확인 방법**:
- 모든 환경 변수가 설정되어 있는지 확인
- `NEAR_SERVICE_PRIVATE_KEY` 형식이 올바른지 확인 (`ed25519:` 접두사 포함)

### 6. 네트워크 연결 문제 ⚠️

**문제**:
- NEAR RPC 노드 연결 실패
- 네트워크 타임아웃

**확인 방법**:
- `NEAR_NODE_URL`이 올바른지 확인
- 네트워크 연결 상태 확인
- RPC 노드 상태 확인

---

## 수정된 코드

### 주요 변경 사항

1. **계정 생성 로직 개선**:
   - `createAccount` 메서드 존재 여부 확인 후 fallback 로직 추가
   - `functionCall` 방식으로 서브 계정 생성

2. **에러 처리 강화**:
   - 상세한 에러 로깅 추가
   - 특정 에러 타입에 대한 추가 정보 제공

3. **Public Key 처리 개선**:
   - 올바른 Public Key 객체 사용

---

## 디버깅 체크리스트

### 1. 에러 로그 확인

서버 로그에서 다음 메시지를 확인하세요:
```
[Wallet] Failed to create wallet for {userId}: {error}
```

**확인 사항**:
- 에러 메시지 내용
- 에러 스택 트레이스
- 서비스 계정 ID
- 네트워크 설정

### 2. 환경 변수 확인

```bash
# 환경 변수 확인
echo $NEAR_SERVICE_PRIVATE_KEY
echo $NEAR_SERVICE_ACCOUNT_ID
echo $NEAR_NETWORK_ID
echo $NEAR_NODE_URL
echo $ENCRYPTION_KEY
```

### 3. 서비스 계정 잔액 확인

```bash
# NEAR Explorer에서 확인
https://explorer.testnet.near.org/accounts/rogulus.testnet

# 또는 near-cli 사용
near state rogulus.testnet
```

### 4. 계정 ID 형식 확인

```typescript
// 디버깅용 로그 추가
console.log("Sanitized ID:", sanitizedId);
console.log("New Account ID:", newAccountId);
console.log("Account ID length:", newAccountId.length);
```

---

## 일반적인 에러 메시지 및 해결 방법

### 1. "insufficient balance"

**원인**: 서비스 계정 잔액 부족

**해결**:
- 서비스 계정에 NEAR 충전
- 최소 1-2 NEAR 이상 권장

### 2. "Account already exists"

**원인**: 동일한 계정 ID가 이미 존재

**해결**:
- 계정 ID 생성 로직 확인
- 중복 생성 방지 로직 확인

### 3. "Invalid account ID"

**원인**: 계정 ID 형식이 올바르지 않음

**해결**:
- 계정 ID sanitization 로직 확인
- 특수문자 제거 확인
- 길이 제한 확인 (최대 64자)

### 4. "Network error" 또는 "Connection timeout"

**원인**: 네트워크 연결 문제

**해결**:
- RPC 노드 URL 확인
- 네트워크 연결 상태 확인
- 다른 RPC 노드 시도

### 5. "Invalid private key"

**원인**: Private Key 형식이 올바르지 않음

**해결**:
- `NEAR_SERVICE_PRIVATE_KEY` 형식 확인
- `ed25519:` 접두사 포함 여부 확인

---

## 테스트 방법

### 1. 단일 사용자 테스트

```typescript
// 테스트 스크립트
import { ensureNearWallet } from "./app/lib/near/wallet.server";

const testUserId = "test-user-id";
const result = await ensureNearWallet(testUserId);
console.log("Result:", result);
```

### 2. 배치 마이그레이션 테스트

```bash
# 배치 마이그레이션 스크립트 실행
npm run migrate-wallets
```

### 3. 로그 모니터링

```bash
# 서버 로그 확인
tail -f logs/server.log | grep "Wallet"
```

---

## 추가 개선 사항

### 1. 재시도 로직 추가

```typescript
// 네트워크 오류 시 재시도
let retries = 3;
while (retries > 0) {
    try {
        await serviceAccount.functionCall({...});
        break;
    } catch (error) {
        if (retries === 1) throw error;
        retries--;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}
```

### 2. 잔액 사전 확인

```typescript
// 계정 생성 전 잔액 확인
const balance = await serviceAccount.getAccountBalance();
if (parseFloat(balance.available) < 0.2) {
    throw new Error("Insufficient balance for account creation");
}
```

### 3. 계정 ID 충돌 방지

```typescript
// 계정 ID 생성 시 중복 확인
const existingAccount = await near.account(newAccountId).getAccountBalance().catch(() => null);
if (existingAccount) {
    // 다른 계정 ID 생성 로직
}
```

---

## 다음 단계

1. **에러 로그 확인**: 실제 발생한 에러 메시지 확인
2. **환경 변수 확인**: 모든 필수 환경 변수 설정 확인
3. **서비스 계정 잔액 확인**: 충분한 NEAR 보유 확인
4. **네트워크 연결 확인**: RPC 노드 연결 상태 확인
5. **코드 수정 적용**: 수정된 코드 적용 및 테스트

---

**참고**: 실제 에러 로그를 확인하면 더 정확한 원인 파악이 가능합니다.


## Related Documents
- **Test**: [Document Management Plan](../01_Concept_Design/09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
