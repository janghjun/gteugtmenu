import { describe, it, expect } from 'vitest'
import { selectActivePack, isPackInDateRange } from './selectors'
import type { QuizPack } from './loadPack'

function makePack(
  packId: string,
  type: 'core' | 'seasonal' | 'experimental',
  status: 'active' | 'scheduled' | 'expired',
  startsAt: string | null,
  endsAt: string | null,
  questionCount = 3,
): QuizPack {
  return {
    packId,
    title: packId,
    meta: {
      packId, title: packId, subtitle: '', type,
      isSeasonal: type === 'seasonal',
      startsAt, endsAt,
      categories: [], status,
    },
    questions: Array.from({ length: questionCount }, (_, i) => ({
      id: `${packId}-q${i}`,
      format: 'ox' as const,
      category: 'snack_recall' as const,
      prompt: '문제',
      choices: ['O', 'X'] as ['O', 'X'],
      answer: 'O',
      explanation: '.',
      evidenceLevel: 'A' as const,
    })),
  }
}

const core = makePack('core', 'core', 'active', null, null)

describe('isPackInDateRange', () => {
  it('startsAt/endsAt 없으면 항상 true', () => {
    expect(isPackInDateRange(core.meta!, '2026-04-21')).toBe(true)
  })

  it('startsAt 이전 날짜는 false', () => {
    const meta = { ...core.meta!, startsAt: '2026-05-01', endsAt: null }
    expect(isPackInDateRange(meta, '2026-04-30')).toBe(false)
  })

  it('endsAt 이후 날짜는 false', () => {
    const meta = { ...core.meta!, startsAt: null, endsAt: '2026-04-20' }
    expect(isPackInDateRange(meta, '2026-04-21')).toBe(false)
  })

  it('범위 내 날짜는 true', () => {
    const meta = { ...core.meta!, startsAt: '2026-04-01', endsAt: '2026-04-30' }
    expect(isPackInDateRange(meta, '2026-04-21')).toBe(true)
  })
})

describe('selectActivePack', () => {
  it('seasonal pack이 없으면 core 반환', () => {
    expect(selectActivePack(core, [], '2026-04-21')).toBe(core)
  })

  it('active seasonal이 있으면 seasonal 반환', () => {
    const s = makePack('s1', 'seasonal', 'active', '2026-03-01', '2026-05-31')
    expect(selectActivePack(core, [s], '2026-04-21')).toBe(s)
  })

  it('expired seasonal은 무시하고 core 반환', () => {
    const s = makePack('s1', 'seasonal', 'expired', '2026-01-01', '2026-02-28')
    expect(selectActivePack(core, [s], '2026-04-21')).toBe(core)
  })

  it('scheduled seasonal은 무시하고 core 반환', () => {
    const s = makePack('s1', 'seasonal', 'scheduled', '2026-06-01', '2026-08-31')
    expect(selectActivePack(core, [s], '2026-04-21')).toBe(core)
  })

  it('날짜 범위 밖 active seasonal은 무시하고 core 반환', () => {
    const s = makePack('s1', 'seasonal', 'active', '2026-06-01', '2026-08-31')
    expect(selectActivePack(core, [s], '2026-04-21')).toBe(core)
  })

  it('여러 active seasonal 중 가장 최근 startsAt 선택', () => {
    const old = makePack('s-old', 'seasonal', 'active', '2026-01-01', null)
    const recent = makePack('s-new', 'seasonal', 'active', '2026-04-01', null)
    expect(selectActivePack(core, [old, recent], '2026-04-21')).toBe(recent)
  })

  it('문항이 없는 seasonal은 무시', () => {
    const empty = makePack('s-empty', 'seasonal', 'active', '2026-03-01', '2026-05-31', 0)
    expect(selectActivePack(core, [empty], '2026-04-21')).toBe(core)
  })

  it('type이 core인 pack은 seasonal 후보에서 제외', () => {
    const notSeasonal = makePack('s-core', 'core', 'active', '2026-03-01', '2026-05-31')
    expect(selectActivePack(core, [notSeasonal], '2026-04-21')).toBe(core)
  })
})
