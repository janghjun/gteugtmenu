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
 * 카드를 공유합니다.
 *
 * cardEl이 있으면 이미지 공유를 먼저 시도합니다:
 * 1. toBlob → navigator.share({ files, title, text }) — 이미지 파일 공유
 * 2. navigator.share({ text }) — 텍스트 공유
 * 3. clipboard.writeText — 텍스트 복사
 * 4. unavailable
 */
export async function shareResult(
  data: ShareCardData,
  cardEl: HTMLElement | null = null,
): Promise<ShareOutcome> {
  const text = buildShareText(data)

  // ① 이미지 공유 (cardEl 있고 navigator.share({ files }) 지원)
  if (cardEl && typeof navigator !== 'undefined' && navigator.share) {
    try {
      const { toBlob } = await import('html-to-image')
      await toBlob(cardEl, CAPTURE_OPTS)            // 캐시 워밍
      const blob = await toBlob(cardEl, CAPTURE_OPTS)
      if (blob) {
        const file = new File([blob], 'foodquiz-result.png', { type: 'image/png' })
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file] })
          return 'shared'
        }
      }
    } catch {
      // 이미지 캡처 또는 파일 공유 실패 → 텍스트 공유로 진행
    }
  }

  // ② 텍스트 공유
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: text.title, text: text.full })
      return 'shared'
    } catch {
      // 취소 또는 실패 — clipboard fallback으로 진행
    }
  }

  // ③ 클립보드 복사
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

// ── 카드 이미지 캡처 ─────────────────────────────────────────────

export type CaptureOutcome = 'downloaded' | 'manual'

const CAPTURE_OPTS = { pixelRatio: 2, cacheBust: true } as const

/**
 * 카드 DOM을 PNG로 캡처해 저장합니다.
 *
 * - iOS 15+: navigator.share({ files }) → 사진 앱으로 저장
 * - iOS 14 이하: manual (화면 길게 눌러 저장 안내)
 * - 데스크톱 / Android: createObjectURL → <a download> → revoke
 *
 * toBlob을 두 번 호출하는 이유: html-to-image 첫 번째 호출에서
 * 폰트·이모지 리소스를 캐시에 올리고, 두 번째 호출에서 완전한 이미지를 생성합니다.
 */
export async function captureShareCard(
  cardEl: HTMLElement | null,
): Promise<CaptureOutcome> {
  if (!cardEl) return 'manual'
  try {
    const { toBlob } = await import('html-to-image')
    await toBlob(cardEl, CAPTURE_OPTS)           // 캐시 워밍
    const blob = await toBlob(cardEl, CAPTURE_OPTS)
    if (!blob) return 'manual'

    const file = new File([blob], 'foodquiz-result.png', { type: 'image/png' })

    // iOS: <a download> 미지원 → Web Share API({ files }) 로 사진 앱에 저장
    if (/iP(hone|ad|od)/i.test(navigator.userAgent ?? '')) {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] })
        return 'downloaded'
      }
      return 'manual'
    }

    // 데스크톱 / Android
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'foodquiz-result.png'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 100) // click 후 비동기 해제
    return 'downloaded'
  } catch {
    return 'manual'
  }
}

// ── 스토리 카드 공유 ─────────────────────────────────────────────

/** shareResult의 alias — cardEl을 받아 이미지 공유를 시도합니다. */
export async function shareStoryCard(
  data: ShareCardData,
  cardEl: HTMLElement | null = null,
): Promise<ShareOutcome> {
  return shareResult(data, cardEl)
}
