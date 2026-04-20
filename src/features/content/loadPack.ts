import { validateQuestion } from '../quiz/schema'
import type { Question } from '../quiz/types'
import rawPack from './mockPack.json'

// ── 공개 타입 ─────────────────────────────────────────────────

export type PackType = 'core' | 'seasonal' | 'experimental'

export interface PackMeta {
  packId:     string
  title:      string
  subtitle:   string
  type:       PackType
  /** @deprecated isSeasonal → type === 'seasonal' で代替。後方互換のため残す */
  isSeasonal: boolean
  startsAt:   string | null  // "YYYY-MM-DD"
  endsAt:     string | null
  categories: string[]
  status:     'active' | 'scheduled' | 'expired'
}

export interface QuizPack {
  packId:    string
  title:     string
  meta?:     PackMeta
  questions: Question[]
}

export type PackSource = 'local' | 'remote'

export interface PackLoadOptions {
  remoteUrl?: string
  bustCache?: boolean
}

// 사용자 메시지 (한국어, 스택 없음) — 개발자 로그는 console.error/warn으로 분리
export const PACK_USER_ERRORS = {
  NETWORK: '네트워크 연결을 확인해 주세요',
  INVALID: '문제 데이터 형식이 올바르지 않아요',
  EMPTY:   '불러온 문제가 없어요',
} as const

// ── 캐시 ──────────────────────────────────────────────────────

const cache = new Map<string, QuizPack>()

export function clearPackCache(): void {
  cache.clear()
}

// ── 공개 진입점 ───────────────────────────────────────────────

export async function loadPack(
  options?: PackLoadOptions,
): Promise<{ pack: QuizPack; source: PackSource }> {
  const { remoteUrl, bustCache = false } = options ?? {}
  const cacheKey = remoteUrl ?? '__local__'

  if (!bustCache && cache.has(cacheKey)) {
    return { pack: cache.get(cacheKey)!, source: remoteUrl ? 'remote' : 'local' }
  }

  if (remoteUrl) {
    try {
      const pack = await fetchRemote(remoteUrl)
      cache.set(cacheKey, pack)
      return { pack, source: 'remote' }
    } catch (err) {
      // 개발자 로그: 원인 포함 전체 에러
      console.error('[content] Remote pack 로드 실패, local fallback 사용:', err)
    }
  }

  const local = buildLocalPack()
  cache.set(cacheKey, local)
  return { pack: local, source: 'local' }
}

// ── 내부 구현 ─────────────────────────────────────────────────

async function fetchRemote(url: string): Promise<QuizPack> {
  let res: Response
  try {
    res = await fetch(url)
  } catch (cause) {
    throw Object.assign(new Error(PACK_USER_ERRORS.NETWORK), { cause })
  }

  if (!res.ok) {
    throw new Error(`[content] HTTP ${res.status} — ${url}`)
  }

  let data: unknown
  try {
    data = await res.json()
  } catch (cause) {
    throw Object.assign(new Error(PACK_USER_ERRORS.INVALID), { cause })
  }

  const pack = parsePackShape(data)
  if (pack.questions.length === 0) {
    throw new Error(PACK_USER_ERRORS.EMPTY)
  }

  return pack
}

const PACK_TYPES = ['core', 'seasonal', 'experimental'] as const
const STATUSES   = ['active', 'scheduled', 'expired'] as const

function parsePackMeta(raw: unknown): PackMeta | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const m = raw as Record<string, unknown>

  if (
    typeof m.packId    !== 'string' ||
    typeof m.title     !== 'string' ||
    typeof m.subtitle  !== 'string' ||
    !Array.isArray(m.categories) ||
    !STATUSES.includes(m.status as typeof STATUSES[number])
  ) return undefined

  // type 필드: 없으면 isSeasonal로 하위 호환 추론
  const rawType = m.type as string | undefined
  const type: PackType = PACK_TYPES.includes(rawType as PackType)
    ? (rawType as PackType)
    : (m.isSeasonal === true ? 'seasonal' : 'core')

  return {
    packId:     m.packId,
    title:      m.title,
    subtitle:   m.subtitle,
    type,
    isSeasonal: type === 'seasonal',
    startsAt:   typeof m.startsAt === 'string' ? m.startsAt : null,
    endsAt:     typeof m.endsAt   === 'string' ? m.endsAt   : null,
    categories: m.categories as string[],
    status:     m.status as PackMeta['status'],
  }
}

function parsePackShape(data: unknown): QuizPack {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error(PACK_USER_ERRORS.INVALID)
  }

  const d = data as Record<string, unknown>
  if (typeof d.packId !== 'string' || typeof d.title !== 'string' || !Array.isArray(d.questions)) {
    throw new Error(PACK_USER_ERRORS.INVALID)
  }

  const questions: Question[] = []
  for (const raw of d.questions) {
    const result = validateQuestion(raw)
    if (result.ok) {
      questions.push(result.question)
    } else {
      console.warn('[content] 문항 제외 (validation 실패):', (raw as { id?: string }).id, result.errors)
    }
  }

  return { packId: d.packId, title: d.title, meta: parsePackMeta(d.meta), questions }
}

/** 임의 raw JSON → QuizPack. 파싱 실패 시 빈 팩 반환 (원격 팩·시즌팩 공용). */
export function buildPackFromRaw(raw: unknown): QuizPack {
  try {
    return parsePackShape(raw)
  } catch (err) {
    console.error('[content] Pack 파싱 오류:', err)
    return { packId: 'fallback', title: '그때그메뉴', questions: [] }
  }
}

/** 기본 로컬 팩 빌드 — mockPack 하위 호환 + loadPack fallback 공용. */
export function buildLocalPack(): QuizPack {
  return buildPackFromRaw(rawPack)
}

/** 시즌팩이 active 상태면 meta 반환, 아니면 null. */
export function getActiveSeasonMeta(pack: QuizPack): PackMeta | null {
  if (!pack.meta?.isSeasonal) return null
  if (pack.meta.status !== 'active') return null
  return pack.meta
}
