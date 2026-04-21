---
name: season-pack-generator
description: candidate registry를 읽고 seasonal quiz pack JSON 초안을 자동 생성하는 플레이북
type: content-generation
allowed-tools: Read, Write, Glob, Grep, Bash
invocation: /season-pack-generator <pack-id> <시즌 레이블> <startsAt> <endsAt>
version: 2.0.0
---

# Season Pack Generator — 플레이북

seasonal quiz pack을 직접 손으로 작성하는 반복 작업을 자동화합니다.
candidate registry에서 eligible 후보를 선택하고, 규칙에 맞는 문항 초안을 생성하여 JSON 파일로 출력합니다.

---

## 실행 방법 (두 가지)

### A. Node.js 스크립트 (빠름, 결정론적)

```bash
# 시즌팩 초안 생성
node scripts/generate-draft-pack.mjs <pack-id> "시즌 레이블" <startsAt> <endsAt>

# 예시
node scripts/generate-draft-pack.mjs mz-2026-q3 "MZ 트렌드팩 2026 Q3" 2026-07-01 2026-09-30
node scripts/generate-draft-pack.mjs fall-2026 "가을 트렌드팩 2026" 2026-10-01 2026-12-31

# 기본값으로 실행 (pack-id: new-season-pack, 기간: 오늘~90일 후)
node scripts/generate-draft-pack.mjs
```

출력: `src/features/content/<pack-id>.draft.json`
- `.draft.json` 확장자 → app이 로드하지 않음, validate-content.mjs도 처리하지 않음
- 검토 완료 후 `.json`으로 이름 변경

### B. Claude Code 슬래시 커맨드 (유연, 판단 포함)

```
/season-pack-generator <pack-id> "시즌 레이블" <startsAt> <endsAt>
```

의미 중복 감지·explanation 품질·format 분포 등을 Claude가 직접 판단해 생성.
Node.js 스크립트로 처리하기 어려운 경계 케이스(설명 품질, 비정형 후보 등)에 적합.

---

## 자동화 경계

```
자동 (스크립트/슬래시 커맨드)   │   수동 (큐레이터 필수)
─────────────────────────────┼─────────────────────────────
eligible 후보 필터             │  explanation 품질 검토
카테고리 균형 선택             │  year_to_menu choices 교체
문항 초안 생성                 │  image_to_year 에셋 교체
format 분포 맞추기             │  status: scheduled → active
중복 prompt 감지·스킵          │  index.ts 등록 + vitest 확인
_draft 체크리스트 생성          │
```

---

## 배경 및 목적

그때그메뉴는 curated quiz pack 기반으로 동작합니다.
seasonal pack은 분기마다 새 트렌드 음식을 반영해 교체해야 하는데,
매번 후보 선별 → 문항 작성 → 형식 검증 → JSON 직렬화를 수작업으로 반복하는 것은 비효율적입니다.

```
CANDIDATE_REGISTRY
  → eligible 필터 (evidenceLevel, questionReady, trendStatus)
  → 5~10개 선택 (카테고리 균형)
  → 후보당 2문항 초안 생성
  → format 분포 검증
  → 기존 팩 중복 프롬프트 감지 및 스킵
  → QuizPack JSON 출력 (status: "scheduled")
```

---

## 프로젝트 파일 참조

| 역할 | 경로 |
|------|------|
| 실행 스크립트 | `scripts/generate-draft-pack.mjs` |
| 후보 목록 | `src/features/content/candidates/registry.ts` |
| 후보 타입 | `src/features/content/candidates/types.ts` |
| 후보 selector | `src/features/content/candidates/selectors.ts` |
| 기존 팩 JSON | `src/features/content/*.json` |
| 팩 타입 정의 | `src/features/content/loadPack.ts` |
| 문항 타입 | `src/features/quiz/types.ts` |
| 문항 schema | `src/features/quiz/schema.ts` |
| 팩 등록 위치 | `src/features/content/index.ts` |

---

## Eligible Candidate 조건

```
evidenceLevel !== 'C'              — (방어적 확인)
trendStatus ∈ {rising, active, peak}
questionReady === true
  OR (questionReady === undefined
      AND evidenceLevel === 'A'
      AND peakStartAt 존재)
```

`questionReady === false`는 항상 제외.

---

## 후보 선택 전략 (5~10개)

1. `trendStatus` 우선순위: `rising` > `active` > `peak`
2. `firstSeenAt` 내림차순 (최신 우선)
3. 동일 `category` 최대 3개 제한
4. 최대 10개 선택

---

## 문항 생성 규칙

### 허용 format

| format | 설명 | 추가 필드 |
|--------|------|----------|
| `menu_to_year` | "이 메뉴가 가장 크게 유행한 해는?" | `menu` |
| `year_to_menu` | "이 해에 가장 핫했던 메뉴는?" | `year` |
| `image_to_year` | 이미지 보고 연도 추측 (placeholder 동작 가능) | `imageUrl` |
| `ox` | OX 참/거짓 판별 | — |

### format 분포 목표 (전체 문항 기준)

```
menu_to_year:  40~50%   (주력 — 가장 직관적)
year_to_menu:  25~35%   (연도 → 메뉴 역방향)
ox:            15~25%   (난이도 조절용, 피크 연도 확인)
image_to_year:  0~15%   (placeholder 허용, 에셋 없어도 동작)
```

### 문항 2번 format 선택 로직 (스크립트)

```
현재까지 ox 비율 < 15%   → ox
image 비율 < 10% + visualKeywords ≥ 2개  → image_to_year
year_to_menu 비율 < 25%  → year_to_menu
그 외                    → ox (fallback)
```

### 필드 명세

```ts
{
  id:            string   // "<packId 앞 4자>_q<3자리>" — 예: mz20_q001
  format:        'menu_to_year' | 'year_to_menu' | 'image_to_year' | 'ox'
  category:      QuestionCategory
  prompt:        string   // ≤30자, 짧고 직관적, 해요체 금지
  choices:       string[] // 4개 (ox는 ["O","X"])
  answer:        string   // choices 중 하나와 정확 일치
  explanation:   string   // 1문장, 해요체 종결, ≤50자 [초안 — 큐레이터 검토 필수]
  evidenceLevel: 'A' | 'B' // candidate.evidenceLevel 그대로
  difficulty:    'easy' | 'medium' | 'hard'
  tags:          string[] // candidate.tags에서 최대 4개
  // format별 추가 필드
  menu?:         string   // menu_to_year 전용
  year?:         number   // year_to_menu 전용
  imageUrl?:     string   // image_to_year 전용 (placeholder 허용)
}
```

### image_to_year placeholder 정책

이미지 에셋이 없을 때: `/assets/images/placeholder/<category>.svg` 경로 사용.
앱이 `resolveImageSrc(questionId, visualAssetKey, category)` 호출 시 자동 fallback 동작.
큐레이터가 나중에 실제 에셋으로 교체하거나 placeholder 유지 결정.

---

## 중복 프롬프트 처리

기존 팩(`src/features/content/*.json`)의 `prompt` 값과 비교.

중복 감지 알고리즘:
1. 템플릿 stopword 제거 (가장, 크게, 유행한, 해는 등)
2. Jaccard 유사도 ≥ 0.6 → 해당 format 스킵
3. 같은 후보에 대해 다른 format으로 대신 생성

draft 내 신규 prompt 간 중복은 exact match로 감지.

---

## draft JSON 구조

```json
{
  "packId": "mz-2026-q3",
  "title": "MZ 트렌드팩 2026 Q3",
  "meta": {
    "packId": "mz-2026-q3",
    "title": "MZ 트렌드팩 2026 Q3",
    "subtitle": "편의점 산도·요거트 아이스크림·흑임자 라떼 등 최신 트렌드",
    "type": "seasonal",
    "isSeasonal": true,
    "startsAt": "2026-07-01",
    "endsAt": "2026-09-30",
    "categories": ["convenience_dessert", "dessert_trend"],
    "status": "scheduled"
  },
  "_draft": {
    "generatedAt": "2026-04-22",
    "scriptVersion": "1.0.0",
    "candidatesUsed": [...],
    "formatDistribution": { "menu_to_year": 2, "year_to_menu": 1, "ox": 1, "image_to_year": 1 },
    "totalQuestions": 5,
    "reviewChecklist": [...],
    "note": "배포 전 이 _draft 키 전체를 삭제하세요."
  },
  "questions": [...]
}
```

`status`는 항상 `"scheduled"` — 배포 전 수동으로 `"active"` 변경.
`_draft` 키는 배포 전 전체 삭제.

---

## 팩 등록 절차 (검토 완료 후 수동 작업)

```bash
# 1. 파일 이름 변경
mv src/features/content/mz-2026-q3.draft.json src/features/content/mz-2026-q3.json

# 2. _draft 키 삭제 (편집기에서 수동 제거)

# 3. meta.status를 "active"로 변경

# 4. index.ts 등록
```

```ts
// src/features/content/index.ts
import rawNewPack from './mz-2026-q3.json'

const newPack = buildPackFromRaw(rawNewPack)
const ALL_SEASONAL = [seasonPack, mzTrendPack, newPack]
```

```bash
# 5. 테스트 통과 확인
npx vitest run
```

---

## Human Review Checklist

draft 파일의 `_draft.reviewChecklist`에 자동 생성되지만, 항상 아래를 직접 확인:

### 필수
- [ ] evidenceLevel B 문항: answer 근거 재확인
- [ ] year_to_menu choices: 플레이스홀더("메뉴 N")를 실제 메뉴명으로 교체
- [ ] image_to_year imageUrl: 실제 에셋 교체 여부 결정 (placeholder 유지도 허용)

### 콘텐츠
- [ ] explanation이 1문장이고 해요체로 끝나는가
- [ ] prompt가 30자 이내인가
- [ ] 기존 팩과 의미 중복 prompt가 없는가

### 기술
- [ ] answer가 choices 안에 정확히 포함되는가
- [ ] meta.status가 "scheduled"인가
- [ ] npx vitest run 통과

### 배포 전
- [ ] .draft.json → .json 이름 변경
- [ ] _draft 키 삭제
- [ ] meta.status → "active"
- [ ] index.ts import + ALL_SEASONAL 추가

---

## 관련 파일

- 실행 스크립트: `scripts/generate-draft-pack.mjs`
- 슬래시 커맨드: `.claude/commands/season-pack-generator.md`
- candidate 후보군: `src/features/content/candidates/registry.ts`
- 기존 팩 예시: `src/features/content/mzTrendPack.json`
- 팩 타입 정의: `src/features/content/loadPack.ts`
- 샘플 draft 출력: `src/features/content/mz-2026-q3.draft.json`
