# CHOCO 토큰 발행 가이드 (테스트넷)
> Created: 2026-02-08
> Last Updated: 2026-02-08

이 문서는 `rogulus.testnet` 계정을 사용하여 NEAR 테스트넷에 CHOCO 토큰을 발행하는 단계별 가이드를 제공합니다.

---

## 사전 준비사항

- **계정**: `rogulus.testnet` (이미 보유 중)
- **잔액**: 최소 3~5 NEAR 필요 (현재 약 9.94 NEAR 보유 - 충분함)
- **지갑**: MyNearWallet 테스트넷 접속 중

---

## 방법 0: `near-cli-rs` 및 `token.primitives.testnet` 팩토리 사용 (성공 사례)

가장 확실하고 권장되는 방식입니다. 터미널 명령어를 통해 공식 팩토리 컨트랙트를 호출하여 토큰을 발행합니다.

### 단계 1: 팩토리 호출

터미널에서 다음 명령어를 실행합니다:

```bash
# 1. 발행할 계정 설정
export ID=rogulus.testnet

# 2. 토큰 발행 명령어 실행
npx near-cli-rs contract call-function as-transaction token.primitives.testnet create_token json-args '{
  "args": {
    "owner_id": "'$ID'",
    "total_supply": "1000000000000000000000000000",
    "metadata": {
      "spec": "ft-1.0.0",
      "name": "CHOONSIM Token",
      "symbol": "CHOCO",
      "decimals": 18
    }
  }
}' prepaid-gas '100.000 TeraGas' attached-deposit '5 NEAR' sign-as $ID network-config testnet sign-with-keychain send
```

### 단계 2: 발행 결과 확인

성공 시 다음과 같은 로그가 출력됩니다:
- **Contract Address**: `choco.token.primitives.testnet`
- **Transaction ID**: `6rkNPkREnpuoSbZ6PKjmjALmDArz8xLa5qykZXFGynWH`
- **Wallet Status**: "App Interaction"으로 표시되며 `rogulus.testnet`의 잔액에 1B CHOCO가 추가됨

---

## 방법 1: Ref Finance Token Factory 사용 (추천)

### 단계 1: Ref Finance Token Factory 접속

1. 브라우저에서 다음 URL로 이동:
   ```
   https://tkn.ref.finance/
   ```
   또는 테스트넷용:
   ```
   https://testnet.tkn.ref.finance/
   ```

2. 지갑 연결:
   - "Connect Wallet" 버튼 클릭
   - MyNearWallet 선택
   - `rogulus.testnet` 계정으로 로그인

### 단계 2: 토큰 정보 입력

다음 정보를 입력합니다:

| 필드 | 값 | 비고 |
|------|-----|------|
| **Token Name** | `CHOONSIM Token` | 공식 명칭 |
| **Token Symbol** | `CHOCO` | 거래소 표시용 |
| **Decimals** | `18` | 표준 단위 |
| **Total Supply** | `1000000000` | 1,000,000,000 CHOCO (1B) |
| **Icon URL** | (선택사항) | 춘심 캐릭터 아이콘 URL |

**중요 사항**:
- Token Symbol은 대문자로 `CHOCO` 입력
- Total Supply는 소수점 없이 숫자만 입력 (예: `1000000000`)
- Decimals는 `18`로 설정 (NEAR 표준)

### 단계 3: 토큰 발행 실행

1. 모든 정보 입력 후 "Create Token" 또는 "Deploy" 버튼 클릭
2. MyNearWallet에서 트랜잭션 승인:
   - 가스비 약 3~5 NEAR 소요
   - 트랜잭션 서명 확인
3. 발행 완료 대기:
   - 블록체인 확인까지 약 1~2분 소요
   - 성공 메시지와 함께 토큰 컨트랙트 주소 표시

### 단계 4: 토큰 컨트랙트 주소 확인

발행 완료 후 다음 정보를 기록하세요:

- **토큰 컨트랙트 주소**: `choco.rogulus.testnet` 또는 `ft-choco.rogulus.testnet` 형식
- **트랜잭션 해시**: 발행 트랜잭션의 해시 값

**예시**:
```
Contract Address: choco.rogulus.testnet
Transaction Hash: Gu4VQoXhE6YEQM2zVKfs...
```

---

## 방법 2: NEAR CLI를 통한 직접 배포 (고급)

### 사전 준비

1. NEAR CLI 설치:
   ```bash
   npm install -g near-cli
   ```

2. 테스트넷 계정 로그인:
   ```bash
   near login
   ```
   - 브라우저가 열리면 `rogulus.testnet` 계정으로 로그인

### 토큰 컨트랙트 배포

1. 표준 FT 컨트랙트 다운로드:
   ```bash
   git clone https://github.com/near-examples/FT
   cd FT
   ```

2. 컨트랙트 빌드:
   ```bash
   ./build.sh
   ```

3. 서브계정 생성 및 배포:
   ```bash
   near create-account choco.rogulus.testnet --masterAccount rogulus.testnet --initialBalance 5
   near deploy --accountId choco.rogulus.testnet --wasmFile res/fungible_token.wasm
   ```

4. 토큰 초기화:
   ```bash
   near call choco.rogulus.testnet new '{
     "owner_id": "rogulus.testnet",
     "total_supply": "1000000000000000000000000000",
     "metadata": {
       "spec": "ft-1.0.0",
       "name": "CHOONSIM Token",
       "symbol": "CHOCO",
       "decimals": 18,
       "icon": "https://your-icon-url.com/choco.png"
     }
   }' --accountId rogulus.testnet
   ```

**참고**: `total_supply`는 18 decimals를 고려하여 `1000000000 * 10^18` 형식으로 입력합니다.

---

## 발행 후 확인 사항

### 1. MyNearWallet에서 확인

1. MyNearWallet의 "Balances" 탭으로 이동
2. "Your Portfolio" 섹션에서 CHOCO 토큰 확인
3. 토큰 아이콘, 이름, 심볼이 정상적으로 표시되는지 확인

### 2. NEAR Explorer에서 확인

1. [NEAR Testnet Explorer](https://explorer.testnet.near.org/) 접속
2. 발행한 트랜잭션 해시로 검색
3. 컨트랙트 주소로 토큰 정보 확인

### 3. 환경 변수 설정

프로젝트의 `.env` 또는 `.env.development` 파일에 추가:

```env
# CHOCO Token (Testnet)
CHOCO_TOKEN_CONTRACT=choco.token.primitives.testnet
NEAR_NETWORK_ID=testnet
NEAR_NODE_URL=https://rpc.testnet.near.org
NEAR_SERVICE_ACCOUNT_ID=rogulus.testnet
```

---

## 문제 해결

### 문제 1: "Insufficient balance" 오류

**원인**: 잔액이 부족함 (3~5 NEAR 필요)

**해결**:
1. [NEAR Testnet Faucet](https://www.allthatnode.com/near.dsrv)에서 테스트넷 NEAR 받기
2. 또는 다른 계정에서 전송받기

### 문제 2: "Account already exists" 오류

**원인**: 동일한 이름의 토큰이 이미 존재함

**해결**:
- 다른 이름으로 토큰 발행 (예: `choco-v2.rogulus.testnet`)
- 또는 기존 토큰 사용

### 문제 3: 토큰이 지갑에 표시되지 않음

**원인**: Storage Deposit이 필요함

**해결**:
1. 토큰 컨트랙트에 Storage Deposit 실행:
   ```bash
   near call choco.rogulus.testnet storage_deposit '{
     "account_id": "rogulus.testnet",
     "registration_only": false
   }' --accountId rogulus.testnet --amount 0.00125
   ```

2. 또는 MyNearWallet에서 토큰 수신 시 자동으로 처리됨

---

## 다음 단계

토큰 발행 완료 후:

1. **환경 변수 업데이트**: `.env.development`에 컨트랙트 주소 추가
2. **토큰 잔액 조회 API 구현**: `docs/specs/NEAR_TOKEN_ISSUANCE_SPEC.md`의 6.1절 참조
3. **x402 프로토콜 통합**: `docs/plans/NEAR_X402_STRATEGY.md`의 Phase 4 참조

---

## 참고 자료

- [Ref Finance Token Factory](https://tkn.ref.finance/)
- [NEAR Fungible Token 표준 (NEP-141)](https://nomicon.io/Standards/Tokens/FungibleToken/Core)
- [NEAR Token Metadata 표준 (NEP-148)](https://nomicon.io/Standards/Tokens/FungibleToken/Metadata)
- [NEAR Testnet Explorer](https://explorer.testnet.near.org/)

---

**작성일**: 2026-01-11
**버전**: 1.0
**작성**: Antigravity AI Assistant


## Related Documents
- **Test**: [Document Management Plan](../01_Concept_Design/09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
