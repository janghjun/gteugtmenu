import { forwardRef } from 'react'
import './ResultSquareShareCard.css'

// ── 결과 타입별 데이터 ──────────────────────────────────────────

const RESULT_EMOJI: Record<string, string> = {
  'dessert-sensor':         '🍰',
  'convenience-tracker':    '🛒',
  'sns-viral-catcher':      '📱',
  'snack-nostalgia-master': '🍭',
  'solo-lifestyle':         '🍜',
}

interface CardTheme {
  bg: string
  brandColor: string
  resultColor: string
  barColor: string
  decoOpacity: string
  decoFill: string
}

const CARD_THEMES: Record<string, CardTheme> = {
  'dessert-sensor': {
    bg:           'linear-gradient(150deg, #fff0f5 0%, #ffe4ec 55%, #fff8f0 100%)',
    brandColor:   '#ad1457',
    resultColor:  '#c2185b',
    barColor:     '#f06292',
    decoOpacity:  '0.2',
    decoFill:     '#f48fb1',
  },
  'convenience-tracker': {
    bg:           'linear-gradient(150deg, #e8f8f5 0%, #ccf0e8 55%, #e4f6fd 100%)',
    brandColor:   '#00695c',
    resultColor:  '#00796b',
    barColor:     '#26a69a',
    decoOpacity:  '0.2',
    decoFill:     '#80cbc4',
  },
  'sns-viral-catcher': {
    bg:           'linear-gradient(150deg, #f3e5f5 0%, #e8d0f7 55%, #ede8fa 100%)',
    brandColor:   '#4a148c',
    resultColor:  '#6a1b9a',
    barColor:     '#9c27b0',
    decoOpacity:  '0.2',
    decoFill:     '#ce93d8',
  },
  'snack-nostalgia-master': {
    bg:           'linear-gradient(150deg, #fff8e1 0%, #ffeeba 55%, #fff5e0 100%)',
    brandColor:   '#bf360c',
    resultColor:  '#e65100',
    barColor:     '#fb8c00',
    decoOpacity:  '0.22',
    decoFill:     '#ffcc80',
  },
  'solo-lifestyle': {
    bg:           'linear-gradient(150deg, #e3f2fd 0%, #d0e8fa 55%, #ede7f6 100%)',
    brandColor:   '#1a237e',
    resultColor:  '#0d47a1',
    barColor:     '#1976d2',
    decoOpacity:  '0.18',
    decoFill:     '#90caf9',
  },
}

const FALLBACK_THEME: CardTheme = {
  bg:           'linear-gradient(150deg, #fafafa 0%, #f5f0ff 55%, #f0f8ff 100%)',
  brandColor:   '#191F28',
  resultColor:  '#191F28',
  barColor:     '#3182F6',
  decoOpacity:  '0.15',
  decoFill:     '#bfdbfe',
}

// ── 컴포넌트 ──────────────────────────────────────────────────────

export interface ResultSquareShareCardProps {
  resultTypeLabel: string
  resultTypeId?: string
  correctCount: number
  totalCount: number
}

const ResultSquareShareCard = forwardRef<HTMLDivElement, ResultSquareShareCardProps>(
  ({ resultTypeLabel, resultTypeId, correctCount, totalCount }, ref) => {
    const emoji = (resultTypeId ? RESULT_EMOJI[resultTypeId] : undefined) ?? '🍽️'
    const theme: CardTheme = (resultTypeId ? CARD_THEMES[resultTypeId] : undefined) ?? FALLBACK_THEME
    const rate  = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0

    return (
      <div
        ref={ref}
        className="sq-card"
        style={{ background: theme.bg }}
        data-testid="result-square-share-card"
      >
        {/* 배경 장식 — 추상 도형, 브랜드 연상 없음 */}
        <svg
          className="sq-card-deco"
          aria-hidden="true"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="84" cy="12" r="30" fill={theme.decoFill} opacity={theme.decoOpacity} />
          <circle cx="10" cy="82" r="20" fill={theme.decoFill} opacity={theme.decoOpacity} />
          <circle cx="80" cy="84" r="11" fill={theme.decoFill} opacity={theme.decoOpacity} />
          <circle cx="25" cy="10" r="7"  fill={theme.decoFill} opacity={theme.decoOpacity} />
          <circle cx="92" cy="55" r="5"  fill={theme.decoFill} opacity={theme.decoOpacity} />
        </svg>

        {/* ① 브랜드 */}
        <div className="sq-card-top">
          <span className="sq-card-brand" style={{ color: theme.brandColor }}>먹퀴즈</span>
          <span className="sq-card-brand-sep" aria-hidden="true">·</span>
          <span className="sq-card-brand-sub">유행 음식 맞히기</span>
        </div>

        {/* ② 히어로: 이모지 + 결과 타입 */}
        <div className="sq-card-hero">
          <span
            className="sq-card-emoji"
            role="img"
            aria-label={resultTypeLabel}
          >
            {emoji}
          </span>
          <p className="sq-card-na">나는</p>
          <p
            className="sq-card-result"
            style={{ color: theme.resultColor }}
          >
            {resultTypeLabel}
          </p>
        </div>

        {/* ③ 점수 + 유입 문구 */}
        <div className="sq-card-footer">
          <p className="sq-card-score-line">
            <span
              className="sq-card-score-num"
              style={{ color: theme.resultColor }}
            >
              {correctCount}
            </span>
            <span className="sq-card-score-denom"> / {totalCount}</span>
            <span className="sq-card-score-suffix"> 맞혔어요</span>
          </p>

          <div className="sq-card-bar">
            <div
              className="sq-card-bar-fill"
              style={{
                width:      `${rate}%`,
                background: theme.barColor,
              }}
            />
          </div>

          <p className="sq-card-cta">너는 몇 점일까요?</p>
        </div>
      </div>
    )
  },
)

ResultSquareShareCard.displayName = 'ResultSquareShareCard'

export default ResultSquareShareCard
