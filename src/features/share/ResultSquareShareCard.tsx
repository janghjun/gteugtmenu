import { forwardRef } from 'react'
import './ResultSquareShareCard.css'

const RESULT_EMOJI: Record<string, string> = {
  'dessert-sensor':         '🍰',
  'convenience-tracker':    '🛒',
  'sns-viral-catcher':      '📱',
  'snack-nostalgia-master': '🍭',
  'solo-lifestyle':         '🍜',
}

interface CardTheme {
  bg:     string
  accent: string
  blob:   string
}

const CARD_THEMES: Record<string, CardTheme> = {
  'dessert-sensor': {
    bg:     'linear-gradient(150deg, #1A0810 0%, #2E1225 60%, #180A1E 100%)',
    accent: '#FF4D88',
    blob:   '#FF2D72',
  },
  'convenience-tracker': {
    bg:     'linear-gradient(150deg, #041812 0%, #0B2E22 60%, #051A10 100%)',
    accent: '#00DEB7',
    blob:   '#00BF9E',
  },
  'sns-viral-catcher': {
    bg:     'linear-gradient(150deg, #0C0418 0%, #1C0834 60%, #100620 100%)',
    accent: '#C060FF',
    blob:   '#A040E8',
  },
  'snack-nostalgia-master': {
    bg:     'linear-gradient(150deg, #180C02 0%, #301804 60%, #1A0C02 100%)',
    accent: '#FF9500',
    blob:   '#E07800',
  },
  'solo-lifestyle': {
    bg:     'linear-gradient(150deg, #040C1C 0%, #0A1E3C 60%, #060E22 100%)',
    accent: '#4D9FFF',
    blob:   '#2B80FF',
  },
}

const FALLBACK_THEME: CardTheme = {
  bg:     'linear-gradient(150deg, #0C0E14 0%, #161C28 60%, #0A0E18 100%)',
  accent: '#3182F6',
  blob:   '#1F64D6',
}

export interface ResultSquareShareCardProps {
  resultTypeLabel: string
  resultTypeId?: string
  correctCount: number
  totalCount: number
}

const ResultSquareShareCard = forwardRef<HTMLDivElement, ResultSquareShareCardProps>(
  ({ resultTypeLabel, resultTypeId, correctCount, totalCount }, ref) => {
    const emoji = (resultTypeId ? RESULT_EMOJI[resultTypeId] : undefined) ?? '🍽️'
    const theme = (resultTypeId ? CARD_THEMES[resultTypeId] : undefined) ?? FALLBACK_THEME
    const rate  = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0

    return (
      <div
        ref={ref}
        className="sq-card"
        style={{ background: theme.bg }}
        data-testid="result-square-share-card"
      >
        {/* 배경 장식: 글로우 블롭 + 그레인 노이즈 */}
        <svg
          className="sq-card-blobs"
          aria-hidden="true"
          viewBox="0 0 280 280"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="sq-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="22" />
            </filter>
            <filter id="sq-noise" x="0%" y="0%" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
          </defs>
          <circle cx="240" cy="44"  r="80" fill={theme.blob} opacity="0.45" filter="url(#sq-glow)" />
          <circle cx="28"  cy="220" r="65" fill={theme.blob} opacity="0.30" filter="url(#sq-glow)" />
          <circle cx="230" cy="248" r="42" fill={theme.blob} opacity="0.22" filter="url(#sq-glow)" />
          <rect width="100%" height="100%" filter="url(#sq-noise)" opacity="0.035" />
        </svg>

        {/* ① 브랜드 필 */}
        <div className="sq-card-top">
          <span className="sq-card-brand-pill">먹퀴즈</span>
          <span className="sq-card-brand-dot" aria-hidden="true">·</span>
          <span className="sq-card-brand-sub">유행 음식 맞히기</span>
        </div>

        {/* ② 히어로 */}
        <div className="sq-card-hero">
          <span className="sq-card-emoji" role="img" aria-label={resultTypeLabel}>
            {emoji}
          </span>
          <p className="sq-card-na">나는</p>
          <p className="sq-card-result">{resultTypeLabel}</p>
        </div>

        {/* ③ 점수 글래스 패널 */}
        <div className="sq-card-footer">
          <div className="sq-card-glass">
            <p className="sq-card-score-line">
              <span className="sq-card-score-num" style={{ color: theme.accent }}>
                {correctCount}
              </span>
              <span className="sq-card-score-denom"> / {totalCount}</span>
              <span className="sq-card-score-suffix"> 맞혔어요</span>
            </p>
            <div className="sq-card-bar">
              <div
                className="sq-card-bar-fill"
                style={{ width: `${rate}%`, background: theme.accent }}
              />
            </div>
            <p className="sq-card-cta" style={{ color: theme.accent }}>
              너는 몇 점일까요? →
            </p>
          </div>
        </div>
      </div>
    )
  },
)

ResultSquareShareCard.displayName = 'ResultSquareShareCard'

export default ResultSquareShareCard
