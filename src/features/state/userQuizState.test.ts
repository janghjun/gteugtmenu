import { describe, it, expect, beforeEach } from 'vitest'
import {
  defaultUserQuizState,
  loadUserQuizState,
  saveUserQuizState,
  applySessionResult,
  getUserStats,
} from './userQuizState'
import type { UserQuizState, QuizHistoryItem } from './userQuizState'
import type { QuizSession } from '../quiz/types'
import type { QuizResult } from '../result/types'
import { STORAGE_KEYS } from '../../constants/storageKeys'

// ── 테스트 픽스처 ──────────────────────────────────────────────

function makeSession(overrides: Partial<QuizSession> = {}): QuizSession {
  return {
    questions: [
      {
        id: 'q1', format: 'ox', prompt: '테스트', answer: 'O',
        choices: ['O', 'X'], explanation: '설명', evidenceLevel: 'A',
        category: 'dessert_trend',
      },
      {
        id: 'q2', format: 'ox', prompt: '테스트2', answer: 'X',
        choices: ['O', 'X'], explanation: '설명2', evidenceLevel: 'A',
        category: 'snack_recall',
      },
    ],
    currentIndex: 2,
    answers: { q1: 'O', q2: 'O' }, // q1 correct, q2 wrong
    startedAt: new Date(),
    completedAt: new Date(),
    sessionType: 'normal',
    ...overrides,
  }
}

function makeResult(score = 0.5, resultType = 'dessert-sensor'): QuizResult {
  return {
    score: { correct: 1, total: 2, rate: score },
    categoryStats: {
      dessert_trend:       { correct: 1, total: 1, rate: 1 },
      snack_recall:        { correct: 0, total: 1, rate: 0 },
      convenience_dessert: { correct: 0, total: 0, rate: 0 },
      solo_meal:           { correct: 0, total: 0, rate: 0 },
      wellness_food:       { correct: 0, total: 0, rate: 0 },
    },
    trendProfile: { modern: 1, recall: 0 },
    resultType: {
      id: resultType as QuizResult['resultType']['id'],
      label: '디저트 감각파',
      description: '테스트 설명',
    },
  }
}

// ── 테스트 ──────────────────────────────────────────────────────

describe('userQuizState', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('세션 완료 시 latestScore / latestResultType이 갱신된다', () => {
    const next = applySessionResult(
      defaultUserQuizState(),
      makeSession(),
      makeResult(0.8, 'convenience-tracker'),
      'mock-pack',
    )
    expect(next.latestScore).toBe(0.8)
    expect(next.latestResultType).toBe('convenience-tracker')
    expect(next.latestPackId).toBe('mock-pack')
    expect(next.latestSessionId).not.toBeNull()
  })

  it('history에 항목이 추가되고 최대 20개로 제한된다', () => {
    let state = defaultUserQuizState()
    for (let i = 0; i < 22; i++) {
      state = applySessionResult(state, makeSession(), makeResult(), `pack-${i}`)
    }
    expect(state.history).toHaveLength(20)
    // 최신 항목이 맨 앞
    expect(state.history[0].packId).toBe('pack-21')
  })

  it('progressByQuestionId가 정답/오답/미답으로 갱신된다', () => {
    const session = makeSession({
      answers: { q1: 'O', q2: 'O' }, // q1=correct, q2=wrong
    })
    const next = applySessionResult(defaultUserQuizState(), session, makeResult(), 'pack-1')

    expect(next.progressByQuestionId['q1'].lastResult).toBe('correct')
    expect(next.progressByQuestionId['q1'].correctCount).toBe(1)
    expect(next.progressByQuestionId['q1'].wrongCount).toBe(0)

    expect(next.progressByQuestionId['q2'].lastResult).toBe('wrong')
    expect(next.progressByQuestionId['q2'].correctCount).toBe(0)
    expect(next.progressByQuestionId['q2'].wrongCount).toBe(1)
  })

  it('반복 플레이 시 attemptCount / correctCount가 누적된다', () => {
    let state = defaultUserQuizState()
    state = applySessionResult(state, makeSession({ answers: { q1: 'O', q2: 'X' } }), makeResult(), 'p')
    state = applySessionResult(state, makeSession({ answers: { q1: 'X', q2: 'X' } }), makeResult(), 'p')

    expect(state.progressByQuestionId['q1'].attemptCount).toBe(2)
    expect(state.progressByQuestionId['q1'].correctCount).toBe(1) // 1회 정답
    expect(state.progressByQuestionId['q2'].correctCount).toBe(2) // 2회 정답
  })

  it('malformed JSON 저장 시 loadUserQuizState가 기본값을 반환한다', () => {
    localStorage.setItem(STORAGE_KEYS.USER_QUIZ_STATE, 'INVALID{{JSON')
    expect(loadUserQuizState()).toEqual(defaultUserQuizState())
  })

  it('schemaVersion 불일치 시 기본값을 반환한다', () => {
    localStorage.setItem(
      STORAGE_KEYS.USER_QUIZ_STATE,
      JSON.stringify({ schemaVersion: 99, history: [] }),
    )
    expect(loadUserQuizState()).toEqual(defaultUserQuizState())
  })

  it('saveUserQuizState / loadUserQuizState 왕복이 일치한다', () => {
    const state = applySessionResult(defaultUserQuizState(), makeSession(), makeResult(), 'pack-1')
    saveUserQuizState(state)
    const loaded = loadUserQuizState()
    expect(loaded.latestResultType).toBe(state.latestResultType)
    expect(loaded.history).toHaveLength(1)
    expect((loaded.history[0] as QuizHistoryItem).sessionId).toBe(
      (state.history[0] as QuizHistoryItem).sessionId,
    )
  })

  it('미답 문항은 skipped로 기록된다', () => {
    const session = makeSession({ answers: { q1: 'O' } }) // q2 미답
    const next = applySessionResult(defaultUserQuizState(), session, makeResult(), 'pack-1')
    expect(next.progressByQuestionId['q2'].lastResult).toBe('skipped')
    expect(next.progressByQuestionId['q2'].attemptCount).toBe(1)
    expect(next.progressByQuestionId['q2'].wrongCount).toBe(0)
  })
})

describe('getUserStats', () => {
  const questions = [
    { id: 'q1', category: 'dessert_trend' },
    { id: 'q2', category: 'snack_recall' },
  ]

  it('플레이 기록 없으면 totalPlays=0, bestScore=null', () => {
    const stats = getUserStats(defaultUserQuizState(), questions)
    expect(stats.totalPlays).toBe(0)
    expect(stats.bestScore).toBeNull()
    expect(stats.weakestCategory).toBeNull()
  })

  it('bestScore는 history 중 최고 점수', () => {
    let state = defaultUserQuizState()
    state = applySessionResult(state, makeSession(), makeResult(0.6), 'p')
    state = applySessionResult(state, makeSession(), makeResult(0.9), 'p')
    const stats = getUserStats(state, questions)
    expect(stats.bestScore).toBe(0.9)
  })

  it('취약 카테고리는 오답률이 가장 높은 카테고리', () => {
    // q1(dessert_trend) 오답, q2(snack_recall) 정답
    const state = applySessionResult(
      defaultUserQuizState(),
      makeSession({ answers: { q1: 'X', q2: 'X' } }), // q1 wrong(answer=O), q2 correct(answer=X)
      makeResult(),
      'p',
    )
    const stats = getUserStats(state, questions)
    expect(stats.weakestCategory).toBe('dessert_trend')
  })

  it('questions를 넘기지 않으면 weakestCategory=null', () => {
    let state = defaultUserQuizState()
    state = applySessionResult(state, makeSession(), makeResult(), 'p')
    expect(getUserStats(state).weakestCategory).toBeNull()
  })
})

// ── 이탈 정책 ────────────────────────────────────────────────────

describe('applySessionResult — 이탈 정책', () => {
  it('completedAt이 null이면 throw한다', () => {
    expect(() =>
      applySessionResult(
        defaultUserQuizState(),
        makeSession({ completedAt: null }),
        makeResult(),
        'pack-1',
      )
    ).toThrow('미완료 세션')
  })

  it('completedAt이 null인 세션은 history를 갱신하지 않는다', () => {
    const before = defaultUserQuizState()
    try {
      applySessionResult(before, makeSession({ completedAt: null }), makeResult(), 'p')
    } catch { /* 예상된 throw */ }
    expect(before.history).toHaveLength(0)
  })

  it('completedAt이 null인 세션은 latestScore를 갱신하지 않는다', () => {
    const before = defaultUserQuizState()
    try {
      applySessionResult(before, makeSession({ completedAt: null }), makeResult(0.9), 'p')
    } catch { /* 예상된 throw */ }
    expect(before.latestScore).toBeNull()
  })

  it('completedAt이 null인 세션은 progressByQuestionId를 갱신하지 않는다', () => {
    const before = defaultUserQuizState()
    try {
      applySessionResult(before, makeSession({ completedAt: null }), makeResult(), 'p')
    } catch { /* 예상된 throw */ }
    expect(Object.keys(before.progressByQuestionId)).toHaveLength(0)
  })

  it('daily 모드에서도 completedAt 없으면 throw한다', () => {
    expect(() =>
      applySessionResult(
        defaultUserQuizState(),
        makeSession({ completedAt: null, sessionType: 'daily' }),
        makeResult(),
        'pack-daily',
      )
    ).toThrow('미완료 세션')
  })

  it('wrong-only 모드에서도 completedAt 없으면 throw한다', () => {
    expect(() =>
      applySessionResult(
        defaultUserQuizState(),
        makeSession({ completedAt: null, sessionType: 'wrong-only' }),
        makeResult(),
        'pack-review',
      )
    ).toThrow('미완료 세션')
  })

  it('seasonal 모드에서도 completedAt 없으면 throw한다', () => {
    expect(() =>
      applySessionResult(
        defaultUserQuizState(),
        makeSession({ completedAt: null, sessionType: 'seasonal' }),
        makeResult(),
        'seasonal-pack',
      )
    ).toThrow('미완료 세션')
  })

  it('category 모드에서도 completedAt 없으면 throw한다', () => {
    expect(() =>
      applySessionResult(
        defaultUserQuizState(),
        makeSession({ completedAt: null, sessionType: 'category' }),
        makeResult(),
        'pack-cat',
      )
    ).toThrow('미완료 세션')
  })

  it('completedAt이 있으면 정상 동작한다', () => {
    const result = applySessionResult(
      defaultUserQuizState(),
      makeSession({ completedAt: new Date() }),
      makeResult(0.5),
      'pack-ok',
    )
    expect(result.latestScore).toBe(0.5)
    expect(result.history).toHaveLength(1)
  })
})
