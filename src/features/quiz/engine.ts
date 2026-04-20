import type { Question, QuestionCategory, QuizSession } from './types'

const SESSION_SIZE = 10

export function createQuizSession(questions: Question[]): QuizSession {
  const shuffled = [...questions]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return {
    questions: shuffled.slice(0, SESSION_SIZE),
    currentIndex: 0,
    answers: {},
    startedAt: new Date(),
    completedAt: null,
    sessionType: 'normal',
  }
}

export function getCurrentQuestion(session: QuizSession): Question | null {
  if (session.currentIndex >= session.questions.length) return null
  return session.questions[session.currentIndex]
}

// 이미 답한 문항은 재선택 불가 — 동일 세션 객체 반환
export function submitAnswer(session: QuizSession, answer: string): QuizSession {
  const current = getCurrentQuestion(session)
  if (current === null) return session
  if (session.answers[current.id] !== undefined) return session
  return {
    ...session,
    answers: { ...session.answers, [current.id]: answer },
  }
}

// 미답 상태에서도 goNext 허용 — 답 강제는 UI 책임
export function goNext(session: QuizSession): QuizSession {
  const next = Math.min(session.currentIndex + 1, session.questions.length)
  const justFinished = next >= session.questions.length && session.completedAt === null
  return {
    ...session,
    currentIndex: next,
    completedAt: justFinished ? new Date() : session.completedAt,
  }
}

export function isCompleted(session: QuizSession): boolean {
  return session.completedAt !== null
}

// 미답이면 null, 정답이면 true, 오답이면 false
export function isCorrect(session: QuizSession, questionId: string): boolean | null {
  const submitted = session.answers[questionId]
  if (submitted === undefined) return null
  const question = session.questions.find((q) => q.id === questionId)
  if (question === undefined) return null
  return question.answer === submitted
}

export interface ReviewSessionOptions {
  category?: QuestionCategory  // future: category filter
}

/**
 * 완료된 세션에서 오답만 추출해 재도전 세션 생성.
 * 오답이 없으면 null 반환.
 */
export function createReviewSession(
  completed: QuizSession,
  options: ReviewSessionOptions = {},
): QuizSession | null {
  let wrongs = completed.questions.filter(
    (q) => completed.answers[q.id] !== undefined && completed.answers[q.id] !== q.answer,
  )

  if (options.category) {
    wrongs = wrongs.filter((q) => q.category === options.category)
  }

  if (wrongs.length === 0) return null

  const shuffled = [...wrongs]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return {
    questions: shuffled,
    currentIndex: 0,
    answers: {},
    startedAt: new Date(),
    completedAt: null,
    sessionType: 'review',
  }
}
