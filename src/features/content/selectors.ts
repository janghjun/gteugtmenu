import type { QuizPack, PackMeta } from './loadPack'

/**
 * dateKey(YYYY-MM-DD) 기준으로 pack이 활성 기간 내인지 확인.
 * startsAt/endsAt 둘 다 null이면 항상 true (상시 팩).
 */
export function isPackInDateRange(meta: PackMeta, dateKey: string): boolean {
  if (meta.startsAt && dateKey < meta.startsAt) return false
  if (meta.endsAt   && dateKey > meta.endsAt)   return false
  return true
}

/**
 * active seasonal pack이 있으면 seasonal 반환, 없으면 core 반환.
 *
 * 규칙:
 * 1. seasonal pack 중 status=active + 날짜 범위 내인 것을 필터
 * 2. 여럿이면 startsAt이 가장 최근인 것 우선
 * 3. 없으면 corePack 반환
 */
export function selectActivePack(
  corePack: QuizPack,
  seasonalPacks: QuizPack[],
  dateKey?: string,
): QuizPack {
  const today = dateKey ?? new Date().toISOString().slice(0, 10)

  const active = seasonalPacks
    .filter((p) => {
      const meta = p.meta
      if (!meta) return false
      if (meta.type !== 'seasonal') return false
      if (meta.status !== 'active') return false
      if (p.questions.length === 0) return false
      return isPackInDateRange(meta, today)
    })
    .sort((a, b) => {
      const aStart = a.meta?.startsAt ?? ''
      const bStart = b.meta?.startsAt ?? ''
      return bStart.localeCompare(aStart)  // 최신 startsAt 우선
    })

  return active[0] ?? corePack
}

/**
 * active seasonal pack의 meta 반환.
 * seasonal이 없거나 비활성이면 core meta 반환.
 */
export function getDisplayMeta(
  corePack: QuizPack,
  seasonalPacks: QuizPack[],
  dateKey?: string,
): PackMeta | undefined {
  const active = selectActivePack(corePack, seasonalPacks, dateKey)
  return active.meta
}
