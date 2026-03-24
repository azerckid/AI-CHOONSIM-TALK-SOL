# 배포 환경 어드민 페이지 접근 불가 점검

> Created: 2026-02-11  
> Last Updated: 2026-02-11  

**증상**: 로컬(`http://localhost:5173/admin/dashboard`)에서는 특정 계정(예: azerc coder)으로 어드민 접근 가능한데, 배포판에서는 동일 계정으로 어드민 페이지 접근 불가 (403 Forbidden 등).

---

## 1. 어드민 판별 조건 (코드 기준)

**파일**: `apps/web/app/lib/auth.server.ts`

어드민 접근은 다음 **둘 중 하나**로 허용됩니다.

| 조건 | 설명 |
|------|------|
| **ADMIN_EMAILS** | 환경 변수 `ADMIN_EMAILS`(쉼표 구분)에 **해당 사용자 이메일**이 포함되어 있으면 Super Admin 처리. |
| **User.role** | DB의 `User.role`이 `'ADMIN'`이면 Admin 처리. |

`requireAdmin(request)`는 세션 사용자에 대해 위 조건을 검사하고, 하나도 만족하지 않으면 **403 Forbidden**을 반환합니다.

---

## 2. 로컬에서만 되는 이유

- **로컬**: `.env.development`에 `ADMIN_EMAILS=해당이메일@...` 가 있거나, **로컬 DB**에서 해당 유저의 `role`이 `ADMIN`으로 설정되어 있음 (예: `scripts/set-admin.mjs` 실행).
- **배포**: **배포 DB**와 **Vercel 환경 변수**는 로컬과 별도이므로, 위 두 가지가 배포 쪽에 설정되지 않으면 어드민 접근 불가.

---

## 3. 배포에서 접근 가능하게 하는 방법

### 방법 A: Vercel에 ADMIN_EMAILS 설정 (권장)

1. Vercel 대시보드 → 해당 프로젝트 → **Settings** → **Environment Variables**
2. **Key**: `ADMIN_EMAILS`
3. **Value**: 어드민으로 쓸 이메일 (배포에서 로그인하는 계정 이메일). 여러 명이면 쉼표로 구분 (예: `admin@example.com,azerckid@gmail.com`).
4. **Environment**: Production (및 필요 시 Preview) 선택 후 Save.
5. 환경 변수만 추가한 경우 대부분 재배포 없이 반영됨. 변경 후에도 403이면 한 번 재배포.

### 방법 B: 배포 DB에서 해당 유저 role을 ADMIN으로 설정

1. **배포 DB**용 연결 정보 준비: 프로덕션용 `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` (Vercel에 설정된 값과 동일).
2. 로컬 터미널에서 배포 DB 대상으로 스크립트 실행:
   ```bash
   cd apps/web
   TURSO_DATABASE_URL="<프로덕션_URL>" TURSO_AUTH_TOKEN="<프로덕션_토큰>" node scripts/set-admin.mjs "로그인_이메일@example.com"
   ```
3. 해당 유저의 `User.role`이 `ADMIN`으로 바뀌면, 배포 환경에서도 어드민 접근 가능.

---

## 4. 확인 요약

| 확인 항목 | 로컬 | 배포 |
|-----------|------|------|
| ADMIN_EMAILS에 해당 이메일 포함 여부 | .env.development 확인 | Vercel Environment Variables 확인 |
| User.role = 'ADMIN' 여부 | 로컬 DB에서 확인 | 배포 DB에서 확인 (방법 B 적용 시) |

**한 줄**: 배포에서도 어드민 접근을 쓰려면 Vercel에 `ADMIN_EMAILS`에 해당 이메일을 넣거나, 배포 DB에서 그 유저의 `role`을 `ADMIN`으로 설정하면 됩니다.

---

## Related Documents

- **Logic**: [00_BACKLOG.md](./00_BACKLOG.md) — Admin 지정 관련 `set-admin.mjs` 참조
- **Auth**: `apps/web/app/lib/auth.server.ts` — `getAdminEmails`, `isAdmin`, `requireAdmin`
