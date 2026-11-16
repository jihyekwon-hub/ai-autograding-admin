export type ReviewPerformanceRecord = {
  date: string
  reviewerId: string
  reviewedPages: number
  corrections: number
  workMinutes: number
}

export type ReviewDetail = {
  id: string
  timestamp: string
  reviewerId: string
  page: number
  question: number
  before: string
  after: string
  errorType: '글자 오인식' | '숫자 자리수 오류' | 'LP 낮음' | '판정 불일치'
  corrected: boolean
}

const dates = ['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16']
const dailyTotals = [5760, 5980, 6320, 6420, 7120, 7320, 7820]
const dailyCorrections = [398, 377, 386, 372, 413, 388, 421]
const reviewerWeights = [0.23, 0.205, 0.179, 0.194, 0.192]

export const reviewPerformanceRecords: ReviewPerformanceRecord[] = dates.flatMap((date, dateIndex) =>
  reviewerWeights.map((weight, reviewerIndex) => ({
    date,
    reviewerId: `TCH00${reviewerIndex + 1}`,
    reviewedPages: Math.round(dailyTotals[dateIndex] * weight),
    corrections: Math.round(dailyCorrections[dateIndex] * weight),
    workMinutes: Math.round((dailyTotals[dateIndex] * weight) / (305 + reviewerIndex * 9) * 60),
  })),
)

export const reviewDetails: ReviewDetail[] = [
  { id: 'RV001', timestamp: '2026-11-16 10:32', reviewerId: 'TCH001', page: 35, question: 4, before: '오답', after: '정답', errorType: '판정 불일치', corrected: true },
  { id: 'RV002', timestamp: '2026-11-16 10:18', reviewerId: 'TCH002', page: 62, question: 5, before: '정답', after: '오답', errorType: '판정 불일치', corrected: true },
  { id: 'RV003', timestamp: '2026-11-16 10:05', reviewerId: 'TCH003', page: 72, question: 4, before: '오답', after: '정답', errorType: '판정 불일치', corrected: true },
  { id: 'RV004', timestamp: '2026-11-16 09:52', reviewerId: 'TCH004', page: 105, question: 2, before: '오답', after: '정답', errorType: '판정 불일치', corrected: true },
  { id: 'RV005', timestamp: '2026-11-16 09:41', reviewerId: 'TCH005', page: 65, question: 6, before: '정답', after: '정답', errorType: '판정 불일치', corrected: false },
  { id: 'RV006', timestamp: '2026-11-16 09:28', reviewerId: 'TCH001', page: 58, question: 3, before: '정답', after: '오답', errorType: '판정 불일치', corrected: true },
  { id: 'RV007', timestamp: '2026-11-16 09:14', reviewerId: 'TCH002', page: 74, question: 1, before: '오답', after: '정답', errorType: '판정 불일치', corrected: true },
  { id: 'RV008', timestamp: '2026-11-16 08:55', reviewerId: 'TCH004', page: 120, question: 6, before: '정답', after: '오답', errorType: '판정 불일치', corrected: true },
]
