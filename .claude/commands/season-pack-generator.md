---
description: candidate registry에서 seasonal quiz pack JSON 초안을 생성합니다. 인수: <pack-id> <시즌 레이블> <startsAt YYYY-MM-DD> <endsAt YYYY-MM-DD>
allowed-tools: Read, Write, Glob, Grep, Bash
---

아래 절차를 순서대로 실행해 seasonal quiz pack JSON 초안을 생성하세요.
자세한 규칙은 `.claude/skills/season-pack-generator/SKILL.md`를 참조하세요.

## 인수 파싱

$ARGUMENTS 형식: `<pack-id> <시즌 레이블> <startsAt> <endsAt>`
예: `summer-2026-q3 "여름 트렌드팩 2026 Q3" 2026-07-01 2026-09-30`

인수가 없으면 오류 없이 다음 기본값을 사용하세요:
- pack-id: `new-season-pack`
- 시즌 레이블: `새 시즌팩`
- startsAt: 오늘 날짜
- endsAt: 오늘로부터 90일 후

## STEP 0 — Node.js 스크립트 실행 시도

먼저 자동 스크립트 실행을 시도하세요:

```bash
node scripts/generate-draft-pack.mjs <pack-id> "<시즌 레이블>" <startsAt> <endsAt>
```

스크립트가 성공하면 생성된 `.draft.json` 파일 경로를 보고하고
`_draft.reviewChecklist`를 출력한 뒤 **STEP 6(결과 보고)로 바로 이동**하세요.

스크립트 실행이 실패하면 STEP 1부터 수동으로 진행하세요.

---

## STEP 1 — 기존 팩 프롬프트 수집 (중복 방지용)

`src/features/content/*.json` 파일을 모두 읽어 기존 questions의 `prompt` 값을 배열로 수집합니다.

## STEP 2 — candidate registry 읽기

`src/features/content/candidates/registry.ts`를 읽어 CANDIDATE_REGISTRY 배열을 파악합니다.

## STEP 3 — eligible candidates 필터링

아래 조건을 모두 만족하는 후보만 선택 대상으로 삼습니다:
- `evidenceLevel` !== 'C'
- `trendStatus` ∈ {rising, active, peak}
- `questionReady === true` 이거나, `questionReady === undefined`이면서 `evidenceLevel === 'A'` && `peakStartAt`이 있음

## STEP 4 — candidate 선택 (5~10개)

- rising → active → peak 순, 같은 status면 최신 firstSeenAt 우선
- 카테고리 편중 없이 동일 카테고리 최대 3개
- 최종 5~10개 선택

## STEP 5 — 문항 초안 생성 (candidate당 2개)

각 candidate에 대해 2개의 Question 초안을 작성합니다.

**허용 format (반드시 이 4개만 사용)**:
- `menu_to_year`, `year_to_menu`, `image_to_year`, `ox`

**format 분포 규칙** (전체 문항 기준):
- menu_to_year: 40~50%
- year_to_menu: 25~35%
- ox: 15~25%
- image_to_year: 0~15%

**image_to_year 필드 규칙**:
- 이미지 에셋 없으면 `imageUrl: "/assets/images/placeholder/<category>.svg"` 사용
- placeholder imageUrl이어도 앱이 정상 동작함 (resolveImageSrc fallback)

**필드 규칙**:
- `id`: `<packId 앞 4자>_q<3자리 순번>` (예: `smr2_q001`)
- `prompt`: 30자 이내, 해요체 금지
- `choices`: 4개 (ox는 ["O", "X"]), answer가 반드시 포함
- `explanation`: 1문장, 해요체로 마무리, 50자 이내
- `evidenceLevel`: candidate의 evidenceLevel 그대로 복사
- `difficulty`: `easy` | `medium` | `hard`

**중복 방지**:
- 기존 팩과 Jaccard 유사도 ≥ 0.6이면 해당 format 스킵
- 다른 format으로 대신 생성

## STEP 6 — JSON 파일 작성

`src/features/content/<pack-id>.draft.json`을 Write합니다.

```json
{
  "packId": "<pack-id>",
  "title": "<시즌 레이블>",
  "meta": {
    "packId": "<pack-id>",
    "title": "<시즌 레이블>",
    "subtitle": "<후보명 3개> 등 최신 트렌드",
    "type": "seasonal",
    "isSeasonal": true,
    "startsAt": "<startsAt>",
    "endsAt": "<endsAt>",
    "categories": ["<사용된 카테고리 목록>"],
    "status": "scheduled"
  },
  "_draft": {
    "generatedAt": "<오늘 날짜>",
    "candidatesUsed": [...],
    "formatDistribution": {...},
    "totalQuestions": N,
    "reviewChecklist": [...],
    "note": "배포 전 이 _draft 키 전체를 삭제하세요."
  },
  "questions": [...]
}
```

`approvalStatus: 'approved'`나 `status: 'active'`는 절대 설정하지 않습니다.
파일명은 반드시 `.draft.json`으로 저장합니다.

## STEP 7 — 결과 보고

다음 형식으로 결과를 출력하세요:

```
## 생성 완료: <pack-id>

- 출력 파일: src/features/content/<pack-id>.draft.json
- 사용 후보: <후보명 목록>
- 총 문항 수: <N>개
- format 분포: menu_to_year <N> / year_to_menu <N> / ox <N> / image_to_year <N>
- 중복 스킵: <N>건
- ⚠️ evidenceLevel B 문항: <있을 경우만>

### Human Review Checklist
<_draft.reviewChecklist 내용>

### 다음 단계
1. src/features/content/<pack-id>.draft.json 검토
2. reviewChecklist 항목 완료
3. 파일명 .json으로 변경 + _draft 키 삭제 + status → active
4. index.ts에 import + ALL_SEASONAL 추가
5. npx vitest run 으로 검증
```
