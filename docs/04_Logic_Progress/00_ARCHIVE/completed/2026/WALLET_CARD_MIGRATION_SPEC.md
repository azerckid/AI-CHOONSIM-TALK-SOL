# MY WALLET 카드 결제 페이지 이동 사양서

**작성일**: 2026-01-11  
**목적**: 설정 페이지의 "MY WALLET" 카드를 결제/구독 페이지로 이동  
**상태**: ✅ 구현 완료

---

## 1. 배경 및 목적

### 1.1 현재 상황

**설정 페이지 (`/settings`)**:
- "MY WALLET" 카드 위치: 프로필 섹션 바로 아래
- 기능: CHOCO/NEAR 잔액 표시, 지갑 주소, 입금(Receive), 환전(Swap), 사용 내역(History)
- 목적: 지갑 관리 및 고급 기능

**결제/구독 페이지 (`/profile/subscription`)**:
- 현재: 멤버십 정보 중심, CHOCO 잔액은 작은 텍스트로만 표시
- 기능: 충전 버튼, 결제 내역
- 목적: 결제 및 구독 관리

### 1.2 문제점

1. **사용자 플로우 불일치**: 
   - 사용자가 결제 페이지에서 잔액을 확인하고 충전하려면 설정 페이지를 거쳐야 함
   - 자연스러운 플로우가 아님

2. **기능 분산**:
   - 결제 관련 기능(잔액, 충전, 입금, 환전)이 여러 페이지에 분산됨
   - 사용자가 찾기 어려움

3. **발견성 저하**:
   - NEAR 입금 방법이 설정 페이지에 있어 결제 맥락에서 찾기 어려움
   - 충전과 입금이 분리되어 있음

### 1.3 목표

- 결제 관련 기능을 결제 페이지에 통합
- 사용자 플로우 최적화 (잔액 확인 → 충전/입금 → 사용)
- 설정 페이지는 앱 설정에 집중
- 기능 그룹화로 발견성 향상

---

## 2. 현재 구조 분석

### 2.1 설정 페이지 구조

**파일**: `app/routes/settings.tsx`

**현재 레이아웃**:
```
1. Header (설정)
2. Profile Section (프로필 정보)
3. MY WALLET Card ← 이동 대상
   - CHOCO 잔액 (큰 숫자)
   - NEAR 잔액 (작은 텍스트)
   - 지갑 주소 (클릭 시 복사)
   - 입금(Receive) 버튼
   - 환전(Swap) 버튼
   - 사용 내역(History) 버튼
4. App Settings (앱 설정)
5. Advanced Settings (고급설정)
   - 지갑 키 관리 (유지)
6. Privacy & Security (개인정보 및 보안)
7. Support (지원)
```

**MY WALLET 카드 코드 위치**: 라인 228-360

### 2.2 결제/구독 페이지 구조

**파일**: `app/routes/profile/subscription.tsx`

**현재 레이아웃**:
```
1. Header (충전 및 결제 관리)
2. Subscription Card (멤버십 정보)
   - CHOCO 잔액 (작은 텍스트) ← 개선 필요
   - 충전 버튼
   - 멤버십 정보
3. Payment History (결제 내역)
```

**개선 후 레이아웃** (권장):
```
1. Header (충전 및 결제 관리)
2. MY WALLET Card ← 새로 추가
   - CHOCO 잔액 (큰 숫자)
   - NEAR 잔액 (작은 텍스트)
   - 지갑 주소 (클릭 시 복사)
   - 입금(Receive) 버튼
   - 환전(Swap) 버튼
   - 사용 내역(History) 버튼
3. Subscription Card (멤버십 정보)
   - CHOCO 잔액 제거 (중복 방지)
   - 충전 버튼 유지 또는 제거 (MY WALLET에 통합)
   - 멤버십 정보
4. Payment History (결제 내역)
```

---

## 3. 구현 계획

### 3.1 Phase 1: MY WALLET 카드 컴포넌트 추출

**목적**: 재사용 가능한 컴포넌트로 분리

**작업 내용**:
1. `app/components/wallet/WalletCard.tsx` 생성
2. 설정 페이지의 MY WALLET 카드 코드를 컴포넌트로 추출
3. Props 정의:
   - `chocoBalance`: CHOCO 잔액
   - `nearBalance`: NEAR 잔액
   - `nearAccountId`: 지갑 주소
   - `onDepositClick`: 입금 버튼 클릭 핸들러
   - `onSwapClick`: 환전 버튼 클릭 핸들러
   - `onHistoryClick`: 사용 내역 버튼 클릭 핸들러

**장점**:
- 코드 재사용성 향상
- 유지보수 용이
- 테스트 용이

### 3.2 Phase 2: 결제 페이지에 MY WALLET 카드 추가

**작업 내용**:
1. `app/routes/profile/subscription.tsx` 수정
2. `WalletCard` 컴포넌트 import
3. 상단에 MY WALLET 카드 추가
4. 필요한 상태 및 핸들러 추가:
   - `depositDialogOpen`, `setDepositDialogOpen`
   - `swapDialogOpen`, `setSwapDialogOpen`
   - `historyDialogOpen`, `setHistoryDialogOpen`
   - `handleScanDeposits` 함수
5. Loader에서 필요한 데이터 추가:
   - `nearBalance` 조회
   - `exchangeLog` (사용 내역) 조회

### 3.3 Phase 3: 설정 페이지에서 MY WALLET 카드 제거

**작업 내용**:
1. `app/routes/settings.tsx` 수정
2. MY WALLET 카드 섹션 제거 (라인 228-360)
3. 관련 상태 및 핸들러 제거:
   - `depositDialogOpen`, `setDepositDialogOpen`
   - `swapDialogOpen`, `setSwapDialogOpen`
   - `historyDialogOpen`, `setHistoryDialogOpen`
   - `handleScanDeposits` 함수
4. Loader에서 불필요한 데이터 제거:
   - `nearBalance` 조회 제거 (또는 유지 - 다른 용도로 사용 가능)
   - `exchangeLog` 조회 제거
5. 관련 Import 정리

### 3.4 Phase 4: 멤버십 카드 개선

**작업 내용**:
1. `app/routes/profile/subscription.tsx`의 멤버십 카드 수정
2. CHOCO 잔액 표시 제거 (MY WALLET 카드에 있으므로 중복)
3. 충전 버튼 유지 또는 제거 결정:
   - **옵션 A**: 충전 버튼 유지 (빠른 접근)
   - **옵션 B**: 충전 버튼 제거 (MY WALLET 카드의 입금/환전으로 통합)
   - **권장**: 옵션 A (충전 버튼 유지, 입금/환전은 별도 기능)

---

## 4. 상세 구현 내용

### 4.1 WalletCard 컴포넌트 생성

**파일**: `app/components/wallet/WalletCard.tsx`

**Props 인터페이스**:
```typescript
interface WalletCardProps {
    chocoBalance: string | null;
    nearBalance: string;
    nearAccountId: string | null;
    onDepositClick?: () => void;
    onSwapClick?: () => void;
    onHistoryClick?: () => void;
    depositDialogOpen?: boolean;
    swapDialogOpen?: boolean;
    historyDialogOpen?: boolean;
    onDepositDialogChange?: (open: boolean) => void;
    onSwapDialogChange?: (open: boolean) => void;
    onHistoryDialogChange?: (open: boolean) => void;
    onScanDeposits?: () => Promise<void>;
    isScanning?: boolean;
    history?: any[]; // ExchangeLog[]
    onCopyAddress?: () => void;
}
```

**구현 내용**:
- 설정 페이지의 MY WALLET 카드 UI 그대로 유지
- Dialog 컴포넌트 포함 (입금, 환전, 사용 내역)
- 재사용 가능하도록 Props로 제어

### 4.2 결제 페이지 수정

**파일**: `app/routes/profile/subscription.tsx`

**Loader 수정**:
```typescript
export async function loader({ request }: LoaderFunctionArgs) {
    // ... 기존 코드 ...
    
    // NEAR 잔액 조회 추가
    let nearBalance = "0";
    if (user?.nearAccountId) {
        try {
            const near = await getNearConnection();
            const account = await near.account(user.nearAccountId);
            const balance = await account.getAccountBalance();
            nearBalance = utils.format.formatNearAmount(balance.available, 3);
        } catch (e) {
            console.error("Failed to fetch NEAR balance:", e);
        }
    }
    
    // 사용 내역 조회 추가
    const history = await db.query.exchangeLog.findMany({
        where: eq(schema.exchangeLog.userId, userId),
        orderBy: [desc(schema.exchangeLog.createdAt)],
        limit: 20,
    });
    
    return Response.json({ 
        user, 
        payments, 
        paypalClientId, 
        tossClientKey,
        nearBalance, // 추가
        history, // 추가
    });
}
```

**컴포넌트 수정**:
```typescript
export default function SubscriptionManagementPage() {
    const { user, payments, paypalClientId, tossClientKey, nearBalance, history } = useLoaderData();
    
    // 상태 추가
    const [depositDialogOpen, setDepositDialogOpen] = useState(false);
    const [swapDialogOpen, setSwapDialogOpen] = useState(false);
    const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    
    // 핸들러 추가
    const handleScanDeposits = async () => {
        setIsScanning(true);
        try {
            const res = await fetch("/api/wallet/check-deposit", { method: "POST" });
            if (res.ok) {
                toast.success("입금 확인 및 자동 환전이 완료되었습니다.");
                navigate(".", { replace: true });
                setSwapDialogOpen(false);
            } else {
                toast.error("확인 중 오류가 발생했습니다.");
            }
        } catch (e) {
            toast.error("서버 연결 실패");
        } finally {
            setIsScanning(false);
        }
    };
    
    const handleCopyAddress = async () => {
        if (!user?.nearAccountId) return;
        try {
            await navigator.clipboard.writeText(user.nearAccountId);
            toast.success("주소가 복사되었습니다.");
        } catch (error) {
            toast.error("복사에 실패했습니다.");
        }
    };
    
    // ... 기존 코드 ...
    
    return (
        <div>
            {/* MY WALLET Card 추가 */}
            <WalletCard
                chocoBalance={user?.chocoBalance}
                nearBalance={nearBalance}
                nearAccountId={user?.nearAccountId}
                depositDialogOpen={depositDialogOpen}
                swapDialogOpen={swapDialogOpen}
                historyDialogOpen={historyDialogOpen}
                onDepositDialogChange={setDepositDialogOpen}
                onSwapDialogChange={setSwapDialogOpen}
                onHistoryDialogChange={setHistoryDialogOpen}
                onScanDeposits={handleScanDeposits}
                isScanning={isScanning}
                history={history}
                onCopyAddress={handleCopyAddress}
            />
            
            {/* Subscription Card (CHOCO 잔액 제거) */}
            {/* ... 기존 코드 ... */}
        </div>
    );
}
```

### 4.3 설정 페이지 수정

**파일**: `app/routes/settings.tsx`

**제거할 코드**:
- 라인 228-360: MY WALLET 카드 섹션 전체
- 관련 상태 및 핸들러 제거
- 관련 Import 제거 (QRCode, Copy, Wallet, RefreshCw, QrCode, History 등 - 다른 곳에서 사용하지 않으면)

**Loader 수정**:
```typescript
export async function loader({ request }: LoaderFunctionArgs) {
    // ... 기존 코드 ...
    
    // 제거할 코드:
    // - nearBalance 조회
    // - exchangeLog 조회
    
    return Response.json({ user }); // nearBalance, history 제거
}
```

---

## 5. UI/UX 개선 사항

### 5.1 결제 페이지 레이아웃

**권장 순서**:
1. **MY WALLET Card** (최상단)
   - 가장 중요한 정보 (잔액)를 먼저 표시
   - 입금/환전 기능 바로 접근 가능

2. **Subscription Card** (중간)
   - 멤버십 정보
   - CHOCO 잔액 제거 (중복 방지)
   - 충전 버튼 유지 (빠른 접근)

3. **Payment History** (하단)
   - 결제 내역 표시

### 5.2 멤버십 카드 개선

**변경 전**:
```tsx
<div className="flex items-center gap-2">
    <p className="text-sm text-white/50">
        보유 CHOCO: <span className="text-primary font-bold">{user?.chocoBalance}</span>
    </p>
    <button onClick={() => setIsTopUpModalOpen(true)}>충전</button>
</div>
```

**변경 후**:
```tsx
<div className="flex items-center gap-2">
    <button onClick={() => setIsTopUpModalOpen(true)}>충전</button>
</div>
```

또는 CHOCO 잔액을 작은 텍스트로 유지하되, MY WALLET 카드로 이동하는 링크 추가:
```tsx
<div className="flex items-center gap-2">
    <button 
        onClick={() => {/* 스크롤 to MY WALLET 카드 */}}
        className="text-sm text-white/50 hover:text-primary"
    >
        보유 CHOCO: <span className="text-primary font-bold">{user?.chocoBalance}</span>
    </button>
    <button onClick={() => setIsTopUpModalOpen(true)}>충전</button>
</div>
```

---

## 6. 데이터 흐름

### 6.1 Loader 데이터

**결제 페이지 Loader**:
```typescript
{
    user: {
        chocoBalance: string | null;
        subscriptionTier: string | null;
        subscriptionStatus: string | null;
        currentPeriodEnd: Date | null;
        subscriptionId: string | null;
        nearAccountId: string | null; // 추가 필요
    };
    payments: Payment[];
    paypalClientId?: string;
    tossClientKey?: string;
    nearBalance: string; // 추가
    history: ExchangeLog[]; // 추가
}
```

**설정 페이지 Loader**:
```typescript
{
    user: {
        id: string;
        name: string;
        email: string;
        image: string;
        // nearAccountId, chocoBalance 제거 가능 (다른 용도로 사용하지 않으면)
    };
    // nearBalance 제거
    // history 제거
}
```

### 6.2 API 엔드포인트

**사용하는 API**:
- `/api/wallet/check-deposit`: 입금 확인 및 환전 (POST)
- `/api/wallet/export-private-key`: 프라이빗 키 내보내기 (GET) - 설정 페이지에 유지

---

## 7. 테스트 시나리오

### 7.1 결제 페이지 테스트

1. **MY WALLET 카드 표시**
   - ✅ CHOCO 잔액이 큰 숫자로 표시됨
   - ✅ NEAR 잔액이 작은 텍스트로 표시됨
   - ✅ 지갑 주소가 표시됨
   - ✅ 입금(Receive) 버튼이 작동함
   - ✅ 환전(Swap) 버튼이 작동함
   - ✅ 사용 내역(History) 버튼이 작동함

2. **입금 기능**
   - ✅ 입금 버튼 클릭 시 QR 코드 모달 열림
   - ✅ 지갑 주소 복사 기능 작동
   - ✅ 입금 안내 메시지 표시

3. **환전 기능**
   - ✅ 환전 버튼 클릭 시 모달 열림
   - ✅ 입금 확인 및 환전 실행 작동
   - ✅ 로딩 상태 표시

4. **사용 내역**
   - ✅ 사용 내역 버튼 클릭 시 모달 열림
   - ✅ 환전 내역이 표시됨
   - ✅ 트랜잭션 링크 작동

### 7.2 설정 페이지 테스트

1. **MY WALLET 카드 제거 확인**
   - ✅ MY WALLET 카드가 표시되지 않음
   - ✅ 지갑 키 관리 기능은 유지됨

2. **기능 정상 작동**
   - ✅ 프로필 정보 표시
   - ✅ 앱 설정 기능 작동
   - ✅ 고급설정 기능 작동

### 7.3 통합 테스트

1. **페이지 간 이동**
   - ✅ 설정 페이지 → 결제 페이지 이동 정상
   - ✅ 결제 페이지에서 MY WALLET 카드 접근 가능

2. **데이터 일관성**
   - ✅ 두 페이지에서 CHOCO 잔액이 일치함
   - ✅ 지갑 주소가 일치함

---

## 8. 구현 체크리스트

### Phase 1: 컴포넌트 추출 ✅
- [x] `app/components/wallet/WalletCard.tsx` 생성
- [x] Props 인터페이스 정의
- [x] 설정 페이지의 MY WALLET 카드 코드를 컴포넌트로 이동
- [x] Dialog 컴포넌트 포함
- [x] 스타일링 유지

### Phase 2: 결제 페이지 수정 ✅
- [x] `app/routes/profile/subscription.tsx` Loader 수정
  - [x] `nearBalance` 조회 추가
  - [x] `exchangeLog` 조회 추가
  - [x] `nearAccountId` 조회 추가
- [x] 상태 추가 (depositDialogOpen, swapDialogOpen, historyDialogOpen, isScanning)
- [x] 핸들러 추가 (handleScanDeposits, handleCopyAddress)
- [x] `WalletCard` 컴포넌트 import 및 추가
- [x] 필요한 Import 추가

### Phase 3: 멤버십 카드 개선 ✅
- [x] CHOCO 잔액 표시 제거 (중복 방지)
- [x] 충전 버튼 유지 (빠른 접근)

### Phase 4: 설정 페이지 수정 ✅
- [x] MY WALLET 카드 섹션 제거
- [x] 관련 상태 제거
- [x] 관련 핸들러 제거
- [x] Loader에서 불필요한 데이터 제거
- [x] 관련 Import 정리

### Phase 5: 테스트 및 검증 ✅
- [x] 결제 페이지 MY WALLET 카드 테스트
- [x] 설정 페이지 기능 테스트
- [x] 페이지 간 이동 테스트
- [x] 데이터 일관성 확인

---

## 9. 고려사항

### 9.1 지갑 키 관리 위치

**현재**: 설정 페이지의 "고급설정" 섹션에 있음

**권장**: 유지
- 보안 관련 기능이므로 설정 페이지가 적절
- 일반 사용자가 자주 접근하지 않는 기능
- 고급 사용자용 기능

### 9.2 충전 버튼 위치

**옵션 A**: 멤버십 카드에 유지
- 장점: 빠른 접근
- 단점: 기능 중복 (MY WALLET 카드에도 입금 기능 있음)

**옵션 B**: MY WALLET 카드로 통합
- 장점: 기능 통합
- 단점: 멤버십 카드에서 충전 접근 불가

**권장**: 옵션 A (충전 버튼 유지)
- 충전은 Toss/PayPal 결제 (일반적인 충전)
- 입금은 NEAR 입금 (암호화폐 사용자용)
- 서로 다른 사용자 그룹을 위한 기능

### 9.3 사용 내역 통합

**현재**:
- 결제 페이지: `Payment` 테이블 (Toss, PayPal 결제 내역)
- 설정 페이지: `ExchangeLog` 테이블 (NEAR 입금/환전 내역)

**권장**: 두 내역을 통합 표시
- 결제 페이지에서 모든 내역 표시
- 필터링 기능 추가 (결제/환전 구분)

---

## 10. 향후 개선 사항

### 10.1 통합 사용 내역

- 결제 내역과 환전 내역을 하나의 리스트로 통합
- 필터링 기능 추가 (결제/환전/사용 구분)
- 날짜별 정렬 및 검색 기능

### 10.2 빠른 충전 버튼

- MY WALLET 카드에 "빠른 충전" 버튼 추가
- 가장 많이 사용하는 패키지로 바로 이동

### 10.3 잔액 알림

- 잔액이 낮을 때 알림 표시
- 자동 충전 옵션 제공

---

## 11. 참고 사항

### 11.1 관련 파일

- `app/routes/settings.tsx`: 설정 페이지 (MY WALLET 카드 제거)
- `app/routes/profile/subscription.tsx`: 결제 페이지 (MY WALLET 카드 추가)
- `app/components/wallet/WalletCard.tsx`: 새로 생성할 컴포넌트
- `app/routes/api/wallet/check-deposit.ts`: 입금 확인 API

### 11.2 관련 문서

- `docs/specs/PAYMENT_UI_CLEANUP_SPEC.md`: 결제 UI 정리 작업
- `docs/features/billing/choco-exchange-rate-policy.md`: CHOCO 환율 정책

---

## 12. 승인 및 구현

- [x] 설계 검토 완료
- [x] 구현 시작
- [x] 테스트 완료
- [x] 배포 준비

**구현 완료일**: 2026-01-13  
**검증 보고서**: `docs/reports/WALLET_CARD_MIGRATION_VERIFICATION.md`

---

**문서 버전**: 1.1  
**최종 수정일**: 2026-01-13  
**구현 완료**: 2026-01-13
