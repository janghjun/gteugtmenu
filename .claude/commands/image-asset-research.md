---
description: candidate registry 항목을 읽고 image asset candidate manifest 초안을 생성합니다. 인수: [cnd_id ...] — 생략 시 매니페스트에 없는 전체 후보 처리
allowed-tools: Read, Write, Glob, Grep
---

아래 절차를 순서대로 실행하세요.
전체 규칙은 `.claude/skills/image-asset-research/SKILL.md`를 참조하세요.

## 인수 파싱

$ARGUMENTS: 공백으로 구분된 candidate id 목록 (선택)
- 지정하면 해당 id만 처리
- 생략하면 매니페스트에 candidateId가 없는 전체 후보 처리

## STEP 1 — 기존 매니페스트 읽기

`src/features/content/imageAssets/manifest.ts`를 읽어 이미 존재하는 `candidateId` 목록을 수집합니다.

## STEP 2 — candidate registry 읽기

`src/features/content/candidates/registry.ts`를 읽어 CANDIDATE_REGISTRY를 파악합니다.

## STEP 3 — 처리 대상 필터링

아래 조건 모두 충족하는 후보만 처리합니다:
- 인수로 지정된 id거나, 인수가 없으면 매니페스트에 candidateId가 없는 모든 후보
- trendStatus !== 'archived'
- evidenceLevel === 'A' 이거나, B이더라도 trendStatus가 'rising'/'active'/'peak'

## STEP 4 — 각 후보에 대해 분석 실행

각 후보마다:
1. 브랜드·저작권 위험 신호 검사 (SKILL.md § 위험 신호 패턴)
2. 적합한 assetType 결정 (SKILL.md § 비주얼 유형 의사결정 트리)
3. visualKeywords 확장 (SKILL.md § visualKeywords 확장 규칙)
4. sourceType 추천 (SKILL.md § sourceType 추천 테이블)
5. notes 초안 작성 (위험 경고 + 큐레이터 액션 포함)

## STEP 5 — manifest 초안 항목 생성

다음 형식으로 TypeScript 항목 초안을 생성합니다:

```ts
{
  id: 'asset_NNN',           // 기존 최대 id + 1부터 순번
  candidateId: 'cnd_XXX',
  displayName: '<후보명> — <비주얼 설명>',
  assetType: 'photo' | 'illustration' | 'placeholder',
  sourceType: '<추천 sourceType>',
  // sourceUrl: undefined    ← 큐레이터가 직접 탐색 후 기입
  // localPath: undefined    ← 파일 확보 후 기입
  visualKeywords: ['<키워드 4~6개>'],
  licenseStatus: 'unknown',  // 항상 unknown으로 시작
  approvalStatus: 'discovered',  // 항상 discovered로 시작
  notes: '<위험 경고 또는 큐레이터 지시사항>',
},
```

`approvalStatus: 'approved'`는 절대 설정하지 않습니다.
`localPath`는 절대 설정하지 않습니다.

## STEP 6 — 결과 보고

출력 형식:
```
## image-asset-research 결과

처리 후보: N개
위험 경고: N건

### [cnd_XXX] 후보명
비주얼 유형: illustration | photo(cropped) | photo(generic) | placeholder
추천 소스:  wikimedia | unsplash | internal | —
⚠️ 위험: <있을 경우만>

[생성된 TypeScript 초안]

---
### 다음 단계
1. 위 초안을 src/features/content/imageAssets/manifest.ts ASSET_MANIFEST 배열 끝에 붙여넣기
2. 각 항목의 sourceUrl을 큐레이터가 직접 탐색 후 기입
3. 파일 확보 완료 후 localPath + approvalStatus: 'needs-review' 업데이트
4. npx vitest run src/features/content/imageAssets/selectors.test.ts 로 검증
```
