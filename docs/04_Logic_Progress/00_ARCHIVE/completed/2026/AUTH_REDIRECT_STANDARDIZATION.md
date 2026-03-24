# AUTH_REDIRECT_STANDARDIZATION: Better Auth 표준 리다이렉트 경로 전환 계획

본 문서는 현재 프로젝트의 커스텀 인증 리다이렉트 URL 형식을 Better Auth의 기본 표준 형식으로 전환하기 위한 목적과 상세 작업 절차를 정의합니다.

---

## 1. 작업 개요 (Overview)

### 1.1 프로젝트 컨텍스트

이 문서는 **CHAT-BOTS** 프로젝트의 인증 리다이렉트 경로 표준화 계획입니다.

**현재 프로젝트 상태**:
- **프레임워크**: React Router v7 (Vite)
- **인증 라이브러리**: Better Auth
- **베이스 경로**: `/auth` (`basePath: "/auth"`)
- **개발 서버 포트**: `5173` (Vite 기본 포트)
- **현재 구현 상태**: 커스텀 콜백 핸들러 사용 중 (Phase 0)

**현재 동작 방식**:
- 외부 OAuth 제공자는 `/auth/{provider}/callback` 경로로 리다이렉트
- 커스텀 콜백 핸들러가 이를 `/auth/callback/{provider}`로 매핑
- Better Auth의 내부 핸들러가 실제 인증 처리

### 1.2 배경 및 목적

**현행 방식**:
- `/auth/{provider}/callback` 형식을 커스텀하게 정의하여 사용 중
- `app/routes/auth/{provider}/callback.ts` 파일들이 경로 매핑 역할 수행
- 환경 변수에서 `redirectURI`를 명시적으로 설정 (`GOOGLE_REDIRECT_URL`, `KAKAO_REDIRECT_URL`, `TWITTER_REDIRECT_URL`)

**표준 방식**:
- Better Auth의 기본 권장 형식: `{basePath}/callback/{provider}` = `/auth/callback/{provider}`
- `basePath`가 `/auth`로 설정되어 있으므로, 표준 경로는 `/auth/callback/{provider}`
- 환경 변수에서 `redirectURI` 제거하여 라이브러리 기본값 사용

**목적**: 
- 라이브러리의 기본 동작 방식을 활용하여 설정 복잡도 최소화 (Zero Config)
- 커스텀 콜백 핸들러 제거로 코드 간결화
- 향후 소셜 제공자 추가 시 확장성 및 유지보수성 향상
- 보안 및 경로 충돌 위험 제거

### 1.3 대상 리다이렉트 URL

**변경 전 (현행)**:
- Google: `/auth/google/callback` → 환경 변수로 `/auth/google/callback` 설정
- Kakao: `/auth/kakao/callback` → 환경 변수로 `/auth/kakao/callback` 설정
- Twitter: `/auth/twitter/callback` → 환경 변수로 `/auth/twitter/callback` 설정

**변경 후 (표준)**:
- Google: `/auth/callback/google` (Better Auth 기본값)
- Kakao: `/auth/callback/kakao` (Better Auth 기본값)
- Twitter: `/auth/callback/twitter` (Better Auth 기본값)

---

## 2. 상세 작업 절차 (Step-by-Step)

### Phase 1: 외부 플랫폼 설정 업데이트

**목적**: 인증 라이브러리 수정 전, 각 소셜 서비스의 개발자 콘솔에서 허용된 리다이렉트 URI를 먼저 추가/수정해야 합니다.

**주의사항**: 기존 리다이렉트 URI를 삭제하지 말고, 새 경로를 추가한 후 테스트 완료 시 기존 경로를 제거합니다.

#### 1.1 Google Cloud Console

**절차**:
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택
3. **APIs & Services** > **Credentials** 이동
4. OAuth 2.0 Client ID 선택
5. **Authorized redirect URIs** 섹션에서 다음 URI 추가:
   - `http://localhost:5173/auth/callback/google` (로컬 개발용)
   - `https://{production-domain}/auth/callback/google` (배포용)

**예시**:
```
http://localhost:5173/auth/callback/google
https://choonsim-chat.vercel.app/auth/callback/google
```

#### 1.2 Kakao Developers

**절차**:
1. [Kakao Developers](https://developers.kakao.com/) 접속
2. 내 애플리케이션 선택
3. **제품 설정** > **카카오 로그인** 이동
4. **Redirect URI** 섹션에서 다음 URI 추가:
   - `http://localhost:5173/auth/callback/kakao` (로컬 개발용)
   - `https://{production-domain}/auth/callback/kakao` (배포용)

**예시**:
```
http://localhost:5173/auth/callback/kakao
https://choonsim-chat.vercel.app/auth/callback/kakao
```

#### 1.3 Twitter Developer Portal

**절차**:
1. [Twitter Developer Portal](https://developer.twitter.com/) 접속
2. 프로젝트 및 앱 선택
3. **App Settings** > **User authentication settings** 이동
4. **App info** 섹션에서 **Callback URI / Redirect URL** 수정:
   - `http://localhost:5173/auth/callback/twitter` (로컬 개발용)
   - `https://{production-domain}/auth/callback/twitter` (배포용)

**예시**:
```
http://localhost:5173/auth/callback/twitter
https://choonsim-chat.vercel.app/auth/callback/twitter
```

**참고**: Twitter는 여러 콜백 URI를 지원하므로, 기존 URI와 함께 새 URI를 추가할 수 있습니다.

### Phase 2: 환경 변수(Environment Variables) 제거

**목적**: Better Auth의 기본값을 사용하므로 `redirectURI` 환경 변수를 제거합니다.

**주의사항**: 환경 변수를 제거하기 전에, Better Auth가 기본값을 올바르게 사용하는지 확인해야 합니다.

#### 2.1 로컬 환경 (`.env.development` 또는 `.env.local`)

**제거할 환경 변수**:
```env
# 제거할 변수들
GOOGLE_REDIRECT_URL=http://localhost:5173/auth/google/callback
KAKAO_REDIRECT_URL=http://localhost:5173/auth/kakao/callback
TWITTER_REDIRECT_URL=http://localhost:5173/auth/twitter/callback
```

**변경 후**: 이 변수들을 제거하면 Better Auth가 자동으로 `/auth/callback/{provider}` 경로를 사용합니다.

#### 2.2 배포 환경 (Vercel Dashboard)

**절차**:
1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. 프로젝트 선택
3. **Settings** > **Environment Variables** 이동
4. 다음 환경 변수 삭제:
   - `GOOGLE_REDIRECT_URL`
   - `KAKAO_REDIRECT_URL`
   - `TWITTER_REDIRECT_URL`

**참고**: 환경 변수를 삭제한 후 Vercel 재배포가 필요할 수 있습니다.

#### 2.3 환경 변수 확인

**제거 후 확인 사항**:
- Better Auth가 기본 콜백 경로를 사용하는지 확인
- 소셜 로그인 시 올바른 리다이렉트 URI가 생성되는지 확인

### Phase 3: Better Auth 설정 코드 수정

**목적**: 라이브러리 초기화 로직에서 커스텀하게 정의된 콜백 경로 설정을 제거합니다.

**대상 파일**: `app/lib/auth.server.ts`

#### 3.1 현재 코드 상태

**현재 구현** (`app/lib/auth.server.ts`):
```typescript
socialProviders: {
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirectURI: process.env.GOOGLE_REDIRECT_URL, // 제거 필요
        // ...
    },
    twitter: {
        clientId: process.env.TWITTER_CLIENT_ID || "",
        clientSecret: process.env.TWITTER_CLIENT_SECRET || "",
        redirectURI: process.env.TWITTER_REDIRECT_URL, // 제거 필요
        // ...
    },
    kakao: {
        clientId: process.env.KAKAO_CLIENT_ID || "",
        clientSecret: process.env.KAKAO_CLIENT_SECRET || "",
        redirectURI: process.env.KAKAO_REDIRECT_URL, // 제거 필요
        // ...
    },
}
```

#### 3.2 수정 후 코드

**변경 사항**: `redirectURI` 속성 제거

```typescript
socialProviders: {
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        // redirectURI 제거 - Better Auth가 자동으로 /auth/callback/google 사용
        overrideUserInfoOnSignIn: true,
        mapProfileToUser: (profile) => {
            // ... 기존 코드 유지 ...
        },
    },
    twitter: {
        clientId: process.env.TWITTER_CLIENT_ID || "",
        clientSecret: process.env.TWITTER_CLIENT_SECRET || "",
        // redirectURI 제거 - Better Auth가 자동으로 /auth/callback/twitter 사용
        overrideUserInfoOnSignIn: true,
        // ... 기존 코드 유지 ...
    },
    kakao: {
        clientId: process.env.KAKAO_CLIENT_ID || "",
        clientSecret: process.env.KAKAO_CLIENT_SECRET || "",
        // redirectURI 제거 - Better Auth가 자동으로 /auth/callback/kakao 사용
        overrideUserInfoOnSignIn: true,
        // ... 기존 코드 유지 ...
    },
}
```

#### 3.3 Better Auth 기본 동작 확인

**기본 콜백 경로 생성 규칙**:
- `basePath`가 `/auth`로 설정되어 있으므로
- 기본 콜백 경로는 `{basePath}/callback/{provider}` = `/auth/callback/{provider}`
- `redirectURI`를 지정하지 않으면 자동으로 이 경로 사용

### Phase 4: 라우팅 설정 간소화 및 불필요 파일 제거

**목적**: 표준 경로를 사용하게 됨에 따라, 더 이상 커스텀 콜백 핸들러가 필요하지 않습니다.

#### 4.1 `app/routes.ts` 수정

**현재 코드** (`app/routes.ts`):
```typescript
// OAuth 콜백 라우트 (Better Auth와의 경로 매핑을 위한 별도 파일)
route("auth/google/callback", "routes/auth/google/callback.ts"),
route("auth/kakao/callback", "routes/auth/kakao/callback.ts"),
route("auth/twitter/callback", "routes/auth/twitter/callback.ts"),
route("auth/*", "routes/api/auth/$.ts"), // Better Auth의 다른 경로들
```

**수정 후 코드**:
```typescript
// OAuth 콜백 라우트 제거 - Better Auth가 직접 /auth/callback/{provider} 처리
route("auth/*", "routes/api/auth/$.ts"), // Better Auth의 모든 경로 처리
```

**변경 사항**:
- 커스텀 콜백 라우트 3개 제거
- `auth/*` 와일드카드 라우트가 `/auth/callback/{provider}`도 처리하도록 유지

#### 4.2 불필요한 파일 삭제

**삭제할 파일 목록**:
- `app/routes/auth/google/callback.ts`
- `app/routes/auth/kakao/callback.ts`
- `app/routes/auth/twitter/callback.ts`

**삭제 전 확인 사항**:
- [ ] Phase 1-3이 완료되었는지 확인
- [ ] 로컬에서 소셜 로그인이 정상 작동하는지 확인
- [ ] Git 커밋을 통해 변경사항 백업

**삭제 명령어**:
```bash
rm app/routes/auth/google/callback.ts
rm app/routes/auth/kakao/callback.ts
rm app/routes/auth/twitter/callback.ts
```

### Phase 5: 클라이언트 사이드 로그인 트리거 확인

**목적**: 로그인 버튼 클릭 시 호출되는 핸들러에서 리다이렉트 주소와 관련된 하드코딩된 경로가 있는지 확인하고 수정합니다.

#### 5.1 현재 코드 확인

**대상 파일**: `app/routes/login.tsx`

**현재 구현**:
```typescript
const { data, error: socialError } = await signIn.social({
    provider: provider as any,
    callbackURL: "/onboarding", // 로그인 후 리다이렉트 경로 (변경 불필요)
});
```

**확인 사항**:
- `callbackURL`은 로그인 성공 후 이동할 페이지 경로이므로 변경 불필요
- OAuth 콜백 경로와는 별개의 개념
- Better Auth 클라이언트가 자동으로 올바른 콜백 경로를 사용

#### 5.2 추가 확인 사항

**검색할 패턴**:
- 하드코딩된 `/auth/{provider}/callback` 경로
- 환경 변수를 사용한 리다이렉트 URL 설정

**검색 명령어**:
```bash
grep -r "auth/google/callback\|auth/kakao/callback\|auth/twitter/callback" app/
grep -r "GOOGLE_REDIRECT_URL\|KAKAO_REDIRECT_URL\|TWITTER_REDIRECT_URL" app/
```

**예상 결과**: 
- 환경 변수 참조는 `app/lib/auth.server.ts`에만 있어야 함 (Phase 3에서 제거 예정)
- 다른 파일에서는 발견되지 않아야 함

---

## 3. 검증 및 테스트 (Verification)

### 3.1 Phase별 검증 체크리스트

#### Phase 1 검증: 외부 플랫폼 설정
- [ ] Google Cloud Console에 새 리다이렉트 URI 추가 완료
- [ ] Kakao Developers에 새 리다이렉트 URI 추가 완료
- [ ] Twitter Developer Portal에 새 리다이렉트 URI 추가 완료
- [ ] 각 플랫폼의 개발자 콘솔에서 URI 형식 확인 (오타 없음)

#### Phase 2 검증: 환경 변수 제거
- [ ] 로컬 `.env` 파일에서 `*_REDIRECT_URL` 변수 제거 확인
- [ ] Vercel Dashboard에서 환경 변수 제거 확인
- [ ] 환경 변수 제거 후 애플리케이션 재시작

#### Phase 3 검증: 코드 수정
- [ ] `app/lib/auth.server.ts`에서 `redirectURI` 속성 제거 확인
- [ ] TypeScript 컴파일 오류 없음 확인
- [ ] 빌드 성공 확인 (`npm run build`)

#### Phase 4 검증: 라우팅 및 파일 삭제
- [ ] `app/routes.ts`에서 커스텀 콜백 라우트 제거 확인
- [ ] 불필요한 콜백 파일 삭제 확인
- [ ] Git 상태 확인 (변경사항 추적)

#### Phase 5 검증: 클라이언트 사이드
- [ ] 하드코딩된 경로 없음 확인
- [ ] 로그인 버튼 클릭 시 올바른 동작 확인

### 3.2 로컬 검증 (Local Test)

**테스트 환경**:
- 개발 서버: `http://localhost:5173`
- 각 소셜 제공자별로 테스트

**테스트 절차**:
1. `npm run dev` 실행
2. 각 소셜 제공자별로 로그인 시도:
   - [ ] Google 로그인 정상 작동
   - [ ] Kakao 로그인 정상 작동
   - [ ] Twitter 로그인 정상 작동
3. 인증 후 확인:
   - [ ] 세션이 올바르게 생성됨
   - [ ] `callbackURL`로 지정한 페이지로 리다이렉트됨 (예: `/onboarding`)
   - [ ] 사용자 정보가 올바르게 저장됨

**브라우저 개발자 도구 확인**:
- Network 탭에서 리다이렉트 URI 확인:
  - `http://localhost:5173/auth/callback/{provider}` 형식인지 확인
  - 기존 `/auth/{provider}/callback` 경로로 요청되지 않는지 확인

### 3.3 배포 환경 검증 (Production Test)

**테스트 환경**:
- 배포 도메인: `https://{production-domain}`
- Vercel 배포 완료 후 테스트

**테스트 절차**:
1. Vercel에 배포 완료 확인
2. 각 소셜 제공자별로 로그인 시도:
   - [ ] Google 로그인 정상 작동
   - [ ] Kakao 로그인 정상 작동
   - [ ] Twitter 로그인 정상 작동
3. 에러 확인:
   - [ ] 개발자 콘솔에 에러 없음
   - [ ] `redirect_uri_mismatch` 에러 없음
   - [ ] 네트워크 요청 성공 (200 OK)

**Vercel 로그 확인**:
- [ ] 인증 관련 에러 로그 없음
- [ ] 리다이렉트 URI 관련 에러 없음

### 3.4 롤백 계획

**문제 발생 시 롤백 절차**:
1. **즉시 롤백** (긴급 상황):
   ```bash
   git revert HEAD
   # 또는
   git reset --hard HEAD~1
   ```

2. **환경 변수 복원**:
   - Vercel Dashboard에서 환경 변수 재추가
   - 로컬 `.env` 파일에 환경 변수 재추가

3. **외부 플랫폼 설정 복원**:
   - 기존 리다이렉트 URI가 유지되어 있으면 그대로 사용
   - 새 URI는 삭제하지 말고 유지 (나중에 다시 사용 가능)

4. **코드 복원**:
   - `app/lib/auth.server.ts`에 `redirectURI` 재추가
   - `app/routes.ts`에 커스텀 콜백 라우트 재추가
   - 삭제한 콜백 파일 복원 (Git에서)

**롤백 결정 기준**:
- 소셜 로그인이 전혀 작동하지 않을 때
- `redirect_uri_mismatch` 에러가 지속될 때
- 사용자 인증이 불가능한 상태일 때

---

## 4. 기대 효과

### 4.1 코드 간결화
- **불필요한 파일 제거**: 3개의 커스텀 콜백 핸들러 파일 제거
- **설정 간소화**: 환경 변수 3개 제거 (`GOOGLE_REDIRECT_URL`, `KAKAO_REDIRECT_URL`, `TWITTER_REDIRECT_URL`)
- **코드 라인 수 감소**: 약 100줄 이상의 코드 제거 예상

### 4.2 안정성 향상
- **표준 흐름 준수**: Better Auth 라이브러리가 보장하는 표준 흐름 준수
- **유지보수성 향상**: 라이브러리 업데이트 시 호환성 문제 감소
- **버그 위험 감소**: 커스텀 경로 매핑 로직 제거로 버그 가능성 감소

### 4.3 개발자 경험 개선
- **문서화 일치**: 라이브러리 공식 문서와 프로젝트 코드 구조의 일치로 학습 곡선 완화
- **직관적 구조**: 표준 경로 사용으로 코드 이해도 향상
- **확장성**: 새로운 소셜 제공자 추가 시 설정 최소화

### 4.4 운영 효율성
- **환경 변수 관리 간소화**: 환경 변수 수 감소로 관리 부담 감소
- **배포 안정성**: 환경 변수 설정 오류 가능성 감소
- **디버깅 용이성**: 표준 경로 사용으로 문제 추적 용이

---

## 5. 주의사항 및 리스크 관리

### 5.1 주의사항

**중요**: 
- Phase 1(외부 플랫폼 설정)을 먼저 완료해야 함
- 기존 리다이렉트 URI를 삭제하지 말고 새 URI를 추가만 함
- 모든 Phase 완료 후 기존 URI 제거 고려

**환경 변수 제거 시**:
- Better Auth가 기본값을 올바르게 사용하는지 확인 필요
- 환경 변수 제거 후 애플리케이션 재시작 필요

**파일 삭제 시**:
- Git 커밋을 통해 변경사항 백업
- 삭제 전 로컬 테스트 완료

### 5.2 리스크 관리

**리스크 1: 외부 플랫폼 설정 오류**
- **확률**: 중간
- **영향**: 소셜 로그인 실패
- **대응**: Phase 1에서 URI 형식 정확히 확인, 테스트 필수

**리스크 2: 환경 변수 제거 후 기본값 미적용**
- **확률**: 낮음
- **영향**: Better Auth가 콜백 경로를 찾지 못함
- **대응**: Phase 3에서 `basePath` 설정 확인, 로컬 테스트 필수

**리스크 3: 라우팅 충돌**
- **확률**: 매우 낮음
- **영향**: 인증 요청 처리 실패
- **대응**: Phase 4에서 `auth/*` 와일드카드 라우트 확인

### 5.3 문제 해결 가이드

**문제 1: `redirect_uri_mismatch` 에러**
- **원인**: 외부 플랫폼에 등록된 URI와 실제 요청 URI 불일치
- **해결**: Phase 1에서 URI 형식 재확인, 포트 번호 확인

**문제 2: 콜백 핸들러를 찾을 수 없음**
- **원인**: 라우팅 설정 오류 또는 파일 삭제 시점 문제
- **해결**: Phase 4에서 `auth/*` 라우트 확인, Better Auth 핸들러 확인

**문제 3: 환경 변수 제거 후 빌드 실패**
- **원인**: 코드에서 여전히 환경 변수 참조
- **해결**: Phase 3에서 모든 `redirectURI` 제거 확인

---

## 6. 구현 상태 추적

### 6.1 현재 상태

**Phase 1: 외부 플랫폼 설정 업데이트**
- [x] Google Cloud Console 설정 완료
- [x] Kakao Developers 설정 완료
- [x] Twitter Developer Portal 설정 완료

**Phase 2: 환경 변수 제거**
- [x] 로컬 환경 변수 제거 완료
- [x] Vercel 환경 변수 제거 완료

**Phase 3: Better Auth 설정 코드 수정**
- [x] `app/lib/auth.server.ts` 수정 완료
- [x] 빌드 성공 확인

**Phase 4: 라우팅 설정 간소화 및 파일 제거**
- [x] `app/routes.ts` 수정 완료
- [x] 불필요한 파일 삭제 완료

**Phase 5: 클라이언트 사이드 확인**
- [x] 하드코딩된 경로 확인 완료
- [x] 로그인 트리거 확인 완료

### 6.2 완료 기준

모든 Phase가 완료되고 다음 조건을 만족해야 합니다:
- [ ] 로컬에서 모든 소셜 로그인 정상 작동
- [ ] 배포 환경에서 모든 소셜 로그인 정상 작동
- [ ] 에러 로그 없음
- [ ] 코드 리뷰 완료
- [ ] 문서 업데이트 완료

---

## 7. 참고 자료

### 7.1 관련 문서
- [Better Auth 공식 문서](https://www.better-auth.com/docs)
- [Better Auth Social Providers](https://www.better-auth.com/docs/guides/social-providers)
- [React Router v7 문서](https://reactrouter.com/)

### 7.2 프로젝트 내 관련 파일
- `app/lib/auth.server.ts`: Better Auth 서버 설정
- `app/lib/auth-client.ts`: Better Auth 클라이언트 설정
- `app/routes.ts`: 라우팅 설정
- `app/routes/login.tsx`: 로그인 페이지
- `app/routes/auth/{provider}/callback.ts`: 커스텀 콜백 핸들러 (제거 예정)

### 7.3 외부 플랫폼 링크
- [Google Cloud Console](https://console.cloud.google.com/)
- [Kakao Developers](https://developers.kakao.com/)
- [Twitter Developer Portal](https://developer.twitter.com/)

---

**문서 버전**: 2.0  
**작성일**: 2026-01-09  
**최종 업데이트**: 2026-01-20  
**작성자**: Antigravity (AI Assistant)
