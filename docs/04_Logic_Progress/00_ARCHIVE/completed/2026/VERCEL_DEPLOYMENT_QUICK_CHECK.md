# Vercel 배포 빠른 체크리스트

## ⚠️ 필수 확인 사항

### 1. 환경 변수 (Vercel 대시보드 → Settings → Environment Variables)

필수 환경 변수:
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `BETTER_AUTH_SECRET` (랜덤 문자열, 최소 32자)
- `BETTER_AUTH_URL` (배포 후 실제 URL로 변경)
- `GEMINI_API_KEY` 또는 `GOOGLE_API_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

선택적:
- `GOOGLE_CLIENT_ID` (Google 로그인 사용 시)
- `GOOGLE_CLIENT_SECRET` (Google 로그인 사용 시)
- `TWITTER_CLIENT_ID` (X/Twitter 로그인 사용 시)
- `TWITTER_CLIENT_SECRET` (X/Twitter 로그인 사용 시)
- `VAPID_PUBLIC_KEY` (웹 푸시 사용 시)
- `VAPID_PRIVATE_KEY` (웹 푸시 사용 시)

### 2. 크론 잡 문제 ⚠️ 중요

**문제**: `node-cron`은 Vercel의 serverless 환경에서 작동하지 않습니다.

**임시 해결책**: `app/lib/db.server.ts`에서 프로덕션 환경에서 크론 잡 비활성화:

```typescript
if (process.env.NODE_ENV === "production") {
    prisma = new PrismaClient({ adapter });
    // initCronJobs(); // Vercel에서는 크론 잡이 작동하지 않으므로 주석 처리
}
```

**향후 해결책**: Vercel Cron Jobs API 엔드포인트로 전환

### 3. Prisma 클라이언트 생성

`package.json`에 `postinstall` 스크립트 추가 권장 (React Router v7은 자동 처리하지만, 명시적으로 추가하는 것이 안전):

```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

### 4. 로컬 빌드 테스트

배포 전에 반드시 로컬에서 테스트:
```bash
npm run build
npm run start
```

### 5. 데이터베이스 준비

- ✅ Turso DB에 `session.token` unique 인덱스가 추가되었는지 확인
- ✅ 모든 테이블이 생성되어 있는지 확인

### 6. Better Auth OAuth 콜백 URL

Google OAuth 사용 시:
- Google Cloud Console → OAuth 2.0 클라이언트 → 승인된 리디렉션 URI에 추가:
  - `https://your-domain.vercel.app/auth/callback/google`
  - 개발: `http://localhost:5173/auth/callback/google`

X/Twitter OAuth 사용 시:
- Twitter Developer Portal → Project → App → Authentication Settings → Callback URLs에 추가:
  - `https://your-domain.vercel.app/auth/callback/twitter`
  - 개발: `http://localhost:5173/auth/callback/twitter`

---

## 빠른 배포 순서

1. 환경 변수 설정 (Vercel 대시보드)
2. 크론 잡 비활성화 (선택사항, 임시)
3. 로컬 빌드 테스트: `npm run build`
4. Git 커밋 & 푸시
5. Vercel에 배포
6. 배포 후 테스트 및 로그 확인

---

자세한 내용은 `docs/VERCEL_DEPLOYMENT_CHECKLIST.md` 참고

