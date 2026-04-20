import { useState, useEffect, useRef } from 'react'
import {
  createQuizSession,
  getCurrentQuestion,
  submitAnswer,
  goNext,
  isCompleted,
  isCorrect,
} from '../features/quiz'
import { mockPack } from '../features/content'
import { getQuizImageSrc } from '../features/content/imageAssets'
import type { QuizSession, QuestionFormat, QuestionCategory, ImageToYearQuestion } from '../features/quiz'
import { logEvent, EVENTS } from '../features/analytics'
import './QuizPage.css'

interface Props {
  onFinish: (session: QuizSession) => void
}

type Status = 'loading' | 'ready' | 'error'

const FORMAT_LABEL: Record<QuestionFormat, string> = {
  menu_to_year:  '언제 유행했을까요',
  year_to_menu:  '그해의 메뉴는?',
  image_to_year: '이미지로 맞혀요',
  ox:            'O / X 퀴즈',
}

type ChoiceVariant = 'idle' | 'correct' | 'wrong' | 'correct-answer' | 'dim'

function resolveVariant(
  choice: string,
  submitted: string | undefined,
  correctAnswer: string,
  correct: boolean | null,
): ChoiceVariant {
  if (submitted === undefined) return 'idle'
  if (choice === submitted) return correct ? 'correct' : 'wrong'
  if (!correct && choice === correctAnswer) return 'correct-answer'
  return 'dim'
}

// key={question.id} 로 마운트해야 문제 이동 시 error 상태가 자동 초기화됨
function QuizImageBlock({ questionId, category }: { questionId: string; category: QuestionCategory }) {
  const src = getQuizImageSrc(questionId)
  const [error, setError] = useState(false)

  if (src && !error) {
    return (
      <div className="quiz-image-wrapper">
        <img
          className="quiz-image"
          src={src}
          alt=""
          onError={() => setError(true)}
        />
      </div>
    )
  }

  return (
    <div className="quiz-image-placeholder" role="img" aria-label={`${category} 이미지 준비 중`}>
      <svg
        className="quiz-image-placeholder-icon"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        />
        <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span className="quiz-image-placeholder-label">이미지 준비 중</span>
    </div>
  )
}

export default function QuizPage({ onFinish }: Props) {
  const [status, setStatus] = useState<Status>('loading')
  const [session, setSession] = useState<QuizSession | null>(null)
  const [loadKey, setLoadKey] = useState(0)
  const feedbackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      if (mockPack.questions.length === 0) throw new Error('empty')
      setSession(createQuizSession(mockPack.questions))
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [loadKey])

  const question = status === 'ready' && session ? getCurrentQuestion(session) : null
  const submitted = question ? session!.answers[question.id] : undefined
  const isAnswered = submitted !== undefined

  useEffect(() => {
    if (isAnswered) {
      feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [isAnswered])

  if (status === 'loading') {
    return (
      <div className="quiz-screen quiz-screen--center">
        <p className="quiz-status-text">문제를 가져오고 있어요</p>
      </div>
    )
  }

  if (status === 'error' || !session) {
    return (
      <div className="quiz-screen quiz-screen--center">
        <p className="quiz-status-text">문제를 불러오지 못했어요</p>
        <button
          className="quiz-cta-btn"
          onClick={() => { setStatus('loading'); setLoadKey((k) => k + 1) }}
        >
          다시 시도해요
        </button>
      </div>
    )
  }

  if (!question) return null

  const correct = isCorrect(session, question.id)
  const isLast = session.currentIndex === session.questions.length - 1
  const isOx = question.format === 'ox'
  const choices = (question as ImageToYearQuestion).choices as string[]

  const handleChoice = (choice: string) => {
    logEvent(EVENTS.QUESTION_ANSWERED, {
      question_id:   question.id,
      category:      question.category,
      question_type: question.format,
      is_correct:    choice === question.answer,
    })
    setSession((s) => (s ? submitAnswer(s, choice) : s))
  }

  const handleNext = () => {
    const next = goNext(session)
    if (isCompleted(next)) onFinish(next)
    else setSession(next)
  }

  return (
    <main className="quiz-screen">
      {/* 진행률 */}
      <div className="quiz-progress">
        <div className="quiz-progress-bar">
          <div
            className="quiz-progress-fill"
            style={{ width: `${((session.currentIndex + 1) / session.questions.length) * 100}%` }}
          />
        </div>
        <span className="quiz-progress-label">
          {session.currentIndex + 1} / {session.questions.length}
        </span>
      </div>

      {/* 문제 타입 배지 */}
      <span className="quiz-format-badge">{FORMAT_LABEL[question.format]}</span>

      {/* 이미지 (image_to_year) — 에셋 없으면 placeholder 카드 표시 */}
      {question.format === 'image_to_year' && (
        <QuizImageBlock
          key={question.id}
          questionId={question.id}
          category={question.category}
        />
      )}

      {/* 문제 */}
      <p className="quiz-prompt">{question.prompt}</p>

      {/* 보기 */}
      <div className={isOx ? 'quiz-choices--ox' : 'quiz-choices'}>
        {choices.map((choice) => {
          const variant = resolveVariant(choice, submitted, question.answer, correct)
          return (
            <button
              key={choice}
              className={`quiz-choice quiz-choice--${variant}${isOx ? ' quiz-choice--ox-item' : ''}`}
              onClick={() => handleChoice(choice)}
              disabled={isAnswered}
            >
              {choice}
            </button>
          )
        })}
      </div>

      {/* 피드백 카드 */}
      {isAnswered && (
        <div ref={feedbackRef} className={`quiz-feedback quiz-feedback--${correct ? 'correct' : 'wrong'}`}>
          <span className="quiz-feedback-title">
            {correct ? '정답이에요!' : `아쉬워요 · 정답은 "${question.answer}"`}
          </span>
          <p className="quiz-feedback-explanation">{question.explanation}</p>
        </div>
      )}

      {/* 다음 문제 — 답변 후에만 표시 */}
      {isAnswered && (
        <button className="quiz-cta-btn" onClick={handleNext}>
          {isLast ? '결과 보기' : '다음 문제'}
        </button>
      )}
    </main>
  )
}
