---
name: smart-message-strategy
description: 그때그메뉴 Apps in Toss 스마트 메시지 전략 및 트리거 설계 문서
type: integration-design
status: pre-implementation   ← 실제 발송 구현 전 전략 단계
version: 1.0.0
related-files:
  - src/features/identity/anonymousKey.ts
  - src/features/state/userQuizState.ts
  - src/features/review/reviewEligibility.ts
  - src/constants/storageKeys.ts
---

# 스마트 메시지 전략 문서

## 목적 및 범위

이 문서는 **전략과 트리거 구조를 정의**하는 것이 목적입니다.
실제 API 호출 코드는 포함하지 않으며, API 연동 시 이 문서를 스펙으로 사용합니다.

**이 문서에서 다루는 것**
- 어떤 이벤트에서 어떤 메시지를 보낼지
- userKey 조건 (발송 가능 여부 판정)
- frequency cap 규칙
- LocalStorage 기반 상태 추적 설계

**이 문서에서 다루지 않는 것**
- 실제 API 엔드포인트 구현
- Toss 콘솔 템플릿 등록 절차
- 메시지 클릭 후 딥링크 처리

---

## 핵심 제약 — userKey 발송 가능성

```
source: 'toss'  →  실제 메시지 발송 가능  (Toss SDK 인증 키)
source: 'local' →  발송 불가, 분석 전용   (로컬 UUID)
```

**`resolveAnonymousKey()`가 반환하는 `source` 값이 `'toss'`인 경우에만 메시지를 발송합니다.**
`'local'` 키에는 메시지 발송을 시도하지 않습니다 — Toss 플랫폼 외부에서 생성된 키는 Apps in Toss 메시지 API로 유저를 식별할 수 없습니다.

발송 가능 여부 판정 예시:
```ts
// 메시지 트리거 직전 반드시 체크
const { source } = await resolveAnonymousKey()
if (source !== 'toss') return   // local UUID는 메시지 발송 불가
```

---

## 시나리오 정의

총 5개 시나리오를 정의합니다.

---

### 시나리오 1 — 오늘의 퀴즈 알림

**목적**: 일별 재방문 유도. 데일리 루틴화.

| 항목 | 내용 |
|------|------|
| 시나리오 ID | `daily_quiz` |
| 트리거 유형 | 스케줄 (매일 09:00~10:00 KST) |
| 발송 조건 | 최근 30일 내 세션 ≥ 1 AND 마지막 세션 > 20시간 전 |
| 발송 불가 조건 | 오늘 이미 다른 메시지 발송됨 (글로벌 cap) |
| 메시지 제목 | `오늘의 트렌드 감각 테스트 🍽️` |
| 메시지 본문 | `퀴즈 3문제가 기다리고 있어요. 지금 몇 점 맞힐 수 있을까요?` |
| 템플릿 변수 | 없음 (정적 메시지) |
| 쿨다운 | 24시간 (동일 시나리오 기준) |
| 우선순위 | 5 (최하위 — 가장 자주 발송되므로 다른 시나리오에 밀림) |

**트리거 평가 시점**: 앱 서버 스케줄러 (현재 없으므로 v3 이후 구현)
**임시 대안**: 앱 오픈 시 마지막 메시지 발송 시각 확인 후 조건 충족이면 local 알림 표시 (Toss 인앱 배너로 대체 가능)

---

### 시나리오 2 — 시즌팩 오픈 알림

**목적**: 신규 팩 출시 인지 및 즉각 진입 유도. 팩당 1회.

| 항목 | 내용 |
|------|------|
| 시나리오 ID | `season_pack_open` |
| 트리거 유형 | 이벤트 (팩 `status: 'scheduled' → 'active'` 전환 시) |
| 발송 조건 | 과거 세션 ≥ 2 AND 해당 packId로 아직 알림을 보낸 적 없음 |
| 메시지 제목 | `새 시즌팩이 열렸어요! 🎉` |
| 메시지 본문 | `{{packTitle}} — {{packSubtitle}}. 지금 바로 도전해보세요.` |
| 템플릿 변수 | `packTitle`, `packSubtitle` |
| 쿨다운 | packId당 1회 (재발송 없음) |
| 우선순위 | 1 (최고 — 희소 이벤트, 가장 시의적절) |

**트리거 평가 시점**: 팩 `startsAt` 날짜 09:00 KST (스케줄러)
**발송 이력 추적**: `gtm_message_log`에 `{ scenarioId: 'season_pack_open', meta: { packId } }` 기록

---

### 시나리오 3 — 오답 복습 유도

**목적**: 직전 세션 오답 기억 강화. 재학습 루프 형성.

| 항목 | 내용 |
|------|------|
| 시나리오 ID | `wrong_review` |
| 트리거 유형 | 이벤트 (세션 완료 후 오답 ≥ 3개) |
| 발송 조건 | 세션 완료 AND 오답 ≥ 3 AND 세션 완료 후 6~24시간 경과 |
| 발송 불가 조건 | 72시간 이내 동일 시나리오 발송 이력 있음 |
| 메시지 제목 | `아깝게 틀린 문제들이 있어요 🔁` |
| 메시지 본문 | `방금 {{wrongCount}}개를 틀렸어요. 지금 복습하면 다음엔 더 잘 맞힐 수 있어요.` |
| 템플릿 변수 | `wrongCount` |
| 쿨다운 | 72시간 (동일 시나리오), sessionId당 1회 |
| 우선순위 | 2 |

**발송 지연 이유**: 세션 직후 즉시 발송은 과잉 개입. 6시간 후 발송은 자연스러운 복습 유도.
**트리거 평가 시점**: 세션 완료 이벤트 후 delayed job (6시간 뒤)

---

### 시나리오 4 — 카테고리 성향 맞춤 추천

**목적**: 특정 카테고리를 선호하는 사용자에게 해당 카테고리 팩을 추천.

| 항목 | 내용 |
|------|------|
| 시나리오 ID | `category_recommendation` |
| 트리거 유형 | 행동 기반 (동일 categoryKey 세션 ≥ 3회 누적) |
| 발송 조건 | 선호 categoryKey의 active seasonal pack 존재 AND 해당 (category, packId) 조합 미발송 |
| 메시지 제목 | `{{categoryLabel}} 문제를 자주 푸시는군요 🍰` |
| 메시지 본문 | `{{categoryLabel}} 전용 팩이 지금 열려있어요. 맞춤 도전해보세요.` |
| 템플릿 변수 | `categoryLabel`, `packTitle` |
| 쿨다운 | 14일 (카테고리당), (category, packId) 조합당 1회 |
| 우선순위 | 3 |

**선호 카테고리 계산**:
```ts
// UserQuizState.history에서 categoryKey 빈도 집계
const categoryCounts = history.reduce((acc, item) => {
  if (item.categoryKey) acc[item.categoryKey] = (acc[item.categoryKey] ?? 0) + 1
  return acc
}, {} as Record<string, number>)
const topCategory = Object.entries(categoryCounts)
  .sort(([,a],[,b]) => b - a)[0]?.[0] ?? null
// topCategory 세션 수 ≥ 3이면 트리거
```

---

### 시나리오 5 — 재방문 유도

**목적**: 이탈 직전 사용자 재활성화. 트렌드 감각 유지 동기 부여.

| 항목 | 내용 |
|------|------|
| 시나리오 ID | `re_engagement` |
| 트리거 유형 | 이탈 감지 (마지막 세션 > 7일 전) |
| 발송 조건 | 총 세션 ≥ 3 AND 마지막 세션 7~21일 전 AND active pack 존재 |
| 발송 불가 조건 | 21일 이상 경과 (이탈로 간주, 메시지 효과 없음) OR 통산 재방문 메시지 3회 이상 발송됨 |
| 메시지 제목 | `오랜만이에요! 트렌드 감각 깨워봐요 👀` |
| 메시지 본문 | `{{daysSinceLast}}일 만이네요. 새 시즌 트렌드 문제가 기다리고 있어요.` |
| 템플릿 변수 | `daysSinceLast` |
| 쿨다운 | 14일, 통산 3회 후 자동 중단 |
| 우선순위 | 4 |

---

## 트리거 이벤트 표

| 시나리오 | 트리거 이벤트 | 평가 시점 | 발송 시각 |
|----------|--------------|----------|----------|
| `daily_quiz` | 매일 반복 | 스케줄러 09:00 | 09:00~10:00 KST |
| `season_pack_open` | 팩 `startsAt` 도달 | 스케줄러 (팩별) | 팩 활성화 당일 09:00 |
| `wrong_review` | 세션 완료 + 오답 ≥ 3 | 세션 완료 이벤트 | 세션 완료 후 +6h |
| `category_recommendation` | 동일 카테고리 세션 3회 달성 | 세션 완료 이벤트 | 트리거 당일 오후 (14:00) |
| `re_engagement` | 마지막 세션 7일 경과 | 스케줄러 (일별 점검) | 09:00~10:00 KST |

### 시나리오 간 우선순위

동일 사용자에게 같은 날 여러 시나리오가 발동하면 우선순위가 높은 1개만 발송합니다.

```
1위  season_pack_open       — 희소 이벤트, 가장 시의적절
2위  wrong_review           — 행동 직결, 시간 민감
3위  category_recommendation — 개인화, 높은 관련성
4위  re_engagement           — 이탈 방어
5위  daily_quiz              — 일반 루틴, 가장 자주 발생
```

---

## Frequency Cap 규칙

### 글로벌 Hard Cap

```
규칙 G1: 24시간 내 1명에게 최대 1개 메시지
규칙 G2: 7일 내 1명에게 최대 3개 메시지
규칙 G3: 발송 금지 시간대 22:00–09:00 KST
규칙 G4: 트리거가 발생해도 G1~G3 위반 시 다음 가능 시간대로 지연 (취소 아님)
```

### 시나리오별 Cooldown

| 시나리오 | 쿨다운 | 추가 제한 |
|----------|--------|----------|
| `daily_quiz` | 24시간 | — |
| `season_pack_open` | packId당 영구 1회 | — |
| `wrong_review` | 72시간 | sessionId당 1회 |
| `category_recommendation` | 14일 (카테고리당) | (category, packId) 조합당 1회 |
| `re_engagement` | 14일 | 통산 3회 후 자동 중단 |

### 연속 무반응 시 자동 감소

```
연속 3회 메시지 미오픈 → 2주간 모든 메시지 일시 중단
(클릭률 추적이 가능한 시점부터 적용, 현재는 준비 단계)
```

### Cap 판정 순서 (의사코드)

```
function canSend(userKey, scenarioId, now):
  1. source 확인 → 'toss'가 아니면 false
  2. 글로벌 24h cap 확인 → 최근 24h 발송 이력 1개 이상이면 false
  3. 글로벌 7d cap 확인 → 최근 7일 발송 이력 3개 이상이면 false
  4. 발송 금지 시간대 확인 → 22:00~09:00 KST이면 false (지연 큐에 추가)
  5. 시나리오별 쿨다운 확인 → 쿨다운 중이면 false
  6. 모두 통과 → true
```

---

## 상태 추적 설계 (LocalStorage)

백엔드 없이 클라이언트 측에서 frequency cap을 관리하는 임시 구조입니다.
서버 도입 시 이 상태를 서버로 이전합니다.

### 신규 storage key 추가 예정

```ts
// src/constants/storageKeys.ts에 추가
MESSAGE_LOG: 'gtm_message_log',
```

### MessageLog 타입 설계

```ts
interface MessageLogEntry {
  scenarioId: string                  // 'daily_quiz' | 'season_pack_open' | ...
  sentAt: string                      // ISO 8601
  meta?: {
    packId?:      string              // season_pack_open, category_recommendation
    categoryKey?: string              // category_recommendation
    sessionId?:   string              // wrong_review
  }
}

interface MessageLog {
  schemaVersion: 1
  entries: MessageLogEntry[]          // 최근 50건 유지, 초과분 trim
}
```

### 기존 구조와 통합 패턴

`reviewEligibility.ts`의 `computeReviewEligibility` 패턴을 그대로 차용합니다:

```ts
interface MessageEligibilityInput {
  scenarioId:   string
  userKeySource: AnonymousKeySource   // 'toss' | 'local'
  messageLog:   MessageLog
  quizState:    UserQuizState
  nowIso?:      string                // 테스트용 주입
  // 시나리오별 추가 입력
  packId?:      string                // season_pack_open
  categoryKey?: string                // category_recommendation
  wrongCount?:  number                // wrong_review
}

type MessageIneligibleReason =
  | 'local_key'             // source !== 'toss'
  | 'global_daily_cap'      // 24h cap
  | 'global_weekly_cap'     // 7d cap
  | 'quiet_hours'           // 22:00~09:00
  | 'scenario_cooldown'     // 시나리오별 쿨다운
  | 'scenario_condition'    // 트리거 조건 미충족 (세션 수, 오답 수 등)
  | 'lifetime_limit'        // re_engagement 3회 초과

interface MessageEligibilityResult {
  eligible: boolean
  reason?: MessageIneligibleReason
  scheduledFor?: string   // quiet_hours 시 다음 가능 시각 (ISO)
}

// 순수 함수 — side effect 없음
function computeMessageEligibility(input: MessageEligibilityInput): MessageEligibilityResult
```

---

## 메시지 템플릿 명세

Toss 콘솔에 등록할 템플릿 초안입니다.
`{{변수}}` 형식이 Toss 스마트 메시지 변수 치환 규격과 일치하는지 파트너 문서 확인 필요합니다.

| templateId (가칭) | 제목 | 본문 | 변수 |
|-------------------|------|------|------|
| `gtm_daily_quiz` | `오늘의 트렌드 감각 테스트 🍽️` | `퀴즈 3문제가 기다리고 있어요. 지금 몇 점 맞힐 수 있을까요?` | 없음 |
| `gtm_season_open` | `새 시즌팩이 열렸어요! 🎉` | `{{packTitle}} — {{packSubtitle}}. 지금 바로 도전해보세요.` | packTitle, packSubtitle |
| `gtm_wrong_review` | `아깝게 틀린 문제들이 있어요 🔁` | `방금 {{wrongCount}}개를 틀렸어요. 지금 복습하면 다음엔 더 잘 맞힐 수 있어요.` | wrongCount |
| `gtm_category_rec` | `{{categoryLabel}} 문제를 자주 푸시는군요 🍰` | `{{categoryLabel}} 전용 팩이 지금 열려있어요. 맞춤 도전해보세요.` | categoryLabel, packTitle |
| `gtm_re_engage` | `오랜만이에요! 트렌드 감각 깨워봐요 👀` | `{{daysSinceLast}}일 만이네요. 새 시즌 트렌드 문제가 기다리고 있어요.` | daysSinceLast |

---

## API 연동 포인트

실제 구현 시 연결할 지점을 정리합니다.

### Apps in Toss 스마트 메시지 API

```
테스트 발송: POST /v1/smart-message/test
실제 발송:   POST /v1/smart-message/send

공통 요청 바디:
{
  userKey:           string,   // resolveAnonymousKey()의 key (source === 'toss' 전용)
  templateId:        string,   // Toss 콘솔 등록 templateId
  templateVariables?: Record<string, string>
}
```

*정확한 엔드포인트·요청 스펙은 Apps in Toss 파트너 문서를 확인하세요.*

### 연동 구현 우선순위

| 단계 | 구현 항목 | 의존 조건 |
|------|----------|----------|
| 1단계 | `computeMessageEligibility()` 순수 함수 | 없음 (지금 시작 가능) |
| 2단계 | `MessageLog` 저장소 (localStorage) | 1단계 |
| 3단계 | 테스트 발송 API 연동 + 내부 테스트 | Toss 파트너 계정 + templateId |
| 4단계 | `season_pack_open` 실 발송 (가장 안전한 시작점) | 3단계 |
| 5단계 | `wrong_review`, `daily_quiz` 순차 추가 | 4단계 + 스케줄러 또는 delayed job |
| 6단계 | 클릭률 추적 → 무반응 자동 감소 규칙 적용 | 서버 이벤트 파이프라인 |

### 첫 번째 연동으로 season_pack_open을 권장하는 이유

```
발송 빈도 낮음    — 팩당 1회, 연 3~4회 수준
조건 단순         — packId + userKey + 미발송 체크만 필요
효과 측정 쉬움    — 발송 직후 팩 진입률로 성과 확인 가능
사용자 불쾌감 낮음 — 명확한 이유가 있는 알림
```

---

## 시나리오별 사용자 상태 판단 요약

기존 `UserQuizState`에서 추출 가능한 조건만 사용합니다. 서버 데이터 없이 판단 가능합니다.

| 시나리오 | 필요한 UserQuizState 필드 |
|----------|--------------------------|
| `daily_quiz` | `history[0].playedAt` (마지막 세션 시각) |
| `season_pack_open` | `history.length` (총 세션 수) |
| `wrong_review` | `latestScore`, `progressByQuestionId` (오답 수 계산) |
| `category_recommendation` | `history[].categoryKey` (카테고리별 세션 빈도) |
| `re_engagement` | `history[0].playedAt`, `history.length` |

---

## 구현 시 주의사항

### 1. Local key 사용자에게 무음 처리

```ts
const { source } = await resolveAnonymousKey()
if (source !== 'toss') {
  // 메시지 없음 — 조용히 종료
  // 분석 이벤트는 여전히 발송 가능
  return
}
```

### 2. 메시지 발송 실패는 사용자 경험에 영향 없도록

```ts
try {
  await sendMessage({ userKey, templateId, templateVariables })
  recordMessageSent(scenarioId, meta)   // 발송 성공 시만 log 기록
} catch {
  // 발송 실패 — 조용히 무시, 재시도는 다음 스케줄 주기
}
```

### 3. frequency cap은 발송 성공 시에만 카운팅

발송 실패 시 cap을 소비하지 않아야 재시도 가능합니다.

### 4. quiet_hours 처리는 취소가 아닌 지연

```ts
if (isQuietHours(now)) {
  scheduleFor(nextAvailableWindow(now))  // 09:00 KST로 지연
  return
}
```

---

## 관련 설계 문서

| 문서 | 위치 | 관련성 |
|------|------|--------|
| 리뷰 요청 eligibility 패턴 | `src/features/review/reviewEligibility.ts` | computeMessageEligibility 설계 참조 |
| anonymous key 구조 | `src/features/identity/anonymousKey.ts` | userKey 발송 가능성 판정 |
| 퀴즈 상태 구조 | `src/features/state/userQuizState.ts` | 시나리오별 조건 추출 |
| 계절팩 selector | `src/features/content/selectors.ts` | season_pack_open 트리거 조건 |
