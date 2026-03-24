# Vercel 배포 전 체크리스트

이 문서는 Vercel에 배포하기 전에 확인해야 할 사항들을 정리합니다.

---

## 1. 환경 변수 설정 ⚠️ 필수

Vercel 대시보드 → 프로젝트 → Settings → Environment Variables에서 다음 환경 변수들을 설정해야 합니다.

### 1.1 데이터베이스
- `TURSO_DATABASE_URL`: Turso 데이터베이스 URL
- `TURSO_AUTH_TOKEN`: Turso 인증 토큰

### 1.2 인증 (Better Auth)
- `BETTER_AUTH_SECRET`: Better Auth 세션 암호화용 시크릿 키 (랜덤 문자열, 최소 32자)
- `BETTER_AUTH_URL`: 프로덕션 URL (예: `https://your-domain.vercel.app`)
- `GOOGLE_CLIENT_ID`: Google OAuth 클라이언트 ID (소셜 로그인 사용 시)
- `GOOGLE_CLIENT_SECRET`: Google OAuth 클라이언트 시크릿 (소셜 로그인 사용 시)
- `TWITTER_CLIENT_ID`: X/Twitter OAuth 클라이언트 ID (X/Twitter 로그인 사용 시)
- `TWITTER_CLIENT_SECRET`: X/Twitter OAuth 클라이언트 시크릿 (X/Twitter 로그인 사용 시)

### 1.3 AI (Gemini)
- `GEMINI_API_KEY` 또는 `GOOGLE_API_KEY`: Google Gemini API 키

### 1.4 미디어 (Cloudinary)
- `CLOUDINARY_CLOUD_NAME`: Cloudinary 클라우드 이름
- `CLOUDINARY_API_KEY`: Cloudinary API 키
- `CLOUDINARY_API_SECRET`: Cloudinary API 시크릿

### 1.5 웹 푸시 (선택사항)
- `VAPID_PUBLIC_KEY`: 웹 푸시 VAPID 공개 키
- `VAPID_PRIVATE_KEY`: 웹 푸시 VAPID 개인 키
- `VAPID_SUBJECT`: 웹 푸시 VAPID subject (mailto: URL)

### 1.6 환경 변수 설정 팁
- 모든 환경 변수는 Production, Preview, Development 환경 모두에 설정 권장
- `BETTER_AUTH_SECRET`은 반드시 안전한 랜덤 문자열로 생성 (예: `openssl rand -base64 32`)
- `BETTER_AUTH_URL`은 배포 후 실제 도메인으로 변경 필요

---

## 2. 빌드 설정 확인

### 2.1 package.json 스크립트
✅ 다음 스크립트가 올바르게 설정되어 있는지 확인:
```json
{
  "scripts": {
    "build": "react-router build",
    "start": "react-router-serve ./build/server/index.js"
  }
}
```

### 2.2 Prisma 클라이언트 생성
✅ `package.json`에 `postinstall` 스크립트 추가 필요:
```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

**중요**: Vercel은 빌드 시 `npm install` 후 자동으로 `postinstall` 스크립트를 실행하므로, Prisma 클라이언트가 자동으로 생성됩니다.

---

## 3. 데이터베이스 준비

### 3.1 Turso 데이터베이스
- ✅ Turso 데이터베이스가 생성되어 있고 접근 가능한지 확인
- ✅ `session` 테이블의 `token` 필드에 unique 인덱스가 추가되었는지 확인
- ✅ 필요한 모든 테이블이 생성되어 있는지 확인

### 3.2 마이그레이션
- ✅ 로컬에서 마이그레이션이 모두 완료되었는지 확인
- ✅ Turso DB에 모든 스키마 변경사항이 반영되었는지 확인

---

## 4. 크론 잡 (Cron Jobs) ⚠️ 중요

### 4.1 문제점
현재 코드에서 `node-cron`을 사용하는 크론 잡(`app/lib/cron.server.ts`)이 있습니다. **Vercel의 Serverless 환경에서는 `node-cron`이 작동하지 않습니다.**

### 4.2 해결 방안

**옵션 A: Vercel Cron Jobs 사용 (권장)**
- Vercel의 Cron Jobs 기능을 사용하여 API 엔드포인트를 주기적으로 호출
- `vercel.json`에 cron 설정 추가:
```json
{
  "crons": [{
    "path": "/api/cron/check-in",
    "schedule": "* * * * *"
  }]
}
```
- 크론 잡 로직을 API 엔드포인트로 이동

**옵션 B: 크론 잡 비활성화**
- 프로덕션 환경에서 크론 잡 초기화를 건너뛰도록 코드 수정
- 또는 별도 서버에서 크론 잡 실행

**옵션 C: 외부 크론 서비스 사용**
- GitHub Actions, EasyCron, cron-job.org 등 외부 서비스 사용

### 4.3 임시 조치
배포 전에 크론 잡 초기화를 비활성화하려면 `app/lib/db.server.ts`에서 프로덕션 환경에서는 크론 잡을 실행하지 않도록 수정:

```typescript
if (process.env.NODE_ENV === "production") {
    prisma = new PrismaClient({ adapter });
    // initCronJobs(); // Vercel에서는 크론 잡이 작동하지 않으므로 주석 처리
} else {
    // ...
}
```

---

## 5. Better Auth 설정

### 5.1 baseURL 설정
- ✅ `app/lib/auth-client.ts`에서 `baseURL`이 올바르게 설정되어 있는지 확인
- 프로덕션에서는 `window.location.origin`이 자동으로 올바른 URL을 사용

### 5.2 OAuth 콜백 URL
- ✅ Google OAuth 사용 시, Google Cloud Console에서 콜백 URL 추가 필요:
  - 프로덕션: `https://your-domain.vercel.app/auth/callback/google`
  - 개발: `http://localhost:5173/auth/callback/google`
- ✅ X/Twitter OAuth 사용 시, Twitter Developer Portal에서 콜백 URL 추가 필요:
  - 프로덕션: `https://your-domain.vercel.app/auth/callback/twitter`
  - 개발: `http://localhost:5173/auth/callback/twitter`

---

## 6. 정적 파일 및 빌드 출력

### 6.1 public 폴더
- ✅ `public/` 폴더의 파일들이 올바르게 설정되어 있는지 확인
- Service Worker (`public/sw.js`) 등

### 6.2 빌드 출력
- ✅ `.gitignore`에 `build/` 폴더가 포함되어 있는지 확인 (Vercel에서 자동 빌드)

---

## 7. Vercel 프로젝트 설정

### 7.1 Framework Preset
- ✅ Vercel에서 Framework Preset을 "Other" 또는 "Vite"로 설정
- 또는 자동 감지에 맡김

### 7.2 Build Command
- ✅ Build Command: `npm run build` (기본값)

### 7.3 Output Directory
- ✅ Output Directory: React Router v7은 서버 빌드를 사용하므로 설정 불필요 (자동 감지)

### 7.4 Install Command
- ✅ Install Command: `npm install` (기본값)

### 7.5 Node.js Version
- ✅ Node.js Version: 18.x 이상 권장 (Vercel 기본값: 18.x)

---

## 8. 보안 및 성능

### 8.1 환경 변수 보안
- ✅ 민감한 정보(API 키, 시크릿)는 환경 변수로만 관리
- ✅ `.env` 파일은 Git에 커밋하지 않음 (`.gitignore` 확인)

### 8.2 CORS 설정
- ✅ 필요 시 CORS 설정 확인 (Better Auth는 자동으로 처리)

### 8.3 Rate Limiting
- ✅ API 엔드포인트에 Rate Limiting 적용 고려 (Vercel의 제한 또는 미들웨어 사용)

---

## 9. 테스트 체크리스트

배포 전에 로컬에서 다음을 테스트:

- ✅ `npm run build`가 성공적으로 완료되는지 확인
- ✅ 빌드된 앱이 로컬에서 실행되는지 확인 (`npm run start`)
- ✅ 환경 변수가 모두 설정되었을 때 앱이 정상 작동하는지 확인
- ✅ 데이터베이스 연결이 정상인지 확인
- ✅ 인증 로그인이 작동하는지 확인
- ✅ AI 응답 생성이 작동하는지 확인
- ✅ 이미지 업로드가 작동하는지 확인

---

## 10. 배포 후 확인 사항

배포 완료 후 다음을 확인:

- ✅ 홈페이지가 정상적으로 로드되는지 확인
- ✅ 로그인이 작동하는지 확인
- ✅ 데이터베이스 연결이 정상인지 확인 (Vercel 로그 확인)
- ✅ API 엔드포인트가 정상 작동하는지 확인
- ✅ 정적 파일이 올바르게 서빙되는지 확인
- ✅ 환경 변수가 모두 올바르게 설정되었는지 확인 (Vercel 로그에서 확인)
- ✅ 에러가 없는지 Vercel 로그 확인

---

## 11. 문제 해결

### 11.1 빌드 실패
- Vercel 로그에서 에러 메시지 확인
- 로컬에서 `npm run build` 테스트
- Prisma 클라이언트 생성 문제 확인

### 11.2 데이터베이스 연결 실패
- 환경 변수 `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` 확인
- Turso 대시보드에서 데이터베이스 상태 확인

### 11.3 인증 오류
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` 확인
- OAuth 콜백 URL 확인

### 11.4 크론 잡 오류
- Vercel 로그에서 크론 관련 에러 확인
- 크론 잡이 비활성화되었는지 확인

---

## 12. 권장 배포 순서

1. **환경 변수 설정**: Vercel 대시보드에서 모든 환경 변수 설정
2. **크론 잡 처리**: 프로덕션에서 크론 잡 비활성화 또는 Vercel Cron Jobs로 대체
3. **로컬 빌드 테스트**: `npm run build` 성공 확인
4. **Git 커밋**: 모든 변경사항 커밋 및 푸시
5. **Vercel 배포**: Git 저장소 연결 후 자동 배포 또는 수동 배포
6. **배포 후 테스트**: 위의 "배포 후 확인 사항" 체크
7. **모니터링**: Vercel 로그에서 에러 확인

---

## 참고 자료

- [Vercel 환경 변수 문서](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vercel Cron Jobs 문서](https://vercel.com/docs/cron-jobs)
- [React Router v7 배포 가이드](https://reactrouter.com/start/deploy)
- [Better Auth 배포 가이드](https://www.better-auth.com/docs/deployment)

