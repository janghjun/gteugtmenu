import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ResultPage from './ResultPage'
import type { QuizSession } from '../features/quiz'
import { createQuizSession, submitAnswer, goNext } from '../features/quiz'
import { mockPack } from '../features/content'

// 테스트 간 localStorage / navigator 오염 방지
beforeEach(() => {
  localStorage.clear()
})

// mockPack (활성 팩) 기준으로 세션 생성 — ResultPage의 getWrongNoteQuestions와 같은 팩 사용
function makeCompletedSession(allCorrect = true): QuizSession {
  let s = createQuizSession(mockPack.questions)
  for (const q of s.questions) {
    s = submitAnswer(s, allCorrect ? q.answer : '__wrong__')
    s = goNext(s)
  }
  return s
}

const RESULT_LABELS = [
  '디저트 감각파', '편의점 트렌드 추적자', 'SNS 바이럴 포착형',
  '추억 간식 마스터', '한 그릇 생활형',
]

describe('ResultPage 2.0', () => {
  it('결과 타입 label이 렌더된다', () => {
    render(<ResultPage session={makeCompletedSession()} onRestart={() => {}} />)
    // ShareCardComponent도 같은 label을 표시하므로 queryAllByText 사용
    const found = RESULT_LABELS.some((l) => screen.queryAllByText(l).length > 0)
    expect(found).toBe(true)
  })

  it('점수 배지(N/10)가 렌더된다', () => {
    render(<ResultPage session={makeCompletedSession()} onRestart={() => {}} />)
    // ShareCardComponent의 score-num과 result-score-badge 모두 숫자를 표시함
    expect(screen.queryAllByText(/^\d+$/).length).toBeGreaterThan(0)
  })

  it('다시 해봐요 버튼이 있고 클릭 시 onRestart 호출', () => {
    const onRestart = vi.fn()
    render(<ResultPage session={makeCompletedSession()} onRestart={onRestart} />)
    fireEvent.click(screen.getByRole('button', { name: '다시 해봐요' }))
    expect(onRestart).toHaveBeenCalledTimes(1)
  })

  it('추천 CTA 버튼이 렌더된다', () => {
    render(<ResultPage session={makeCompletedSession()} onRestart={() => {}} />)
    const btn = screen.getAllByRole('button')
    expect(btn.length).toBeGreaterThanOrEqual(2)
  })

  it('전체 정답이면 오답 복습 fallback 문구가 뜬다', () => {
    render(<ResultPage session={makeCompletedSession(true)} onRestart={() => {}} />)
    expect(screen.getByText('모든 문제를 맞혔어요!')).toBeInTheDocument()
  })

  it('오답이 있으면 오답 미리보기 토글 버튼이 뜬다', () => {
    const session = makeCompletedSession(false)
    render(<ResultPage session={session} onRestart={() => {}} />)
    expect(screen.getByRole('button', { name: /오답 미리 보기/ })).toBeInTheDocument()
  })

  it('오답이 있고 onStartReview 제공 시 틀린 문제 다시 풀래요 CTA가 뜬다', () => {
    const session = makeCompletedSession(false)
    render(<ResultPage session={session} onRestart={() => {}} onStartReview={() => {}} />)
    expect(screen.getByRole('button', { name: '틀린 문제 다시 풀래요' })).toBeInTheDocument()
  })

  it('onStartReview 클릭 시 QuizSession을 인수로 콜백 호출', () => {
    const onStartReview = vi.fn()
    const session = makeCompletedSession(false)
    render(<ResultPage session={session} onRestart={() => {}} onStartReview={onStartReview} />)
    fireEvent.click(screen.getByRole('button', { name: '틀린 문제 다시 풀래요' }))
    expect(onStartReview).toHaveBeenCalledTimes(1)
    // 복습 세션(QuizSession)을 인수로 전달하는지 확인
    expect(onStartReview.mock.calls[0][0]).toMatchObject({
      sessionType: 'wrong-only',
      completedAt: null,
    })
  })

  it('session이 비정상이면 fallback UI를 렌더한다', () => {
    render(<ResultPage session={null as unknown as QuizSession} onRestart={() => {}} />)
    expect(screen.getByText('결과를 계산하지 못했어요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다시 해볼래요' })).toBeInTheDocument()
  })

  it('카드 저장하기 버튼과 공유하기 버튼이 렌더된다', () => {
    render(<ResultPage session={makeCompletedSession()} onRestart={() => {}} />)
    expect(screen.getByRole('button', { name: '카드 저장하기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '공유하기' })).toBeInTheDocument()
  })

  it('스토리 탭 클릭 시 스토리 카드로 전환된다', () => {
    render(<ResultPage session={makeCompletedSession()} onRestart={() => {}} />)
    expect(screen.queryByTestId('result-story-share-card')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '스토리' }))
    expect(screen.getByTestId('result-story-share-card')).toBeInTheDocument()
  })

  it('오답 없을 때 다시 해봐요가 1순위 CTA로 렌더된다', () => {
    render(<ResultPage session={makeCompletedSession(true)} onRestart={() => {}} />)
    const btns = screen.getAllByRole('button')
    const ctaIdx  = btns.findIndex((b) => b.textContent === '다시 해봐요')
    const shareIdx = btns.findIndex((b) => b.textContent === '카드 저장하기')
    expect(ctaIdx).toBeGreaterThanOrEqual(0)
    expect(shareIdx).toBeGreaterThan(ctaIdx)
  })

  it('오답 있고 onStartReview 있을 때 틀린 문제 다시 풀래요가 1순위로 렌더된다', () => {
    render(
      <ResultPage
        session={makeCompletedSession(false)}
        onRestart={() => {}}
        onStartReview={() => {}}
      />
    )
    const btns = screen.getAllByRole('button')
    const reviewIdx = btns.findIndex((b) => b.textContent === '틀린 문제 다시 풀래요')
    const shareIdx  = btns.findIndex((b) => b.textContent === '카드 저장하기')
    expect(reviewIdx).toBeGreaterThanOrEqual(0)
    expect(shareIdx).toBeGreaterThan(reviewIdx)
  })

  it('추천 버튼이 fallback 문구로 렌더된다', () => {
    render(<ResultPage session={makeCompletedSession(true)} onRestart={() => {}} />)
    // 전체 정답이면 weakCat=null → FALLBACK_RECOMMEND
    expect(screen.getByRole('button', { name: '비슷한 퀴즈도 있어요' })).toBeInTheDocument()
  })

  it('카드 저장하기 클릭 시 스크린샷 안내 메시지가 뜬다', async () => {
    render(<ResultPage session={makeCompletedSession()} onRestart={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '카드 저장하기' }))
    expect(await screen.findByText('화면을 길게 눌러 이미지로 저장해주세요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '저장 안내 확인' })).toBeInTheDocument()
  })

  it('Web Share API 사용 가능 시 공유하기 클릭 후 버튼 텍스트가 바뀐다', async () => {
    Object.defineProperty(navigator, 'share', {
      value:        vi.fn().mockResolvedValue(undefined),
      configurable: true,
      writable:     true,
    })
    render(<ResultPage session={makeCompletedSession()} onRestart={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '공유하기' }))
    expect(await screen.findByText('공유했어요 ✓')).toBeInTheDocument()
  })

  it('clipboard fallback 시 복사 완료 메시지가 뜬다', async () => {
    Object.defineProperty(navigator, 'share', {
      value:        undefined,
      configurable: true,
      writable:     true,
    })
    Object.defineProperty(navigator, 'clipboard', {
      value:        { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable:     true,
    })
    render(<ResultPage session={makeCompletedSession()} onRestart={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '공유하기' }))
    expect(await screen.findByText('복사했어요 ✓')).toBeInTheDocument()
  })
})
