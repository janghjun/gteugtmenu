import { describe, it, expect, beforeEach } from 'vitest'
import { saveRecord, loadHistory, getLastRecord, HISTORY_KEY } from './historyStorage'
import type { PlayRecord } from './types'

function makeRecord(overrides: Partial<PlayRecord> = {}): PlayRecord {
  return {
    playedAt: new Date().toISOString(),
    correctCount: 7,
    totalCount: 10,
    score: 0.7,
    resultType: 'dessert-sensor',
    packId: 'base-2024',
    ...overrides,
  }
}

describe('historyStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('결과를 저장하고 읽는다', () => {
    saveRecord(makeRecord())
    const history = loadHistory()
    expect(history).toHaveLength(1)
    expect(history[0].resultType).toBe('dessert-sensor')
  })

  it('새 결과가 맨 앞에 추가된다', () => {
    saveRecord(makeRecord({ resultType: 'solo-lifestyle' }))
    saveRecord(makeRecord({ resultType: 'dessert-sensor' }))
    expect(loadHistory()[0].resultType).toBe('dessert-sensor')
  })

  it('5개 초과 시 오래된 항목이 제거된다', () => {
    for (let i = 0; i < 6; i++) {
      saveRecord(makeRecord({ correctCount: i }))
    }
    const history = loadHistory()
    expect(history).toHaveLength(5)
    expect(history[0].correctCount).toBe(5)
  })

  it('malformed JSON은 빈 배열로 fallback된다', () => {
    localStorage.setItem(HISTORY_KEY, 'NOT_JSON{{')
    expect(loadHistory()).toEqual([])
  })

  it('배열이 아닌 구조는 빈 배열로 fallback된다', () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify({ foo: 'bar' }))
    expect(loadHistory()).toEqual([])
  })

  it('잘못된 구조의 항목만 필터링된다', () => {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify([{ foo: 'bar' }, makeRecord({ correctCount: 3 })])
    )
    const history = loadHistory()
    expect(history).toHaveLength(1)
    expect(history[0].correctCount).toBe(3)
  })

  it('getLastRecord는 기록 없으면 null 반환', () => {
    expect(getLastRecord()).toBeNull()
  })

  it('getLastRecord는 가장 최근 기록을 반환한다', () => {
    saveRecord(makeRecord({ correctCount: 4 }))
    saveRecord(makeRecord({ correctCount: 9 }))
    expect(getLastRecord()?.correctCount).toBe(9)
  })

  it('localStorage.getItem 실패 시 앱이 중단되지 않는다', () => {
    const original = Object.getOwnPropertyDescriptor(Storage.prototype, 'getItem')!
    Object.defineProperty(Storage.prototype, 'getItem', {
      value: () => { throw new Error('storage unavailable') },
      configurable: true,
    })
    expect(() => loadHistory()).not.toThrow()
    expect(loadHistory()).toEqual([])
    Object.defineProperty(Storage.prototype, 'getItem', original)
  })

  it('localStorage.setItem 실패 시 앱이 중단되지 않는다', () => {
    const original = Object.getOwnPropertyDescriptor(Storage.prototype, 'setItem')!
    Object.defineProperty(Storage.prototype, 'setItem', {
      value: () => { throw new Error('quota exceeded') },
      configurable: true,
    })
    expect(() => saveRecord(makeRecord())).not.toThrow()
    Object.defineProperty(Storage.prototype, 'setItem', original)
  })
})
