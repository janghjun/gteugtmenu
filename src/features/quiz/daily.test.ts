import { describe, it, expect } from 'vitest'
import { createDailySession, getDailyDateKey, DAILY_QUIZ_COUNT } from './daily'
import type { Question } from './types'

function makeQuestion(id: string): Question {
  return {
    id,
    format: 'ox',
    category: 'snack_recall',
    prompt: `문제 ${id}`,
    choices: ['O', 'X'],
    answer: 'O',
    explanation: '설명.',
    evidenceLevel: 'A',
  }
}

const questions: Question[] = Array.from({ length: 20 }, (_, i) =>
  makeQuestion(`q${String(i + 1).padStart(2, '0')}`),
)

describe('getDailyDateKey', () => {
  it('YYYY-MM-DD 형식을 반환한다', () => {
    const key = getDailyDateKey(new Date('2026-04-21'))
    expect(key).toBe('2026-04-21')
  })

  it('월/일이 한 자리면 0이 붙는다', () => {
    const key = getDailyDateKey(new Date('2026-01-05'))
    expect(key).toBe('2026-01-05')
  })
})

describe('createDailySession', () => {
  it(`정확히 ${DAILY_QUIZ_COUNT}문제를 포함한다`, () => {
    const s = createDailySession(questions, '2026-04-21')
    expect(s.questions).toHaveLength(DAILY_QUIZ_COUNT)
  })

  it('sessionType이 daily이다', () => {
    const s = createDailySession(questions, '2026-04-21')
    expect(s.sessionType).toBe('daily')
  })

  it('answers가 비어있고 completedAt이 null이다', () => {
    const s = createDailySession(questions, '2026-04-21')
    expect(s.answers).toEqual({})
    expect(s.completedAt).toBeNull()
  })

  it('같은 날짜면 항상 같은 문제셋을 반환한다', () => {
    const s1 = createDailySession(questions, '2026-04-21')
    const s2 = createDailySession(questions, '2026-04-21')
    expect(s1.questions.map((q) => q.id)).toEqual(s2.questions.map((q) => q.id))
  })

  it('날짜가 다르면 다른 문제셋을 반환한다', () => {
    const s1 = createDailySession(questions, '2026-04-21')
    const s2 = createDailySession(questions, '2026-04-22')
    expect(s1.questions.map((q) => q.id)).not.toEqual(s2.questions.map((q) => q.id))
  })

  it('문제 내에 중복이 없다', () => {
    const s = createDailySession(questions, '2026-04-21')
    const ids = s.questions.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('문제 수가 count보다 적으면 있는 만큼만 반환한다', () => {
    const tiny = questions.slice(0, 2)
    const s = createDailySession(tiny, '2026-04-21')
    expect(s.questions).toHaveLength(2)
  })
})
