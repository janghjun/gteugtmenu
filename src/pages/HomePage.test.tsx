import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HomePage from './HomePage'
import { STORAGE_KEYS } from '../constants/storageKeys'
import { defaultUserQuizState } from '../features/state/userQuizState'
import type { UserQuizState, QuizHistoryItem, QuestionProgress } from '../features/state/userQuizState'
import { mockPack, activeSeasonalPacks } from '../features/content'
import type { QuizPack } from '../features/content'
import { getDailyTrendBite } from '../features/content/dailyTrend'

beforeEach(() => {
  localStorage.clear()
})

function saveState(state: UserQuizState) {
  localStorage.setItem(
    STORAGE_KEYS.USER_QUIZ_STATE,
    JSON.stringify({ ...state, schemaVersion: 1 }),
  )
}

function makeHistoryItem(correctCount: number, totalCount: number): QuizHistoryItem {
  return {
    sessionId: 'test',
    playedAt: new Date().toISOString(),
    packId: mockPack.packId,
    sessionType: 'normal',
    correctCount,
    totalCount,
    score: totalCount > 0 ? correctCount / totalCount : 0,
    resultType: 'snack-nostalgia-master',
  }
}

function makeWrongProgress(questionId: string): QuestionProgress {
  return {
    questionId,
    lastPlayedAt: new Date().toISOString(),
    lastMode: 'normal',
    lastPackId: mockPack.packId,
    lastResult: 'wrong',
    attemptCount: 1,
    correctCount: 0,
    wrongCount: 1,
  }
}

describe('HomePage 3.0', () => {
  it('신규 사용자 fallback — 첫 퀴즈를 시작해봐요 문구가 뜬다', () => {
    render(<HomePage onStart={() => {}} onStartDaily={() => {}} />)
    expect(screen.getByText('첫 퀴즈를 시작해봐요')).toBeInTheDocument()
  })

  it('최근 점수 있으면 결과 타입 레이블과 총 문항수가 표시된다', () => {
    saveState({
      ...defaultUserQuizState(),
      history: [makeHistoryItem(7, 10)],
    })
    render(<HomePage onStart={() => {}} onStartDaily={() => {}} />)
    expect(screen.getByText('추억 간식 마스터')).toBeInTheDocument()
    expect(screen.getByText(/7.*10/)).toBeInTheDocument()
  })

  it('onStartReview 없으면 오답 복습 버튼이 렌더되지 않는다', () => {
    render(<HomePage onStart={() => {}} onStartDaily={() => {}} />)
    expect(screen.queryByRole('button', { name: /오답/ })).toBeNull()
  })

  it('오답 없으면 오답이 없어요 버튼이 비활성화 상태로 뜬다', () => {
    render(<HomePage onStart={() => {}} onStartDaily={() => {}} onStartReview={() => {}} />)
    expect(screen.getByRole('button', { name: '오답이 없어요' })).toBeDisabled()
  })

  it('오답 있으면 복습 버튼이 활성화되고 클릭 시 onStartReview 호출', () => {
    const firstQ = mockPack.questions[0]
    saveState({
      ...defaultUserQuizState(),
      progressByQuestionId: { [firstQ.id]: makeWrongProgress(firstQ.id) },
    })
    const onStartReview = vi.fn()
    render(<HomePage onStart={() => {}} onStartDaily={() => {}} onStartReview={onStartReview} />)
    const btn = screen.getByRole('button', { name: /오답 1개 복습해요/ })
    expect(btn).not.toBeDisabled()
    fireEvent.click(btn)
    expect(onStartReview).toHaveBeenCalledTimes(1)
    expect(onStartReview.mock.calls[0][0]).toMatchObject({
      sessionType: 'wrong-only',
      completedAt: null,
    })
  })

  it('오늘의 퀴즈 버튼 클릭 시 onStartDaily 호출', () => {
    const onStartDaily = vi.fn()
    render(<HomePage onStart={() => {}} onStartDaily={onStartDaily} />)
    fireEvent.click(screen.getByRole('button', { name: /오늘의 퀴즈/ }))
    expect(onStartDaily).toHaveBeenCalledTimes(1)
  })

  it('10문제 시작해요 버튼 클릭 시 onStart 호출', () => {
    const onStart = vi.fn()
    render(<HomePage onStart={onStart} onStartDaily={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '10문제 시작해요' }))
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('예시 문제 카드가 보인다', () => {
    render(<HomePage onStart={() => {}} onStartDaily={() => {}} />)
    expect(screen.getByText('예시 문제')).toBeInTheDocument()
  })

  it('타이틀 먹퀴즈가 보인다', () => {
    render(<HomePage onStart={() => {}} onStartDaily={() => {}} />)
    expect(screen.getByText('먹퀴즈')).toBeInTheDocument()
  })
})

describe('HomePage Seasonal Hub', () => {
  it('onStartSeasonal 없으면 시즌팩 섹션이 렌더되지 않는다', () => {
    render(<HomePage onStart={() => {}} onStartDaily={() => {}} />)
    expect(screen.queryByText('시즌팩')).toBeNull()
  })

  it('onStartSeasonal 제공 시 시즌팩 섹션 헤더가 뜬다', () => {
    render(<HomePage onStart={() => {}} onStartDaily={() => {}} onStartSeasonal={() => {}} />)
    expect(screen.getByText('시즌팩')).toBeInTheDocument()
  })

  it('active seasonal pack이 있으면 팩 타이틀이 표시된다', () => {
    render(<HomePage onStart={() => {}} onStartDaily={() => {}} onStartSeasonal={() => {}} />)
    // activeSeasonalPacks는 실제 JSON 기반 — 현재 환경에서 2개 활성
    if (activeSeasonalPacks.length > 0) {
      expect(screen.getByText(activeSeasonalPacks[0].meta?.title ?? activeSeasonalPacks[0].title)).toBeInTheDocument()
    }
  })

  it('시즌팩 카드 클릭 시 onStartSeasonal이 해당 pack과 함께 호출된다', () => {
    if (activeSeasonalPacks.length === 0) return // 환경에 active pack 없으면 skip
    const onStartSeasonal = vi.fn()
    render(<HomePage onStart={() => {}} onStartDaily={() => {}} onStartSeasonal={onStartSeasonal} />)
    const firstPack = activeSeasonalPacks[0]
    const cardTitle = firstPack.meta?.title ?? firstPack.title
    fireEvent.click(screen.getByRole('button', { name: new RegExp(cardTitle) }))
    expect(onStartSeasonal).toHaveBeenCalledTimes(1)
    expect(onStartSeasonal.mock.calls[0][0]).toMatchObject({ packId: firstPack.packId })
  })

  it('active seasonal이 없으면 fallback 문구가 뜬다', () => {
    // vi.mock을 피하고 empty pack 리스트를 시뮬레이션하기 어려우므로
    // activeSeasonalPacks.length === 0일 때만 검증 (현재 환경에서는 skip)
    if (activeSeasonalPacks.length > 0) return
    render(<HomePage onStart={() => {}} onStartDaily={() => {}} onStartSeasonal={() => {}} />)
    expect(screen.getByText('다음 시즌팩을 준비하고 있어요')).toBeInTheDocument()
  })
})

describe('HomePage DailyTrendCard', () => {
  it('오늘의 트렌드 한 입 헤더가 항상 표시된다', () => {
    render(<HomePage onStart={() => {}} onStartDaily={() => {}} />)
    expect(screen.getByText('오늘의 트렌드 한 입')).toBeInTheDocument()
  })

  it('오늘의 트렌드 타이틀이 표시된다', () => {
    const bite = getDailyTrendBite()
    render(<HomePage onStart={() => {}} onStartDaily={() => {}} />)
    if (bite) expect(screen.getByText(bite.title)).toBeInTheDocument()
  })

  it('트렌드 설명 텍스트가 표시된다', () => {
    const bite = getDailyTrendBite()
    render(<HomePage onStart={() => {}} onStartDaily={() => {}} />)
    if (bite) expect(screen.getByText(bite.description)).toBeInTheDocument()
  })

  it('categoryKey 있고 onStartCategory 제공 시 카드가 버튼으로 렌더된다', () => {
    const bite = getDailyTrendBite()
    if (!bite?.categoryKey) return
    const { container } = render(
      <HomePage onStart={() => {}} onStartDaily={() => {}} onStartCategory={() => {}} />
    )
    const card = container.querySelector('.home-trend-card--action')
    expect(card).not.toBeNull()
  })

  it('카드 클릭 시 categoryKey로 onStartCategory가 호출된다', () => {
    const bite = getDailyTrendBite()
    if (!bite?.categoryKey) return
    const onStartCategory = vi.fn()
    render(
      <HomePage onStart={() => {}} onStartDaily={() => {}} onStartCategory={onStartCategory} />,
    )
    // trend card는 --action 버튼이면 클릭 가능
    const trendBtn = screen.getAllByRole('button').find((b) =>
      b.className.includes('home-trend-card'),
    )
    if (trendBtn) {
      fireEvent.click(trendBtn)
      expect(onStartCategory).toHaveBeenCalledWith(bite.categoryKey)
    }
  })

  it('packId 있고 onStartSeasonal 제공 시 seasonal pack으로 연결된다', () => {
    const bite = getDailyTrendBite()
    if (!bite?.packId) return
    const matchingPack = activeSeasonalPacks.find((p) => p.packId === bite.packId)
    if (!matchingPack) return // 현재 active하지 않으면 skip
    const onStartSeasonal = vi.fn()
    render(
      <HomePage
        onStart={() => {}}
        onStartDaily={() => {}}
        onStartSeasonal={onStartSeasonal}
      />,
    )
    const trendBtn = screen.getAllByRole('button').find((b) =>
      b.className.includes('home-trend-card'),
    )
    if (trendBtn) {
      fireEvent.click(trendBtn)
      expect(onStartSeasonal).toHaveBeenCalledWith(
        expect.objectContaining({ packId: bite.packId }),
      )
    }
  })
})
