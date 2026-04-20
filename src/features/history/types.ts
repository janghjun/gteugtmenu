export interface PlayRecord {
  playedAt: string    // ISO 8601
  correctCount: number
  totalCount: number
  score: number       // 0~1
  resultType: string  // ResultTypeId
  packId: string
}
