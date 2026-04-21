export type QuestionFormat = 'menu_to_year' | 'year_to_menu' | 'image_to_year' | 'ox'
export type EvidenceLevel = 'A' | 'B' // C는 사용 금지
export type QuestionCategory =
  | 'dessert_trend'
  | 'snack_recall'
  | 'convenience_dessert'
  | 'solo_meal'
  | 'wellness_food'

interface BaseQuestion {
  id: string
  format: QuestionFormat
  prompt: string
  answer: string
  explanation: string // 1문장
  evidenceLevel: EvidenceLevel
  category: QuestionCategory
}

export interface MenuToYearQuestion extends BaseQuestion {
  format: 'menu_to_year'
  menu: string
  choices: string[]
}

export interface YearToMenuQuestion extends BaseQuestion {
  format: 'year_to_menu'
  year: number
  choices: string[]
}

export interface ImageToYearQuestion extends BaseQuestion {
  format: 'image_to_year'
  imageUrl: string
  visualAssetKey?: string
  choices: string[]
}

export interface OxQuestion extends BaseQuestion {
  format: 'ox'
  choices: ['O', 'X']
}

export type Question =
  | MenuToYearQuestion
  | YearToMenuQuestion
  | ImageToYearQuestion
  | OxQuestion

export type SessionType = 'normal' | 'daily' | 'review' | 'wrong-only' | 'seasonal' | 'category'

export interface QuizSession {
  questions: Question[]
  currentIndex: number
  answers: Record<string, string> // questionId → 선택한 답
  startedAt: Date
  completedAt: Date | null
  sessionType?: SessionType
}
