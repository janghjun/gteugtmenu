import { forwardRef } from 'react'
import './ShareCardComponent.css'

const RESULT_EMOJI: Record<string, string> = {
  'dessert-sensor':         '🍰',
  'convenience-tracker':    '🛒',
  'sns-viral-catcher':      '📱',
  'snack-nostalgia-master': '🍭',
  'solo-lifestyle':         '🍜',
}

const SHARE_COPY: Record<string, string> = {
  'dessert-sensor':         '유행 디저트라면 내가 먼저!',
  'convenience-tracker':    '편의점 신상은 이미 알아요',
  'sns-viral-catcher':      'SNS 화제 음식은 다 알아요',
  'snack-nostalgia-master': '그 시절 간식, 다 기억해요',
  'solo-lifestyle':         '나만의 한 끼 루틴이 있어요',
}

const FALLBACK_EMOJI = '🍽️'
const FALLBACK_COPY  = '내 음식 트렌드 감각은?'

export interface ShareCardProps {
  resultTypeLabel: string
  resultTypeId?: string
  correctCount: number
  totalCount: number
  variant?: 'square' | 'story'
}

const ShareCardComponent = forwardRef<HTMLDivElement, ShareCardProps>(
  ({ resultTypeLabel, resultTypeId, correctCount, totalCount, variant = 'square' }, ref) => {
    const emoji = (resultTypeId && RESULT_EMOJI[resultTypeId]) ?? FALLBACK_EMOJI
    const copy  = (resultTypeId && SHARE_COPY[resultTypeId]) ?? FALLBACK_COPY
    const rate  = totalCount > 0 ? correctCount / totalCount : 0

    return (
      <div ref={ref} className={`share-card share-card--${variant}`}>
        <div className="share-card-top">
          <span className="share-card-brand">먹퀴즈</span>
          <span className="share-card-brand-dot" aria-hidden="true">·</span>
          <span className="share-card-brand-sub">유행 음식 맞히기</span>
        </div>

        <div className="share-card-body">
          <span className="share-card-emoji" role="img" aria-label={resultTypeLabel}>
            {emoji}
          </span>
          <p className="share-card-result">{resultTypeLabel}</p>
          <p className="share-card-copy">{copy}</p>
        </div>

        <div className="share-card-footer">
          <div className="share-card-score-row">
            <span className="share-card-score-num">{correctCount}</span>
            <span className="share-card-score-denom">/{totalCount}</span>
          </div>
          <div className="share-card-bar">
            <div
              className="share-card-bar-fill"
              style={{ width: `${Math.round(rate * 100)}%` }}
            />
          </div>
          <p className="share-card-tagline">먹퀴즈에서 도전해봐요</p>
        </div>
      </div>
    )
  },
)

ShareCardComponent.displayName = 'ShareCardComponent'

export default ShareCardComponent
