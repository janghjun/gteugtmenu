import { forwardRef } from 'react'
import './StoryShareCard.css'

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
  eyebrowColor: string
}

const CARD_THEMES: Record<string, CardTheme> = {
  'dessert-sensor': {
    bg:           'linear-gradient(175deg, #fff0f5 0%, #ffe4ec 40%, #fff8f0 100%)',
    brandColor:   '#ad1457',
    resultColor:  '#c2185b',
    barColor:     '#f06292',
    decoOpacity:  '0.18',
    decoFill:     '#f48fb1',
    eyebrowColor: '#e91e63',
  },
  'convenience-tracker': {
    bg:           'linear-gradient(175deg, #e8f8f5 0%, #ccf0e8 40%, #e4f6fd 100%)',
    brandColor:   '#00695c',
    resultColor:  '#00796b',
    barColor:     '#26a69a',
    decoOpacity:  '0.18',
    decoFill:     '#80cbc4',
    eyebrowColor: '#009688',
  },
  'sns-viral-catcher': {
    bg:           'linear-gradient(175deg, #f3e5f5 0%, #e8d0f7 40%, #ede8fa 100%)',
    brandColor:   '#4a148c',
    resultColor:  '#6a1b9a',
    barColor:     '#9c27b0',
    decoOpacity:  '0.18',
    decoFill:     '#ce93d8',
    eyebrowColor: '#7b1fa2',
  },
  'snack-nostalgia-master': {
    bg:           'linear-gradient(175deg, #fff8e1 0%, #ffeeba 40%, #fff5e0 100%)',
    brandColor:   '#bf360c',
    resultColor:  '#e65100',
    barColor:     '#fb8c00',
    decoOpacity:  '0.20',
    decoFill:     '#ffcc80',
    eyebrowColor: '#f57c00',
  },
  'solo-lifestyle': {
    bg:           'linear-gradient(175deg, #e3f2fd 0%, #d0e8fa 40%, #ede7f6 100%)',
    brandColor:   '#1a237e',
    resultColor:  '#0d47a1',
    barColor:     '#1976d2',
    decoOpacity:  '0.16',
    decoFill:     '#90caf9',
    eyebrowColor: '#1565c0',
  },
}

const FALLBACK_THEME: CardTheme = {
  bg:           'linear-gradient(175deg, #fafafa 0%, #f5f0ff 40%, #f0f8ff 100%)',
  brandColor:   '#191F28',
  resultColor:  '#191F28',
  barColor:     '#3182F6',
  decoOpacity:  '0.12',
  decoFill:     '#bfdbfe',
  eyebrowColor: '#3182F6',
}

// ── 컴포넌트 ──────────────────────────────────────────────────────

export interface StoryShareCardProps {
  resultTypeLabel: string
  resultTypeId?: string
  correctCount: number
  totalCount: number
}

const StoryShareCard = forwardRef<HTMLDivElement, StoryShareCardProps>(
  ({ resultTypeLabel, resultTypeId, correctCount, totalCount }, ref) => {
    const emoji = (resultTypeId ? RESULT_EMOJI[resultTypeId] : undefined) ?? '🍽️'
    const theme: CardTheme = (resultTypeId ? CARD_THEMES[resultTypeId] : undefined) ?? FALLBACK_THEME
    const rate  = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0

    return (
      <div
        ref={ref}
        className="st-card"
        style={{ background: theme.bg }}
        data-testid="result-story-share-card"
      >
        {/* 배경 장식 — 추상 도형 */}
        <svg
          className="st-card-deco"
          aria-hidden="true"
          viewBox="0 0 100 178"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="88" cy="12"  r="32" fill={theme.decoFill} opacity={theme.decoOpacity} />
          <circle cx="8"  cy="40"  r="20" fill={theme.decoFill} opacity={theme.decoOpacity} />
          <circle cx="92" cy="90"  r="14" fill={theme.decoFill} opacity={theme.decoOpacity} />
          <circle cx="12" cy="140" r="24" fill={theme.decoFill} opacity={theme.decoOpacity} />
          <circle cx="80" cy="168" r="18" fill={theme.decoFill} opacity={theme.decoOpacity} />
          <circle cx="50" cy="178" r="40" fill={theme.decoFill} opacity={theme.decoOpacity} />
        </svg>

        {/* ① 브랜드 */}
        <div className="st-card-top">
          <span className="st-card-brand" style={{ color: theme.brandColor }}>먹퀴즈</span>
          <span className="st-card-brand-sep" aria-hidden="true">·</span>
          <span className="st-card-brand-sub">유행 음식 맞히기</span>
        </div>

        {/* ② 히어로: 이모지 + 결과 타입 */}
        <div className="st-card-hero">
          <span
            className="st-card-emoji"
            role="img"
            aria-label={resultTypeLabel}
          >
            {emoji}
          </span>

          <div className="st-card-result-block">
            <p className="st-card-eyebrow" style={{ color: theme.eyebrowColor }}>나의 결과는</p>
            <p
              className="st-card-result"
              style={{ color: theme.resultColor }}
            >
              {resultTypeLabel}
            </p>
          </div>
        </div>

        {/* ③ 점수 + 진행 바 */}
        <div className="st-card-score-block">
          <p className="st-card-score-line">
            <span
              className="st-card-score-num"
              style={{ color: theme.resultColor }}
            >
              {correctCount}
            </span>
            <span className="st-card-score-denom"> / {totalCount}</span>
            <span className="st-card-score-suffix"> 맞혔어요</span>
          </p>

          <div className="st-card-bar">
            <div
              className="st-card-bar-fill"
              style={{
                width:      `${rate}%`,
                background: theme.barColor,
              }}
            />
          </div>
        </div>

        {/* ④ 하단 CTA */}
        <div className="st-card-footer">
          <p className="st-card-cta">너는 몇 점일까요?</p>
          <p className="st-card-app">먹퀴즈 · 지금 도전해봐요</p>
        </div>
      </div>
    )
  },
)

StoryShareCard.displayName = 'StoryShareCard'

export default StoryShareCard
