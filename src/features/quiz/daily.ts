import type { Question, QuizSession } from './types'

export const DAILY_QUIZ_COUNT = 3

/** 로컬 날짜 기준 YYYY-MM-DD 반환 */
export function getDailyDateKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 문자열 → unsigned 32-bit 정수 (djb2 변형) */
function hashString(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 33) ^ s.charCodeAt(i)) >>> 0
  }
  return h
}

/**
 * seed 기반 LCG로 questions 배열에서 count개를 중복 없이 결정적 선택.
 * 같은 seed + 같은 questions 배열이면 항상 같은 결과 반환.
 */
function deterministicPick(questions: Question[], count: number, seed: number): Question[] {
  const n = questions.length
  const selected: Question[] = []
  const used = new Set<number>()
  let s = seed >>> 0

  while (selected.length < Math.min(count, n)) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    const idx = s % n
    if (!used.has(idx)) {
      used.add(idx)
      selected.push(questions[idx])
    }
  }
  return selected
}

/**
 * 날짜 기준 daily quiz 세션 생성.
 * dateKey를 생략하면 오늘 날짜 사용.
 */
export function createDailySession(questions: Question[], dateKey?: string): QuizSession {
  const key = dateKey ?? getDailyDateKey()
  const seed = hashString(key)
  const picked = deterministicPick(questions, DAILY_QUIZ_COUNT, seed)

  return {
    questions: picked,
    currentIndex: 0,
    answers: {},
    startedAt: new Date(),
    completedAt: null,
    sessionType: 'daily',
  }
}
