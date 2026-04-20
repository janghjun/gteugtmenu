import { useEffect, useMemo } from 'react'
import { mockPack, activeSeasonMeta } from '../features/content'
import type { MenuToYearQuestion } from '../features/quiz'
import { logEvent, EVENTS } from '../features/analytics'
import { getLastRecord } from '../features/history'
import { RESULT_TYPES } from '../features/result'
import './HomePage.css'

interface Props {
  onStart: () => void
}

export default function HomePage({ onStart }: Props) {
  useEffect(() => { logEvent(EVENTS.HOME_VIEW) }, [])
  const lastRecord = useMemo(() => getLastRecord(), [])

  // 팩이 비어있으면 에러 화면 — 로컬 JSON이므로 실제로는 발생하지 않음
  if (mockPack.questions.length === 0) {
    return (
      <div className="home-screen home-screen--center">
        <p className="home-status-body">문제를 불러오지 못했어요</p>
      </div>
    )
  }

  // 예시 문제: 팩의 첫 번째 menu_to_year 문항으로 고정
  const exampleQ = mockPack.questions.find((q) => q.format === 'menu_to_year') as MenuToYearQuestion

  return (
    <main className="home-screen">
      <span className="home-badge">
        {activeSeasonMeta ? activeSeasonMeta.subtitle : (mockPack.meta?.subtitle ?? '2000 — 2020년대')}
      </span>

      <h1 className="home-title">그때그메뉴</h1>
      <p className="home-desc">그 메뉴, 그 과자, 그 디저트가 언제 유행했는지 맞혀봐요</p>
      <p className="home-meta">10문제 · 1분</p>

      {lastRecord && (
        <p className="home-last-record">
          최근 결과: {RESULT_TYPES[lastRecord.resultType as keyof typeof RESULT_TYPES]?.label ?? lastRecord.resultType}
          {' '}·{' '}
          {lastRecord.correctCount}/{lastRecord.totalCount}점
        </p>
      )}

      <div className="home-example-card">
        <span className="home-example-label">예시 문제</span>
        <p className="home-example-prompt">{exampleQ.prompt}</p>
        <div className="home-example-choices">
          {exampleQ.choices.map((choice) => (
            <span key={choice} className="home-example-choice">{choice}</span>
          ))}
        </div>
      </div>

      <button
        className="home-cta"
        onClick={() => {
          logEvent(EVENTS.QUIZ_START, { pack_id: mockPack.packId })
          onStart()
        }}
      >
        시작해요
      </button>
    </main>
  )
}
