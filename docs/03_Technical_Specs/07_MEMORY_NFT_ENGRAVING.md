# 07. 기억각인 NFT (cNFT Memory Engraving)
> Created: 2026-03-28
> Last Updated: 2026-04-02 (DAS API Helius RPC 우선화, DB 설계 결정 문서화, .env.example 추가)

채팅 중 유저가 특별한 순간을 Compressed NFT로 Solana Devnet에 영구 기록하는 기능.

---

## 1. 개요

| 항목 | 내용 |
|:---|:---|
| NFT 표준 | Metaplex Bubblegum (Compressed NFT) |
| 네트워크 | Solana Devnet |
| 발행 비용 | 200 CHOCO (유저 차감) + ~0.000005 SOL (서버 부담) |
| Merkle Tree | `AJxCqbFdWLmQ7xMqBQN3AXja9paZJZ9qrqvwViXVkXGF` (depth=14, 최대 16,384개) |
| 발행 주체 | 서버 Agent 지갑 (minting authority) |
| NFT 수신 | 유저 Phantom 지갑 (owner) |

---

## 2. 트리거 방법

### 2.1 슬래시 커맨드
```
/engrave 첫 만남    → "첫 만남" 제목으로 cNFT 발행
/engrave            → 기본 제목("춘심과의 소중한 순간")으로 발행
```

### 2.2 자연어 감지 (5가지 패턴)
```
"기억에 새겨줘"
"추억으로 남겨줘"
"NFT로 만들어줘"
"온체인에 기록해줘"
"기록 남겨줘"
```

자연어 감지는 `stream.ts`의 `executeNaturalLanguageCommand()`에서 정규식으로 처리되며, AI 모델을 거치지 않고 도구를 직접 실행한다.

---

## 3. 전체 발행 흐름

```
유저 메시지 ("기억에 새겨줘" / "/engrave")
    │
    ▼
stream.ts — executeNaturalLanguageCommand() 또는 executeSlashCommand()
    │
    ▼
agent-kit.server.ts — engraveMemory 도구 실행
    │
    ├─ user.solanaWallet 없음 → Phantom 등록 안내 반환 (종료)
    │
    ├─ chocoBalance < 200 → 잔액 부족 안내 반환 (종료)
    │
    └─ 정상 진행
           │
           ▼
        cnft.server.ts — mintMemoryNFT() 직접 호출 (API 라우트 미경유)
           │
           ├─ UMI 인스턴스 생성 (SOLANA_AGENT_PRIVATE_KEY)
           ├─ 메타데이터 JSON 구성 → Base64 Data URI 인코딩
           └─ Bubblegum mintV1() 호출 → 유저 지갑으로 cNFT 전송
                  │
                  ▼
        DB chocoBalance -= 200 (CAST 연산)
        Solana Explorer URL 반환
           │
           ▼
유저 채팅창에 결과 표시
"기억에 새겼어! 🎖️ 200 CHOCO 사용됐어.
 Explorer: https://explorer.solana.com/tx/...?cluster=devnet"
```

---

## 4. 관련 파일

| 파일 | 역할 |
|:---|:---|
| `app/lib/ai/stream.ts` | 자연어/슬래시 감지 → `engraveMemory` 도구 호출 |
| `app/lib/solana/agent-kit.server.ts` | `engraveMemory` 도구 정의 (지갑·잔액 확인 + 민팅 실행) |
| `app/lib/solana/cnft.server.ts` | Bubblegum `mintV1` 실행, 메타데이터 URI 생성 |
| `app/routes/api/solana/mint-memory.ts` | REST API (`POST /api/solana/mint-memory`) — 채팅 외부 직접 호출용 |

> **주의**: 채팅 파이프라인(`engraveMemory` 도구)은 `mint-memory.ts` API 라우트를 거치지 않고 `mintMemoryNFT()`를 직접 import해서 호출한다.

---

## 5. NFT 메타데이터 구조

```json
{
  "name": "춘심과의 소중한 순간",
  "description": "춘심과의 소중한 순간 — 2026-03-28",
  "image": "https://res.cloudinary.com/dpmw96p8k/image/upload/v1/choonsim/choonsim.png",
  "attributes": [
    { "trait_type": "character", "value": "choonsim" },
    { "trait_type": "userId",    "value": "<userId>" },
    { "trait_type": "type",      "value": "memory" }
  ],
  "properties": {
    "files": [{ "uri": "<image_url>", "type": "image/png" }]
  }
}
```

메타데이터 JSON은 Arweave/IPFS 대신 **Base64 Data URI로 인코딩**해 온체인 URI에 직접 포함한다 (해커톤 데모용).

---

## 6. NFT 이미지 결정 로직

발행 시 사용되는 이미지는 `agent-kit.server.ts`에서 아래 순서로 결정된다.

```ts
const imageUri =
  process.env.CHOONSIM_DEFAULT_IMAGE_URI ||
  "https://res.cloudinary.com/dpmw96p8k/image/upload/v1/choonsim/choonsim.png";
```

| 우선순위 | 소스 | 현재 상태 |
|:---:|:---|:---|
| 1 | 환경변수 `CHOONSIM_DEFAULT_IMAGE_URI` | ⚠️ **미설정** (로컬·Vercel 모두) |
| 2 | Cloudinary 하드코딩 URL (fallback) | 현재 항상 이 값 사용 |

---

## 7. 알려진 문제점

### 7.1 `CHOONSIM_DEFAULT_IMAGE_URI` 미설정
- `.env.development`, `.env.example`, Vercel 환경변수 어디에도 설정되어 있지 않다.
- 현재는 항상 fallback Cloudinary URL을 사용하고 있으며, 해당 URL이 실제로 존재하는지 확인이 필요하다.
- `.env.example`에 항목 추가 완료 (2026-04-02).
- **조치**: Cloudinary URL 존재 여부 확인 후 Vercel 환경변수에 `CHOONSIM_DEFAULT_IMAGE_URI` 추가.

### 7.6 Message 테이블에 NFT 추적 컬럼 없음 (설계 결정)
- `schema.ts`의 `Message` 테이블에 `nft_mint_address`, `nft_engraved_at` 컬럼이 존재하지 않는다.
- **현재 방식**: cNFT 발행 후 DB에 기록 없이, `/profile/memories` 페이지는 온체인 DAS API 단독 조회로 동작.
- **장점**: DB 마이그레이션 불필요, 온체인 데이터가 단일 진실 공급원.
- **단점**: 특정 메시지에서 발행된 NFT를 채팅 화면에서 직접 연결 불가.
- **MVP 결정**: DAS API 조회 방식으로 확정. 향후 채팅-NFT 연결이 필요하다면 컬럼 추가.

### 7.7 DAS API — Helius RPC 필수
- `getAssetsByOwner` 메서드는 표준 Devnet RPC에서 지원되지 않는다.
- `HELIUS_RPC_URL` 또는 `ZK_COMPRESSION_RPC_URL` 환경변수 설정 필수.
- 미설정 시 `/profile/memories`가 항상 빈 결과를 반환한다.
- `memories.ts` 수정 완료: Helius RPC 우선 사용 (2026-04-02).

### ~~7.1 Explorer 링크 버그~~ ✅ 수정 완료 (2026-03-28)
- `Buffer.from(signature).toString("base64")` → `bs58.encode(signature)` 로 수정
- 파일: `app/lib/solana/cnft.server.ts`

### 7.2 모든 NFT가 동일한 이미지 사용
- 유저, 대화 내용, 감정 상태에 무관하게 단일 이미지(`choonsim.png`)가 고정으로 사용된다.
- NFT로서의 희소성·개인화가 없다.
- **조치 (데모 이후)**: 채팅 스크린샷 또는 감정 상태별 이미지를 Cloudinary에 업로드하고, `engraveMemory` 도구에서 대화 컨텍스트를 기반으로 이미지를 선택하는 로직 추가.

### ~~7.3 메타데이터 URI가 Base64 Data URI~~ ✅ 수정 완료 (2026-03-28)
- `buildMetadataUri()`가 이제 Cloudinary `raw` 리소스로 메타데이터 JSON을 업로드하고 HTTPS URL을 반환한다.
- DAS API 인덱서가 메타데이터를 정상 파싱할 수 있어 `/profile/memories` 앨범 구현 가능.
- 파일: `app/lib/cloudinary.server.ts` (`uploadNFTMetadata`), `app/lib/solana/cnft.server.ts`

### ~~7.4 채팅 파이프라인과 REST API의 이미지 처리 불일치~~ ✅ 수정 완료 (2026-03-28)
- `cnft.server.ts`에 `getDefaultImageUri()` 헬퍼를 추출했다.
- `agent-kit.server.ts`와 `mint-memory.ts` 양쪽에서 동일한 함수를 사용한다.

### ~~7.5 `mint-memory.ts` API에서 빈 imageUri 허용~~ ✅ 수정 완료 (2026-03-28)
- `imageUri` 기본값 `""` 제거, 생략 시 `getDefaultImageUri()` 결과를 사용한다.

---

## 8. REST API 명세 (`POST /api/solana/mint-memory`)

> 채팅 파이프라인이 아닌 외부에서 직접 호출하는 경우 사용.

**인증**: 세션 쿠키 필수 (로그인 상태)

**Request Body**
```json
{
  "ownerAddress": "Base58 지갑 주소 (32~44자)",
  "name": "NFT 제목 (최대 32자)",
  "description": "설명 (최대 200자, 선택)",
  "imageUri": "이미지 URL (선택)",
  "characterId": "choonsim"
}
```

**Response (성공)**
```json
{
  "success": true,
  "signature": "Base64 인코딩된 트랜잭션 서명",
  "message": "🎖️ 메모리 NFT가 온체인에 각인되었습니다! (200 CHOCO 소모)"
}
```

**에러 케이스**
| Status | 조건 |
|:---:|:---|
| 401 | 미로그인 |
| 402 | CHOCO 잔액 부족 (< 200) |
| 400 | 요청 파라미터 유효성 검사 실패 |
| 500 | cNFT 발행 중 서버 오류 |

---

## 9. 관련 문서

- [02_SOLANA_INTEGRATION_SPECS.md](./02_SOLANA_INTEGRATION_SPECS.md) — Bubblegum/Merkle Tree 기술 기반
- [04_AGENT_KIT_IMPLEMENTATION.md](./04_AGENT_KIT_IMPLEMENTATION.md) — AI Agent Kit 전체 도구 구조
- [06_SLASH_COMMANDS.md](./06_SLASH_COMMANDS.md) — `/engrave` 슬래시 커맨드 사용법
