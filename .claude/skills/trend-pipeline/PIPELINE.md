---
name: trend-pipeline
description: 최신 MZ 음식 트렌드 후보 자동화 파이프라인 설계 — source 수집부터 seasonal pack 반영까지 전체 흐름 정의
type: pipeline-design
version: 1.0.0
related-files:
  - src/features/content/candidates/registry.ts
  - src/features/content/candidates/types.ts
  - src/features/content/candidates/selectors.ts
  - src/features/content/imageAssets/manifest.ts
  - .claude/skills/candidate-intake/PLAYBOOK.md
  - .claude/commands/season-pack-generator.md
  - scripts/validate-content.mjs
---

# 트렌드 후보 자동화 파이프라인

## 핵심 원칙

```
자동화 범위: 신호 수집 → 중복 감지 → 초안 생성 → 유효성 검사
수동 개입 범위: evidenceLevel 확정 → trendStatus 승인 → questionReady 부여 → pack 반영
```

자동화가 절대 하지 않는 것:
- `questionReady: true` 부여
- `evidenceLevel: 'A'` 자동 부여
- `approvalStatus: 'approved'` 설정 (이미지 에셋 포함)
- seasonal pack JSON을 직접 배포 브랜치에 커밋

---

## 전체 파이프라인 개요

```
┌─────────────────────────────────────────────────────────────────────┐
│  STAGE 0      │  STAGE 1       │  STAGE 2      │  STAGE 3           │
│  Source 수집   │  Candidate 등록 │  Question 초안 │  Pack 반영          │
│  (자동/수동)   │  (자동 → 수동)  │  (반자동)      │  (수동 승인)        │
└──────┬────────┴───────┬────────┴──────┬────────┴─────────┬──────────┘
       │                │               │                  │
  신호 감지           중복 확인         문항 초안          seasonal
  + 정규화           + registry         생성               pack.json
                      초안              + 검증              커밋
```

---

## STAGE 0 — Source 수집

### 소스 유형별 수집 기준

#### SNS (`sourceType: 'sns'`)

| 지표 | 트리거 임계값 |
|------|--------------|
| 인스타그램 해시태그 신규 게시물 (30일) | 1만 건 이상 |
| 틱톡 누적 조회수 | 100만 이상 |
| 유튜브 관련 영상 (100만 뷰+ 채널) | 3편 이상 |
| 트위터/스레드 실시간 트렌드 진입 | 3회 이상 |

최초 포착 기록 양식:
```
플랫폼: instagram
해시태그: #말차쫀득쿠키 #matcha쿠키
최초 감지일: 2024-01-15
포착 계기: 인스타 탐색 피드 3회 이상 노출 + 해시태그 1.2만 건
```

**SNS 단독 → evidenceLevel 초기값: `B`**
오프라인 확산(카페·편의점·뉴스 보도) 추가 시 A로 상향 심사.

---

#### 뉴스/매거진 (`sourceType: 'news'`)

수집 기준:
- 식품 전문 매체(한국경제TV, 매경이코노미 등) 기사 2건 이상
- 네이버·다음 음식 트렌드 기획 기사
- 편의점·외식 업계 공식 보도자료

기록 양식:
```
매체: 한국경제TV
기사 제목: "두바이 초콜릿, 편의점 3사 동시 출시"
기사 날짜: 2024-09-12
URL: [큐레이터가 직접 기입]
```

뉴스 단독은 여전히 evidenceLevel B. SNS + 뉴스 조합이면 A 진입 조건 충족.

---

#### 리테일/편의점 (`sourceType: 'convenience'`)

수집 기준:
- 편의점 3사(CU·GS25·세븐일레븐) 신상품 발표
- 대형마트(이마트·홈플러스·롯데마트) 트렌드 MD 보고서
- 카카오·배민 홈 노출 카테고리 신규 진입

**편의점 3사 동시 출시 = evidenceLevel A 직결 조건.**
오프라인 유통망에서 동시 반응한다는 것은 이미 대중 수요 확인이 된 상태.

---

#### 내부 관찰 (`sourceType: 'internal'`)

수집 기준:
- 먹퀴즈 퀴즈 오답률 이상 패턴 (예: 특정 메뉴 정답률 70% 미만이면 인지도 과대 추정)
- 결과 화면 공유 텍스트에 메뉴명 언급 빈도
- 운영 팀 직접 관찰 (신규 카페 방문, 길거리 음식 목격)

내부 관찰만으로는 evidenceLevel B를 넘지 않음. 외부 소스 보강 필수.

---

### 소스 → 신호 정규화

수집된 신호를 아래 필드로 정규화한 뒤 중복 감지 단계로 넘깁니다:

```ts
interface RawSignal {
  name: string          // 메뉴 대표명 (정규화 전)
  aliases: string[]     // 수집된 이칭·해시태그
  sourceType: SourceType
  firstSeenAt: string   // YYYY-MM-DD
  sourceNote: string    // 수집 계기 한 줄 메모
}
```

**자동화 가능 지점**: Claude Code skill이 수집된 메모/목록을 받아 위 구조로 변환.

---

## STAGE 1 — Candidate Registry 등록

### 1-A. 중복 후보 감지 (Duplicate Merge)

신규 신호를 registry에 추가하기 전, 아래 순서로 중복을 확인합니다.

#### 감지 순서

```
① name 완전 일치         → 동일 후보 확정
② aliases 교집합 ≥ 1    → 동일 후보 확정
③ name 편집 거리 ≤ 2    → 유사 후보 (큐레이터 판단 요청)
④ visualKeywords Jaccard ≥ 0.4 → 유사 후보 (큐레이터 판단 요청)
⑤ 해당 없음             → 신규 후보로 진행
```

#### 병합 규칙

| 조건 | 처리 |
|------|------|
| 동일 후보 (①②) + 기존이 `archived` | 신규 신호의 `firstSeenAt`으로 archived 후보 **재활성화** 검토 (큐레이터 판단) |
| 동일 후보 (①②) + 기존이 `active/rising` | `sourceType` 배열에 새 출처 추가, `sourceNotes` 업데이트 |
| 유사 후보 (③④) | 큐레이터에게 병합 또는 독립 등록 선택 요청 |
| 신규 후보 | 아래 1-B 초안 생성으로 진행 |

중복 감지는 `/image-asset-research`와 유사한 Claude Code skill로 자동 실행 가능.
최종 병합 결정은 **반드시 큐레이터**가 수행.

---

### 1-B. evidenceLevel 산정

점수 기반 산정 — 아래 항목 점수 합산:

| 증거 항목 | 점수 |
|-----------|------|
| SNS 해시태그 1만+ (30일) | +1 |
| 틱톡/유튜브 100만 뷰+ | +1 |
| 뉴스/매거진 보도 2건+ | +1 |
| 편의점 1사 출시 | +1 |
| 편의점 2사 이상 동시 출시 | +2 (단독으로 A 조건) |
| 대형마트 정식 입점 | +1 |
| 내부 퀴즈 오답 패턴 포착 | +0.5 |

**판정 기준**:
- 합계 ≥ 3 → evidenceLevel `A` 심사 (큐레이터 최종 확정)
- 합계 1~2 → evidenceLevel `B`
- 합계 0 → registry 등록 금지 (신호 메모에만 보관)

**자동화 범위**: 점수 계산 및 등급 추천까지.
**수동 필수**: 큐레이터가 최종 evidenceLevel 확정.

---

### 1-C. trendStatus 판정 흐름

```
firstSeenAt 기준 경과일
        │
        ├─ < 90일 → rising 후보
        │   └─ SNS/뉴스 신호 다수? → rising 확정
        │   └─ 신호 약함?          → 큐레이터 보류 판단
        │
        ├─ 90일 ~ 18개월 + 오프라인 확산 확인 → active
        │   └─ peakStartAt 설정 권장
        │
        ├─ 편의점·카페 메뉴화 완료 + SNS 언급 감소 시작 → peak
        │   └─ peakStartAt 확정 필수
        │
        ├─ SNS 급감 + 전문점 폐업 신호 → declining
        │   └─ peakEndAt 설정
        │
        └─ declining > 6개월 지속 OR 일반 메뉴화 완전 정착 → archived 검토
```

**자동화 범위**: `firstSeenAt`, `peakStartAt`, `peakEndAt` 기준으로 `trendStatus` 추천.
**수동 필수**: 실제 오프라인 상황은 자동 감지 불가 → 큐레이터 최종 확정.

---

### 1-D. Archived 처리 기준

아래 중 **하나 이상** 충족 시 `archived` 심사:

| 조건 | 기준값 |
|------|--------|
| `peakEndAt` 경과 후 비활성 지속 | 6개월 이상 |
| SNS 해시태그 신규 게시 | 월 100건 미만으로 감소 |
| 전문 브랜드 폐업 / 단종 보도 | 2건 이상 |
| 편의점·카페 메뉴에서 제외 확인 | 2사 이상 |
| 일반 메뉴화 완전 정착 (더 이상 "트렌드"가 아님) | 큐레이터 판단 |

**archived 처리 규칙**:
- 레코드 삭제 금지 — `trendStatus: 'archived'`로 변경만
- `questionReady: true`였던 항목은 유지 (이미 만들어진 문항은 영구 활용 가능)
- `questionReady: false`였던 항목은 그대로 유지 (문항 초안 생성 대상에서 자동 제외됨)
- archived 후보는 seasonal pack에 "레트로" 테마로 재활용 가능 (큐레이터 재활성화 판단)

---

### 1-E. registry.ts 초안 생성

중복 없음 + evidenceLevel 점수 충분 → Claude Code skill이 아래 초안을 생성합니다:

```ts
{
  id: 'cnd_NNN',           // 기존 최대 id + 1
  name: '메뉴명',
  aliases: ['이칭1', '이칭2'],
  category: 'dessert',     // 수집 정보 기반 추론
  sourceType: ['sns', 'convenience'],
  firstSeenAt: 'YYYY-MM-DD',
  peakStartAt: undefined,  // 큐레이터가 확인 후 기입
  trendStatus: 'rising',   // 추천값 — 큐레이터 확정 필요
  visualKeywords: ['키워드1', '키워드2', '키워드3'],
  tags: ['태그1', '태그2'],
  evidenceLevel: 'B',      // 추천값 — 큐레이터 확정 필요
  sourceNotes: '수집 메모',
  questionReady: false,    // 항상 false로 시작 — 큐레이터만 true로 변경 가능
},
```

**`questionReady`는 항상 `false`로 초안 생성. 절대 `true` 자동 부여 금지.**

---

## STAGE 2 — Question 초안 생성

`questionReady: true` + `trendStatus !== 'archived'`인 후보에 대해서만 실행.

### 2-A. 문항 형식 추천 로직

```
후보 특성 분석
    │
    ├─ peakStartAt 연도 특정 가능 + visualKeywords 풍부
    │   → image_to_year 우선 추천
    │
    ├─ peakStartAt 연도 특정 가능 + 이미지 없음
    │   → menu_to_year 추천
    │
    ├─ 같은 연도에 유사 트렌드 2개 이상 존재
    │   → year_to_menu 추천 (해당 연도의 대표 메뉴 고르기)
    │
    └─ 사실 확인형 (출처·기원 관련)
        → ox 추천
```

### 2-B. 문항 초안 생성 필드

```ts
{
  id: 'q_NNN',
  format: 'menu_to_year',   // 추천된 형식
  category: 'dessert_trend',
  difficulty: 'medium',
  prompt: '이 메뉴가 SNS에서 가장 크게 유행한 시기는?',  // 초안 — 큐레이터 수정 필수
  choices: ['2022년', '2023년', '2024년', '2025년'],      // peakStartAt 기반 생성
  answer: '2024년',
  explanation: '큐레이터 작성 필요.',  // 자동 생성 금지
  evidenceLevel: 'B',       // 후보에서 상속
  tags: ['후보 태그 상속'],
  sourceNotes: '후보 sourceNotes 상속',
}
```

**자동 생성 금지 필드**: `explanation` (항상 큐레이터 직접 작성).
**자동 생성 가능 필드**: `prompt` 초안, `choices` (peakStartAt ± 2년 범위), `answer`.

### 2-C. 문항 초안 검증

생성 직후 `scripts/validate-content.mjs` 자동 실행:
- answer-in-choices 확인
- 중복 prompt 감지 (Jaccard ≥ 0.5이면 경고)
- schema 유효성

검증 실패 시 초안을 registry에 등록하지 않고 큐레이터에게 경고 보고.

---

## STAGE 3 — Seasonal Pack 반영

### 3-A. Pack 대상 선정 기준

seasonal pack에 포함할 문항 기준:

| 기준 | 조건 |
|------|------|
| evidenceLevel | A 필수. B는 trendStatus가 `rising`/`active`/`peak`일 때만 허용 |
| trendStatus | `archived` 제외 |
| explanation | 큐레이터 작성 완료 필수 |
| 이미지 문항 (image_to_year) | `approvalStatus: 'approved'` 이미지 에셋 존재 시만 포함 |

### 3-B. Pack 초안 생성

`/season-pack-generator` skill 실행 → seasonal pack JSON 초안 생성.
초안은 `src/features/content/packs/` 디렉토리에 저장.

**커밋·배포는 수동 단계.** Claude Code는 초안 파일을 작성하는 것까지만 수행.

---

## 도구 역할표

| 단계 | 자동화 도구 | 역할 | 수동 개입 |
|------|------------|------|----------|
| **S0** 신호 수집 | 없음 (수동 수집 기본) | — | 큐레이터가 직접 수집·기록 |
| **S0** 신호 정규화 | Claude Code (임시 skill) | `RawSignal` 구조로 정규화 | 기록 검토 |
| **S1-A** 중복 감지 | Claude Code skill | aliases + 편집거리 + Jaccard 검사 | 병합/독립 최종 결정 |
| **S1-B** evidenceLevel 점수 | Claude Code skill | 항목별 점수 합산 + 등급 추천 | 큐레이터 최종 확정 |
| **S1-C** trendStatus 추천 | Claude Code skill | 날짜 기반 상태 추천 | 큐레이터 최종 확정 |
| **S1-D** archived 판단 | Claude Code skill | 조건 충족 여부 감지 + 목록 제공 | 큐레이터 `archived` 확정 |
| **S1-E** registry 초안 | Claude Code skill | `cnd_NNN` 초안 생성 | registry.ts 수동 편집·커밋 |
| **S2** 문항 초안 | Claude Code skill (`/season-pack-generator` 앞단) | `prompt`·`choices`·`answer` 초안 | `explanation` 작성 + 검토 |
| **S2** 문항 검증 | Hook (PostToolUse + Stop) + `validate-content.mjs` | schema·중복·answer 자동 검사 | 경고 해소 |
| **S3** pack 초안 | `/season-pack-generator` skill | seasonal pack JSON 초안 | 검토 + 커밋 + 배포 |
| **S3** 이미지 에셋 | `/image-asset-research` skill | manifest 초안 생성 | 큐레이터 파일 확보 + approved 부여 |

### MCP 활용 여부

현재 설계에서 MCP는 **사용하지 않음**.

이유:
- 외부 API(SNS, 뉴스) 실시간 연동은 소스 품질·라이선스 문제 발생 가능
- Toss 미니앱 심사 기준 상 외부 의존도 최소화 원칙
- MCP 통한 자동 수집은 evidenceLevel A 판정의 근거로 인정하지 않음

MCP 도입 검토 시점: 월 100개 이상 신호를 수동으로 처리하기 어려워질 때.

### Hooks 활용 지점

```
PostToolUse (Write|Edit) → validate-content.mjs --stdin
  └─ 문항 JSON 저장 시마다 자동 schema + 중복 검사

Stop → validate-content.mjs --all
  └─ 세션 종료 시 전체 팩 일괄 검증 보고
```

---

## Human Approval 지점

파이프라인에서 사람이 반드시 개입해야 하는 지점 9곳:

```
[H1] 신호 수집     — 큐레이터가 직접 SNS/뉴스/리테일 모니터링
[H2] 중복 병합     — 유사 후보 병합 또는 독립 등록 결정
[H3] evidenceLevel — 추천 등급 확인 및 최종 확정
[H4] trendStatus   — 오프라인 상황 반영한 상태 확정
[H5] archived 처리 — 실제 트렌드 소멸 확인 후 archived 승인
[H6] questionReady — true로 변경하는 것은 큐레이터만 가능
[H7] explanation   — 문항 해설은 반드시 큐레이터가 직접 작성
[H8] 이미지 승인   — localPath 확보 + approvalStatus 'approved' 부여
[H9] pack 커밋·배포 — seasonal pack JSON의 git 커밋과 배포 승인
```

---

## 운영 주기 제안

### 주간 (매주 월요일)
- SNS 트리거 임계값 초과 신호 스캔 (큐레이터, 15분)
- 신규 신호 있으면 S0 정규화 → Claude Code skill 실행
- 결과 검토 후 registry 초안 있으면 [H2]~[H4] 수행

### 격주 (월 2회)
- evidenceLevel B 후보 중 상향 조건 충족 여부 재검토 [H3]
- trendStatus 일괄 재검토 — declining 후보 archived 검토 [H4][H5]
- 이미지 에셋 큐레이션 진행 (pending 항목 위주) [H8]

### 월간 (매달 1일)
- 뉴스/리테일 월간 트렌드 리포트 스캔 [H1]
- `questionReady: false` 후보 일괄 재검토 → [H6] 여부 판단
- `/season-pack-generator` 실행으로 다음 시즌팩 초안 생성
- explanation 미작성 문항 완성 [H7]

### 분기 (3개월 1회)
- archived 후보 레트로 재활용 가능성 검토
- evidenceLevel A 후보 중 seasonal pack 미반영 항목 우선순위 조정
- 파이프라인 자체 회고 (임계값·판단 기준 조정)

---

## 운영 부하 추정

| 단계 | 주간 예상 시간 | 담당 |
|------|--------------|------|
| S0 신호 수집 | 30분 | 큐레이터 |
| S1 registry 초안 검토 | 20분 | 큐레이터 |
| S2 explanation 작성 (신규 문항당) | 5분/건 | 큐레이터 |
| S2 검증 결과 확인 | 5분 | 자동 (hook) |
| S3 pack 검토·커밋 | 30분/분기 | 개발자 |

주간 총 큐레이터 부하: **신규 후보 없으면 0**, 신호 있으면 약 1~2시간.
월간 explanation 병목이 가장 큰 수작업 지점.

---

## 설계 결정 근거

### "자동화는 초안까지만" 원칙의 이유

1. **evidenceLevel A 자동 부여 금지**: SNS 지표는 마케팅 조작 가능. 편의점 출시는 직접 확인이 필요.
2. **explanation 자동 생성 금지**: 먹퀴즈의 핵심 가치는 "정확한 시대 맥락 설명". LLM 생성 설명은 사실 오류 위험이 높음.
3. **questionReady 자동 true 금지**: 준비되지 않은 문항이 퀴즈에 섞이면 사용자 경험 품질 직결 저하.
4. **pack 자동 배포 금지**: Toss 미니앱 심사 기준 상 콘텐츠 품질 보증 책임은 운영팀에 있음.

### 임계값 조정 방법

`PIPELINE.md`에서 직접 수치를 변경하고 큐레이터 팀이 리뷰.
코드에 하드코딩하지 않음 — 임계값은 운영 정책이지 기능 요구사항이 아님.
