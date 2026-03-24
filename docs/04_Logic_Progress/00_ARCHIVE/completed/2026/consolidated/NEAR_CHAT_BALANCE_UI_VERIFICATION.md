---
status: archived
archived_reason: "통합됨"
consolidated_into: "docs/reports/NEAR_CHAT_BALANCE_UI_COMPLETE_VERIFICATION.md"
archived_date: 2026-01-14
original_location: "docs/reports/verification/NEAR_CHAT_BALANCE_UI_VERIFICATION.md"
tags: [completed, verification, ui, consolidated]
---

# 채팅방 실시간 잔액 표시 UI 확인 점검 보고서

**⚠️ 이 문서는 통합되었습니다. 최신 정보는 `docs/reports/NEAR_CHAT_BALANCE_UI_COMPLETE_VERIFICATION.md`를 참조하세요.**

**점검일**: 2026-01-11
**점검자**: Antigravity AI Assistant
**점검 목적**: NEAR_UX_GAP_ANALYSIS.md 92-96번 라인 요구사항 구현 상태 확인

---

## 문서 요구사항

**위치**: `docs/specs/NEAR_UX_GAP_ANALYSIS.md` 라인 92-96

**요구사항**:
1. **[신규] 채팅방 실시간 잔액 표시**: 돈을 쓰고 있다는 감각을 제공해야 함.
   - 채팅방 헤더에 Credit/CHOCO 잔액 뱃지 추가 필요.
   - 사용 시 숫자가 실시간으로 차감되는 애니메이션(Optimistic UI) 구현 필요.
   - 관련 스펙: `NEAR_X402_UI_SPEC.md`의 4.5절 참조.

**관련 스펙**: `docs/specs/NEAR_X402_UI_SPEC.md` 4.5절
- 즉시 차감 표시: 네트워크 컨펌을 기다리지 않고 사용자 액션 즉시 프론트엔드 잔액 차감
- 카운터 애니메이션: 숫자가 줄어들거나 늘어날 때 Rolling Counter 애니메이션 적용
- 시각적 피드백: 차감 시 붉은색 텍스트 점멸(`-50`), 충전 시 녹색 텍스트 점멸(`+500`)
- 위치: 채팅방 헤더(Header)에 Credits/CHOCO 잔액 상시 노출

---

## 구현 상태 종합 평가

**전체 구현 완성도**: **20%**

| 요구사항 | 구현 상태 | 완성도 |
|---------|----------|--------|
| 채팅방 헤더 잔액 뱃지 | ❌ 미구현 | 0% |
| 실시간 차감 애니메이션 (Optimistic UI) | ⚠️ 부분 구현 | 30% |
| 카운터 애니메이션 | ❌ 미구현 | 0% |
| 시각적 피드백 (색상 점멸) | ❌ 미구현 | 0% |

---

## 상세 확인 결과

### 1. 채팅방 헤더 잔액 뱃지

#### 문서 요구사항
- 채팅방 헤더에 Credit/CHOCO 잔액 뱃지 추가 필요
- 위치: 채팅방 헤더(Header)에 Credits/CHOCO 잔액 상시 노출

#### 실제 구현 확인
**파일**: `app/components/chat/ChatHeader.tsx`

**확인 결과**:
- ❌ 잔액 표시 없음
- ❌ Credit/CHOCO 뱃지 없음
- ❌ 잔액 관련 props 없음

**ChatHeader 컴포넌트 구조**:
```typescript
interface ChatHeaderProps {
  characterName: string;
  characterId?: string;
  isOnline?: boolean;
  statusText?: string;
  onBack?: () => void;
  onDeleteChat?: () => void;
  onResetChat?: () => void;
  statusClassName?: string;
  statusOpacity?: number;
  // ❌ credits, chocoBalance 등의 props 없음
}
```

**ChatHeader 렌더링** (라인 35-90):
- 뒤로가기 버튼
- 캐릭터 이름 및 온라인 상태
- 상태 텍스트
- 드롭다운 메뉴 (삭제, 초기화)
- ❌ 잔액 표시 없음

**ChatRoom에서 ChatHeader 사용** (`app/routes/chat/$id.tsx` 라인 594-604):
```typescript
<ChatHeader
  characterName={characterName}
  characterId={dbCharacter?.id}
  isOnline={true}
  statusText={EMOTION_MAP[currentEmotion]?.text || "Active Now"}
  statusClassName={EMOTION_MAP[currentEmotion]?.color}
  statusOpacity={auraOpacity}
  onBack={handleBack}
  onDeleteChat={() => setIsDeleteDialogOpen(true)}
  onResetChat={() => setIsResetDialogOpen(true)}
/>
// ❌ 잔액 관련 props 전달 없음
```

**확인 결과**: ❌ **미구현**

---

### 2. 실시간 차감 애니메이션 (Optimistic UI)

#### 문서 요구사항
- 즉시 차감 표시: 네트워크 컨펌을 기다리지 않고 사용자 액션(버튼 클릭) 즉시 프론트엔드 잔액 차감
- 카운터 애니메이션: 숫자가 줄어들거나 늘어날 때 Rolling Counter 애니메이션 적용
- 시각적 피드백: 차감 시 붉은색 텍스트 점멸(`-50`), 충전 시 녹색 텍스트 점멸(`+500`)

#### 실제 구현 확인
**파일**: `app/routes/chat/$id.tsx`

**확인 결과**:

1. **잔액 State 관리** (라인 211-217):
   ```typescript
   const [currentUserCredits, setCurrentUserCredits] = useState(user?.credits || 0);
   
   // Re-sync states when loader data updates
   useEffect(() => {
     setCurrentUserHearts(user?.inventory?.find((i: any) => i.itemId === "heart")?.quantity || 0);
     setCurrentUserCredits(user?.credits || 0);
   }, [user]);
   ```
   - ✅ `currentUserCredits` state 존재
   - ✅ loader 데이터 업데이트 시 동기화

2. **메시지 전송 시 잔액 차감** (라인 391-420):
   ```typescript
   const handleSend = async (message: string, mediaUrl?: string) => {
     // ... 메시지 전송 로직
     setIsOptimisticTyping(true);
     // ❌ 즉시 잔액 차감 로직 없음
   };
   ```
   - ❌ 메시지 전송 시 즉시 잔액 차감 없음
   - ⚠️ Optimistic UI는 메시지 표시에만 사용됨 (`isOptimisticTyping`)

3. **백엔드 잔액 차감** (`app/routes/api/chat/index.ts` 라인 178-197):
   ```typescript
   // 3단계. 토큰 사용량에 따른 크레딧 차감 (스트리밍 완료 후)
   if (tokenUsage && tokenUsage.totalTokens > 0) {
       try {
           await db.update(schema.user)
               .set({ credits: sql`${schema.user.credits} - ${tokenUsage.totalTokens}` })
               .where(eq(schema.user.id, session.user.id));
       } catch (err) {
           // ...
       }
   }
   ```
   - ⚠️ 백엔드에서 스트리밍 완료 후에만 차감됨
   - ❌ 프론트엔드 Optimistic Update 없음

4. **잔액 업데이트** (라인 304-306):
   ```typescript
   setIsOptimisticTyping(false);
   if (user?.credits !== undefined) {
       setCurrentUserCredits(user.credits);
   }
   ```
   - ⚠️ 스트리밍 완료 후에만 업데이트됨
   - ❌ 즉시 차감 없음

**확인 결과**: ⚠️ **부분 구현** (잔액 state는 있으나 Optimistic Update 없음)

---

### 3. 카운터 애니메이션

#### 문서 요구사항
- 카운터 애니메이션: 숫자가 줄어들거나 늘어날 때 Rolling Counter 애니메이션 적용

#### 실제 구현 확인
**검색 결과**: 카운터 애니메이션 관련 코드 없음

**확인 결과**: ❌ **미구현**

---

### 4. 시각적 피드백 (색상 점멸)

#### 문서 요구사항
- 시각적 피드백: 차감 시 붉은색 텍스트 점멸(`-50`), 충전 시 녹색 텍스트 점멸(`+500`)

#### 실제 구현 확인
**검색 결과**: 차감/충전 시 색상 점멸 효과 없음

**확인 결과**: ❌ **미구현**

---

### 5. MessageInput 컴포넌트

#### 확인 내용
**파일**: `app/components/chat/MessageInput.tsx`

**확인 결과**:
- ✅ `userCredits` prop 존재 (라인 9, 20)
- ❌ 실제로 잔액을 표시하지 않음
- ❌ 잔액 차감 애니메이션 없음

**MessageInput 사용** (`app/routes/chat/$id.tsx` 라인 686-693):
```typescript
<MessageInput
  onSend={handleSend}
  onGift={handleGift}
  onOpenStore={() => setIsItemStoreOpen(true)}
  userCredits={currentUserCredits}
  ownedHearts={currentUserHearts}
  disabled={isOptimisticTyping || isInterrupting}
/>
```
- ✅ `userCredits` prop 전달됨
- ❌ MessageInput 내부에서 표시하지 않음

**확인 결과**: ⚠️ **부분 구현** (prop은 있으나 UI 표시 없음)

---

## 종합 평가

### 구현 완료된 항목 ✅

1. **잔액 State 관리**
   - `currentUserCredits` state 존재
   - loader 데이터와 동기화

2. **MessageInput에 잔액 prop 전달**
   - `userCredits` prop 전달됨

---

### 미구현 항목 ❌

1. **채팅방 헤더 잔액 뱃지**
   - ChatHeader에 잔액 표시 없음
   - Credit/CHOCO 뱃지 없음

2. **실시간 차감 애니메이션 (Optimistic UI)**
   - 메시지 전송 시 즉시 잔액 차감 없음
   - 백엔드 응답 대기 후에만 업데이트됨

3. **카운터 애니메이션**
   - Rolling Counter 애니메이션 없음

4. **시각적 피드백**
   - 차감 시 붉은색 점멸 효과 없음
   - 충전 시 녹색 점멸 효과 없음

---

## 개선 권장 사항

### 우선순위 1: 채팅방 헤더 잔액 뱃지 추가

**구현 필요 사항**:
1. `ChatHeader` 컴포넌트에 잔액 관련 props 추가:
   ```typescript
   interface ChatHeaderProps {
     // ... 기존 props
     credits?: number;
     chocoBalance?: string;
   }
   ```

2. ChatHeader에 잔액 뱃지 UI 추가:
   - 위치: 헤더 우측 상단 (드롭다운 메뉴 옆)
   - 표시 형식: `🍫 {chocoBalance} CHOCO` 또는 `{credits} Credits`
   - 디자인: 작은 뱃지 형태

3. ChatRoom에서 잔액 props 전달:
   ```typescript
   <ChatHeader
     // ... 기존 props
     credits={currentUserCredits}
     chocoBalance={user?.chocoBalance}
   />
   ```

---

### 우선순위 2: 실시간 차감 애니메이션 (Optimistic UI)

**구현 필요 사항**:
1. 메시지 전송 시 즉시 잔액 차감:
   ```typescript
   const handleSend = async (message: string, mediaUrl?: string) => {
     // 예상 비용 계산 (예: 10 credits)
     const estimatedCost = 10;
     
     // 즉시 차감 (Optimistic Update)
     setCurrentUserCredits(prev => prev - estimatedCost);
     
     // 메시지 전송
     // ...
     
     // 백엔드 응답 후 실제 비용으로 조정
   };
   ```

2. 백엔드 응답 후 실제 비용으로 조정:
   - 스트리밍 완료 후 실제 사용량(`tokenUsage.totalTokens`) 확인
   - 예상 비용과 실제 비용 차이 조정

---

### 우선순위 3: 카운터 애니메이션

**구현 필요 사항**:
1. Rolling Counter 애니메이션 라이브러리 사용 또는 직접 구현
2. 숫자 변경 시 부드러운 카운터 애니메이션 적용

---

### 우선순위 4: 시각적 피드백

**구현 필요 사항**:
1. 차감 시 붉은색 텍스트 점멸 효과:
   - 잔액 옆에 `-50` 텍스트 표시
   - 붉은색 색상 및 페이드 아웃 애니메이션

2. 충전 시 녹색 텍스트 점멸 효과:
   - 잔액 옆에 `+500` 텍스트 표시
   - 녹색 색상 및 페이드 아웃 애니메이션

---

## 결론

**채팅방 실시간 잔액 표시 UI가 거의 구현되지 않았습니다.**

**구현 완성도**: **20%**

**주요 발견 사항**:
- ❌ 채팅방 헤더에 잔액 뱃지 없음
- ❌ 실시간 차감 애니메이션 없음
- ❌ 카운터 애니메이션 없음
- ❌ 시각적 피드백 없음
- ⚠️ 잔액 state는 관리되고 있으나 UI 표시 없음

**UAT 준비 상태**: ❌ **미완료**

문서 요구사항에 따라 채팅방 헤더 잔액 뱃지 및 실시간 차감 애니메이션 구현이 필요합니다.

---

**작성일**: 2026-01-11
**버전**: 1.0 (Chat Balance UI Verification)
