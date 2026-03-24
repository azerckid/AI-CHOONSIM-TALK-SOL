# AI Travel Media Generation Specification (Travel with Choonsim)
> Created: 2026-02-08
> Last Updated: 2026-02-08

이 문서는 춘심이 캐릭터와 유저의 사진을 합성하여 전 세계 명소를 배경으로 한 고품질 이미지 및 영상을 생성하는 기능에 대한 기술 규격 및 구현 전략을 정의합니다.

## 1. 개요 (Overview)
*   **기능명:** 춘심이와 함께하는 AI 여행 미디어 생성
*   **목적:** 유저가 제공한 사진과 춘심이 캐릭터를 합성하여 가상의 여행 경험을 시각적으로 제공함으로써 유저와의 유대감 강화 및 유료 기능(Credit) 활성화.
*   **대상 모델:** Google Imagen 3 (Image), Google Veo 3.1 (Video)

## 2. 핵심 기술 스택 (Technical Stack)
*   **Multimodal Analysis:** [Gemini 1.5 Flash] 유저 사진 특징 추출 및 이미지 생성 프롬프트 정교화.
*   **Image Generation:** [Vertex AI Imagen 3]
    *   `Reference Image`: 춘심이 공식 일러스트를 참조 이미지로 사용하여 캐릭터 일관성 유지.
    *   `Subject Customization`: 유저의 외형적 특징을 반영하면서 배경을 변경.
*   **Video Generation:** [Veo 3.1 API]
    *   `Image-to-Video`: 생성된 합성 이미지를 기반으로 5~8초 분량의 시네마틱 영상 생성.
    *   `Native Audio`: 영상 분위기에 맞는 배경음(Ambient Sound) 자동 생성.

## 3. 상세 워크플로우 (Detailed Workflow)

### 3.1 이미지 생성 단계 (Image Phase)
1.  **유저 입력:** 유저가 본인 사진 업로드 + 여행지(예: 뉴욕 타임스퀘어) 요청.
2.  **프롬프트 엔지니어링:** Gemini가 유저 사진을 분석하여 특징(머리색, 복장 등)을 텍스트로 변환하고, 춘심이의 특징과 조합된 Imagen 3 전용 프롬프트 생성.
3.  **API 호출:** Imagen 3의 `Subject Reference` 기능을 통해 춘심이 캐릭터성을 유지하며 합성 이미지 생성.
4.  **채팅 전송:** 생성된 이미지를 채팅 인터페이스에 카드 형태로 노출.

### 3.2 영상 생성 단계 (Video Phase - Optional)
1.  **유저 트리거:** 이미지 하단의 "🎥 이 장면을 영상으로 만들기" 버튼 클릭.
2.  **비용 확인:** 유료 크레딧 소모에 대한 유저 승인(Confirmation).
3.  **API 호출:** 첫 단계에서 생성된 이미지를 `Reference Seed`로 사용하여 Veo 3.1 영상 생성 시작.
4.  **결과 전송:** 생성 완료 후 비디오 플레이어 형태로 전송 및 다운로드 링크 제공.

## 4. UI/UX 디자인 가이드

### 4.1 대기 화면 (Loading Experience)
*   AI 생성 특성상 발생하는 대기 시간(이미지 5~10초, 영상 30초 이상)을 스토리텔링으로 승화.
*   메시지 예시:
    *   "춘심이가 비행기 티켓을 예매 중이에요... ✈️"
    *   "현지 가이드랑 통화하고 있어요! 잠시만요! 📞"

### 4.2 결과물 UI
*   **Image Card:** 1024x1024 해상도, 둥근 모서리, 우측 하단 "Choonsim Travel Logo" 워터마크(선택 사항).
*   **Video Player:** 심리스 루프(Seamless Loop) 재생, 전체화면 보기, SNS 공유 인터페이스 통합.

## 5. 데이터 및 보안 정책
*   **유저 사진 처리:** 이미지 생성 직후 특징 값만 추출하고 원본 사진은 즉시 삭제하거나 암호화된 버킷에 임시 저장(Privacy First).
*   **콘텐츠 필터링:** Vertex AI의 Safety Filter를 적용하여 부적절한 배경이나 포즈 생성을 원천 차단.

## 6. 수익 모델 연동 (Monetization)
*   **Freemium:** 이미지는 일일 1회 무료 또는 낮은 크레딧, 영상은 높은 크레딧 소모 또는 프리미엄 구독자 전용.
*   **Album System:** 생성된 모든 미디어는 유저의 '추억 앨범' 탭에 보관하여 지속적인 서비스 재방문 유도.

## 7. 향후 확장성
*   **Voice Integration:** 영상 생성 시 춘심이의 TTS 음성 대사 삽입.
*   **Seasonal Events:** 특정 기간(성탄절, 명절 등) 한정 특별 배경 및 의상 업데이트.


## Related Documents
- **Specs**: [Document Management Plan](../01_Concept_Design/09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
