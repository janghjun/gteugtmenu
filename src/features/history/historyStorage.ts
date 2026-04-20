import type { PlayRecord } from './types'

export const HISTORY_KEY = 'gtm_history'
const MAX_RECORDS = 5

function isValidRecord(r: unknown): r is PlayRecord {
  if (!r || typeof r !== 'object') return false
  const rec = r as Record<string, unknown>
  return (
    typeof rec.playedAt === 'string' &&
    typeof rec.correctCount === 'number' &&
    typeof rec.totalCount === 'number' &&
    typeof rec.score === 'number' &&
    typeof rec.resultType === 'string' &&
    typeof rec.packId === 'string'
  )
}

function parseHistory(): PlayRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidRecord)
  } catch {
    return []
  }
}

/** 새 결과를 맨 앞에 추가하고 최대 5개까지만 유지 */
export function saveRecord(record: PlayRecord): void {
  try {
    const history = parseHistory()
    const updated = [record, ...history].slice(0, MAX_RECORDS)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
  } catch {
    // 쓰기 실패(용량 초과, 프라이빗 모드 등) — 무시
  }
}

/** 저장된 전체 기록 반환 (최신순) */
export function loadHistory(): PlayRecord[] {
  return parseHistory()
}

/** 가장 최근 기록 1개, 없으면 null */
export function getLastRecord(): PlayRecord | null {
  return parseHistory()[0] ?? null
}
