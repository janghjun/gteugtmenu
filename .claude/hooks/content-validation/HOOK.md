---
name: content-validation
description: seasonal pack JSON 파일을 자동 검증하는 Claude Code hook 설계 문서
trigger-events: PostToolUse(Write|Edit), Stop
script: scripts/validate-content.mjs
version: 1.0.0
---

# Content Validation Hook — 설계 문서

seasonal pack과 candidate registry는 수작업으로 편집되므로 schema 오류, 중복 ID, 잘못된 answer 같은 문제가 세션 중에 몰래 끼어들 수 있습니다.
이 hook은 Claude Code의 `PostToolUse`와 `Stop` 이벤트를 활용해 JSON 무결성을 자동 검사합니다.

---

## 적용 시점

Claude Code hook 이벤트는 두 단계로 적용합니다.

### 1. PostToolUse — 즉각 피드백 (파일 단위)

```
[Claude가 Write/Edit 실행]
        ↓
[PostToolUse hook 발동]
        ↓
[validate-content.mjs --stdin]
  · stdin에서 {tool_input.file_path} 추출
  · content/*.json이면 해당 파일만 검증
  · 결과를 stdout으로 출력 (Claude가 다음 메시지에서 확인)
```

**이유**: Write 직후 오류를 발견하면 Claude가 같은 turn 내에서 즉시 수정할 수 있습니다.
JSON이 아닌 파일(`.ts`, `.tsx`)이 Write 대상이면 조용히 skip합니다.

### 2. Stop — 전체 검증 (세션 종료)

```
[Claude 응답 완료 — turn 종료]
        ↓
[Stop hook 발동]
        ↓
[validate-content.mjs --all]
  · src/features/content/*.json 전체 검증
  · 팩 간 question id 중복 교차 검사
  · 요약 출력
```

**이유**: 여러 파일을 수정한 세션 끝에 팩 간 충돌(중복 id 등)을 한 번에 잡습니다.
Stop hook은 비차단(always exit 0)이므로 Claude 응답을 막지 않습니다.

---

## Hook 설정 파일

`.claude/settings.json` (프로젝트 공유, git commit 대상):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "node scripts/validate-content.mjs --stdin"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node scripts/validate-content.mjs --all"
          }
        ]
      }
    ]
  }
}
```

`settings.local.json`(개인 권한 설정)과 분리합니다.
`settings.json`은 git에 커밋하여 팀 전체에 적용합니다.

---

## 검증 스크립트 구조

`scripts/validate-content.mjs` — Node.js ES module, 외부 의존성 없음.

```
validate-content.mjs
│
├── resolveTargets(args)
│   ├── --stdin  → stdin JSON → tool_input.file_path → 단일 파일
│   ├── --all    → readdirSync(CONTENT)/*.json → 전체
│   └── <path>   → 직접 경로 (CLI 수동 실행)
│
├── validatePack(filePath)
│   ├── JSON 파싱 오류 감지
│   ├── meta 검증
│   ├── questions[] 순회
│   │   ├── schema 검증 (id/prompt/answer/explanation/format/category/evidenceLevel)
│   │   ├── correctAnswer in choices
│   │   ├── format별 필수 필드 (menu, year, imageUrl)
│   │   ├── 팩 내 id 중복
│   │   └── prompt 유사도 (Jaccard ≥ 0.7 → 경고, ≥ 1.0 → 오류)
│   └── inactive seasonal pack 경고
│
├── crossPackDuplicateIds(packData)  ← --all 모드 전용
│   └── 모든 팩의 question id를 단일 Map으로 교차 검사
│
└── 최종 요약 출력 + process.exit(0)
```

---

## 검증 항목 및 판정 기준

| 항목 | 판정 | 기준 |
|------|------|------|
| JSON 파싱 실패 | **오류** | 파일이 유효한 JSON이 아님 |
| meta 필수 필드 누락 | **오류** | packId / title / meta 없음 |
| meta.status 유효하지 않음 | **오류** | active / scheduled / expired 외의 값 |
| meta 날짜 형식 오류 | **오류** | YYYY-MM-DD 패턴 불일치 |
| **inactive seasonal pack** | **경고** | type=seasonal, status=active, endsAt < today |
| question schema 오류 | **오류** | id / prompt / answer / explanation / format / category / evidenceLevel 중 하나라도 누락·무효 |
| evidenceLevel C | **오류** | CLAUDE.md 규칙: C 등급 문항 사용 불가 |
| **correctAnswer not in choices** | **오류** | choices 배열에 answer 값이 없음 |
| format별 필수 필드 누락 | **오류** | menu_to_year→menu, year_to_menu→year, image_to_year→imageUrl 없음 |
| ox choices 오류 | **오류** | choices가 ["O","X"]가 아님 |
| **팩 내 id 중복** | **오류** | 같은 팩 안에 동일 question id |
| **팩 간 id 중복** | **오류** | 다른 팩 사이에 동일 question id |
| **prompt 완전 중복** | **오류** | Jaccard similarity = 1.0 |
| **prompt 유사도 경고** | **경고** | Jaccard similarity ≥ 0.7 |

### 오류 vs 경고

- **오류(✗)**: 배포 전 반드시 수정. Claude가 다음 메시지에서 보고 자동 수정 시도 가능.
- **경고(⚠)**: 배포 가능하지만 확인 권장. 무시해도 앱은 동작.

---

## 출력 형식 예시

### 이상 없음

```
── 콘텐츠 무결성 검증 (2026-04-21T14:30) ──

📦 mzTrendPack.json
  ✓ 이상 없음

📦 seasonPack.json
  ✓ 이상 없음

────────────────────────────────────────────
✓ 모든 팩 검증 통과 (2개 파일)
```

### 오류 + 경고 혼재

```
── 콘텐츠 무결성 검증 (2026-07-01T09:15) ──

📄 summer-2026-q3.json
  ✗ questions[3] (id: smr2_q004): answer("2023년")가 choices에 없음
  ✗ questions[7] (id: smr2_q008): image_to_year인데 imageUrl 없음
  ⚠ questions[5] (id: smr2_q006): prompt 유사도 74% — questions[1] "흑당 밀크티가 국내…"

📦 mzTrendPack.json
  ✓ 이상 없음

📋 팩 간 id 중복
  ✗ id "qt03" — summer-2026-q3.json ↔ mzTrendPack.json

────────────────────────────────────────────
✗ 오류 3건, 경고 1건 — 배포 전 수정 필요
```

---

## 수동 실행

```bash
# 전체 팩 검증
node scripts/validate-content.mjs --all

# 특정 파일만 검증
node scripts/validate-content.mjs src/features/content/summer-2026-q3.json

# PostToolUse hook 흉내 (stdin에 JSON 입력)
echo '{"tool_input":{"file_path":"src/features/content/mzTrendPack.json"}}' \
  | node scripts/validate-content.mjs --stdin
```

---

## 설계 결정 사항

### candidate registry는 왜 제외하는가

`src/features/content/candidates/registry.ts`는 TypeScript 파일이므로 Node.js 직접 파싱이 불가합니다.
candidate 검증은 `npx vitest run src/features/content/candidates/selectors.test.ts`가 담당합니다.
두 레이어를 중복 검증하는 것보다 각 레이어가 책임을 분리하는 것이 유지보수에 유리합니다.

### hook exit code는 왜 항상 0인가

Stop hook에서 non-zero exit를 반환하면 Claude Code가 재처리(stop loop)에 들어갑니다.
PostToolUse에서 non-zero exit는 Claude에게 오류 피드백을 전달하지만, 검증 실패가 파일 저장 자체를 막을 이유는 없습니다.
검증 결과는 Claude의 다음 컨텍스트에서 자동으로 읽히므로 exit 0으로 충분합니다.

### mockPack.json은 왜 제외하는가

`mockPack.json`은 개발 픽스처 목적이며 실제 배포 팩이 아닙니다.
`resolveTargets`에서 `mock`을 포함하는 파일명은 skip합니다.

---

## 관련 파일

| 파일 | 역할 |
|------|------|
| `scripts/validate-content.mjs` | 검증 스크립트 본체 |
| `.claude/settings.json` | hook 이벤트 바인딩 설정 |
| `src/features/quiz/schema.ts` | 앱 내 validateQuestion (이 스크립트와 동일 규칙 유지) |
| `src/features/content/candidates/selectors.test.ts` | candidate registry 검증 (vitest) |
