import { useEffect, useMemo } from 'react'
import { mockPack, activeSeasonMeta, activeSeasonalPacks } from '../features/content'
import type { QuizPack } from '../features/content'
import { getDailyTrendBite } from '../features/content/dailyTrend'
import type { MenuToYearQuestion, QuizSession } from '../features/quiz'
import { CATEGORIES } from '../features/quiz'
import { logEvent, EVENTS } from '../features/analytics'
import { getLastRecord } from '../features/history'
import { RESULT_TYPES } from '../features/result'
import { loadUserQuizState, getUserStats } from '../features/state/userQuizState'
import { getWrongNoteQuestions, createWrongNoteSession } from '../features/review/reviewSelectors'
import './HomePage.css'

const CATEGORY_LABEL: Record<string, string> = {
  dessert_trend:       '디저트 트렌드',
  snack_recall:        '추억 간식',
  convenience_dessert: '편의점 디저트',
  solo_meal:           '혼밥 문화',
  wellness_food:       '건강식 트렌드',
}

interface Props {
  onStart: () => void
  onStartDaily: () => void
  onStartReview?: (session: QuizSession) => void
  onStartCategory?: (categoryKey: string) => void
  onStartSeasonal?: (pack: QuizPack) => void
}

export default function HomePage({ onStart, onStartDaily, onStartReview, onStartCategory, onStartSeasonal }: Props) {
  useEffect(() => { logEvent(EVENTS.HOME_VIEW) }, [])

  const userState        = useMemo(() => loadUserQuizState(), [])
  const lastRecord       = useMemo(() => getLastRecord(), [])
  const stats            = useMemo(() => getUserStats(userState, mockPack.questions), [userState])
  const wrongNoteQuestions = useMemo(
    () => getWrongNoteQuestions(userState.progressByQuestionId, mockPack.questions),
    [userState],
  )
  const trendBite = useMemo(() => getDailyTrendBite(), [])

  if (mockPack.questions.length === 0) {
    return (
      <div className="home-screen home-screen--center">
        <p className="home-status-body">문제를 불러오지 못했어요</p>
      </div>
    )
  }

  const exampleQ = mockPack.questions.find((q) => q.format === 'menu_to_year') as MenuToYearQuestion
  const wrongCount = wrongNoteQuestions.length
  const hasRecord  = lastRecord !== null

  const handleReview = () => {
    if (!onStartReview || wrongCount === 0) return
    const session = createWrongNoteSession(wrongNoteQuestions, mockPack.packId)
    if (session) onStartReview(session)
  }

  const handleTrendBiteAction = () => {
    if (!trendBite) return
    if (trendBite.packId && onStartSeasonal) {
      const pack = activeSeasonalPacks.find((p) => p.packId === trendBite.packId)
      if (pack) { onStartSeasonal(pack); return }
    }
    if (trendBite.categoryKey && onStartCategory) {
      onStartCategory(trendBite.categoryKey)
    }
  }

  const trendBiteActionable =
    trendBite !== null &&
    (
      (trendBite.packId && onStartSeasonal && activeSeasonalPacks.some((p) => p.packId === trendBite.packId)) ||
      (trendBite.categoryKey && onStartCategory)
    )

  return (
    <main className="home-screen">

      {/* ── 헤더 ────────────────────────────────────── */}
      <div className="home-header">
        <h1 className="home-title">먹퀴즈</h1>
        <span className="home-badge">
          {activeSeasonMeta ? activeSeasonMeta.subtitle : (mockPack.meta?.subtitle ?? '2000 — 2020년대')}
        </span>
      </div>

      {/* ── 내 현황 카드 ─────────────────────────────── */}
      <div className="home-summary-card">
        {hasRecord ? (
          <>
            <div className="home-summary-row">
              <span className="home-summary-type">
                {RESULT_TYPES[lastRecord!.resultType as keyof typeof RESULT_TYPES]?.label
                  ?? lastRecord!.resultType}
              </span>
              <span className="home-summary-score">
                {lastRecord!.correctCount}
                <span className="home-summary-score-sep">/</span>
                {lastRecord!.totalCount}
              </span>
            </div>
            {stats.totalPlays >= 2 && (
              <div className="home-stats">
                <span className="home-stats-item">총 {stats.totalPlays}번 플레이</span>
                {stats.bestScore !== null && (
                  <span className="home-stats-item">
                    최고 {Math.round(stats.bestScore * 100)}%
                  </span>
                )}
                {stats.weakestCategory && (
                  <span className="home-stats-item home-stats-item--weak">
                    취약 {CATEGORY_LABEL[stats.weakestCategory] ?? stats.weakestCategory}
                  </span>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="home-summary-empty">첫 퀴즈를 시작해봐요</p>
        )}
      </div>

      {/* ── 오늘의 트렌드 한 입 ─────────────────────── */}
      {trendBite ? (
        trendBiteActionable ? (
          <button className="home-trend-card home-trend-card--action" onClick={handleTrendBiteAction}>
            <div className="home-trend-header">
              <span className="home-trend-eyebrow">오늘의 트렌드 한 입</span>
              <span className="home-trend-arrow">›</span>
            </div>
            <p className="home-trend-title">{trendBite.title}</p>
            <p className="home-trend-desc">{trendBite.description}</p>
            <div className="home-trend-tags">
              {trendBite.tags.map((tag) => (
                <span key={tag} className="home-trend-tag">#{tag}</span>
              ))}
            </div>
          </button>
        ) : (
          <div className="home-trend-card">
            <div className="home-trend-header">
              <span className="home-trend-eyebrow">오늘의 트렌드 한 입</span>
            </div>
            <p className="home-trend-title">{trendBite.title}</p>
            <p className="home-trend-desc">{trendBite.description}</p>
            <div className="home-trend-tags">
              {trendBite.tags.map((tag) => (
                <span key={tag} className="home-trend-tag">#{tag}</span>
              ))}
            </div>
          </div>
        )
      ) : (
        <div className="home-trend-card home-trend-card--empty">
          <span className="home-trend-eyebrow">오늘의 트렌드 한 입</span>
          <p className="home-trend-empty">오늘의 트렌드를 불러오지 못했어요</p>
        </div>
      )}

      {/* ── 예시 문제 카드 ──────────────────────────── */}
      <div className="home-example-card">
        <span className="home-example-label">예시 문제</span>
        <p className="home-example-prompt">{exampleQ.prompt}</p>
        <div className="home-example-choices">
          {exampleQ.choices.map((choice) => (
            <span key={choice} className="home-example-choice">{choice}</span>
          ))}
        </div>
      </div>

      {/* ── 액션 그룹 ────────────────────────────────── */}
      <div className="home-action-group">

        {/* 오늘의 퀴즈 */}
        <button
          className="home-daily-card"
          onClick={() => {
            logEvent(EVENTS.QUIZ_START, { pack_id: `${mockPack.packId}__daily` })
            onStartDaily()
          }}
        >
          <div className="home-daily-info">
            <span className="home-daily-title">오늘의 퀴즈</span>
            <span className="home-daily-meta">3문제 · 매일 새로 나와요</span>
          </div>
          <span className="home-daily-arrow">›</span>
        </button>

        {/* 일반 퀴즈 */}
        <button
          className="home-cta"
          onClick={() => {
            logEvent(EVENTS.QUIZ_START, { pack_id: mockPack.packId })
            onStart()
          }}
        >
          10문제 시작해요
        </button>

        {/* 오답 복습 */}
        {onStartReview && (
          <button
            className={`home-review-row${wrongCount > 0 ? ' home-review-row--active' : ''}`}
            onClick={handleReview}
            disabled={wrongCount === 0}
          >
            <span className="home-review-label">
              {wrongCount > 0 ? `오답 ${wrongCount}개 복습해요` : '오답이 없어요'}
            </span>
            {wrongCount > 0 && <span className="home-review-arrow">›</span>}
          </button>
        )}
      </div>

      {/* ── Seasonal Hub ─────────────────────────────── */}
      {onStartSeasonal && (
        <div className="home-seasonal-hub">
          <span className="home-category-label">시즌팩</span>

          {activeSeasonalPacks.length > 0 ? (
            activeSeasonalPacks.map((pack) => (
              <button
                key={pack.packId}
                className="home-seasonal-card"
                onClick={() => {
                  logEvent(EVENTS.QUIZ_START, { pack_id: pack.packId })
                  onStartSeasonal(pack)
                }}
              >
                <div className="home-seasonal-info">
                  <span className="home-seasonal-title">{pack.meta?.title ?? pack.title}</span>
                  <span className="home-seasonal-sub">{pack.meta?.subtitle}</span>
                </div>
                <div className="home-seasonal-right">
                  <span className="home-seasonal-count">{pack.questions.length}문제</span>
                  <span className="home-seasonal-arrow">›</span>
                </div>
              </button>
            ))
          ) : (
            <p className="home-seasonal-empty">다음 시즌팩을 준비하고 있어요</p>
          )}
        </div>
      )}

      {/* ── 카테고리 선택 (onStartCategory 제공 시) ── */}
      {onStartCategory && (
        <div className="home-category-section">
          <span className="home-category-label">카테고리로 풀기</span>
          <div className="home-category-chips">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                className="home-category-chip"
                onClick={() => {
                  logEvent(EVENTS.QUIZ_START, { pack_id: `${mockPack.packId}__${cat.key}` })
                  onStartCategory(cat.key)
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

    </main>
  )
}
