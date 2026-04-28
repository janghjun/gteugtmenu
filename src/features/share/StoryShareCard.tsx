import { forwardRef } from 'react'
import './StoryShareCard.css'

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
    bg:     'linear-gradient(175deg, #1A0810 0%, #2E1225 55%, #180A1E 100%)',
    accent: '#FF4D88',
    blob:   '#FF2D72',
  },
  'convenience-tracker': {
    bg:     'linear-gradient(175deg, #041812 0%, #0B2E22 55%, #051A10 100%)',
    accent: '#00DEB7',
    blob:   '#00BF9E',
  },
  'sns-viral-catcher': {
    bg:     'linear-gradient(175deg, #0C0418 0%, #1C0834 55%, #100620 100%)',
    accent: '#C060FF',
    blob:   '#A040E8',
  },
  'snack-nostalgia-master': {
    bg:     'linear-gradient(175deg, #180C02 0%, #301804 55%, #1A0C02 100%)',
    accent: '#FF9500',
    blob:   '#E07800',
  },
  'solo-lifestyle': {
    bg:     'linear-gradient(175deg, #040C1C 0%, #0A1E3C 55%, #060E22 100%)',
    accent: '#4D9FFF',
    blob:   '#2B80FF',
  },
}

const FALLBACK_THEME: CardTheme = {
  bg:     'linear-gradient(175deg, #0C0E14 0%, #161C28 55%, #0A0E18 100%)',
  accent: '#3182F6',
  blob:   '#1F64D6',
}

export interface StoryShareCardProps {
  resultTypeLabel: string
  resultTypeId?: string
  correctCount: number
  totalCount: number
}

const StoryShareCard = forwardRef<HTMLDivElement, StoryShareCardProps>(
  ({ resultTypeLabel, resultTypeId, correctCount, totalCount }, ref) => {
    const emoji = (resultTypeId ? RESULT_EMOJI[resultTypeId] : undefined) ?? '🍽️'
    const theme = (resultTypeId ? CARD_THEMES[resultTypeId] : undefined) ?? FALLBACK_THEME
    const rate  = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0

    return (
      <div
        ref={ref}
        className="st-card"
        style={{ background: theme.bg }}
        data-testid="result-story-share-card"
      >
        {/* 배경 장식: 글로우 블롭 + 그레인 노이즈 */}
        <svg
          className="st-card-blobs"
          aria-hidden="true"
          viewBox="0 0 100 178"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="st-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="14" />
            </filter>
            <filter id="st-noise" x="0%" y="0%" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
          </defs>
          {/* 블롭: 스토리 비율(9:16)에 맞게 상단·중간·하단 분산 */}
          <circle cx="88"  cy="20"  r="42" fill={theme.blob} opacity="0.50" filter="url(#st-glow)" />
          <circle cx="8"   cy="60"  r="28" fill={theme.blob} opacity="0.28" filter="url(#st-glow)" />
          <circle cx="82"  cy="110" r="22" fill={theme.blob} opacity="0.20" filter="url(#st-glow)" />
          <circle cx="15"  cy="155" r="32" fill={theme.blob} opacity="0.32" filter="url(#st-glow)" />
          <circle cx="75"  cy="170" r="18" fill={theme.blob} opacity="0.18" filter="url(#st-glow)" />
          <rect width="100%" height="100%" filter="url(#st-noise)" opacity="0.035" />
        </svg>

        {/* ZONE ① 브랜드 — 상단 고정 */}
        <div className="st-card-top">
          <span className="st-card-brand-pill">먹퀴즈</span>
          <span className="st-card-brand-dot" aria-hidden="true">·</span>
          <span className="st-card-brand-sub">유행 음식 맞히기</span>
        </div>

        {/* ZONE ② 히어로 — 나머지 공간을 채우며 세로 중앙 정렬 */}
        <div className="st-card-hero">
          <span className="st-card-emoji" role="img" aria-label={resultTypeLabel}>
            {emoji}
          </span>
          <p className="st-card-eyebrow">나의 결과는</p>
          <p className="st-card-result">{resultTypeLabel}</p>
        </div>

        {/* ZONE ③ 스코어 + CTA — 하단 고정 */}
        <div className="st-card-bottom">
          <div className="st-card-glass">
            <p className="st-card-score-line">
              <span className="st-card-score-num" style={{ color: theme.accent }}>
                {correctCount}
              </span>
              <span className="st-card-score-denom"> / {totalCount}</span>
              <span className="st-card-score-suffix"> 맞혔어요</span>
            </p>
            <div className="st-card-bar">
              <div
                className="st-card-bar-fill"
                style={{ width: `${rate}%`, background: theme.accent }}
              />
            </div>
          </div>
          <p className="st-card-cta" style={{ color: theme.accent }}>
            너는 몇 점일까요?
          </p>
          <p className="st-card-app">먹퀴즈 · 지금 도전해봐요</p>
        </div>
      </div>
    )
  },
)

StoryShareCard.displayName = 'StoryShareCard'

export default StoryShareCard
