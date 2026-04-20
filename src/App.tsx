import { useState } from 'react'
import HomePage from './pages/HomePage'
import QuizPage from './pages/QuizPage'
import ResultPage from './pages/ResultPage'
import type { QuizSession } from './features/quiz'
import { createReviewSession, createDailySession } from './features/quiz'
import { mockPack } from './features/content'

export type Screen = 'home' | 'quiz' | 'result'

const RESULT_KEY = 'gtm_result'

function loadSavedSession(): QuizSession | null {
  try {
    const raw = sessionStorage.getItem(RESULT_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as QuizSession & { startedAt: string; completedAt: string | null }
    return {
      ...p,
      startedAt: new Date(p.startedAt),
      completedAt: p.completedAt ? new Date(p.completedAt) : null,
    }
  } catch {
    return null
  }
}

export default function App() {
  const [completedSession, setCompletedSession] = useState<QuizSession | null>(loadSavedSession)
  // pending: review 또는 daily용 pre-built session
  const [pendingSession, setPendingSession] = useState<QuizSession | null>(null)
  const [quizLabel, setQuizLabel] = useState<string | undefined>(undefined)
  const [screen, setScreen] = useState<Screen>(() => {
    try { return sessionStorage.getItem(RESULT_KEY) ? 'result' : 'home' } catch { return 'home' }
  })

  const handleFinish = (s: QuizSession) => {
    try { sessionStorage.setItem(RESULT_KEY, JSON.stringify(s)) } catch { /* noop */ }
    setCompletedSession(s)
    setPendingSession(null)
    setQuizLabel(undefined)
    setScreen('result')
  }

  const handleRestart = () => {
    try { sessionStorage.removeItem(RESULT_KEY) } catch { /* noop */ }
    setCompletedSession(null)
    setPendingSession(null)
    setQuizLabel(undefined)
    setScreen('home')
  }

  const startWith = (session: QuizSession, label: string) => {
    setPendingSession(session)
    setQuizLabel(label)
    setScreen('quiz')
  }

  if (screen === 'quiz') {
    return (
      <QuizPage
        onFinish={handleFinish}
        initialSession={pendingSession ?? undefined}
        quizLabel={quizLabel}
      />
    )
  }

  if (screen === 'result' && completedSession) {
    const reviewable = createReviewSession(completedSession)
    return (
      <ResultPage
        session={completedSession}
        onRestart={handleRestart}
        onStartReview={reviewable ? () => startWith(reviewable, '오답 복습') : undefined}
      />
    )
  }

  return (
    <HomePage
      onStart={() => setScreen('quiz')}
      onStartDaily={() => startWith(createDailySession(mockPack.questions), '오늘의 퀴즈')}
    />
  )
}
