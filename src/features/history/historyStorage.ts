import type { PlayRecord } from './types'
import type { QuizHistoryItem } from '../state/userQuizState'
import { loadUserQuizState, saveUserQuizState } from '../state/userQuizState'
import { STORAGE_KEYS } from '../../constants/storageKeys'

export const HISTORY_KEY = STORAGE_KEYS.LEGACY_HISTORY  // 기존 테스트 / 롤백 대비 유지
const COMPAT_LIMIT = 5

function toPlayRecord(item: QuizHistoryItem): PlayRecord {
  return {
    playedAt:     item.playedAt,
    correctCount: item.correctCount,
    totalCount:   item.totalCount,
    score:        item.score,
    resultType:   item.resultType,
    packId:       item.packId,
  }
}

/**
 * @deprecated ResultPage는 applySessionResult + saveUserQuizState를 사용하세요.
 * 기존 코드 / 테스트 호환을 위해 유지 — PlayRecord를 UserQuizState.history에 기록합니다.
 */
export function saveRecord(record: PlayRecord): void {
  try {
    const current = loadUserQuizState()
    const item: QuizHistoryItem = {
      sessionId:   `legacy-${Date.now().toString(36)}`,
      sessionType: 'normal',
      playedAt:     record.playedAt,
      correctCount: record.correctCount,
      totalCount:   record.totalCount,
      score:        record.score,
      resultType:   record.resultType,
      packId:       record.packId,
    }
    saveUserQuizState({
      ...current,
      latestSessionId:  item.sessionId,
      latestScore:      record.score,
      latestResultType: record.resultType,
      latestPackId:     record.packId,
      history: [item, ...current.history].slice(0, COMPAT_LIMIT),
    })
  } catch {
    // 저장 실패 무시
  }
}

/** 저장된 전체 기록 반환 (최신순, 최대 5개) — PlayRecord 호환 레이어 */
export function loadHistory(): PlayRecord[] {
  try {
    return loadUserQuizState().history.slice(0, COMPAT_LIMIT).map(toPlayRecord)
  } catch {
    return []
  }
}

/** 가장 최근 기록 1개, 없으면 null */
export function getLastRecord(): PlayRecord | null {
  try {
    const first = loadUserQuizState().history[0]
    return first ? toPlayRecord(first) : null
  } catch {
    return null
  }
}
