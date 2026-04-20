import { useMemo, useEffect, useState } from 'react'
import { buildQuizResult } from '../features/result'
import type { CategoryStat, QuizResult } from '../features/result'
import type { QuizSession } from '../features/quiz'
import { logEvent, EVENTS } from '../features/analytics'
import { mockPack } from '../features/content'
import { saveRecord } from '../features/history'
import './ResultPage.css'

interface Props {
  session: QuizSession
  onRestart: () => void
}

const CATEGORY_LABEL: Record<string, string> = {
  dessert_trend:       '디저트 트렌드',
  snack_recall:        '추억 간식',
  convenience_dessert: '편의점 디저트',
  solo_meal:           '혼밥 문화',
  wellness_food:       '건강식 트렌드',
}

const RECOMMEND_TEXT: Record<string, string> = {
  dessert_trend:       '디저트 문제를 더 풀어볼까요?',
  snack_recall:        '추억 간식 문제를 더 풀어볼까요?',
  convenience_dessert: '편의점 트렌드 문제를 더 풀어볼까요?',
  solo_meal:           '혼밥 문화 문제를 더 풀어볼까요?',
  wellness_food:       '건강식 문제를 더 풀어볼까요?',
}
const FALLBACK_RECOMMEND = '비슷한 퀴즈도 있어요'

function safeCalc(session: QuizSession): QuizResult | null {
  try {
    return buildQuizResult(session)
  } catch {
    return null
  }
}

export default function ResultPage({ session, onRestart }: Props) {
  const result = useMemo(() => safeCalc(session), [session])
  const [reviewOpen, setReviewOpen] = useState(false)

  useEffect(() => {
    if (!result) return
    logEvent(EVENTS.QUIZ_COMPLETE, {
      score:       result.score.correct,
      total:       result.score.total,
      result_type: result.resultType.id,
      pack_id:     mockPack.packId,
    })
    saveRecord({
      playedAt:     new Date().toISOString(),
      correctCount: result.score.correct,
      totalCount:   result.score.total,
      score:        result.score.rate,
      resultType:   result.resultType.id,
      packId:       mockPack.packId,
    })
  }, [result])

  if (!result) {
    return (
      <div className="result-screen result-screen--center">
        <p className="result-status-text">결과를 계산하지 못했어요</p>
        <button className="result-cta-btn" onClick={onRestart}>다시 해볼래요</button>
      </div>
    )
  }

  const { score, categoryStats, resultType } = result

  const activeCats = (Object.entries(categoryStats) as [string, CategoryStat][])
    .filter(([, s]) => s.total > 0)
    .sort(([, a], [, b]) => b.rate - a.rate)

  const strongCat = activeCats[0] ?? null
  const weakCat   = activeCats.length > 1 ? activeCats[activeCats.length - 1] : null
  const showWeak  = weakCat !== null && weakCat[1].rate < (strongCat?.[1].rate ?? 1)

  const wrongQuestions = session.questions
    .filter((q) => {
      const s = session.answers[q.id]
      return s !== undefined && s !== q.answer
    })
    .slice(0, 3)

  const recommendText = weakCat
    ? (RECOMMEND_TEXT[weakCat[0]] ?? FALLBACK_RECOMMEND)
    : FALLBACK_RECOMMEND

  return (
    <main className="result-screen">
      {/* ① 결과 타입 + 해석 + 점수 */}
      <div className="result-type-card">
        <span className="result-type-name">{resultType.label}</span>
        <p className="result-type-desc">{resultType.description}</p>
        <div className="result-score-inline">
          <div className="result-score-bar">
            <div
              className="result-score-fill"
              style={{ width: `${Math.round(score.rate * 100)}%` }}
            />
          </div>
          <span className="result-score-badge">
            {score.correct}<span className="result-score-sep">/</span>{score.total}
          </span>
        </div>
      </div>

      {/* ② 카테고리 강약 */}
      {activeCats.length > 0 && (
        <div className="result-category-section">
          <p className="result-section-label">카테고리 강약</p>

          {strongCat && (
            <div className="result-category-row">
              <span className="result-category-tag result-category-tag--strong">강해요</span>
              <span className="result-category-name">
                {CATEGORY_LABEL[strongCat[0]] ?? strongCat[0]}
              </span>
              <span className="result-category-rate">
                {Math.round(strongCat[1].rate * 100)}%
              </span>
            </div>
          )}

          {showWeak && weakCat && (
            <div className="result-category-row">
              <span className="result-category-tag result-category-tag--weak">약해요</span>
              <span className="result-category-name">
                {CATEGORY_LABEL[weakCat[0]] ?? weakCat[0]}
              </span>
              <span className="result-category-rate">
                {Math.round(weakCat[1].rate * 100)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* ③ 오답 복습 */}
      <div className="result-review-section">
        {wrongQuestions.length > 0 ? (
          <>
            <button
              className="result-review-toggle"
              onClick={() => setReviewOpen((o) => !o)}
            >
              <span>틀린 문제 다시 볼래요</span>
              <span className="result-review-count">{wrongQuestions.length}개</span>
              <span className={`result-review-chevron${reviewOpen ? ' open' : ''}`}>›</span>
            </button>
            {reviewOpen && (
              <div className="result-review-list">
                {wrongQuestions.map((q) => (
                  <div key={q.id} className="result-review-item">
                    <p className="result-review-prompt">{q.prompt}</p>
                    <p className="result-review-answer">정답: {q.answer}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="result-review-fallback">모든 문제를 맞혔어요!</p>
        )}
      </div>

      {/* ④ CTA 영역 */}
      <div className="result-cta-group">
        <button
          className="result-cta-btn"
          onClick={() => {
            logEvent(EVENTS.RESULT_RETRY_CLICKED)
            onRestart()
          }}
        >
          다시 해봐요
        </button>
        <button
          className="result-cta-btn result-cta-btn--secondary"
          onClick={onRestart}
        >
          {recommendText}
        </button>
      </div>
    </main>
  )
}
