# 캐릭터 사진 관리 가이드
> Created: 2026-02-08
> Last Updated: 2026-02-08

캐릭터들이 채팅에서 보낼 수 있는 사진을 생성하고 관리하는 방법입니다.

## 📸 사진 생성 방법

### 1. AI 이미지 생성 도구 사용 (추천)

다음 도구들을 사용하여 캐릭터 사진을 생성할 수 있습니다:

- **DALL-E 3/4** (OpenAI): https://openai.com/dall-e-3
- **Midjourney**: https://midjourney.com
- **Stable Diffusion**: https://stability.ai
- **Leonardo.ai**: https://leonardo.ai
- **Playground AI**: https://playground.ai

#### 프롬프트 예시

```
춘심 캐릭터의 일상 사진, 귀여운 여성, 친근한 표정, 자연스러운 포즈, 
고품질 일러스트, 밝은 색감, 깔끔한 배경

[캐릭터 이름] 캐릭터의 셀카, 일상적인 옷차림, 따뜻한 분위기, 
고해상도, 아름다운 조명
```

### 2. 직접 제작

- 일러스트레이터/디자이너가 직접 제작
- 사진 촬영 (실사 캐릭터인 경우)
- 3D 모델 렌더링

### 3. 외부 이미지 호스팅

- 기존에 호스팅된 이미지 URL 사용
- 이미지 CDN 서비스 활용

## 📤 사진 업로드 및 관리

### 방법 1: 스크립트 사용 (자동화)

프로젝트에 포함된 스크립트를 사용하여 자동으로 업로드하고 `characters.ts`를 업데이트할 수 있습니다.

```bash
# 환경 변수 설정 확인 (.env 파일)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# 스크립트 실행
node scripts/upload-character-photos.mjs <characterId> <photoPath1> [photoPath2] ...

# 예시
node scripts/upload-character-photos.mjs chunsim ./photos/chunsim-1.jpg ./photos/chunsim-2.jpg
node scripts/upload-character-photos.mjs mina ./photos/mina-1.jpg
```

**지원하는 캐릭터 ID:**
- `chunsim` - 춘심
- `mina` - 미나
- `yuna` - 유나
- `sora` - 소라
- `rina` - 리나
- `hana` - 하나

### 방법 2: 수동 업로드

1. **Cloudinary 대시보드에서 업로드**
   - https://cloudinary.com/console 접속
   - `chunsim-chat/characters/{characterId}/` 폴더에 업로드
   - 업로드된 이미지의 URL 복사

2. **characters.ts 파일 수정**
   ```typescript
   photoGallery: [
       "https://res.cloudinary.com/.../chunsim-photo1.jpg",
       "https://res.cloudinary.com/.../chunsim-photo2.jpg",
   ],
   ```

### 방법 3: API 엔드포인트 사용

기존 `/api/upload` 엔드포인트를 사용하여 업로드할 수도 있습니다:

```bash
curl -X POST http://localhost:5173/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@./photos/chunsim-1.jpg"
```

## 🎯 AI가 사진을 보내는 방법

AI가 대화 중에 `[PHOTO:index]` 마커를 사용하면 자동으로 해당 인덱스의 사진이 전송됩니다.

### 예시

- `[PHOTO:0]` → `photoGallery[0]` 이미지 전송
- `[PHOTO:1]` → `photoGallery[1]` 이미지 전송
- `[PHOTO:2]` → `photoGallery[2]` 이미지 전송

### AI 프롬프트 가이드라인

AI 프롬프트에 이미 사진 전송 기능이 포함되어 있습니다:

```
사진 전송 기능:
- 사용자에게 사진을 보여주고 싶을 때는 메시지에 [PHOTO:0] 형식의 마커를 포함하세요.
- 예시: "오늘 찍은 사진 보여줄게 [PHOTO:0] 어때?"
- 마커는 반드시 메시지 끝이나 중간에 자연스럽게 포함하세요.
- 사진을 보낼 때는 반드시 사진에 대한 설명도 함께 해주세요.
```

## 📁 파일 구조

```
app/lib/characters.ts          # 캐릭터 정의 및 photoGallery 배열
scripts/upload-character-photos.mjs  # 자동 업로드 스크립트
docs/CHARACTER_PHOTOS.md       # 이 문서
```

## 💡 권장 사항

1. **각 캐릭터마다 5-10장의 사진 준비**
   - 다양한 상황의 사진 (일상, 특별한 순간 등)
   - 캐릭터의 성격과 페르소나에 맞는 사진

2. **이미지 품질**
   - 해상도: 최소 800x800px 이상
   - 형식: JPG 또는 PNG
   - 파일 크기: 5MB 이하 권장

3. **사진 주제 예시**
   - 일상 셀카
   - 특별한 순간 (생일, 기념일 등)
   - 취미 활동 사진
   - 옷/패션 사진
   - 음식/카페 사진
   - 여행 사진

4. **정기적인 업데이트**
   - 새로운 사진을 주기적으로 추가
   - 사용자 피드백에 따라 사진 교체

## 🔧 문제 해결

### 스크립트 실행 오류

```bash
# 환경 변수 확인
echo $CLOUDINARY_CLOUD_NAME

# .env 파일에서 로드 (필요시)
source .env
```

### 이미지가 표시되지 않을 때

1. URL이 올바른지 확인
2. Cloudinary 설정 확인
3. 브라우저 콘솔에서 CORS 오류 확인

### characters.ts 업데이트 실패

스크립트가 실패하면 수동으로 `app/lib/characters.ts` 파일을 직접 수정하세요.



## Related Documents
- **Specs**: [Document Management Plan](../01_Concept_Design/09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
