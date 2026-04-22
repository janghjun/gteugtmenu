const APP_NAME = '먹퀴즈'

const RESULT_EMOJI: Record<string, string> = {
  'dessert-sensor':         '🍰',
  'convenience-tracker':    '🛒',
  'sns-viral-catcher':      '📱',
  'snack-nostalgia-master': '🍭',
  'solo-lifestyle':         '🍜',
}

const FALLBACK_LABEL = '푸드 트렌드 탐험가'
const FALLBACK_EMOJI = '🍽️'

// ── 데이터 모델 ─────────────────────────────────────────────────

export interface ShareCardData {
  resultTypeLabel: string
  resultTypeId?: string
  correctCount: number
  totalCount: number
  /** future: 이미지 카드 URL을 붙일 자리 */
  imageUrl?: string
}

export interface ShareText {
  title: string
  body: string
  footer: string
  full: string
}

// ── 텍스트 생성 ─────────────────────────────────────────────────

export function buildShareText(data: ShareCardData): ShareText {
  const label  = data.resultTypeLabel?.trim() || FALLBACK_LABEL
  const emoji  = (data.resultTypeId && RESULT_EMOJI[data.resultTypeId]) ?? FALLBACK_EMOJI
  const title  = `나는 "${label}" ${emoji}`
  const body   = `${data.correctCount}/${data.totalCount} 맞혔어요\n너는 몇 점일까요?`
  const footer = APP_NAME
  const full   = [title, body, footer].join('\n')
  return { title, body, footer, full }
}

// ── 공유 실행 ───────────────────────────────────────────────────

export type ShareOutcome = 'shared' | 'copied' | 'unavailable'

/**
 * Web Share API → clipboard → unavailable 순서로 시도합니다.
 * 이미지 카드 URL이 제공되면 Web Share API에 files로 포함할 준비가 되어 있습니다(future).
 */
export async function shareResult(data: ShareCardData): Promise<ShareOutcome> {
  const text = buildShareText(data)

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: text.title, text: text.full })
      return 'shared'
    } catch {
      // 사용자가 취소했거나 공유 실패 — clipboard fallback으로 진행
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text.full)
      return 'copied'
    } catch {
      // clipboard 거부
    }
  }

  return 'unavailable'
}
