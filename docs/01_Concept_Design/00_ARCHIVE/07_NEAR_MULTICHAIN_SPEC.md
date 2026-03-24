# NEAR Chain Signatures: Multi-chain Deposit & Management Specification
> Created: 2026-02-08
> Last Updated: 2026-02-08

이 문서는 NEAR 프로토콜의 **Chain Signatures (체인 서명)** 기술을 활용하여, 단일 NEAR 계정(`user.rogulus.testnet`)에서 비트코인(BTC), 이더리움(ETH), 솔라나(SOL) 등 타 블록체인의 자산을 직접 수용하고 관리하기 위한 기술적 명세를 정의합니다.

---

## 0. 프로젝트 컨텍스트

**현재 프로젝트 상태**:
- **프레임워크**: React Router v7 (Vite)
- **인증**: Better Auth (Google, Kakao, Twitter)
- **데이터베이스**: Turso (libSQL) with Drizzle ORM
- **AI 엔진**: Google Gemini API (LangGraph)
- **현재 NEAR 구현 상태**: 
  - NEAR 서브 계정 생성 및 관리 시스템 구현 완료 (`ensureNearWallet`)
  - CHOCO 토큰 발행 완료 (`choco.token.primitives.testnet`)
  - 프라이빗 키 암호화 및 내보내기 기능 구현 완료
  - Relayer 서버 구현 완료 (가스비 대납)
  - X402 프로토콜 통합 완료

**관련 문서**:
- `docs/plans/NEAR_X402_STRATEGY.md`: NEAR 통합 전략 및 x402 프로토콜
- `docs/specs/NEAR_TOKEN_ISSUANCE_SPEC.md`: CHOCO 토큰 발행 및 관리 명세
- `docs/specs/NEAR_WALLET_MIGRATION_STRATEGY.md`: 지갑 마이그레이션 전략
- `docs/specs/NEAR_X402_UI_SPEC.md`: UI/UX 디자인 사양

**이 문서의 목적**:
- NEAR Chain Signatures를 활용한 멀티체인 자산 관리 기능 추가
- 단일 NEAR 계정으로 BTC/ETH/SOL 등 타 체인 자산 수용 및 관리
- 자동 환전 및 자산 회수(Sweep) 시스템 구축

---

## 1. 개요 (Overview)

사용자가 이메일이나 SNS로 생성한 'Invisible NEAR Wallet'은 단순히 NEAR 자산만을 위한 지갑이 아닙니다. 

**핵심 개념**:
- **NEAR 지갑이 대표 주소**: `user123.rogulus.testnet`가 메인 지갑 역할
- **다른 코인 지갑도 생성**: 이더리움, 비트코인, 솔라나 등 각 체인별로 지갑 주소 생성
- **단일 계정으로 통합 관리**: NEAR 계정 하나로 모든 체인의 지갑을 제어

NEAR 프로토콜의 **MPC(Multi-Party Computation)** 기술을 통해, 하나의 NEAR 키 pair로 비트코인이나 이더리움과 같은 다른 체인의 주소를 파생하고 제어할 수 있는 **'마스터 임베디드 지갑'** 역할을 수행합니다.

### 1.1 주요 목적
*   **Single Address UX**: 사용자는 여러 개의 복잡한 지갑 주소를 외울 필요 없이, 자신의 니어 주소 하나만으로 모든 코인을 관리합니다.
*   **Native Deposit**: 외부 거래소에서 사용자의 니어 계정에 귀속된 BTC/ETH/SOL 주소로 직접 입금이 가능하게 합니다.
*   **Automatic Value Conversion**: 타 체인 코인이 입금되면 이를 감지하여 앱 내의 결제 수단인 **CHOCO 토큰** 또는 크레딧으로 자동 전환해 주는 환경을 제공합니다.

---

## 2. 기술 아키텍처 (Technical Architecture)

### 2.1 작동 원리: Chain Signatures & MPC

**NEAR Chain Signatures의 실제 기능**:
NEAR Chain Signatures는 NEAR 프로토콜의 공식 기능으로, 단일 NEAR 계정을 통해 여러 블록체인(Bitcoin, Ethereum, Solana 등)의 자산을 관리할 수 있게 해줍니다.

**핵심 작동 원리**:
1.  **단일 계정 관리**: 하나의 NEAR 계정(`user123.rogulus.testnet`)으로 여러 블록체인 자산을 통합 관리
    *   NEAR 지갑이 "대표 주소" 역할을 하며, 다른 코인 지갑(ETH, BTC, SOL 등)도 생성하여 관리
2.  **MPC (Multi-Party Computation)**: 탈중앙화된 MPC 노드들이 프라이빗 키를 분산 관리하여 보안성 향상
3.  **타 체인 주소 파생**: NEAR 계정에서 타 체인의 주소를 결정론적으로 파생
4.  **타 체인 트랜잭션 서명**: MPC 네트워크를 통해 타 체인 트랜잭션에 서명 가능

**MPC (Multi-Party Computation) 기술 상세 설명**:

**MPC란?**
MPC는 **Multi-Party Computation (다자간 계산)**의 약자로, 여러 당사자가 프라이빗 키를 공유하지 않고도 협력하여 암호화 작업(서명 등)을 수행할 수 있는 암호학 기술입니다.

**전통적인 방식의 문제점**:
```
[전통적인 방식]
사용자 → 프라이빗 키를 하나의 장소에 저장
        ↓
        단일 지점 실패 위험 (해킹, 분실 등)
```

**MPC 방식의 작동 원리**:
```
[MPC 방식]
프라이빗 키 → 여러 조각(Secret Share)으로 분할
            ↓
조각 1 → MPC 노드 1에 저장
조각 2 → MPC 노드 2에 저장
조각 3 → MPC 노드 3에 저장
...
            ↓
서명 필요 시 → 각 노드가 자신의 조각으로 부분 서명 생성
            ↓
            → 부분 서명들을 합쳐서 완전한 서명 생성
            ↓
            → 실제 트랜잭션 서명 완료
```

**MPC의 장점**:
1. **보안성 향상**: 프라이빗 키가 한 곳에 완전히 저장되지 않아 단일 지점 실패 위험 감소
2. **탈중앙화**: 여러 노드에 분산되어 있어 일부 노드가 손상되어도 안전
3. **투명성**: 각 노드가 독립적으로 검증 가능
4. **복구 가능**: 일부 노드가 손실되어도 다른 노드들로 복구 가능 (threshold 방식)

**NEAR Chain Signatures에서의 MPC 활용**:
- 사용자의 NEAR 계정 권한을 여러 MPC 노드가 분산 관리
- 타 체인 트랜잭션 서명 시, 각 MPC 노드가 자신의 Secret Share로 부분 서명 생성
- 부분 서명들을 합쳐서 유효한 타 체인 서명 생성
- 사용자는 프라이빗 키를 직접 관리할 필요 없이 NEAR 계정만으로 모든 체인의 자산 제어 가능

**우리 프로젝트의 활용 방식**:
1.  **주소 파생**: 사용자의 `nearAccountId`와 파생 경로를 조합하여 타 체인 주소 생성
    *   `Derivation Path`: `nearAccountId + derivation_path`
    *   예: `user123.rogulus.testnet` + `ethereum,1` → ETH 주소 생성
2.  **MPC 서명**: 사용자가 타 체인 트랜잭션(예: 자산 회수)을 수행할 때 MPC 네트워크를 통해 서명
3.  **Relayer Integration**: 유저는 타 체인의 가스비(Gas Fee)를 직접 지불할 필요 없이 서버의 릴레이어가 대납

**RPC 연결 요약**:
- ✅ **입금 감지**: 각 체인의 RPC를 통해 블록체인 데이터 조회 (필수)
- ✅ **트랜잭션 전송**: 서명된 트랜잭션을 각 체인의 RPC를 통해 브로드캐스트 (필수)
- ✅ **잔액 조회**: 사용자 주소의 잔액 확인 (필수)
- ✅ **트랜잭션 확인**: 전송된 트랜잭션의 확인 상태 모니터링 (필수)
- ❌ **NEAR MPC**: 서명만 제공, 타 체인 네트워크 연결 불필요

**주의사항**:
- NEAR Chain Signatures는 비교적 새로운 기능이며, 실제 구현 세부사항은 NEAR 공식 문서를 참조해야 합니다.
- 파생 경로 형식, MPC 컨트랙트 주소, API 엔드포인트 등은 실제 배포 시 확인이 필요합니다.
- 각 체인별 RPC Provider 선택 시 Rate Limit, 가용성, 비용을 고려해야 합니다.

### 2.2 역할 분담 및 워크플로우 도식 (Role Assignment)

멀티체인 시스템은 **NEAR(서명 권한)**와 **외부 RPC(데이터 전송 및 감지)**의 긴밀한 협업으로 작동합니다.

**핵심 원칙**: 
- **NEAR MPC는 서명만 제공**: 타 체인 네트워크에 직접 연결하지 않음
- **RPC 연결은 필수**: 입금 감지와 트랜잭션 전송 모두 RPC를 통해 이루어짐

#### **역할 분담 및 목적지 관리**

| 구분 | NEAR (MPC Nodes) | RPC Provider (Infura, Alchemy 등) | 앱 백엔드 (우리 서버) |
| :--- | :--- | :--- | :--- |
| **핵심 역할** | **인감 도장 (Signer)** | **우체부/장부 (Transmitter)** | **관리자 (Coordinator)** |
| **세부 기능** | - 수학적 주소 계산 (KDF)<br>- 타 체인 트랜잭션 서명<br>- **서명만 제공, 네트워크 연결 없음** | - 입금 여부 실시간 감지(Polling)<br>- 서명된 트랜잭션 네트워크 전파<br>- **각 체인별 RPC 연결 필수** | - 사용자-주소 매핑 및 DB 관리<br>- 가상 환전(CHOCO 지급)<br>- 회수(Sweep) 로직 실행<br>- RPC 호출 조율 |
| **특징** | 타 체인 네트워크 연결 불필요 | 각 체인별 네트워크 연결 필수 | 중앙 금고(Treasury) 주소 관리 |

**RPC 연결의 필요성**:
1. **입금 감지**: 각 체인(ETH/BTC/SOL)의 블록체인 데이터를 조회하여 입금 여부 확인
2. **트랜잭션 전송**: NEAR MPC로부터 받은 서명을 각 체인의 네트워크에 브로드캐스트
3. **잔액 조회**: 사용자 주소의 잔액 확인 및 가스비 계산
4. **트랜잭션 상태 추적**: 전송된 트랜잭션의 확인(Confirmation) 상태 모니터링

#### **전체 자산 흐름 도식 (Workflow Diagram)**

```mermaid
graph TD
    subgraph "External Network (ETH/BTC/SOL)"
        EW[외부 사용자 지갑] -- "1. 코인 입금" --> UDA[유저별 파생 주소]
        UDA -- "5. 자산 회수 (Sweep)" --> TW[서비스 중앙 금고 (Treasury)]
    end

    subgraph "RPC & Monitoring"
        RPC[RPC 노드 (Infura/Alchemy)] -- "2. 입금 감지 알림" --> SRV
        SRV[앱 백엔드 서버] -- "6. 서명된 Tx 전송" --> RPC
    end

    subgraph "NEAR Protocol (MPC)"
        MPC[NEAR MPC 컨트랙트] -- "4. 타 체인 서명 반환" --> SRV
        SRV -- "3. 서명 요청 (Payload)" --> MPC
    end

    subgraph "Local Logic"
        SRV -- "가상 환전" --> DB[(Turso DB: CHOCO)]
    end
```

### 2.3 체인별 파생 경로 (Derivation Paths)

**참고**: NEAR Chain Signatures는 비교적 새로운 기술이며, 실제 구현 시 NEAR 공식 문서 및 SDK를 참조해야 합니다.

| 대상 체인 | 파생 경로 (Path) | 주소 형식 | 구현 상태 |
| :--- | :--- | :--- | :--- |
| **Bitcoin** | `m/44'/0'/0'/0/0` 또는 NEAR Chain Signatures API | Native SegWit (Bech32) | 검토 필요 |
| **Ethereum** | `m/44'/60'/0'/0/0` 또는 NEAR Chain Signatures API | EIP-155 (0x...) | 검토 필요 |
| **Solana** | `m/44'/501'/0'/0'` 또는 NEAR Chain Signatures API | Base58 | 검토 필요 |

**주의사항**:
- NEAR Chain Signatures는 테스트넷에서도 제한적으로 사용 가능할 수 있습니다.
- 실제 구현 전에 NEAR 공식 문서 및 최신 SDK 버전을 확인해야 합니다.
- MPC 컨트랙트 주소 및 API 엔드포인트는 실제 배포 시 확인 필요합니다.

---

---

## 3. 핵심 워크플로우 (Core Workflows)

### 3.0 NEAR Native MVP (최우선 구현)
멀티체인(BTC/ETH/SOL) 확장 전, 이미 구축된 NEAR 인프라를 활용하여 환전 및 회수 시스템을 선행 검증합니다.

*   **방식**: 사용자의 NEAR 주소(`user.rogulus.testnet`)로 직접 NEAR를 입금받아 CHOCO로 환전.
*   **장점**: 타 체인 RPC 연결 없이 즉시 구현 가능, 핵심 로직(감지-환전-회수) 조기 검증.
*   **회수 목적지**: 관리자 계정(`rogulus.testnet`)으로 자동 전송.

### 3.1 멀티체인 입금 주소 생성 (Address Generation)

**핵심 개념**: 
- `user123.rogulus.testnet` (NEAR 주소)는 **이미 존재**합니다.
- 이더리움 주소는 **입금 전에 미리 생성**됩니다. 입금 시점에 생성하는 것이 아닙니다.
- 이더리움 주소는 `user123.rogulus.testnet`에서 **파생 경로를 사용하여** 결정론적으로 생성됩니다.

**시나리오 예시**:

**이더리움 선택 시**:
```
1. 사용자가 앱에 가입 → NEAR 지갑 생성 → `user123.rogulus.testnet` 생성됨 ✅
2. 사용자가 충전 메뉴 진입 → "이더리움" 선택
3. 백엔드가 `user123.rogulus.testnet` + 파생 경로(`ethereum,1`) 사용 → ETH 주소 생성 (예: `0xABC...`)
4. ETH 주소를 DB에 저장 (`ethAddress` 필드)
5. 사용자에게 ETH 주소와 QR 코드 표시
6. 사용자가 외부 거래소에서 `0xABC...`로 입금 ← 이미 생성된 주소로 입금
7. 인덱서가 입금 감지 → CHOCO/크레딧 부여
```

**비트코인 선택 시**:
```
1. 사용자가 충전 메뉴 진입 → "비트코인" 선택
2. 백엔드가 `user123.rogulus.testnet` + 파생 경로(`bitcoin,1`) 사용 → BTC 주소 생성 (예: `tb1XYZ...`)
3. BTC 주소를 DB에 저장 (`btcAddress` 필드)
4. 사용자에게 BTC 주소와 QR 코드 표시
5. 사용자가 외부 거래소에서 `tb1XYZ...`로 입금
6. 인덱서가 입금 감지 → CHOCO/크레딧 부여
```

**솔라나 선택 시**:
```
1. 사용자가 충전 메뉴 진입 → "솔라나" 선택
2. 백엔드가 `user123.rogulus.testnet` + 파생 경로(`solana,1`) 사용 → SOL 주소 생성 (예: `SOL...`)
3. SOL 주소를 DB에 저장 (`solAddress` 필드)
4. 사용자에게 SOL 주소와 QR 코드 표시
5. 사용자가 외부 거래소에서 `SOL...`로 입금
6. 인덱서가 입금 감지 → CHOCO/크레딧 부여
```

**핵심**: 각 코인을 선택할 때마다 해당 코인의 주소가 생성됩니다. 한 번 생성된 주소는 DB에 저장되어 재사용됩니다.

**중요**: 입금 시점에는 주소 생성이 아니라 **입금 감지**만 합니다.

**워크플로우**:
1.  **Frontend**: 사용자가 '충전' 메뉴 진입 후 원하는 코인을 선택합니다.
    *   이더리움 선택 → ETH 주소 생성
    *   비트코인 선택 → BTC 주소 생성
    *   솔라나 선택 → SOL 주소 생성
2.  **Backend**: `getMultichainAddress(userId, chain)`를 호출합니다.
    *   `chain` 파라미터: `"ETH"`, `"BTC"`, `"SOL"` 중 하나
3.  **Process**:
    *   사용자의 `nearAccountId`를 DB에서 가져옵니다.
    *   **파생 경로(Derivation Path)를 사용하여** 선택한 코인의 주소를 계산합니다.
        *   ETH 선택: `nearAccountId` + `ethereum,1` → ETH 주소 생성
        *   BTC 선택: `nearAccountId` + `bitcoin,1` → BTC 주소 생성
        *   SOL 선택: `nearAccountId` + `solana,1` → SOL 주소 생성
    *   NEAR Chain Signatures API 또는 MPC 컨트랙트를 통해 주소를 파생(Derive)합니다.
    *   계산된 주소를 `MultichainAddress` 테이블에 저장:
        *   `userId`: 사용자 ID
        *   `chain`: 코인 종류 ("ETH", "BTC", "SOL" 등)
        *   `address`: 생성된 주소
        *   `derivationPath`: 사용된 파생 경로
4.  **UI**: 계산된 주소를 사용자에게 노출하고 QR 코드를 생성합니다.
5.  **사용자**: 외부 거래소나 지갑에서 생성된 주소로 입금합니다.

**중요**: 
- 각 코인을 선택할 때마다 해당 코인의 주소가 생성됩니다.
- 한 번 생성된 주소는 DB에 저장되어 재사용됩니다 (결정론적이므로 항상 같은 주소).
- 사용자가 여러 코인을 선택하면 각각의 주소가 생성되어 DB에 저장됩니다.

**파생 경로 작동 원리**:
- 사용자의 `nearAccountId` (예: `user123.rogulus.testnet`)는 **이미 존재**하고 고정되어 있습니다.
- 각 체인별로 고유한 파생 경로를 사용하여 타 체인 주소를 생성합니다:
  - **Ethereum**: `user123.rogulus.testnet` + `ethereum,1` → `0xABC...` (ETH 주소)
  - **Bitcoin**: `user123.rogulus.testnet` + `bitcoin,1` → `tb1XYZ...` (BTC 주소)
  - **Solana**: `user123.rogulus.testnet` + `solana,1` → `SOL...` (SOL 주소)
- 같은 `nearAccountId`와 같은 파생 경로를 사용하면 **항상 같은 주소**가 생성됩니다 (결정론적).
- 따라서 한 번 생성하면 계속 재사용할 수 있습니다.

**타임라인 예시** (이더리움 선택 시):
```
[가입 시] NEAR 지갑 생성 → `user123.rogulus.testnet` 생성 ✅
    ↓
[충전 메뉴 진입] 사용자가 "이더리움" 선택
    ↓
[ETH 주소 생성] `user123.rogulus.testnet` + `ethereum,1` → `0xABC...` 생성 및 DB 저장 (`ethAddress`)
    ↓
[사용자가 입금] 외부 거래소에서 `0xABC...`로 입금
    ↓
[입금 감지] 인덱서가 입금 감지 → CHOCO/크레딧 부여
```

**타임라인 예시** (비트코인 선택 시):
```
[충전 메뉴 진입] 사용자가 "비트코인" 선택
    ↓
[BTC 주소 생성] `user123.rogulus.testnet` + `bitcoin,1` → `tb1XYZ...` 생성 및 DB 저장 (`btcAddress`)
    ↓
[사용자가 입금] 외부 거래소에서 `tb1XYZ...`로 입금
    ↓
[입금 감지] 인덱서가 입금 감지 → CHOCO/크레딧 부여
```

**타임라인 예시** (솔라나 선택 시):
```
[충전 메뉴 진입] 사용자가 "솔라나" 선택
    ↓
[SOL 주소 생성] `user123.rogulus.testnet` + `solana,1` → `SOL...` 생성 및 DB 저장 (`solAddress`)
    ↓
[사용자가 입금] 외부 거래소에서 `SOL...`로 입금
    ↓
[입금 감지] 인덱서가 입금 감지 → CHOCO/크레딧 부여
```

**Q: 이더가 입금되면 내부적으로 이더 주소를 만드는가?**
**A: 아니요. 이더 주소는 입금 전에 이미 생성되어 있습니다. 입금 시점에는 입금 감지만 합니다.**

**구현 예시**:
```typescript
// app/lib/near/multichain.server.ts
export async function getMultichainAddress(
    userId: string,
    chain: "BTC" | "ETH" | "SOL"
): Promise<string> {
    const user = await db.query.user.findFirst({
        where: eq(schema.user.id, userId),
        columns: { nearAccountId: true }
    });
    
    if (!user?.nearAccountId) {
        throw new Error("User NEAR account not found");
    }
    
    // NEAR Chain Signatures API 호출 (실제 구현 시)
    // const address = await nearChainSignatures.deriveAddress(
    //     user.nearAccountId,
    //     chain
    // );
    
    // 임시: 실제 구현 전까지는 더미 주소 반환
    return `derived_${chain.toLowerCase()}_address_for_${user.nearAccountId}`;
}
```

### 3.2 입금 감지 및 가상 환전 (Deposit & Virtual Swap)

**중요**: 이 단계는 **이미 생성된 주소**로 입금이 이루어진 후에 실행됩니다. **RPC 연결이 필수**입니다.

**워크플로우**:
1.  **Monitoring (RPC 연결 필수)**: 각 체인의 인덱서(Indexer) 또는 RPC 리스너를 통해 **이미 생성된 사용자 고유 주소**로의 입금을 감지합니다.
    *   **RPC 연결 필요**: 각 체인별 RPC 노드를 통해 블록체인 데이터를 조회합니다.
        *   **Ethereum**: `eth_getBalance(address)`, `eth_getTransactionByHash()` → Infura/Alchemy RPC
        *   **Bitcoin**: `getreceivedbyaddress(address)`, `listtransactions()` → Bitcoin Core RPC 또는 Blockstream API
        *   **Solana**: `getBalance(address)`, `getTransaction()` → Solana RPC 노드
    *   예: 사용자가 이전에 생성한 ETH 주소 `0x1234...`로 0.1 ETH가 입금됨
    *   **폴링 방식**: 주기적으로(예: 1분마다) RPC를 호출하여 입금 여부 확인
    *   **웹훅 방식**: RPC Provider의 웹훅 기능을 활용하여 실시간 입금 알림 수신 (권장)
2.  **Address Matching**: 입금된 주소를 DB의 `MultichainAddress` 테이블과 매칭하여 사용자를 식별합니다.
3.  **Price Fetching**: 외부 Oracle(Pyth, CoinGecko 등)을 통해 입금된 시점의 실시간 시세를 가져옵니다.
    *   예: `0.1 ETH 입금` 시점에 `1 ETH = 2,500 USD`라면 유저에게 **$250** 상당의 가치 부여.
4.  **Credit/CHOCO 부여**:
    *   앱 DB의 `user.chocoBalance` 또는 `user.credits`를 계산된 가치만큼 즉시 업데이트합니다.
    *   사용자에게는 "충전 완료" 알림을 전송하여 즉시 서비스를 이용하게 합니다.

**RPC 연결 예시**:
```typescript
// Ethereum 입금 감지 예시
async function checkEthereumDeposit(userAddress: string) {
    const rpcUrl = process.env.ETHEREUM_RPC_URL; // Infura 또는 Alchemy
    const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_getBalance",
            params: [userAddress, "latest"],
            id: 1,
        }),
    });
    
    const result = await response.json();
    const balance = BigInt(result.result);
    
    // 이전 잔액과 비교하여 입금 여부 확인
    // ...
}
```

**요약**:
- ✅ **입금 전**: 파생 경로로 주소 생성 → DB 저장 → 사용자에게 표시
- ✅ **입금 시**: 사용자가 생성된 주소로 입금
- ✅ **입금 후**: 인덱서가 입금 감지 → 시세 조회 → CHOCO/크레딧 부여

### 3.3 관리 계정 회수 (Asset Sweep Workflow)
사용자 지갑에 들어온 '진짜' 자산을 서비스 관리용 마스터 계정(Treasury)으로 옮기는 과정입니다. 이 과정은 **Chain Signatures**를 통해 서버가 자동 수행합니다.

**중요**: 타 코인 전송 시 RPC 연결이 필수입니다. NEAR MPC는 서명만 제공하며, 실제 트랜잭션 전송은 각 체인의 RPC를 통해 이루어집니다.

**워크플로우**:
1.  **Trigger**: 입금 확인 및 가상 환전 완료 직후 실행.
2.  **트랜잭션 생성**: 
    *   서버가 사용자 주소에서 Treasury 주소로의 트랜잭션을 생성합니다.
    *   각 체인별 트랜잭션 형식:
        *   **Ethereum**: `eth_sendTransaction` 또는 `eth_sendRawTransaction` (서명된 트랜잭션)
        *   **Bitcoin**: `sendrawtransaction` (서명된 트랜잭션)
        *   **Solana**: `sendTransaction` (서명된 트랜잭션)
3.  **MPC Signing**: 
    *   서버는 해당 유저의 NEAR 권한을 사용하여 MPC 컨트랙트에 `sign`을 요청합니다.
    *   목적지는 **[중앙 관리 계좌]** (Service BTC/ETH/SOL Wallet)입니다.
    *   MPC는 서명만 반환하며, 네트워크 연결은 하지 않습니다.
4.  **RPC를 통한 Broadcasting**: 
    *   **RPC 연결 필수**: MPC 노드로부터 받은 타 체인 서명을 각 체인의 RPC 노드를 통해 네트워크에 전송합니다.
    *   각 체인별 RPC 호출:
        *   **Ethereum**: `eth_sendRawTransaction(signedTx)` → Infura/Alchemy RPC
        *   **Bitcoin**: `sendrawtransaction(signedTx)` → Bitcoin Core RPC 또는 Blockstream API
        *   **Solana**: `sendTransaction(signedTx)` → Solana RPC 노드
5.  **트랜잭션 확인**: RPC를 통해 전송된 트랜잭션의 확인 상태를 모니터링합니다.
6.  **Consolidation**: 모든 유저가 입금한 코인은 최종적으로 관리자의 중앙 지갑에 안전하게 모이게 됩니다.

**RPC 연결 예시**:
```typescript
// Ethereum 트랜잭션 전송 예시
async function sweepEthereumAsset(userAddress: string, treasuryAddress: string) {
    // 1. NEAR MPC에 서명 요청
    const signedTx = await nearMPC.signTransaction({
        chain: "ETH",
        from: userAddress,
        to: treasuryAddress,
        value: balance,
    });
    
    // 2. RPC를 통해 서명된 트랜잭션 전송 (필수)
    const rpcUrl = process.env.ETHEREUM_RPC_URL; // Infura 또는 Alchemy
    const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_sendRawTransaction",
            params: [signedTx],
            id: 1,
        }),
    });
    
    const result = await response.json();
    return result.transactionHash;
}
```

**요약**:
- ✅ **NEAR MPC**: 서명만 제공 (네트워크 연결 불필요)
- ✅ **RPC Provider**: 입금 감지 및 트랜잭션 전송 (네트워크 연결 필수)
- ✅ **앱 백엔드**: MPC와 RPC를 조율하여 전체 프로세스 관리

---

## 4. 데이터베이스 및 시세 엔진

### 4.1 스키마 확장 (`app/db/schema.ts`)

**문제점**: 각 코인마다 개별 컬럼(`btcAddress`, `ethAddress`, `solAddress` 등)을 추가하면 지원 코인이 늘어날 때마다 스키마 변경이 필요하고 확장성이 떨어집니다.

**해결책**: 별도 테이블로 분리하여 확장 가능한 구조로 설계합니다.

```typescript
// 멀티체인 주소 테이블 (확장 가능한 구조)
export const multichainAddress = sqliteTable("MultichainAddress", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    chain: text("chain").notNull(), // "BTC", "ETH", "SOL", "USDC", "USDT" 등
    address: text("address").notNull(), // 해당 체인의 주소
    derivationPath: text("derivationPath"), // 파생 경로 (예: "ethereum,1")
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
}, (table) => ({
    // userId + chain 조합이 유니크해야 함 (한 사용자는 각 체인당 하나의 주소만)
    userIdChainUnique: unique().on(table.userId, table.chain),
    // userId로 빠른 조회를 위한 인덱스
    userIdIdx: index("multichainAddress_userId_idx").on(table.userId),
    // chain으로 빠른 조회를 위한 인덱스 (입금 감지 시 사용)
    chainIdx: index("multichainAddress_chain_idx").on(table.chain),
}));

// User 테이블에는 멀티체인 주소 필드를 추가하지 않음
// 대신 MultichainAddress 테이블을 통해 조회

// 시세 정보 테이블
export const exchangeRate = sqliteTable("ExchangeRate", {
    id: text("id").primaryKey(),
    tokenPair: text("tokenPair").notNull().unique(), // "ETH/USD", "BTC/USD", "SOL/USD" 등
    rate: real("rate").notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
}, (table) => ({
    tokenPairIdx: index("exchangeRate_tokenPair_idx").on(table.tokenPair),
}));

// User 테이블에 추가할 필드 (선택사항)
export const user = sqliteTable("User", {
    // ... 기존 필드들 ...
    
    // 중앙 Treasury 설정 (Sweep 기능 제어)
    isSweepEnabled: integer("isSweepEnabled", { mode: "boolean" }).default(true),
});
```

**장점**:
1. **확장성**: 새로운 코인 추가 시 스키마 변경 불필요 (예: USDC, USDT, MATIC 등)
2. **정규화**: 데이터 중복 방지 및 일관성 유지
3. **쿼리 효율성**: 인덱스를 활용한 빠른 조회
4. **유연성**: 각 체인별로 추가 메타데이터 저장 가능 (예: `derivationPath`)

**사용 예시**:
```typescript
// 주소 생성 및 저장
await db.insert(schema.multichainAddress).values({
    id: nanoid(),
    userId: user.id,
    chain: "ETH",
    address: "0xABC...",
    derivationPath: "ethereum,1",
    createdAt: new Date(),
    updatedAt: new Date(),
});

// 사용자의 모든 멀티체인 주소 조회
const addresses = await db.query.multichainAddress.findMany({
    where: eq(schema.multichainAddress.userId, userId),
});

// 특정 체인 주소 조회
const ethAddress = await db.query.multichainAddress.findFirst({
    where: and(
        eq(schema.multichainAddress.userId, userId),
        eq(schema.multichainAddress.chain, "ETH")
    ),
});

// 입금 감지 시 주소로 사용자 찾기
const user = await db.query.multichainAddress.findFirst({
    where: eq(schema.multichainAddress.address, depositAddress),
    with: { user: true }, // 관계 설정 필요
});
```

---

## 5. 단계별 구현 체크리스트 (Current Status Based)

**현재 완료된 Phase**:
- ✅ Phase 1-2: NEAR 지갑 엔진 개발 및 Auth Hook 통합
- ✅ Phase 3: CHOCO 토큰 발행 및 기본 통합
- ✅ Phase 4: 기존 지갑 마이그레이션 및 프라이빗 키 관리
- ✅ Phase 5: Relayer 서버 및 가스비 대납 시스템
- ✅ Phase 6: X402 프로토콜 통합 및 Silent Payment

**현재 최우선 단계 (MVP)**:
### Phase 6.5: NEAR Native 환전 및 회수 엔진 (✅ 완료 - 2026-01-11)

**구현 파일**:
- `app/lib/near/deposit-engine.server.ts`: 핵심 로직 구현
- `app/lib/cron.server.ts`: 크론 잡 스케줄링 (라인 163-175)
- `app/db/schema.ts`: `ExchangeLog` 테이블 스키마 (라인 568-583)
- `app/db/schema.ts`: `User.nearLastBalance` 필드 추가 (라인 43)

**구현 완료 항목**:
- [x] **NEAR 입금 감지**: 사용자 NEAR 계정의 잔액 변화를 실시간/주기적 모니터링.
    *   구현: `runDepositMonitoring()` 함수
    *   크론 잡: 매분 실행 (`* * * * *`)
    *   감지 방식: `nearLastBalance` 필드와 현재 잔액(`account.getState()`) 비교
    *   최소 입금 금액: 0.01 NEAR 미만은 무시
    *   에러 처리: 개별 사용자 처리 실패가 전체에 영향 없도록 try-catch 적용
- [x] **실시간 환전 로직**: 1 NEAR 입금 시 시세 오라클(또는 고정비율) 기준 CHOCO 토큰 실제 지급.
    *   구현: `processExchangeAndSweep()` 함수
    *   현재 환율: 고정비율 1 NEAR = 5,000 CHOCO (MVP)
    *   향후 개선: 시세 오라클 연동 (`ExchangeRate` 테이블 활용)
    *   DB 업데이트: `user.chocoBalance` 필드에 CHOCO 추가 (BigNumber 사용)
    *   트랜잭션: DB 트랜잭션으로 원자성 보장
- [x] **자동 회수(Sweep)**: 사용자 계정 내 NEAR를 `rogulus.testnet`(Treasury)으로 자동 전송.
    *   구현: `executeSweep()` 함수
    *   Treasury 계정: 환경 변수 `NEAR_TREASURY_ACCOUNT_ID` 또는 기본값 `rogulus.testnet`
    *   안전 마진: 가스비를 위해 0.01 NEAR 남김
    *   조건: `user.isSweepEnabled === true`인 경우에만 실행
    *   서명 방식: 사용자 프라이빗 키 복호화 후 KeyPair로 서명
    *   트랜잭션: `account.sendMoney()` 사용
    *   상태 업데이트: `ExchangeLog.status`를 `COMPLETED` 또는 `FAILED`로 업데이트
- [x] **환전 히스토리**: `ExchangeLog` 테이블을 통한 환전 내역 기록.
    *   구현: `ExchangeLog` 테이블 스키마
    *   기록 항목: `fromChain`, `fromAmount`, `toToken`, `toAmount`, `rate`, `txHash`, `sweepTxHash`, `status`
    *   상태 관리: `PENDING_SWEEP` → `COMPLETED` 또는 `FAILED`
    *   인덱스: `userId`, `txHash` 인덱스로 빠른 조회 지원

**개선 권장 사항**:
1. **로깅 개선**: `console.log` 대신 `logger` 서버 사용 (`app/lib/logger.server.ts`)
2. **시세 오라클 연동**: 고정비율 대신 CoinGecko API 등 외부 시세 연동
3. **실제 트랜잭션 해시**: 현재 더미 해시(`DEP_...`) 대신 실제 입금 트랜잭션 해시 추적
4. **병렬 처리**: 여러 사용자 처리 시 `Promise.all` 사용 고려 (현재는 순차 처리)
5. **환경 변수 검증**: `NEAR_TREASURY_ACCOUNT_ID` 환경 변수 존재 여부 확인
6. **에러 복구**: Sweep 실패 시 재시도 로직 추가 고려

**다음 단계 (멀티체인 기능)**:

### Phase 7: 멀티체인 주소 생성 및 노출 (진행 예정)
- [ ] `app/lib/near/multichain.server.ts`: BTC/ETH/SOL 주소 계산 함수 구현
- [ ] 관리자 페이지: 유저별 멀티체인 입금 주소 리스트 뷰 추가
- [ ] 유저 사이드: 충전 페이지 내 체인별 입금 주소 및 QR 코드 표시

### Phase 8: 실시간 입금 감지 및 환전 엔진 (진행 예정)
- [ ] **RPC 연결 설정**: 각 체인별 RPC Provider 설정 (Infura, Alchemy, Blockstream 등)
    *   Ethereum: Infura 또는 Alchemy RPC 엔드포인트 설정
    *   Bitcoin: Blockstream API 또는 Bitcoin Core RPC 설정
    *   Solana: Solana RPC 노드 설정
- [ ] 시세 엔진 구축: CoinGecko API 연동 및 `ExchangeRate` 테이블 캐싱
- [ ] 입금 감지 인터셉터: 타 체인 RPC 폴링(Polling) 또는 Webhook 연동
    *   RPC를 통한 주기적 잔액 조회 (`eth_getBalance`, `getBalance` 등)
    *   또는 RPC Provider의 웹훅 기능 활용 (권장)
- [ ] 입금 시 `user.chocoBalance` 가산 및 알림 발송 시스템

### Phase 9: 자동 자산 회수(Sweep) 시스템 (핵심 단계)
- [ ] NEAR Chain Signatures 연동: 타 체인 트랜잭션 서명 요청 로직
- [ ] **RPC를 통한 트랜잭션 전송**: 서명된 트랜잭션을 각 체인의 RPC를 통해 브로드캐스트
    *   Ethereum: `eth_sendRawTransaction` 호출
    *   Bitcoin: `sendrawtransaction` 호출
    *   Solana: `sendTransaction` 호출
- [ ] 자동 이동 로직: 유저 주소 -> 관리 주소로의 잔액 전송 자동화
- [ ] 가스비 관리: 회수 전 타 체인 가스비(Gas) 선충전 또는 Paymaster 연동
- [ ] 트랜잭션 확인 모니터링: RPC를 통해 전송된 트랜잭션의 확인 상태 추적

---

## 6. 보안 및 기술적 고려사항

### 6.2 성능 및 인프라 안정성
*   **성능 격리 (Performance Isolation)**: 
    *   타 체인 인덱싱 및 MPC 서명 작업은 CPU 및 I/O 부하가 높을 수 있습니다. 
    *   메인 API 서버와 블록체인 작업 스케줄러를 분리하거나 Worker Thread를 사용하여 이벤트 루프 차단을 방지해야 합니다.
*   **작업 큐(Job Queue) 도입**: 
    *   단순 `node-cron` 대신 `BullMQ`나 `Redis` 기반의 큐 시스템을 활용하여, 네트워크 지연이나 고부하 상황에서도 작업이 누락되지 않고 재시도(Retry)될 수 있도록 설계합니다.
*   **Sweep 가스비**: ETH나 BTC의 경우 자산 회수 시 발생하는 가스비가 입금액보다 클 수 있습니다. 최소 입금액(Minimum Deposit) 정책을 설정해야 합니다.
*   **시세 변동성**: 입금 감지 시점과 환전 시점의 시차로 인한 리스크를 방지하기 위해 입금 트랜잭션이 생성된 시점의 시세를 기준으로 잡습니다.
*   **Oracle 보안**: 잘못된 시세 정보가 들어올 경우 시스템 전체에 타격을 줄 수 있습니다. 다중 오라클 검증(Aggregation)을 고려합니다.

### 6.2 구현 전 확인 사항
*   NEAR Chain Signatures 공식 문서 및 SDK 버전 확인
*   테스트넷에서의 실제 동작 테스트
*   MPC 컨트랙트 배포 상태 확인
*   각 체인(BTC/ETH/SOL)별 RPC 노드 및 인덱서 연동 방법 확인
*   시세 오라클 서비스 선택 및 API 연동 방법 확인

### 6.3 대안 고려사항
만약 NEAR Chain Signatures가 아직 완전히 사용 가능하지 않은 경우:
*   각 체인별 전용 지갑 생성 및 관리 (복잡도 증가)
*   중앙 집중식 입금 주소 사용 후 사용자별 매핑 테이블 관리
*   타 멀티체인 지갑 솔루션(예: Privy의 멀티체인 지원) 활용 검토

---

## 7. 실제 운영 사례 및 교훈 (Lessons Learned)

### 7.1 node-cron Missed Execution 이슈

**상용 환경 사례 (2026-01-11)**:
*   **현상**: `NODE-CRON [WARN] missed execution` 경고가 터미널에 반복 발생.
*   **원인**: 
    *   매분 실행되는 선제적 메시지 생성 로직(`cron.server.ts`)이 직렬(Sequential)로 무거운 AI API를 호출.
    *   특정 시간대에 대상 사용자가 몰릴 경우, 전체 실행 시간이 1분을 초과하여 다음 스케줄이 밀리는 현상 발생.

**해결 방법 (2026-01-11 적용)**:
1.  **작업 병렬화**: 순차 처리(`for` 루프)를 병렬 처리(`Promise.all`)로 변경
    *   배치 크기 제한: 최대 5개씩 동시 처리하여 과부하 방지
    *   각 사용자 처리를 독립적인 함수로 분리하여 병렬 실행
2.  **타임아웃 설정**: AI API 호출에 30초 타임아웃 설정
    *   `Promise.race`를 사용하여 타임아웃 시 에러 처리
    *   이벤트 루프 차단 방지
3.  **에러 핸들링 개선**: 각 사용자 처리 실패가 전체 작업에 영향을 주지 않도록 개별 try-catch 적용

**적용된 코드 변경사항**:
```typescript
// Before: 순차 처리
for (const user of usersToCheckIn) {
    await generateProactiveMessage(...); // 순차 실행
}

// After: 병렬 처리 + 타임아웃
const processUser = async (user) => {
    try {
        const messageContent = await Promise.race([
            generateProactiveMessage(...),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Timeout")), 30000)
            )
        ]);
        // ... 처리 로직
    } catch (error) {
        // 개별 에러 처리
    }
};

// 배치 단위 병렬 처리
const BATCH_SIZE = 5;
for (let i = 0; i < usersToCheckIn.length; i += BATCH_SIZE) {
    const batch = usersToCheckIn.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(processUser));
}
```

**멀티체인 구현 시 대응 방안**:
1.  **작업 병렬화**: 루프 내에서 무거운 작업(시세 조회, 서명 요청)을 수행할 때는 반드시 `Promise.all` 또는 병렬 스트림을 사용.
2.  **타임아웃 설정**: 외부 API(RPC, Oracle) 호출 시 엄격한 타임아웃을 설정하여 이벤트 루프 차단 방지.
3.  **전문 스케줄러 고려**: 복잡한 블록체인 작업은 `node-cron` 대신 상태 추적이 가능한 작업 큐(Job Queue) 시스템으로 이관.

---

## 8. NEAR Chain Signatures 실제 기능 확인

### 7.1 NEAR Chain Signatures란?

**공식 기능**: NEAR Chain Signatures는 NEAR 프로토콜의 공식 기능으로, 단일 NEAR 계정을 통해 여러 블록체인(Bitcoin, Ethereum, Solana 등)의 자산을 관리할 수 있게 해주는 기술입니다.

**핵심 특징**:
- ✅ **단일 계정 관리**: 하나의 NEAR 계정으로 여러 블록체인 자산 통합 관리
- ✅ **MPC 기술**: 멀티파티 컴퓨테이션을 통한 프라이빗 키 분산 관리 및 보안성 향상
- ✅ **타 체인 주소 파생**: NEAR 계정에서 타 체인의 주소를 결정론적으로 파생 가능
- ✅ **타 체인 트랜잭션 서명**: MPC 네트워크를 통해 타 체인 트랜잭션에 서명 가능

**우리 문서의 설명과의 일치성**:
- ✅ 문서에서 설명한 핵심 개념(단일 계정, MPC, 주소 파생)은 NEAR Chain Signatures의 실제 기능과 일치합니다.
- ⚠️ 다만, 실제 구현 세부사항(파생 경로 형식, API 엔드포인트, MPC 컨트랙트 주소 등)은 NEAR 공식 문서를 참조해야 합니다.

### 7.2 구현 시 확인 필요 사항

**반드시 확인해야 할 것들**:
1. **NEAR Chain Signatures 공식 문서**
   - 실제 API 엔드포인트 및 SDK 사용법
   - 파생 경로 형식 및 주소 생성 방법
   - MPC 컨트랙트 주소 및 호출 방법

2. **테스트넷/메인넷 가용성**
   - 현재 테스트넷에서 사용 가능한지 확인
   - 메인넷 배포 일정 확인

3. **실제 동작 테스트**
   - 테스트넷에서 실제 주소 파생 테스트
   - 타 체인 트랜잭션 서명 테스트

### 7.3 관련 파일 및 참고 자료

**프로젝트 내 관련 파일**:
- `app/lib/near/wallet.server.ts`: NEAR 지갑 생성 및 관리
- `app/lib/near/multichain.server.ts`: 멀티체인 주소 생성 (현재 데모용 구현)
- `app/lib/near/relayer.server.ts`: 가스비 대납(Relayer) 서버
- `app/lib/near/key-encryption.server.ts`: 프라이빗 키 암호화/복호화
- `app/db/schema.ts`: 데이터베이스 스키마 정의

**외부 참고 자료**:
- [NEAR Chain Signatures 공식 문서](https://docs.near.org/) - **반드시 확인 필요**
- [NEAR Protocol 공식 문서](https://docs.near.org/)
- [NEAR GitHub Repository](https://github.com/near)
- [CoinGecko API 문서](https://www.coingecko.com/en/api)
- [Pyth Network Oracle](https://pyth.network/)

---

**작성일**: 2026-01-11
**최종 수정일**: 2026-01-11
**버전**: 1.2 (프로젝트 컨텍스트 추가 및 기술적 검증 강화)
**작성**: Antigravity AI Assistant


## Related Documents
- **Foundation**: [Document Management Plan](./09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
