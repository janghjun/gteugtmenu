import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import HomePage from './HomePage'

const defaultProps = { onStart: () => {}, onStartDaily: () => {} }

describe('HomePage smoke', () => {
  it('타이틀과 시작 버튼을 렌더한다', () => {
    render(<HomePage {...defaultProps} />)
    expect(screen.getByText('그때그메뉴')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '시작해요' })).toBeInTheDocument()
  })

  it('예시 문제 카드가 보인다', () => {
    render(<HomePage {...defaultProps} />)
    expect(screen.getByText('예시 문제')).toBeInTheDocument()
  })

  it('문제 수와 시간 메타 정보가 보인다', () => {
    render(<HomePage {...defaultProps} />)
    expect(screen.getByText('10문제 · 1분')).toBeInTheDocument()
  })

  it('오늘의 퀴즈 카드가 보인다', () => {
    render(<HomePage {...defaultProps} />)
    expect(screen.getByText('오늘의 퀴즈')).toBeInTheDocument()
  })
})
