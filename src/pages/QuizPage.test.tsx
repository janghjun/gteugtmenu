import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import QuizPage from './QuizPage'
import { createQuizSession, submitAnswer } from '../features/quiz'
import { mockPack } from '../features/content'

describe('QuizPage smoke', () => {
  it('첫 문제 진행률 1/10을 렌더한다', () => {
    render(<QuizPage onFinish={() => {}} />)
    expect(screen.getByText('1 / 10')).toBeInTheDocument()
  })

  it('4종 format badge 중 하나를 렌더한다', () => {
    render(<QuizPage onFinish={() => {}} />)
    const BADGES = ['언제 유행했을까요', '그해의 메뉴는?', '이미지로 맞혀요', 'O / X 퀴즈']
    const found = BADGES.some((b) => screen.queryByText(b) !== null)
    expect(found).toBe(true)
  })

  it('선택지 버튼이 최소 2개 렌더된다', () => {
    render(<QuizPage onFinish={() => {}} />)
    const buttons = screen.getAllByRole('button')
    // 선택지 버튼들 (최소 2개) + 진행 중에는 다음 버튼 없음
    expect(buttons.length).toBeGreaterThanOrEqual(2)
  })
})

describe('QuizPage 내비게이션', () => {
  it('onExit 없으면 내비게이션 버튼이 렌더되지 않는다', () => {
    render(<QuizPage onFinish={() => {}} />)
    expect(screen.queryByRole('button', { name: '뒤로가기' })).toBeNull()
    expect(screen.queryByRole('button', { name: '홈으로' })).toBeNull()
  })

  it('onExit 제공 시 뒤로가기·홈 버튼이 렌더된다', () => {
    render(<QuizPage onFinish={() => {}} onExit={() => {}} />)
    expect(screen.getByRole('button', { name: '뒤로가기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '홈으로' })).toBeInTheDocument()
  })

  it('답변 전 뒤로가기 클릭 시 모달 없이 onExit 호출', () => {
    const onExit = vi.fn()
    render(<QuizPage onFinish={() => {}} onExit={onExit} />)
    fireEvent.click(screen.getByRole('button', { name: '뒤로가기' }))
    expect(onExit).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('퀴즈를 그만둘까요?')).toBeNull()
  })

  it('답변 전 홈 버튼 클릭 시 모달 없이 onExit 호출', () => {
    const onExit = vi.fn()
    render(<QuizPage onFinish={() => {}} onExit={onExit} />)
    fireEvent.click(screen.getByRole('button', { name: '홈으로' }))
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it('1문제 이상 답변 후 이탈 시 확인 모달이 표시된다', () => {
    // 첫 문제에 답변이 제출된 세션을 주입
    const base = createQuizSession(mockPack.questions)
    const firstQ = mockPack.questions[0]
    const answered = submitAnswer(base, firstQ.answer)

    render(
      <QuizPage
        onFinish={() => {}}
        onExit={() => {}}
        initialSession={answered}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '뒤로가기' }))
    expect(screen.getByText('퀴즈를 그만둘까요?')).toBeInTheDocument()
  })

  it('모달에서 닫기 클릭 시 모달이 사라지고 onExit은 호출되지 않는다', () => {
    const onExit = vi.fn()
    const base = createQuizSession(mockPack.questions)
    const answered = submitAnswer(base, mockPack.questions[0].answer)

    render(
      <QuizPage
        onFinish={() => {}}
        onExit={onExit}
        initialSession={answered}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '뒤로가기' }))
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))

    expect(screen.queryByText('퀴즈를 그만둘까요?')).toBeNull()
    expect(onExit).not.toHaveBeenCalled()
  })

  it('모달에서 나갈게요 클릭 시 onExit 호출', () => {
    const onExit = vi.fn()
    const base = createQuizSession(mockPack.questions)
    const answered = submitAnswer(base, mockPack.questions[0].answer)

    render(
      <QuizPage
        onFinish={() => {}}
        onExit={onExit}
        initialSession={answered}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '뒤로가기' }))
    fireEvent.click(screen.getByRole('button', { name: '나갈게요' }))

    expect(onExit).toHaveBeenCalledTimes(1)
  })
})
