---
name: candidate-intake
description: 최신 MZ 음식 트렌드 후보를 candidate registry에 추가하는 큐레이션 플레이북
type: content-curation
version: 1.0.0
related-files:
  - src/features/content/candidates/registry.ts
  - src/features/content/candidates/types.ts
  - src/features/content/candidates/selectors.ts
---

# Candidate Intake Playbook

## 개요

자동화는 **후보 수집 + 초안 생성**까지만 담당합니다.
`trendStatus` 확정, `evidenceLevel` 판정, `questionReady: true` 승인은 반드시 큐레이터 검토를 거칩니다.

```
신호 감지 (자동) → 초안 생성 (자동) → 큐레이터 검토 (수동) → registry 등록 (수동) → question 전환 (반자동)
```

이 경계를 넘어서는 자동화는 품질 문제를 초래합니다. 특히 `questionReady: true` 자동 부여는 금지입니다.

---

## 수집 주기

| 채널 | 주기 | 담당 |
|------|------|------|
| SNS (인스타그램·틱톡 해시태그) | 격주 | 큐레이터 |
| 뉴스·매거진 | 월 1회 | 큐레이터 |
| 편의점·리테일 신상품 | 월 1회 (편의점 3사 공지 기준) | 큐레이터 |
| 내부 관찰 (플레이 패턴, 사용자 피드백) | 수시 | 개발자 |

---

## PHASE 1 — 신호 감지

### 1-1. Source 유형별 수집 기준

#### SNS (`sourceType: 'sns'`)

수집 트리거 (아래 중 하나 이상):
- 인스타그램 해시태그 1만 건 이상 (30일 내 신규 게시물 기준)
- 틱톡 영상 누적 조회수 100만 이상
- 유튜브 관련 콘텐츠 3편 이상 (100만 뷰 이상 채널 기준)
- 트위터/스레드 실시간 트렌드 3회 이상 진입

수집 시 기록할 것:
```
- 플랫폼 이름
- 대표 해시태그 1~3개
- 최초 감지 일자 (firstSeenAt의 근거)
- 포착 계기 (예: "인스타 탐색 피드에 3회 이상 노출")
```

**SNS만으로는 evidenceLevel B** — 오프라인 확산(카페 메뉴·편의점 출시)이 추가되어야 A로 상향됩니다.

#### 뉴스·매거진 (`sourceType: 'news'`)

수집 트리거 (아래 중 하나 이상):
- 중앙일보·조선일보·한겨레 등 일간지에 2회 이상 언급
- 식품 전문 매거진 (더 푸드, 미식 등) 특집 기사 게재
- 방송 3사 뉴스 아이템 편성

수집 시 기록할 것:
```
- 매체명 + 기사 제목
- 게재일
- 핵심 인용 1줄 (예: "MZ세대 새벽 줄서기 음식으로 등극")
```

**뉴스 단독 등장 = 잠재 후보**, 오프라인 유통 또는 SNS 동반 시 evidenceLevel A 승격 검토.

#### 리테일·편의점 (`sourceType: 'convenience'`)

수집 트리거 (아래 중 하나 이상):
- 편의점 2사 이상 동일 카테고리 신상품 동시 출시
- 대형마트 HMR(가정간편식) 신규 라인 런칭
- 프랜차이즈 카페 2사 이상 동일 메뉴 출시 (계절 한정 제외)

수집 시 기록할 것:
```
- 출시 브랜드 (예: "GS25, CU 동시 출시")
- 출시 날짜
- 출시 가격대 (대중화 지표)
- 오픈런 여부
```

**편의점 출시 = 대중화 신호 → evidenceLevel A 강한 근거**.
단, 기존 트렌드의 파생 상품(예: 흑당 맛 과자)은 신규 candidate가 아닌 기존 candidate의 sourceNotes 보강으로 처리합니다.

#### 내부 관찰 (`sourceType: 'restaurant'` / `'homecook'` / 큐레이터 직접 관찰)

수집 트리거:
- 퀴즈 정답률이 유독 낮거나 높은 카테고리 (사용자가 모르는 신 트렌드 또는 너무 잘 아는 구 트렌드)
- 큐레이터가 식당·카페에서 직접 목격
- 홈베이킹 커뮤니티(유튜브 레시피, 네이버 카페)에서 반복 등장

수집 시 기록할 것:
```
- 관찰 일자 + 장소 (예: "2025-03-15 성수동 카페 거리 3곳")
- 발견 맥락 한 줄
```

내부 관찰은 단독으로 evidenceLevel A가 될 수 없습니다. 반드시 SNS 또는 리테일 출처와 병행해야 합니다.

---

## PHASE 2 — 초안 작성

### 2-1. 초안 필드 채우기 순서

```
1. name         — 가장 많이 쓰이는 표기 사용 (검색 결과 빈도 기준)
2. aliases      — SNS 해시태그, 줄임말, 영문 표기
3. category     — 아래 매핑표 참조
4. sourceType   — 수집 채널 (복수 가능)
5. firstSeenAt  — 최초 신호 감지 일자 (YYYY-MM-DD)
6. trendStatus  — 아래 판정 기준 참조
7. evidenceLevel — 아래 판정 기준 참조
8. visualKeywords — 아래 작성 규칙 참조
9. tags         — 카테고리·출처·특성 키워드
10. sourceNotes — 아래 작성 규칙 참조
11. questionReady — 초안 단계에서는 반드시 false 또는 생략
```

초안 단계에서 `peakStartAt`이 불명확하면 생략합니다.
`questionReady`는 **큐레이터 최종 승인 전까지 절대 true 설정 금지**입니다.

### 2-2. 카테고리 매핑표

| 음식 유형 | CandidateCategory | 매핑 퀴즈 카테고리 |
|-----------|-------------------|--------------------|
| 케이크·아이스크림·파르페·라떼류 | `dessert` | `dessert_trend` |
| 과자·쿠키·떡·길거리 간식 | `snack` | `snack_recall` |
| 편의점 전용 출시 상품 | `convenience` | `convenience_dessert` |
| 혼밥·혼술·한 끼 식사 | `meal` | `solo_meal` |
| 건강식·고단백·저당 | `wellness` | `wellness_food` |
| 음료·버블티·에이드 | `drink` | *(확장 대비)* |

음료가 디저트 카테고리에도 해당하면 주 소비 맥락 기준으로 판단합니다.
(예: 흑임자 라떼 → 카페 디저트 목적 → `drink`보다 `dessert` 더 적합하면 `dessert`로)

---

## PHASE 3 — trendStatus 판정

### 판정 의사결정 트리

```
Q1. 처음 등장한 지 6개월 미만이고 SNS 중심 확산 중인가?
    YES → rising

Q2. 오프라인(카페·편의점·음식점)으로 본격 확산되었는가?
    + 일반 대중도 알고 있는가?
    YES → active

Q3. 전국 편의점 or 대형 프랜차이즈 전국 도입,
    뉴스에 매주 등장, 최고 화제 상태인가?
    YES → peak

Q4. 신규 언급이 줄고, 전문점 폐업·메뉴 삭제가 시작되었는가?
    YES → declining

Q5. 더 이상 신규 언급이 없고, 일반 메뉴화 또는 완전 소멸인가?
    YES → archived
```

### trendStatus별 기준 요약

| 상태 | 기간 기준 | 주 신호 |
|------|----------|---------|
| `rising` | 0~6개월 | SNS 해시태그 증가, 일부 카페만 취급 |
| `active` | 6개월~2년 | 편의점 출시, 프랜차이즈 도입, 대중 인지 |
| `peak` | 수주~3개월 | 오픈런, 뉴스 집중 보도, 최고 검색량 |
| `declining` | peak 이후 | 전문점 폐업, 언급량 감소, 신규 진입자 중단 |
| `archived` | 트렌드 소멸 | 일반 메뉴화 or 완전 소멸 |

**peak는 오래 지속되지 않습니다.** peak로 판정 후 2개월 이내 declining으로 전환 여부를 재검토합니다.

### trendStatus 변경 규칙

- 상태는 일방향으로만 진행합니다: `rising → active → peak → declining → archived`
- **역방향 변경 금지** (declining → active 등)
- 상태 변경 시 sourceNotes에 변경 날짜와 근거를 한 줄 추가합니다
- archived로 변경 후에는 `questionReady` 값을 변경하지 않습니다 (히스토리 보존)

---

## PHASE 4 — evidenceLevel 판정

| 등급 | 조건 | 의미 |
|------|------|------|
| **A** | 아래 중 2개 이상 충족 | 문항화 가능 수준의 충분한 근거 |
| **B** | 1개만 충족 | 추적 중, 문항화 보류 |
| ~~C~~ | 소문·1차 관찰만 존재 | **등록 금지** |

**evidenceLevel A 충족 조건** (2개 이상 필요):
1. 편의점 2사 이상 또는 프랜차이즈 카페 2사 이상 출시
2. 일간지 또는 공중파 뉴스 보도 1회 이상
3. SNS 해시태그 누적 10만 건 이상
4. 전문점 프랜차이즈 런칭 (가맹점 10호점 이상)
5. 큐레이터 현장 확인 + SNS 동반 확인

**evidenceLevel B → A 상향 조건**: 신규 출처가 추가될 때마다 재평가합니다.
상향 시 sourceNotes에 날짜와 근거를 기록합니다.

---

## PHASE 5 — candidate → question draft 전환 기준

### 전환 가능 조건 (모두 충족)

```
evidenceLevel === 'A'
  AND peakStartAt 존재 (피크 시기를 특정 가능)
  AND trendStatus !== 'archived'  ← archived도 전환 불가 (seasonal pack 목적)
  AND 큐레이터 최종 승인
```

### 전환 판단 기준

| 조건 | 판단 |
|------|------|
| peakStartAt 있고 피크 연도를 특정할 수 있음 | 전환 가능 |
| peakStartAt 불명확 (범위만 앎, 예: "2024년 상반기") | 가장 이른 월로 추정 기입 후 sourceNotes에 "추정값" 명시 |
| 여러 피크가 있음 (재유행) | 가장 크게 유행한 1차 피크 기준 |
| declining이지만 peakStartAt 명확 | 전환 가능 (과거 트렌드 회상 문제로 활용 가능) |

### 전환 시 큐레이터 체크리스트

- [ ] `peakStartAt`이 실제 데이터에 근거하는가 (추정이면 sourceNotes에 명시)
- [ ] 문제로 만들기에 충분히 유명한가 (MZ 세대 20~30% 이상 인지)
- [ ] 기존 registry에 동일하거나 매우 유사한 후보가 없는가
- [ ] 계절·지역 한정이 아닌 전국적 트렌드인가

체크리스트 통과 후 `questionReady: true`를 설정하고 PR 설명에 근거를 기록합니다.

---

## PHASE 6 — archived / deprecated 처리

### archived 전환 기준 (아래 중 하나 이상)

- 전문 브랜드 폐업율 50% 초과
- 주요 SNS 해시태그 월간 신규 게시물이 피크 대비 10% 미만
- 편의점·프랜차이즈에서 해당 메뉴 일괄 삭제
- 큐레이터 현장 확인: 서울 주요 상권 3곳에서 해당 메뉴 미확인

**archived 처리 방법**:
```ts
trendStatus: 'archived',
peakEndAt: 'YYYY-MM-DD',   // 트렌드 소멸 감지 시점
// sourceNotes에 소멸 이유 한 줄 추가
// questionReady는 변경하지 않음 (기존 true → 유지, 과거 회상 문항으로 재활용 가능)
```

### deprecated (registry에서 제거)

**제거 조건**: 아래 중 하나만 해당되어도 제거합니다.
- evidenceLevel C 수준으로 재평가됨 (처음부터 근거 불충분이었음이 밝혀진 경우)
- 기존 candidate와 merge됨 (중복 판정)
- 오염된 데이터 (오기입, 존재하지 않는 트렌드)

**제거 방법**: 배열에서 항목을 삭제하고 git commit 메시지에 이유를 명시합니다.
archived와 달리 deprecated는 히스토리가 git log에 남으므로 배열 잔존 불필요합니다.

---

## sourceNotes 작성 규칙

### 형식

```
<기원 또는 유입 경로>. <확산 계기>. <현황 또는 특이사항>.
```

- 1~3문장. 마침표로 각 항을 구분합니다.
- 해요체 금지. 명사형 종결 또는 단문 서술.
- URL 포함 금지 (URL은 시간이 지나면 죽음).
- 숫자 근거가 있으면 포함 (예: "편의점 3사", "오픈런 2주 지속").

### 좋은 예시

```
필리핀산 우베(보라 고구마) 기반. 인스타 해시태그 급증. 국내 필리핀 식문화 관심 증가와 맞물려 확산.
```
```
중동 기원. 국내 편의점 3사 동시 출시. 오픈런 현상. 피스타치오 크런치 질감이 SNS 인증샷 소재.
```

### 나쁜 예시

```
인스타에서 엄청 유명해짐.                         ← 수치 없음, 너무 모호
https://instagram.com/... 에서 확인 가능.          ← URL 포함 금지
2024년 10월에 엄청 유행했어요. 지금도 유행 중.     ← 해요체, 모호한 시기
```

### trendStatus 변경 시 추가 패턴

```
기존 내용. [YYYY-MM-DD] declining 전환: 전문점 폐업 증가, SNS 언급 감소.
기존 내용. [YYYY-MM-DD] archived 전환: 주요 프랜차이즈 메뉴 삭제 확인.
```

---

## visualKeywords 작성 규칙

퀴즈 이미지 생성·에셋 검색 시 사용하는 시각적 특징어입니다.

### 3가지 레이어 구조

```
레이어 1 (식품 자체): 색상, 형태, 질감, 주재료
레이어 2 (맥락):     제공 용기, 배경 환경 (카페·편의점·길거리)
레이어 3 (연상):     원산지·문화적 키워드 (있을 경우)
```

### 작성 기준

- 3~6개 작성 (최소 3개, 최대 6개)
- 명사 또는 명사구. 동사·형용사 단독 사용 금지.
- 구체적일수록 좋음: "음료" (X) → "보라색 라떼" (O)
- 재료명 + 시각 형용사 조합 권장

### 예시 비교

| 후보 | 나쁜 예 | 좋은 예 |
|------|---------|---------|
| 우베 라떼 | `음료`, `카페`, `보라` | `보라색 라떼`, `카페 음료`, `필리핀 식재료`, `우베 크림` |
| 탕후루 | `과일`, `설탕`, `달다` | `설탕 코팅`, `딸기 꼬치`, `길거리 간식`, `투명 크런치` |
| 말차쫀득쿠키 | `쿠키`, `녹색`, `홈베이킹` | `녹색 쿠키`, `말차 파우더`, `홈베이킹 도구`, `쫀득한 질감` |

---

## 중복 candidate merge 규칙

### 중복 판정 기준

아래 중 2개 이상 해당하면 중복으로 판정합니다.

1. name 또는 aliases가 기존 항목과 동일하거나 포함 관계
2. category + peakStartAt이 기존 항목과 6개월 이내 일치
3. visualKeywords가 50% 이상 겹침

### merge 방법

기존 항목(낮은 id)을 마스터로 유지하고 신규 항목을 흡수합니다.

```ts
// Before: cnd_006 흑임자 라떼 + 신규 초안 "검은깨 라떼"
// After: cnd_006에 merge

{
  id: 'cnd_006',
  name: '흑임자 라떼',
  aliases: ['흑임자 음료', '검은깨 라떼', '흑임자 음료'],  // ← aliases에 추가
  // 신규 초안에서 더 구체적인 sourceNotes가 있으면 병합
  // visualKeywords는 union 취하되 6개 초과 시 덜 구체적인 것 제거
}
```

### 파생 상품은 merge 대상이 아님

기존 트렌드의 파생 상품은 별도 candidate가 아닌 기존 항목의 sourceNotes 또는 aliases 보강으로 처리합니다.

```
흑당 밀크티 (cnd_010) 존재 시:
  → 흑당 버터쿠키 = 파생 상품 → cnd_010 sourceNotes 보강
  → 흑당 아이스크림 = 파생 상품 → cnd_010 aliases 추가
  → 흑당 라멘 = 별도 카테고리(meal) → 신규 candidate 등록 검토
```

---

## 단계별 승인 흐름

```
┌─────────────────────────────────────────────────────────────┐
│  PHASE 1  신호 감지                                          │
│  큐레이터가 SNS/뉴스/리테일에서 후보 포착                    │
│  → 수집 채널별 최소 기준 충족 여부 확인                      │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  PHASE 2  초안 작성 (자동화 가능)                            │
│  name / aliases / category / sourceType / firstSeenAt       │
│  visualKeywords / tags / sourceNotes 초안 작성               │
│  questionReady: false 설정 (또는 생략)                       │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  GATE 1 ✋ 큐레이터 검토 — evidenceLevel + trendStatus 확정  │
│  □ evidenceLevel A/B 판정                                    │
│  □ trendStatus 판정                                          │
│  □ peakStartAt 근거 있으면 기입                              │
│  □ 기존 registry와 중복 여부 확인 → 필요 시 merge           │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  PHASE 3  registry.ts에 항목 추가                            │
│  id: 'cnd_XXX' (기존 최대 id + 1)                           │
│  questionReady: false 유지                                   │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  PHASE 4  자동 검증                                          │
│  npx vitest run src/.../selectors.test.ts                   │
│  (schema 오류, id 중복, evidenceLevel C 자동 차단)           │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  GATE 2 ✋ 큐레이터 검토 — questionReady 승인                │
│  □ peakStartAt 특정 가능한가                                 │
│  □ MZ 20~30% 이상 인지하는 트렌드인가                        │
│  □ 문항으로 만들기에 흥미로운가                              │
│  □ 기존 팩과 중복 문제가 없는가                              │
│  모두 YES → questionReady: true 설정                         │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  PHASE 5  question draft 생성 (반자동)                       │
│  /season-pack-generator 실행                                 │
│  → 초안 JSON 생성                                            │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  GATE 3 ✋ 큐레이터 검토 — 문항 품질 최종 확인               │
│  □ prompt가 30자 이내이고 직관적인가                         │
│  □ explanation이 1문장 해요체인가                            │
│  □ answer가 choices에 정확히 포함되는가                      │
│  □ 난이도가 적절한가 (너무 쉽거나 어렵지 않음)              │
└────────────────────┬────────────────────────────────────────┘
                     ↓
              seasonal pack 등록 및 배포
```

---

## 우베·말차쫀득쿠키 샘플 흐름

### 우베 라떼 (cnd_001) — 현재 rising/B, questionReady: false

```
2024-03  PHASE 1: 인스타그램 #우베라떼 해시태그 3,000건 감지 → 등록 트리거
2024-03  PHASE 2: 초안 작성. sourceType: ['sns', 'cafe_menu'], evidenceLevel: B (SNS만)
         GATE 1:  SNS 단독 확산 → evidenceLevel B 확정. rising 확정.
         PHASE 3: cnd_001으로 registry 등록. questionReady: false.
2024-07  ←현재→  peakStartAt 추정 기입. 아직 오프라인 미확산 → evidenceLevel B 유지.

─── 다음 Action ──────────────────────────────────────────────
국내 카페 프랜차이즈 2사 이상 메뉴 채택 확인 시 → evidenceLevel A 상향
peakStartAt 확정 후 → GATE 2 진행 → questionReady: true 검토
```

### 말차쫀득쿠키 (cnd_003) — 현재 active/B, questionReady: false

```
2024-01  PHASE 1: 홈베이킹 유튜브 채널 레시피 영상 50만 뷰 → 등록 트리거
2024-01  PHASE 2: 초안 작성. sourceType: ['sns', 'homecook']
         GATE 1:  SNS + homecook 확산이지만 오프라인 미확산 → evidenceLevel B.
                  active 판정 (홈베이킹 커뮤니티 전반 확산 중).
2024-04  peakStartAt: '2024-04-01' 추정 기입.

─── evidenceLevel A 상향 조건 미달 ──────────────────────────
· 편의점 출시 없음 (homecook 한정)
· 뉴스 보도 없음
→ questionReady: false 유지. 카페 출시 또는 편의점 출시 모니터링 중.

─── 만약 카페 2사 이상 출시 확인되면 ────────────────────────
evidenceLevel A 상향 → GATE 2 → questionReady: true → 문항화 가능
```

---

## 후보 등록 예시 5개

### 예시 1 — 소금버터롤 (bakery/snack, evidenceLevel A, archived)

```ts
{
  id: 'cnd_013',
  name: '소금버터롤',
  aliases: ['소금빵', '버터소금빵', 'salt butter roll'],
  category: 'snack',
  sourceType: ['cafe_menu', 'sns', 'convenience'],
  firstSeenAt: '2021-11-01',
  peakStartAt: '2022-06-01',
  peakEndAt: '2023-06-30',
  trendStatus: 'archived',
  visualKeywords: ['결 있는 빵', '황금색 버터 크러스트', '소금 토핑', '카페 베이커리'],
  tags: ['베이커리', '카페', '버터', '소금', 'SNS'],
  evidenceLevel: 'A',
  sourceNotes: '일본 오사카 기원 소금버터롤. 2022년 국내 독립 카페 중심 확산 후 편의점 3사 출시. 2023년 이후 일반 메뉴화로 트렌드 소멸.',
  questionReady: true,
},
```

**등록 근거**: 편의점 3사 출시(조건 1) + 일간지 보도 2회(조건 2) → evidenceLevel A.
peakStartAt 특정 가능 + 트렌드 소멸 확인 → archived 처리, questionReady: true 유지.

---

### 예시 2 — 마라 크림새우 (meal, evidenceLevel B, rising)

```ts
{
  id: 'cnd_014',
  name: '마라 크림새우',
  aliases: ['마라새우', '크림 마라새우'],
  category: 'meal',
  sourceType: ['sns', 'restaurant'],
  firstSeenAt: '2025-01-01',
  peakStartAt: undefined,
  trendStatus: 'rising',
  visualKeywords: ['빨간 소스', '크림 코팅 새우', '마라 향신료', '식당 메뉴판'],
  tags: ['한 끼', '마라', '새우', 'SNS', '중식 퓨전'],
  evidenceLevel: 'B',
  sourceNotes: '마라 열풍의 파생 메뉴. 2025년 서울 홍대·성수 식당 중심 SNS 확산 시작. 편의점 미출시.',
  questionReady: false,
},
```

**등록 근거**: SNS 확산 초기(조건 1 하나만) → evidenceLevel B. peakStartAt 불명확 → 생략.
모니터링 대상: 편의점 출시 또는 프랜차이즈 채택 시 evidenceLevel A 상향 검토.

---

### 예시 3 — 유자 에이드 (drink, evidenceLevel A, peak)

```ts
{
  id: 'cnd_015',
  name: '유자 에이드',
  aliases: ['유자 음료', '유자 스파클링', '유자 레몬에이드'],
  category: 'drink',
  sourceType: ['cafe_menu', 'sns', 'convenience'],
  firstSeenAt: '2024-04-01',
  peakStartAt: '2024-07-01',
  trendStatus: 'peak',
  visualKeywords: ['노란 에이드', '유자 슬라이스', '탄산 음료', '카페 여름 음료'],
  tags: ['음료', '여름', '카페', '유자', '에이드'],
  evidenceLevel: 'A',
  sourceNotes: '국내산 유자 활용 카페 에이드. 스타벅스·메가커피 여름 한정 출시로 대중화. GS25·CU 페트병 에이드 동시 출시. 2024년 여름 최다 주문 음료 1위 기록.',
  questionReady: true,
},
```

**등록 근거**: 카페 2사 이상 출시(조건 1) + 편의점 2사 출시(조건 1 중복) + 뉴스 보도(조건 2) → evidenceLevel A.
peakStartAt 명확 → GATE 2 통과 → questionReady: true.

---

### 예시 4 — 오트밀 쿠키 볼 (wellness, evidenceLevel B, active)

```ts
{
  id: 'cnd_016',
  name: '오트밀 쿠키 볼',
  aliases: ['오트볼', '오트밀 에너지볼', 'oat ball'],
  category: 'wellness',
  sourceType: ['sns', 'homecook'],
  firstSeenAt: '2023-10-01',
  peakStartAt: '2024-03-01',
  trendStatus: 'active',
  visualKeywords: ['둥근 귀리 간식', '초코칩 오트볼', '홈메이드 포장', '단백질 간식'],
  tags: ['건강식', '홈베이킹', '오트밀', '단백질', '저당'],
  evidenceLevel: 'B',
  sourceNotes: '유튜브 다이어트 레시피 채널 확산. 홈베이킹 커뮤니티 주요 레시피. 대형마트 HMR 출시 미확인.',
  questionReady: false,
},
```

**등록 근거**: SNS + homecook 확산(조건 1 하나만) → evidenceLevel B.
대형마트 HMR 또는 프랜차이즈 카페 출시 확인 시 재평가 예정.

---

### 예시 5 — 버블 아이스크림 (dessert, evidenceLevel A, declining)

```ts
{
  id: 'cnd_017',
  name: '버블 아이스크림',
  aliases: ['팝핑 아이스크림', '버블팝 아이스크림'],
  category: 'dessert',
  sourceType: ['convenience', 'sns'],
  firstSeenAt: '2023-05-01',
  peakStartAt: '2023-08-01',
  peakEndAt: '2024-02-28',
  trendStatus: 'declining',
  visualKeywords: ['터지는 사탕 아이스크림', '팝핑캔디', '편의점 아이스크림', '파란색 포장'],
  tags: ['디저트', '편의점', '아이스크림', '팝핑', 'SNS'],
  evidenceLevel: 'A',
  sourceNotes: '팝핑캔디 식감 아이스크림. GS25 단독 출시 후 편의점 전체 확산. 2023년 여름 SNS 인증샷 열풍. 2024년 이후 신제품 없이 정체.',
  questionReady: true,
},
```

**등록 근거**: 편의점 3사 확산(조건 1) + SNS 해시태그 10만+(조건 3) → evidenceLevel A.
declining이지만 peakStartAt 명확 → 과거 회상 문항 가능 → questionReady: true.

---

## 체크리스트 — 등록 전 최종 확인

### GATE 1 체크리스트 (큐레이터)

- [ ] evidenceLevel 판정 근거가 sourceNotes에 기록되어 있는가
- [ ] trendStatus가 판정 기준에 부합하는가
- [ ] firstSeenAt이 최초 신호 감지 날짜인가 (출시일이 아님)
- [ ] aliases에 SNS 해시태그, 줄임말, 영문 표기가 포함되었는가
- [ ] visualKeywords가 3~6개이고 구체적인가
- [ ] 기존 registry와 중복되지 않는가 (aliases 교차 검색)
- [ ] questionReady가 false 또는 생략 상태인가

### GATE 2 체크리스트 (큐레이터, questionReady: true 승인 전)

- [ ] evidenceLevel === 'A'인가
- [ ] peakStartAt이 존재하고 특정 월 기준인가
- [ ] MZ 세대 20~30% 이상이 알 법한 트렌드인가
- [ ] trendStatus가 archived가 아닌가
- [ ] 기존 seasonal pack 문항과 유사한 prompt를 만들지 않을 수 있는가

---

## 관련 도구

| 도구 | 용도 |
|------|------|
| `npx vitest run src/features/content/candidates/selectors.test.ts` | registry 등록 후 schema 검증 |
| `/season-pack-generator` | questionReady: true 후보 → question draft 생성 |
| `node scripts/validate-content.mjs --all` | 생성된 pack JSON 무결성 검증 |
