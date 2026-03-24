# Vercel 배포 404 NOT_FOUND 점검 체크리스트

> Created: 2026-03-03  
> Last Updated: 2026-03-03

**증상**: 로컬에서는 정상인데 Vercel 배포 URL 루트(`https://chat-bot-choonsim.vercel.app`) 접속 시 `404: NOT_FOUND` 발생.

**원인 요약**: Vercel이 앱 진입점(Root Directory) 또는 빌드 결과를 잘못 인식해 루트 경로(/) 요청을 처리하지 못함.

---

## 1. 필수 확인 (Vercel 대시보드)

### 1.1 Root Directory

- **설정 위치**: Project → Settings → General → Root Directory  
- **권장값**: `apps/web`  
- **이유**: 이 프로젝트는 모노레포이며, 실제 앱과 `react-router build`·`vercelPreset()` 설정은 `apps/web`에 있음. Root를 저장소 루트로 두면 빌드/출력 경로가 어긋나 404가 날 수 있음.
- **조치**: Root Directory를 비우지 말고 `apps/web`로 설정 후 재배포.

### 1.2 Build and Output Settings

- **Build Command**: `npm run build` (또는 `npx react-router build`)  
  - Root Directory가 `apps/web`이면 해당 디렉터리에서 실행되며 `package.json`의 `"build": "react-router build"`가 사용됨.
- **Output Directory**: 비워두기. `@vercel/react-router`의 `vercelPreset()`이 빌드 시 출력 구조를 지정함.
- **Install Command**: `npm install` (기본값 유지).

### 1.3 Framework Preset

- **Framework Preset**: Vite 또는 Other.  
- Root를 `apps/web`로 두면 `react-router.config.ts`의 `vercelPreset()`이 빌드에 반영됨.

---

## 2. 체크리스트

- [ ] Root Directory = `apps/web`
- [ ] Build Command = `npm run build` (또는 명시적으로 `npx react-router build`)
- [ ] Output Directory = 비움 (preset 사용)
- [ ] 위 변경 후 **Redeploy** (Deployments → … → Redeploy)

---

## 3. 재배포 후에도 404일 때

- Vercel → Deployments → 해당 배포 → **Build Logs**에서 빌드가 성공했는지, 오류 로그가 없는지 확인.
- **Runtime Logs**에서 루트(/) 요청 시 어떤 함수/경로가 호출되는지 확인.
- Node.js 버전: `apps/web` 또는 루트 `package.json`의 `engines.node`(예: `>=20.0.0`)와 Vercel의 Node 버전이 맞는지 확인 (Settings → General → Node.js Version).

---

## 4. Related Documents

- **Logic_Progress**: [00_BACKLOG.md](./00_BACKLOG.md)  
- **Root**: AGENTS.md — 배포 Root Directory를 App Directory(`apps/web`)로 지정
