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
import rawSeasonPack from './seasonPack.json'

const corePack    = buildLocalPack()
const seasonPack  = buildPackFromRaw(rawSeasonPack)

/** 현재 날짜 기준 active pack (seasonal > core 우선순위) */
export const mockPack         = selectActivePack(corePack, [seasonPack])
export const activeSeasonMeta = getDisplayMeta(corePack, [seasonPack])

// 개별 팩도 필요 시 직접 접근 가능
export { corePack, seasonPack }
