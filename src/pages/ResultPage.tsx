import { useMemo, useEffect, useState, useRef } from 'react'
import { buildQuizResult } from '../features/result'
import type { CategoryStat, QuizResult } from '../features/result'
import type { QuizSession } from '../features/quiz'
import { logEvent, EVENTS } from '../features/analytics'
import { mockPack } from '../features/content'
import { loadUserQuizState, saveUserQuizState, applySessionResult } from '../features/state/userQuizState'
import { getWrongNoteQuestions, createWrongNoteSession } from '../features/review/reviewSelectors'
import { tryRequestReview } from '../features/review/reviewPrompt'
import { shareResult, captureShareCard } from '../features/share/shareCard'
import type { ShareOutcome, CaptureOutcome } from '../features/share/shareCard'
import ResultSquareShareCard from '../features/share/ResultSquareShareCard'
import StoryShareCard from '../features/share/StoryShareCard'
import './ResultPage.css'

interface Props {
  session: QuizSession
  onRestart: () => void
  /** 오답 노트 복습 시작. 복습 세션을 인수로 전달합니다. */
  onStartReview?: (session: QuizSession) => void
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

export default function ResultPage({ session, onRestart, onStartReview }: Props) {
  const result = useMemo(() => safeCalc(session), [session])
  const [reviewOpen,     setReviewOpen]     = useState(false)
  const [shareOutcome,   setShareOutcome]   = useState<ShareOutcome | null>(null)
  const [captureOutcome, setCaptureOutcome] = useState<CaptureOutcome | null>(null)
  const [cardFormat, setCardFormat] = useState<'square' | 'story'>('square')
  const cardRef = useRef<HTMLDivElement>(null)

  // ── 상태 저장 ─────────────────────────────────────────────
  // completedAt 없는 세션(중간 이탈)은 null 반환 — applySessionResult 호출 자체를 막음
  const newState = useMemo(() => {
    if (!result || !session.completedAt) return null
    const current = loadUserQuizState()
    return applySessionResult(current, session, result, session.packId ?? mockPack.packId)
  }, [result, session])

  useEffect(() => {
    if (!result || !newState) return
    logEvent(EVENTS.QUIZ_COMPLETE, {
      score:       result.score.correct,
      total:       result.score.total,
      result_type: result.resultType.id,
      pack_id:     session.packId ?? mockPack.packId,
    })
    saveUserQuizState(newState)
    tryRequestReview(newState, session)
  }, [newState])

  // ── 오답 노트 (progressive state 기준) ───────────────────
  const wrongNoteQuestions = useMemo(() => {
    if (!newState) return []
    return getWrongNoteQuestions(newState.progressByQuestionId, mockPack.questions)
  }, [newState])

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

  // showWeak일 때만 카테고리별 추천, 나머지는 범용 fallback
  const recommendText = (showWeak && weakCat)
    ? (RECOMMEND_TEXT[weakCat[0]] ?? FALLBACK_RECOMMEND)
    : FALLBACK_RECOMMEND

  // 이번 세션 오답 미리보기 (현재 세션 기준)
  const wrongPreview = session.questions
    .filter((q) => {
      const s = session.answers[q.id]
      return s !== undefined && s !== q.answer
    })
    .slice(0, 3)

  const canReview = onStartReview !== undefined && wrongNoteQuestions.length > 0

  const handleSaveCard = async () => {
    const outcome = await captureShareCard(cardRef.current)
    setCaptureOutcome(outcome)
    if (outcome !== 'manual') setTimeout(() => setCaptureOutcome(null), 2200)
  }

  const handleShare = async () => {
    const outcome = await shareResult({
      resultTypeLabel: resultType.label,
      resultTypeId:    resultType.id,
      correctCount:    score.correct,
      totalCount:      score.total,
    })
    setShareOutcome(outcome)
    setTimeout(() => setShareOutcome(null), 2200)
  }

  const handleStartReview = () => {
    if (!canReview) return
    const reviewSession = createWrongNoteSession(
      wrongNoteQuestions,
      newState?.latestPackId ?? mockPack.packId,
    )
    if (reviewSession) onStartReview!(reviewSession)
  }

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

      {/* ③ CTA 그룹 — 1순위/2순위 (공유 위에 배치) */}
      <div className="result-cta-group">
        {canReview ? (
          <>
            {/* 오답 있을 때: 복습 우선 */}
            <button
              className="result-cta-btn result-cta-btn--review"
              onClick={handleStartReview}
            >
              틀린 문제 다시 풀래요
            </button>
            <button
              className="result-cta-btn result-cta-btn--secondary"
              onClick={() => {
                logEvent(EVENTS.RESULT_RETRY_CLICKED)
                onRestart()
              }}
            >
              다시 해봐요
            </button>
          </>
        ) : (
          <>
            {/* 오답 없을 때: 재도전 우선 */}
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
          </>
        )}
      </div>

      {/* ④ 오답 미리보기 — 이번 세션 기준 (접이식 상세) */}
      <div className="result-review-section">
        {wrongPreview.length > 0 ? (
          <>
            <button
              className="result-review-toggle"
              onClick={() => setReviewOpen((o) => !o)}
            >
              <span>오답 미리 보기</span>
              <span className="result-review-count">{wrongPreview.length}개</span>
              <span className={`result-review-chevron${reviewOpen ? ' open' : ''}`}>›</span>
            </button>
            {reviewOpen && (
              <div className="result-review-list">
                {wrongPreview.map((q) => (
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

      {/* ⑤ 공유 카드 — 3순위, 보조 행동 */}
      <div className="result-share-section">
        <div className="result-share-format-row">
          <p className="result-section-label">결과 카드</p>
          <div className="result-share-format-tabs">
            <button
              className={`result-share-format-tab${cardFormat === 'square' ? ' result-share-format-tab--active' : ''}`}
              onClick={() => setCardFormat('square')}
            >
              정방형
            </button>
            <button
              className={`result-share-format-tab${cardFormat === 'story' ? ' result-share-format-tab--active' : ''}`}
              onClick={() => setCardFormat('story')}
            >
              스토리
            </button>
          </div>
        </div>

        {/* 시각적 공유 카드 */}
        <div className={`result-share-card-wrap${cardFormat === 'story' ? ' result-share-card-wrap--story' : ''}`}>
          {cardFormat === 'square' ? (
            <ResultSquareShareCard
              ref={cardRef}
              resultTypeLabel={resultType.label}
              resultTypeId={resultType.id}
              correctCount={score.correct}
              totalCount={score.total}
            />
          ) : (
            <StoryShareCard
              ref={cardRef}
              resultTypeLabel={resultType.label}
              resultTypeId={resultType.id}
              correctCount={score.correct}
              totalCount={score.total}
            />
          )}
        </div>

        {/* 저장 안내 토스트 */}
        {captureOutcome === 'manual' && (
          <p className="result-share-hint">
            화면을 길게 눌러 이미지로 저장해주세요
          </p>
        )}

        {/* 공유 버튼 2개 — 저장(primary) + 공유(secondary) */}
        <div className="result-share-btns">
          <button
            className="result-share-btn result-share-btn--primary"
            onClick={handleSaveCard}
          >
            {captureOutcome === 'manual' ? '저장 안내 확인' : '카드 저장하기'}
          </button>
          <button
            className={`result-share-btn${shareOutcome === 'unavailable' ? ' result-share-btn--muted' : ''}`}
            onClick={handleShare}
          >
            {shareOutcome === 'shared'
              ? '공유했어요 ✓'
              : shareOutcome === 'copied'
              ? '복사했어요 ✓'
              : shareOutcome === 'unavailable'
              ? '공유를 지원하지 않아요'
              : '공유하기'}
          </button>
        </div>
      </div>

    </main>
  )
}
