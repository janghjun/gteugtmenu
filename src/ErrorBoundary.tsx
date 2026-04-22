import { Component } from 'react'
import type { ReactNode } from 'react'

interface State { hasError: boolean }

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100dvh', gap: 16, padding: 24,
      }}>
        <p style={{ fontSize: 16, color: '#333D4B' }}>잠시 문제가 생겼어요</p>
        <button
          style={{
            padding: '12px 24px', background: '#3182F6', color: '#fff',
            border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}
          onClick={() => window.location.reload()}
        >
          다시 시도해봐요
        </button>
      </div>
    )
  }
}
