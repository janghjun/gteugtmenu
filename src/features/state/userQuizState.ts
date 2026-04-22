import { STORAGE_KEYS } from '../../constants/storageKeys'
import type { QuizSession, SessionType } from '../quiz/types'
import type { QuizResult } from '../result/types'

type QuestionLike = { id: string; category: string }

const MAX_HISTORY = 20

// ── 타입 정의 ────────────────────────────────────────────────────

export interface QuestionProgress {
  questionId: string
  lastPlayedAt: string
  lastMode: SessionType
  lastPackId: string
  lastResult: 'correct' | 'wrong' | 'skipped'
  attemptCount: number
  correctCount: number
  wrongCount: number
}

export interface QuizHistoryItem {
  sessionId: string
  sessionType: SessionType
  playedAt: string
  correctCount: number
  totalCount: number
  score: number       // 0~1
  resultType: string
  packId: string
  categoryKey?: string
}

export interface UserQuizState {
  schemaVersion: 1
  latestSessionId: string | null
  latestScore: number | null
  latestResultType: string | null
  latestPackId: string | null
  history: QuizHistoryItem[]
  progressByQuestionId: Record<string, QuestionProgress>
}

// ── 기본값 / 유효성 ──────────────────────────────────────────────

export function defaultUserQuizState(): UserQuizState {
  return {
    schemaVersion: 1,
    latestSessionId: null,
    latestScore: null,
    latestResultType: null,
    latestPackId: null,
    history: [],
    progressByQuestionId: {},
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

// ── 저장소 ───────────────────────────────────────────────────────

export function loadUserQuizState(): UserQuizState {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_QUIZ_STATE)
    if (!raw) return defaultUserQuizState()
    const parsed = JSON.parse(raw)
    if (!isObject(parsed) || parsed.schemaVersion !== 1) return defaultUserQuizState()
    // 알 수 없는 필드는 무시하고 기본값과 병합 (malformed partial state 방어)
    return { ...defaultUserQuizState(), ...parsed } as UserQuizState
  } catch {
    return defaultUserQuizState()
  }
}

export function saveUserQuizState(state: UserQuizState): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_QUIZ_STATE, JSON.stringify(state))
  } catch {
    // 용량 초과 / private 모드 — 무시
  }
}

// ── 세션 ID 생성 ─────────────────────────────────────────────────

function genSessionId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  }
}

// ── 핵심 reducer ─────────────────────────────────────────────────

// 이탈 정책: completedAt이 없는 세션은 history/latestScore/progressByQuestionId를 갱신하지 않는다.
// wrong-only / daily / seasonal / category 모드 모두 동일 규칙.

/**
 * 완료된 세션과 결과를 받아 UserQuizState를 갱신 (순수 함수).
 * side effect 없음 — 호출 측에서 saveUserQuizState()로 저장.
 * @throws 세션이 완료되지 않은 경우 (completedAt === null)
 */
export function applySessionResult(
  current: UserQuizState,
  session: QuizSession,
  result: QuizResult,
  packId: string,
): UserQuizState {
  if (!session.completedAt) {
    throw new Error('applySessionResult: 미완료 세션 — completedAt이 없습니다')
  }

  const sessionId  = genSessionId()
  const playedAt   = new Date().toISOString()
  const sessionType: SessionType = session.sessionType ?? 'normal'

  const historyItem: QuizHistoryItem = {
    sessionId,
    sessionType,
    playedAt,
    correctCount: result.score.correct,
    totalCount:   result.score.total,
    score:        result.score.rate,
    resultType:   result.resultType.id,
    packId,
    ...(session.categoryKey ? { categoryKey: session.categoryKey } : {}),
  }

  const updatedProgress: Record<string, QuestionProgress> = { ...current.progressByQuestionId }

  for (const q of session.questions) {
    const submitted = session.answers[q.id]
    const lastResult: 'correct' | 'wrong' | 'skipped' =
      submitted === undefined  ? 'skipped'
      : submitted === q.answer ? 'correct'
      : 'wrong'

    const prev = updatedProgress[q.id]
    updatedProgress[q.id] = {
      questionId:   q.id,
      lastPlayedAt: playedAt,
      lastMode:     sessionType,
      lastPackId:   packId,
      lastResult,
      attemptCount: (prev?.attemptCount ?? 0) + 1,
      correctCount: (prev?.correctCount ?? 0) + (lastResult === 'correct' ? 1 : 0),
      wrongCount:   (prev?.wrongCount   ?? 0) + (lastResult === 'wrong'   ? 1 : 0),
    }
  }

  return {
    schemaVersion:        1,
    latestSessionId:      sessionId,
    latestScore:          result.score.rate,
    latestResultType:     result.resultType.id,
    latestPackId:         packId,
    history:              [historyItem, ...current.history].slice(0, MAX_HISTORY),
    progressByQuestionId: updatedProgress,
  }
}

// ── 통계 ──────────────────────────────────────────────────────

export interface UserStats {
  totalPlays: number
  bestScore: number | null    // 0~1
  weakestCategory: string | null
}

/**
 * UserQuizState에서 홈 화면용 통계를 계산.
 * questions를 넘기면 취약 카테고리도 계산.
 */
export function getUserStats(state: UserQuizState, questions: QuestionLike[] = []): UserStats {
  const totalPlays = state.history.length
  const bestScore  = totalPlays > 0
    ? Math.max(...state.history.map((h) => h.score))
    : null

  let weakestCategory: string | null = null

  if (questions.length > 0) {
    const catStats: Record<string, { wrong: number; total: number }> = {}
    for (const q of questions) {
      const p = state.progressByQuestionId[q.id]
      if (!p || p.attemptCount === 0) continue
      if (!catStats[q.category]) catStats[q.category] = { wrong: 0, total: 0 }
      catStats[q.category].wrong += p.wrongCount
      catStats[q.category].total += p.attemptCount
    }
    let worstRate = -1
    for (const [cat, stat] of Object.entries(catStats)) {
      if (stat.total === 0) continue
      const rate = stat.wrong / stat.total
      if (rate > worstRate) { worstRate = rate; weakestCategory = cat }
    }
  }

  return { totalPlays, bestScore, weakestCategory }
}
