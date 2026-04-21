---
name: image-asset-research
description: candidate registry 항목별 image asset candidate manifest 초안을 생성하는 큐레이션 플레이북
type: asset-curation
invocation: /image-asset-research [cnd_id ...]
allowed-tools: Read, Write, Glob, Grep
version: 1.0.0
related-files:
  - src/features/content/candidates/registry.ts
  - src/features/content/imageAssets/manifest.ts
  - src/features/content/imageAssets/types.ts
---

# Image Asset Research Playbook

## 목적 및 범위

이 skill은 **이미지 후보를 정리하는 단계**까지만 담당합니다.
최종 이미지 파일 확보, 다운로드, 앱 적용은 큐레이터가 별도로 수행합니다.

```
candidate registry
    ↓
이 skill이 담당하는 영역
    ↓  visualKeywords 확장
    ↓  비주얼 유형 추천
    ↓  소스 추천
    ↓  위험 경고 생성
    ↓
manifest 초안 (approvalStatus: 'discovered')
    ↓  ← 여기서부터 큐레이터 수동 작업
    ↓  sourceUrl 탐색 및 기입
    ↓  파일 확보 + localPath 기입
    ↓  라이선스 확인 + licenseStatus 업데이트
    ↓
approvalStatus: 'needs-review' → 큐레이터 최종 승인 → 'approved'
```

**절대 하지 않는 것**
- 외부 이미지 자동 다운로드
- `approvalStatus: 'approved'` 설정
- `localPath` 설정
- `licenseStatus: 'verified-free'` 사전 설정

---

## 프로젝트 파일 참조

| 역할 | 경로 |
|------|------|
| 후보 목록 | `src/features/content/candidates/registry.ts` |
| 후보 타입 | `src/features/content/candidates/types.ts` |
| 매니페스트 | `src/features/content/imageAssets/manifest.ts` |
| 에셋 타입 | `src/features/content/imageAssets/types.ts` |
| 선택 함수 | `src/features/content/imageAssets/selectors.ts` |

---

## 처리 대상 기준

매니페스트에 이미 `candidateId`가 등록된 후보는 건너뜁니다.
아래 조건을 모두 충족하는 후보만 처리합니다:

```
trendStatus !== 'archived'
AND (
  evidenceLevel === 'A'
  OR (evidenceLevel === 'B' AND trendStatus IN ['rising', 'active', 'peak'])
)
```

evidenceLevel B + declining/archived 후보는 이미지 투자 대비 가치가 낮아 건너뜁니다.

---

## 비주얼 유형 의사결정 트리

후보당 하나의 `assetType`과 세부 비주얼 서브타입을 결정합니다.

```
Q1. 브랜드·저작권 위험 신호가 있는가? (§ 위험 신호 패턴 참조)
    YES → illustration 강력 권장, photo는 ⚠️ 경고 후 큐레이터 판단

Q2. 음식의 외형이 단순하고 아이콘화 가능한가?
    (예: 쿠키, 마카롱, 아이스크림콘처럼 실루엣이 명확)
    YES → illustration (icon 스타일)

Q3. 음식의 핵심이 독특한 '질감·단면·재료 조합'인가?
    (예: 탕후루 설탕 코팅, 두바이 초콜릿 단면, 크로플 겹)
    YES → photo (cropped food photo)
         — 클로즈업 매크로 또는 단면 컷

Q4. 음식이 특정 항목보다 '음식 카테고리 전체'를 대표하는가?
    (예: 그릭요거트 파르페, 각종 라떼 음료)
    YES → photo (generic food bowl/plate)
         — 오버헤드 또는 넓은 앵글

Q5. 위 모두 해당 없거나 소스 확보가 불확실한가?
    YES → illustration (범용 스타일) 또는 placeholder
```

### 비주얼 서브타입 4가지

| 서브타입 | 설명 | 적합한 후보 예시 |
|----------|------|----------------|
| **icon** | 단순 실루엣, 작은 크기에서도 인식 가능 | 마카롱, 쿠키, 아이스크림콘 |
| **illustration** | 스타일화된 일러스트 (사진 라이선스 걱정 없음) | 두바이 초콜릿, 탕후루, 편의점 브랜드 상품 |
| **cropped food photo** | 질감·단면 강조 클로즈업 | 크로플, 달고나 라떼 크림, 두바이 초콜릿 단면 |
| **generic food bowl** | 카테고리를 대표하는 넓은 앵글 | 그릭요거트 파르페, 흑임자 라떼 |

notes 필드에 서브타입을 명시합니다:
```ts
notes: '비주얼 서브타입: cropped food photo. ...'
```

---

## 위험 신호 패턴

아래 조건 중 하나라도 해당하면 `notes`에 ⚠️ 경고를 기재하고, photo보다 illustration을 권장합니다.

### 브랜드 위험

| 패턴 | 예시 | 경고 수준 |
|------|------|----------|
| name 또는 aliases에 지명 + 식품명 조합 | "두바이 초콜릿", "파리 바게트" | ⚠️ 중간 — 일반 명칭일 수 있으나 특정 브랜드와 혼동 가능 |
| aliases에 영문 고유명사 포함 | "Dubai chocolate", "Ube Latte" | ⚠️ 낮음 — 검색 시 브랜드 이미지 혼입 가능 |
| 편의점 3사 중 하나의 전용 출시 상품 | sourceType: 'convenience' | ⚠️ 높음 — 패키지 디자인 저작권 |
| 특정 프랜차이즈 메뉴명 | "메가 흑임자 라떼" | 🚨 매우 높음 — 사용 금지 |

### 저작권·라이선스 위험

| 패턴 | 설명 | 대응 |
|------|------|------|
| sourceType: 'sns' | SNS 게시물은 기본적으로 저작권자 동의 없이 사용 불가 | illustration로 대체 권장 |
| sourceType: 'news-photo' | 뉴스 사진은 AFP·Reuters 등 유료 에이전시 소속 다수 | illustration 또는 Wikimedia Commons 대체 탐색 |
| 특정 연도 이미지가 핵심 (예: 2019년 당시 모습) | 연도 특정 이미지는 소스 추적 어려움 | 일반 대표 이미지로 대체 또는 illustration |

---

## visualKeywords 확장 규칙

`candidate.visualKeywords`에서 시작해 아래 레이어를 추가합니다.
최종 4~6개가 되도록 중복 제거 후 조정합니다.

### 레이어 구성

```
레이어 0 (복사):     candidate.visualKeywords (이미 큐레이션된 것)
레이어 1 (색상):     이름에서 색상 파생 (말차→녹색, 흑임자→검은색, 우베→보라색)
레이어 2 (질감):     음식 고유 질감 (쫀득한, 바삭한, 크리미한, 탱글한, 크런치)
레이어 3 (용기):     제공 형태 (유리컵, 꼬치, 플레이트, 도시락, 편의점 봉지)
레이어 4 (배경·문화): 기원 또는 대표 소비 장소 (길거리 간식, 카페 시그니처, 홈베이킹)
```

### 피해야 할 키워드

- 너무 추상적인 단어: "음식", "맛있는", "디저트" (단독)
- 브랜드명 직접 포함: "스타벅스 음료", "GS25 신상"
- 레이어 1~4에서 이미 레이어 0과 겹치는 것

---

## sourceType 추천 테이블

| 음식 특성 | 추천 sourceType | 이유 |
|----------|----------------|------|
| 동아시아 길거리 음식 (탕후루, 버터떡) | `wikimedia` 우선 | Wikimedia Commons에 길거리 음식 사진 다수 |
| 한국 카페 음료 (라떼류, 에이드) | `unsplash` 우선 | 라떼·카페 음료 무료 사진 풍부 |
| 홈베이킹·홈쿡 음식 | `unsplash` 우선 | 홈베이킹 테마 무료 사진 풍부 |
| 편의점 전용 상품 | `illustration` 강력 권장 | 패키지 저작권 위험, 사진 소스 제한적 |
| 수입 식품 (두바이 초콜릿, 우베) | `illustration` 또는 `wikimedia` | 원산지 기반 이미지는 Wikimedia에 있을 수 있음 |
| 한국 전통 재료 변형 (흑임자, 말차) | `unsplash` 또는 `wikimedia` | 재료 자체 사진은 라이선스 자유로운 것 많음 |

---

## licenseStatus / approvalStatus 기본값

이 skill이 생성하는 모든 초안은 다음 값을 고정합니다:

```ts
licenseStatus: 'unknown',    // 큐레이터가 확인 전까지 항상 unknown
approvalStatus: 'discovered', // 파이프라인 시작점
```

**큐레이터가 수동으로 업데이트해야 하는 시점**:

| 조건 | licenseStatus 업데이트 |
|------|----------------------|
| Unsplash URL 확인 완료 | `'verified-free'` |
| Wikimedia Commons CC0 확인 | `'verified-free'` |
| Wikimedia CC-BY | `'needs-attribution'` |
| 직접 촬영·제작 완료 | `'owned'` |
| 뉴스 사진 유료 에이전시 확인 | `'restricted'` |

| 조건 | approvalStatus 업데이트 |
|------|------------------------|
| 초안 생성 시 | `'discovered'` |
| 파일 확보 후 큐레이터 검토 요청 | `'needs-review'` |
| 큐레이터 최종 승인 | `'approved'` |
| 품질·라이선스 문제 | `'rejected'` |
| 더 나은 이미지로 교체 | `'replaced'` |

---

## 출력 형식

### TypeScript 초안 예시

```ts
{
  id: 'asset_015',
  candidateId: 'cnd_001',
  displayName: '우베 라떼 — 보라색 카페 음료 오버헤드',
  assetType: 'photo',
  sourceType: 'unsplash',
  // sourceUrl: ''   ← 큐레이터가 Unsplash에서 탐색 후 기입
  // localPath: ''   ← 파일 확보 후 public/assets/... 경로 기입
  visualKeywords: ['보라색 라떼', '우베 크림', '카페 음료', '오버헤드 샷', '필리핀 식재료'],
  licenseStatus: 'unknown',
  approvalStatus: 'discovered',
  notes: '비주얼 서브타입: generic food bowl. Unsplash 탐색 키워드: "ube latte purple coffee". 브랜드 위험 낮음 — 우베는 일반 식재료 명칭.',
},
```

### 위험 경고가 있는 예시

```ts
{
  id: 'asset_016',
  candidateId: 'cnd_002',
  displayName: '두바이 초콜릿 — 피스타치오 카다이프 단면',
  assetType: 'illustration',    // ← 브랜드 위험으로 illustration 권장
  sourceType: 'unknown',
  // sourceUrl: ''
  // localPath: ''
  visualKeywords: ['피스타치오 초콜릿 바', '카다이프 면 층', '단면 컷', '골드 포장 요소', '중동 디저트'],
  licenseStatus: 'unknown',
  approvalStatus: 'discovered',
  notes: '⚠️ 브랜드 위험 중간: "두바이 초콜릿"은 일반 명칭이나 특정 브랜드(Fix Dessert) 연상 강함. 사진 사용 시 브랜드 로고·패키지 노출 주의. 비주얼 서브타입: illustration(cropped) 또는 cropped food photo(단면 클로즈업). Wikimedia에서 "Dubai chocolate pistachio" 검색 후 라이선스 확인 권장.',
},
```

---

## 실행 예시

### 전체 미등록 후보 처리

```
/image-asset-research
```

→ 매니페스트에 없는 후보 전체를 처리합니다.
예: cnd_001(우베 라떼), cnd_003(말차쫀득쿠키), cnd_005(버터떡), cnd_011(그릭요거트 파르페) 등

### 특정 후보만 처리

```
/image-asset-research cnd_003 cnd_005
```

→ 말차쫀득쿠키, 버터떡만 처리합니다.

### 예상 출력 (cnd_003 말차쫀득쿠키)

```
### [cnd_003] 말차쫀득쿠키
비주얼 유형: illustration (icon 스타일)
추천 소스:   unsplash (홈베이킹 테마)
위험 경고:   없음

{
  id: 'asset_015',
  candidateId: 'cnd_003',
  displayName: '말차쫀득쿠키 — 녹색 홈베이킹 쿠키 플레이트',
  assetType: 'illustration',
  sourceType: 'unsplash',
  visualKeywords: ['녹색 쿠키', '말차 파우더', '홈베이킹', '쫀득한 질감', '원형 쿠키'],
  licenseStatus: 'unknown',
  approvalStatus: 'discovered',
  notes: '비주얼 서브타입: illustration(icon). 쿠키 실루엣이 단순해 icon 스타일 적합. Unsplash 탐색 키워드: "matcha cookie green homemade". evidenceLevel B + active → 우선순위 중간.',
},
```

### 예상 출력 (cnd_005 버터떡)

```
### [cnd_005] 버터떡
비주얼 유형: photo (cropped food photo)
추천 소스:   wikimedia 또는 internal
위험 경고:   없음

{
  id: 'asset_016',
  candidateId: 'cnd_005',
  displayName: '버터떡 — 구운 가래떡 버터 클로즈업',
  assetType: 'photo',
  sourceType: 'wikimedia',
  visualKeywords: ['구운 가래떡', '버터 코팅', '달달한 길거리 음식', '그을린 표면', '꼬치 형태'],
  licenseStatus: 'unknown',
  approvalStatus: 'discovered',
  notes: '비주얼 서브타입: cropped food photo. 구운 떡 표면의 글레이즈 질감이 핵심 비주얼. Wikimedia "tteok butter grilled" 탐색. 없으면 internal(직접 촬영) 권장.',
},
```

---

## 주요 판단 사례 정리

| 후보 | 결정 | 이유 |
|------|------|------|
| 우베 라떼 (cnd_001) | photo / generic food bowl | 색상(보라)이 핵심, 일반 카페음료 → Unsplash 풍부 |
| 두바이 초콜릿 (cnd_002) | illustration 권장 | 브랜드명 연상, 패키지 저작권 위험 |
| 말차쫀득쿠키 (cnd_003) | illustration / icon | 쿠키 실루엣 단순, homecook 특성상 사진 소스 한정 |
| 요거트 아이스크림 (cnd_004) | photo / generic food bowl | 일반 식품 이미지 → Unsplash 풍부, 브랜드 위험 없음 |
| 버터떡 (cnd_005) | photo / cropped food photo | 구운 질감이 핵심, 한국 전통 음식 → Wikimedia 탐색 |
| 흑임자 라떼 (cnd_006) | photo / generic food bowl | 기존 asset_005 이미 approved → 건너뜀 (qt07 연결) |
| 그릭요거트 파르페 (cnd_011) | photo / generic food bowl | 파르페 그릇 오버헤드 → Unsplash 풍부, 브랜드 위험 없음 |

---

## 체크리스트 — 초안 생성 후 큐레이터 작업

- [ ] TypeScript 초안을 `manifest.ts` ASSET_MANIFEST 끝에 붙여넣기
- [ ] 각 항목의 `notes`에 기재된 Unsplash/Wikimedia 탐색 키워드로 실제 이미지 검색
- [ ] 라이선스 확인 → `licenseStatus` 업데이트
- [ ] 파일 다운로드 → `public/assets/images/quiz/{category}/` 저장
- [ ] `localPath` + `approvalStatus: 'needs-review'` 업데이트
- [ ] `npx vitest run src/features/content/imageAssets/selectors.test.ts` 실행
- [ ] 최종 승인 → `approvalStatus: 'approved'` + `approvedBy` + `approvedAt` 기입

---

## 관련 문서

| 문서 | 위치 | 관련성 |
|------|------|--------|
| 에셋 타입 정의 | `src/features/content/imageAssets/types.ts` | 사용 가능한 타입 값 참조 |
| 기존 매니페스트 | `src/features/content/imageAssets/manifest.ts` | 중복 방지 및 id 채번 |
| candidate 수집 플레이북 | `.claude/skills/candidate-intake/PLAYBOOK.md` | visualKeywords 원본 기준 |
| season pack generator | `.claude/commands/season-pack-generator.md` | questionReady candidate → 문항화 |
