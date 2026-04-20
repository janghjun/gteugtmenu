export type { QuizPack, PackSource, PackLoadOptions, PackMeta, PackType } from './loadPack'
export {
  loadPack,
  clearPackCache,
  buildLocalPack,
  buildPackFromRaw,
  getActiveSeasonMeta,
  PACK_USER_ERRORS,
} from './loadPack'
export { selectActivePack, getDisplayMeta, isPackInDateRange } from './selectors'

import { buildLocalPack, buildPackFromRaw } from './loadPack'
import { selectActivePack, getDisplayMeta } from './selectors'
import rawSeasonPack  from './seasonPack.json'
import rawMzTrendPack from './mzTrendPack.json'

const corePack     = buildLocalPack()
const seasonPack   = buildPackFromRaw(rawSeasonPack)
const mzTrendPack  = buildPackFromRaw(rawMzTrendPack)

/** 현재 날짜 기준 active pack (가장 최근 startsAt seasonal 우선, 없으면 core) */
export const mockPack         = selectActivePack(corePack, [seasonPack, mzTrendPack])
export const activeSeasonMeta = getDisplayMeta(corePack, [seasonPack, mzTrendPack])

// 개별 팩도 필요 시 직접 접근 가능
export { corePack, seasonPack, mzTrendPack }
