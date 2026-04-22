---
name: kpi-dashboard
description: 먹퀴즈 v3 운영 대시보드 KPI 정의 및 모니터링 기준 문서
type: operations
version: 1.0.0
related-files:
  - src/features/analytics/events.ts
  - src/features/analytics/logEvent.ts
  - src/features/state/userQuizState.ts
  - src/features/content/imageAssets.ts
---

# v3 운영 대시보드 & KPI 정의

---

## 현재 계측 현황

`src/features/analytics/events.ts`에 등록된 이벤트 (v2 기준):

| 이벤트 | 상태 | 페이로드 |
|--------|------|---------|
| `home_view` | ✅ 존재 | — |
| `quiz_start` | ✅ 존재 | pack_id |
| `question_answered` | ✅ 존재 | question_id, category, question_type, is_correct |
| `quiz_complete` | ✅ 존재 | score, total, result_type, pack_id |
| `result_retry_clicked` | ✅ 존재 | — |

v3 KPI 달성을 위해 **추가로 계측해야 할 이벤트**는 각 KPI 항목의 `필요 이벤트` 열에 🆕로 표시합니다.

---

## 이벤트 추가 명세 (v3 계측 확장)

`src/features/analytics/events.ts`에 추가할 이벤트 목록입니다.

```ts
// 추가 이벤트 (events.ts EVENTS 상수에 병합)
DAILY_QUIZ_START:        'daily_quiz_start',
WRONG_NOTE_RETRY_START:  'wrong_note_retry_start',
WRONG_NOTE_RESOLVED:     'wrong_note_resolved',
SEASONAL_PACK_START:     'seasonal_pack_start',
RESULT_SHARE_CLICKED:    'result_share_clicked',
RESULT_SHARE_OUTCOME:    'result_share_outcome',
STATE_SYNC_FAILED:       'state_sync_failed',
STALE_HISTORY_DETECTED:  'stale_history_detected',
IMAGE_FALLBACK_USED:     'image_fallback_used',
```

```ts
// 추가 페이로드 (EventPayloadMap에 병합)
daily_quiz_start:       { date_key: string }
wrong_note_retry_start: { wrong_count: number }
wrong_note_resolved:    { question_id: string; attempt_count: number }
seasonal_pack_start:    { pack_id: string; pack_title: string }
result_share_clicked:   { result_type: string; score: number; total: number }
result_share_outcome:   { outcome: 'shared' | 'copied' | 'unavailable' }
state_sync_failed:      { operation: 'read' | 'write'; key: string }
stale_history_detected: { field: string; session_count: number }
image_fallback_used:    { question_id: string; category: string }

// 기존 quiz_start 페이로드에 session_type 추가
quiz_start:             { pack_id: string; session_type: 'normal' | 'daily' | 'seasonal' | 'wrong_note' | 'category' }
// 기존 quiz_complete 페이로드에 wrong_count, session_type 추가
quiz_complete:          { score: number; total: number; result_type: string; pack_id: string; wrong_count: number; session_type: string }
```

---

## 섹션 1 — 제품 KPI

### P1 — 퀴즈 전환 퍼널

| KPI | 정의 | 계산식 | 목표 | 필요 이벤트 |
|-----|------|--------|------|------------|
| **홈→퀴즈 전환율** | 홈 진입 후 퀴즈를 시작한 비율 | `quiz_start / home_view` | ≥ 55% | ✅ 기존 |
| **퀴즈 완주율** | 퀴즈 시작 후 완료까지 도달한 비율 | `quiz_complete / quiz_start` | ≥ 80% | ✅ 기존 |
| **평균 정답률** | 완료된 세션의 평균 점수 | `avg(score / total)` per quiz_complete | ≥ 0.60 | ✅ 기존 |

### P2 — 기능별 활성화율

| KPI | 정의 | 계산식 | 목표 | 필요 이벤트 |
|-----|------|--------|------|------------|
| **daily quiz start rate** | 홈 진입 대비 오늘의 퀴즈 시작 비율 | `daily_quiz_start / home_view` | ≥ 25% | 🆕 `daily_quiz_start` |
| **wrong-note retry rate** | 오답 노트 접근 가능 사용자 대비 복습 시작 비율 | `wrong_note_retry_start / home_view with wrong_note eligible` | ≥ 30% | 🆕 `wrong_note_retry_start` |
| **wrong-note resolution rate** | 복습 시작 세션에서 오답 재도전 후 정답 전환 비율 | `wrong_note_resolved / (wrong_note_retry_start × avg_wrong_count)` | ≥ 50% | 🆕 `wrong_note_resolved` |
| **seasonal pack start rate** | 홈 진입 대비 시즌팩 퀴즈 시작 비율 | `seasonal_pack_start / home_view` | ≥ 20% | 🆕 `seasonal_pack_start` |
| **result share click rate** | 퀴즈 완료 대비 공유 버튼 클릭 비율 | `result_share_clicked / quiz_complete` | ≥ 10% | 🆕 `result_share_clicked` |

### P3 — 리텐션 지표

| KPI | 정의 | 계산식 | 목표 | 데이터 소스 |
|-----|------|--------|------|------------|
| **D1 Retention** | 첫 세션 후 다음날 재방문 비율 | D+1 `home_view` / D0 첫 `quiz_complete` 사용자 수 | ≥ 30% | analytics |
| **D7 Retention** | 첫 세션 후 7일 내 재방문 비율 | D+7 내 `home_view` / D0 첫 `quiz_complete` 사용자 수 | ≥ 20% | analytics |
| **daily quiz 연속 사용일** | 오늘의 퀴즈를 연속으로 시작한 평균 일수 | `daily_quiz_start` 연속 날짜 스트릭 avg | ≥ 3일 | analytics |

---

## 섹션 2 — 콘텐츠 KPI

| KPI | 정의 | 계산식 | 목표 | 알림 기준 |
|-----|------|--------|------|----------|
| **문항별 정답률** | 각 question_id의 정답률 | `is_correct=true / total answered` per question_id | — | 정답률 < 15% or > 95% → 난이도 재검토 |
| **카테고리별 평균 정답률** | 카테고리별 정답률 분포 | `avg(is_correct)` per category | — | 특정 카테고리 ≤ 30% → 문항 과도 어려움 |
| **image fallback rate** | image_to_year 문항 중 실제 이미지 없이 placeholder로 대체된 비율 | `image_fallback_used / total image_to_year questions answered` | < 20% | > 50% → 이미지 에셋 등록 필요 |
| **evidenceLevel A 문항 정답률** | 근거 충분한 문항의 정답률 | `is_correct per evidenceLevel A questions` | ≥ 55% | — |
| **팩별 완주율** | 팩별 quiz_complete / quiz_start | per pack_id | ≥ 75% | < 60% → 팩 난이도 또는 UX 문제 |
| **공유 성공율** | 공유 클릭 중 실제 공유 완료 비율 | `outcome=shared / result_share_clicked` | ≥ 60% | < 30% → Web Share API 환경 이슈 |

---

## 섹션 3 — 상태 일관성 오류 KPI

| KPI | 정의 | 계산식 | 임계치 | 필요 이벤트 |
|-----|------|--------|--------|------------|
| **state sync failure count** | localStorage read/write 실패 횟수 | `count(state_sync_failed)` per day | > 10건/일 → P1 알림 | 🆕 `state_sync_failed` |
| **stale history incidence** | 불완전하거나 손상된 history 항목 감지 비율 | `stale_history_detected / home_view` | > 1% → 즉시 조사 | 🆕 `stale_history_detected` |
| **schema version mismatch** | schemaVersion !== 1로 defaultState 강제 초기화된 비율 | state load 시 schema 불일치 감지 / total state load | > 0.5% → 마이그레이션 필요 | `state_sync_failed` 확장 |
| **image fallback rate** | *(콘텐츠 KPI와 동일, 에러 관점 재정의)* image 로드 실패로 placeholder 사용 | `image_fallback_used / image_to_year answered` | > 30% → 에셋 CDN 이슈 | 🆕 `image_fallback_used` |

### stale history 감지 기준

`loadUserQuizState()` 실행 시 아래 조건을 체크합니다.

```ts
// 감지 기준 (src/features/state/userQuizState.ts 내 확장 예정)
const STALE_CHECKS = [
  (h: QuizHistoryItem) => !h.sessionId,           // sessionId 없음
  (h: QuizHistoryItem) => !h.playedAt,             // playedAt 없음
  (h: QuizHistoryItem) => h.score < 0 || h.score > 1,  // score 범위 이상
  (h: QuizHistoryItem) => h.correctCount > h.totalCount, // 논리 오류
]
```

---

## 섹션 4 — 출시 후 2주 집중 모니터링

출시 후 1~2주는 기능 전체보다 **안정성과 핵심 전환율**을 우선합니다.

### 1주차 (D1~D7) — 안정성 + 퍼널

```
우선 지표:
  ① 퀴즈 완주율               목표 ≥ 80%    이탈 지점 파악
  ② state sync failure count  목표 < 5건/일  앱 안정성
  ③ stale history incidence   목표 < 1%      데이터 무결성
  ④ image fallback rate       목표 < 30%     에셋 상태
  ⑤ 홈→퀴즈 전환율            목표 ≥ 55%     UX 진입 장벽

후순위 (확인만):
  - 평균 정답률
  - 팩별 완주율
  - result_retry_clicked 비율
```

### 2주차 (D8~D14) — 기능 활성화

```
추가 집중 지표:
  ⑥ daily quiz start rate     목표 ≥ 25%     데일리 루프 형성
  ⑦ wrong-note retry rate     목표 ≥ 30%     복습 기능 발견율
  ⑧ seasonal pack start rate  목표 ≥ 20%     시즌팩 인지도
  ⑨ result share click rate   목표 ≥ 10%     바이럴 루프 초기 신호

판단 기준:
  - ⑥이 25% 미달 → 홈 데일리 카드 노출 위치/타이밍 재검토
  - ⑦이 30% 미달 → 오답 노트 진입점 가시성 재검토
  - ⑧이 20% 미달 → 시즌팩 허브 UI 또는 메시지 알림 검토
  - ⑨이 5% 미달  → 공유 버튼 노출 타이밍 또는 카피 재검토
```

---

## 섹션 5 — 운영 대시보드 섹션 구조

### 섹션 A — 헤드라인 (항상 상단 고정)

```
┌──────────────────────────────────────────────────────────┐
│  오늘의 퀴즈 시작 수    퀴즈 완주율    평균 정답률    공유 클릭    │
│     [N명]              [XX%]          [XX%]          [N건]     │
└──────────────────────────────────────────────────────────┘
```

| 지표 | 집계 단위 | 기준선 표시 |
|------|----------|-----------|
| 퀴즈 시작 수 | 일별 | 전일 대비 +/- % |
| 퀴즈 완주율 | 일별 rolling 7일 | 목표 80% 기준선 |
| 평균 정답률 | 팩별 | 팩 간 비교 |
| 공유 클릭 수 | 일별 | — |

---

### 섹션 B — 퀴즈 전환 퍼널

```
home_view
    │ 홈→퀴즈 전환율 [XX%]
    ▼
quiz_start
    │ 퀴즈 완주율 [XX%]
    ▼
quiz_complete
    │ 결과 공유 클릭율 [XX%]
    ▼
result_share_clicked
```

집계 단위: 일별 / 팩별 드릴다운 가능

---

### 섹션 C — 기능별 활성화율

```
┌─────────────────────────────────────────────────────────┐
│  기능               이번 주      지난 주      목표       │
│  ─────────────────────────────────────────────────────  │
│  daily quiz start   [XX%]       [XX%]       ≥ 25%      │
│  wrong-note retry   [XX%]       [XX%]       ≥ 30%      │
│  seasonal pack      [XX%]       [XX%]       ≥ 20%      │
│  share click        [XX%]       [XX%]       ≥ 10%      │
└─────────────────────────────────────────────────────────┘
```

집계 단위: 주별 (7일 rolling)

---

### 섹션 D — 콘텐츠 품질

```
┌─────────────────────────────────────────────────────────┐
│  팩별 완주율 비교         문항별 정답률 분포               │
│  [바 차트]               [히스토그램 / 최저·최고 문항]    │
│                                                         │
│  카테고리 정답률           image fallback rate           │
│  [카테고리별 바 차트]       [XX%] ▶ 실제 이미지 N/전체 N  │
└─────────────────────────────────────────────────────────┘
```

**문항 이상 감지 패널** (자동 생성):
- 정답률 < 15% 문항 목록 → "너무 어려움" 태그
- 정답률 > 95% 문항 목록 → "너무 쉬움" 태그
- image fallback 발생 문항 목록 → 에셋 등록 대기

---

### 섹션 E — 상태 안정성

```
┌─────────────────────────────────────────────────────────┐
│  state sync failure          stale history              │
│  [N건/일] ● 정상 / ⚠ 주의    [X.X%] ● 정상 / ⚠ 주의   │
│                                                         │
│  schema mismatch             image fallback             │
│  [X.X%] ● 정상 / ⚠ 주의      [XX%] ● 정상 / ⚠ 주의    │
└─────────────────────────────────────────────────────────┘
```

상태: 정상 ● / 주의 ⚠ (임계치 초과) / 긴급 🚨 (P1 임계치 초과)

---

### 섹션 F — 리텐션 코호트

```
D0 코호트 → D1 → D3 → D7 → D14 → D30
  [100%]   [XX%] [XX%] [XX%] [XX%] [XX%]
```

집계 단위: 주별 코호트 (일별 신규 사용자 그룹)
시각화: 코호트 테이블 + D7 추이 라인 차트

---

## 섹션 6 — 알림/모니터링 기준

### P1 — 즉시 대응 (1시간 내)

| 조건 | 의미 | 대응 |
|------|------|------|
| `quiz_complete` 0건 / 1시간 | 빌드 오류 또는 앱 크래시 가능성 | 빌드 로그 확인 + 긴급 롤백 검토 |
| `state_sync_failed` > 50건 / 시간 | localStorage 대규모 장애 | 스토리지 초기화 fallback 동작 확인 |
| `image_fallback_used` 100% (전체 이미지 문항) | 이미지 에셋 CDN/경로 전체 장애 | 에셋 서버 확인 |
| `stale_history_detected` > 5% | 상태 마이그레이션 실패 대량 발생 | 롤백 또는 핫픽스 |

### P2 — 당일 대응 (24시간 내)

| 조건 | 의미 | 대응 |
|------|------|------|
| 퀴즈 완주율 < 60% (rolling 24h) | 퀴즈 흐름 UX 문제 | QuizPage 이탈 지점 분석 |
| 홈→퀴즈 전환율 < 40% | 홈 UX 개선 필요 | 홈 버튼 노출 위치 재검토 |
| `result_share_outcome: unavailable` > 70% | Web Share API 미지원 환경 다수 | 클립보드 복사 UX 강조 |
| `state_sync_failed` > 10건 / 일 | 산발적 localStorage 오류 | 에러 패턴 분석 |

### P3 — 주간 리뷰

| 조건 | 의미 | 대응 |
|------|------|------|
| `wrong-note retry rate` < 20% | 복습 기능 미발견 | 홈 진입점 UX 개선 |
| `daily quiz start rate` < 15% | 데일리 루프 미형성 | 알림 또는 홈 카드 UX 검토 |
| `seasonal pack start rate` < 10% | 시즌팩 인지도 부족 | 시즌팩 허브 위치 또는 메시지 알림 |
| D7 Retention < 10% | 재방문 동기 부족 | daily quiz 강화 또는 메시지 알림 |
| 특정 문항 정답률 < 15% 3개 이상 | 팩 난이도 불균형 | `/season-pack-generator`로 대체 문항 생성 |
| `image fallback rate` > 50% | 이미지 에셋 미등록 문항 다수 | 에셋 등록 우선순위 수립 |

---

## 계측 구현 우선순위

### Phase 1 (v3 출시 전 필수)

```
1. quiz_start에 session_type 추가
2. quiz_complete에 wrong_count, session_type 추가
3. daily_quiz_start 계측
4. seasonal_pack_start 계측
5. state_sync_failed 계측 (loadUserQuizState / saveUserQuizState 오류 catch 내)
```

### Phase 2 (출시 후 1주차 내)

```
6. result_share_clicked + result_share_outcome 계측
7. wrong_note_retry_start 계측
8. image_fallback_used 계측 (getQuizImageSrc null 반환 시)
```

### Phase 3 (출시 후 2주차)

```
9. wrong_note_resolved 계측
10. stale_history_detected 계측 (loadUserQuizState 내 검증 로직 확장)
11. schema mismatch 계측
```

---

## 관련 문서

| 문서 | 위치 | 관련성 |
|------|------|--------|
| 이벤트 타입 | `src/features/analytics/events.ts` | 계측 이벤트 소스 |
| 상태 reducer | `src/features/state/userQuizState.ts` | stale history 감지 위치 |
| 이미지 에셋 | `src/features/content/imageAssets.ts` | image fallback 감지 위치 |
| 공유 카드 | `src/features/share/shareCard.ts` | share outcome 계측 위치 |
| 스마트 메시지 전략 | `.claude/skills/smart-message/STRATEGY.md` | 리텐션 개선 수단 |
