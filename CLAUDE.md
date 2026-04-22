## Project

- Apps in Toss 비게임 Mini App: 먹퀴즈 (foodquiz-app)
- 목표는 심사 제출 가능한 MVP 구현
- 핵심 플로우: 홈 → 10문제 → 결과

## Product Rules

- 외부 앱 설치 유도 금지
- 외부 핵심 링크 의존 금지
- 로그인 의존 기능 금지
- MVP는 핵심 기능 1개 + 핵심 플로우 1개
- 실시간 자동 생성보다 curated quiz pack 우선
- 최신 트렌드는 시즌팩으로만 반영

## Engineering Rules

- 한 번에 전체 구현 금지
- 항상 작은 단위로 나눠서 구현
- 변경 파일 명시
- 테스트 방법 포함
- 과도한 설계 금지
- React + TypeScript + minimal state
- TDS 우선
- mock data 먼저, remote pack loader는 나중

## Data Rules

- 문제 문구는 "가장 크게 유행한 시기" 기준
- evidenceLevel C 문항 제외
- schema validation 통과 필수

## UI Writing

- 해요체
- 능동형
- 긍정형

## Screen Rules

- 화면은 3개만 유지
- Home / Quiz / Result 외 불필요한 페이지 추가 금지
- 첫 화면에서 규칙을 길게 설명하지 말고 예시 문제로 이해시키기
- Quiz 화면은 문제 → 선택 → 피드백 → 다음 문제 흐름만 유지
- Result 화면은 점수보다 결과 타입을 먼저 보여주기

## Quiz Rules

- 문제 형식은 아래 4개만 허용
  - menu_to_year
  - year_to_menu
  - image_to_year
  - ox
- 자유입력 문제 금지
- 문제는 객관식 중심으로 유지
- 문제 문구는 짧고 직관적으로 작성
- explanation은 1문장으로 작성

## Result Rules

- 결과 타입은 5개 이내로 유지
- 점수만 보여주지 말고 카테고리 강약과 한 줄 해석 포함
- 결과 타입 fallback 필요

## Output Rules for Claude Code

- 항상 아래 순서로 답변
  1. 이번 작업 목표
  2. 변경 파일
  3. 구현 코드
  4. 실행 방법
  5. 테스트 방법
- 작업 범위를 벗어나면 먼저 경고하고 멈출 것