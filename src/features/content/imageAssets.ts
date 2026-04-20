// ── 경로 상수 ─────────────────────────────────────────────────
// public/ 폴더 기준 URL — Vite import 불필요, 빌드 해시 없음
// 실제 이미지 파일을 추가할 때:
//   1. public/assets/images/quiz/{category}/{visualAssetKey}.jpg 에 파일 추가
//   2. 아래 ASSET_MAP 주석 해제

// const QUIZ_BASE = '/assets/images/quiz'  ← 실제 이미지 등록 시 주석 해제
const PLACEHOLDER_BASE = '/assets/images/placeholder'

// ── 카테고리별 placeholder ─────────────────────────────────────
// 실제 이미지가 없을 때 카테고리 색상이 구분된 placeholder SVG 제공
export const CATEGORY_PLACEHOLDER: Record<string, string> = {
  dessert_trend:       `${PLACEHOLDER_BASE}/dessert_trend.svg`,
  snack_recall:        `${PLACEHOLDER_BASE}/snack_recall.svg`,
  convenience_dessert: `${PLACEHOLDER_BASE}/convenience_dessert.svg`,
  solo_meal:           `${PLACEHOLDER_BASE}/solo_meal.svg`,
  wellness_food:       `${PLACEHOLDER_BASE}/wellness_food.svg`,
}

export const DEFAULT_PLACEHOLDER = `${PLACEHOLDER_BASE}/default.svg`

// ── 문항별 실제 이미지 매핑 ───────────────────────────────────
// key: question.id   value: public URL
// 파일 위치: public/assets/images/quiz/{category}/{visualAssetKey}.{ext}
const ASSET_MAP: Record<string, string> = {
  q08: '/assets/images/quiz/dessert_trend/dalgonaLatte_2020.jpg',
  q09: '/assets/images/quiz/snack_recall/tanghulu_2023.jpg',
  q32: '/assets/images/quiz/convenience_dessert/convenienceStoreLunch_2016.jpg',
  q47: '/assets/images/quiz/wellness_food/greekYogurt_2015.jpg',
}

// ── 공개 API ──────────────────────────────────────────────────

/** question.id → 실제 이미지 URL. 등록된 에셋 없으면 null. */
export function getQuizImageSrc(questionId: string): string | null {
  return ASSET_MAP[questionId] ?? null
}

/** category → placeholder SVG URL. 카테고리 불일치 시 default 반환. */
export function getCategoryPlaceholder(category: string): string {
  return CATEGORY_PLACEHOLDER[category] ?? DEFAULT_PLACEHOLDER
}
