# 먹퀴즈

> 유행 음식 맞히는 1분 퀴즈 — Apps in Toss 비게임 Mini App

## 개요

먹퀴즈는 MZ세대 음식 트렌드를 주제로 한 퀴즈 미니앱입니다.
달고나커피·탕후루·두바이 초콜릿 등 시대별 유행 음식이 언제 유행했는지 맞히는 10문제 퀴즈입니다.

**핵심 플로우**: 홈 → 10문제 → 결과

## 레포지토리

| 역할 | 주소 |
|------|------|
| 개발 | `github.com/janghjun/gteugtmenu` |
| 배포 (Vercel) | `github.com/janghjun/foodquiz-app` |

## 실행

```bash
npm install
npm run dev       # 개발 서버
npm run build     # 프로덕션 빌드
npm run test      # 테스트
```

## 구조

```
src/
  pages/          # Home / Quiz / Result (3화면 고정)
  features/
    content/      # 퀴즈 팩 JSON, candidate registry, 이미지 에셋
    quiz/         # 세션 생성, 문항 타입, 채점
    state/        # UserQuizState — 로컬 진행 기록
    share/        # 결과 공유 카드
    analytics/    # 이벤트 로깅 (핸들러 주입 방식)
  constants/      # 스토리지 키 (mq_*)
scripts/
  generate-draft-pack.mjs   # seasonal pack 초안 자동 생성
  validate-content.mjs      # 콘텐츠 무결성 검증
.claude/
  commands/       # Claude Code 슬래시 커맨드
  skills/         # 운영 플레이북 (candidate intake, image research 등)
```

## 콘텐츠 파이프라인

새 트렌드 후보 → candidate registry → seasonal pack draft 생성 → 큐레이터 검토 → 배포

```bash
# seasonal pack 초안 생성
node scripts/generate-draft-pack.mjs <pack-id> "레이블" <start> <end>
```

## 스토리지 키

모든 로컬 데이터는 `mq_` 접두사 키를 사용합니다.

| 키 | 내용 |
|----|------|
| `mq_user_quiz_state` | 퀴즈 진행 기록 / 오답 노트 |
| `mq_result` | 현재 세션 결과 (sessionStorage) |
| `mq_anonymous_key` | 익명 식별자 |
| `mq_last_review_prompt` | 리뷰 요청 타이밍 기록 |
