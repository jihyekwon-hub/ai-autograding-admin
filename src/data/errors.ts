import { reviewDetails } from './reviewPerformance'
import { MONTH_START, TODAY } from './curriculum'
import { initialReviewers, type ReviewerSubject } from './reviewers'

export type ErrorType = '글자 오인식' | '숫자 자리수 오류' | 'LP 낮음' | '특정 장 반복 오류' | '기타'
export type ErrorStatus = '수정완료' | '검토중'

export type GradingError = {
  id: string
  timestamp: string
  reviewerId: string
  subject: ReviewerSubject
  stage: string
  progress: number
  question: number
  page: number
  type: ErrorType
  before: string
  after: string
  detail: string
  status: ErrorStatus
}

const typeDetails: Record<ErrorType, string> = {
  '글자 오인식': '문자 형태를 유사 문자로 인식해 정답 판정을 수정',
  '숫자 자리수 오류': '숫자 자리수 또는 배열을 잘못 인식해 정답값 수정',
  'LP 낮음': '자동채점 신뢰도 기준 미달로 재채점 후 판정 수정',
  '특정 장 반복 오류': '동일 장에서 반복 판정 오류가 발생해 검수 결과로 수정',
  '기타': '답안 형식 또는 예외 케이스를 운영기준에 맞게 수정',
}

const normalizedReviewErrors: GradingError[] = reviewDetails
  .filter((detail) => detail.corrected)
  .map((detail, index) => {
    const reviewer = initialReviewers.find((item) => item.id === detail.reviewerId) ?? initialReviewers[0]
    const normalizedType: ErrorType = detail.errorType === '판정 불일치' ? '특정 장 반복 오류' : detail.errorType
    return {
      id: `ERR${String(index + 1).padStart(3, '0')}`,
      timestamp: detail.timestamp,
      reviewerId: detail.reviewerId,
      subject: reviewer.subject,
      stage: reviewer.stage,
      progress: reviewer.progressFrom + (index % Math.max(1, reviewer.progressTo - reviewer.progressFrom + 1)),
      question: detail.question,
      page: detail.page,
      type: normalizedType,
      before: detail.before,
      after: detail.after,
      detail: typeDetails[normalizedType],
      status: '수정완료',
    }
  })

const additionalErrors: GradingError[] = [
  { id: 'ERR101', timestamp: '2026-11-15 17:48', reviewerId: 'TCH003', subject: '국어', stage: '2A', progress: 66, question: 8, page: 72, type: '특정 장 반복 오류', before: '오답', after: '정답', detail: typeDetails['특정 장 반복 오류'], status: '수정완료' },
  { id: 'ERR102', timestamp: '2026-11-15 16:32', reviewerId: 'TCH005', subject: '영어', stage: '2A', progress: 48, question: 1, page: 65, type: '글자 오인식', before: '오답', after: '정답', detail: typeDetails['글자 오인식'], status: '수정완료' },
  { id: 'ERR103', timestamp: '2026-11-14 18:21', reviewerId: 'TCH001', subject: '수학', stage: 'A', progress: 24, question: 3, page: 78, type: '글자 오인식', before: '오답', after: '정답', detail: typeDetails['글자 오인식'], status: '수정완료' },
  { id: 'ERR104', timestamp: '2026-11-14 17:09', reviewerId: 'TCH002', subject: '수학', stage: 'A', progress: 45, question: 5, page: 76, type: '숫자 자리수 오류', before: '정답', after: '오답', detail: typeDetails['숫자 자리수 오류'], status: '수정완료' },
  { id: 'ERR105', timestamp: '2026-11-13 16:57', reviewerId: 'TCH004', subject: '과학', stage: 'A', progress: 82, question: 2, page: 69, type: 'LP 낮음', before: '오답', after: '정답', detail: typeDetails['LP 낮음'], status: '수정완료' },
  { id: 'ERR106', timestamp: '2026-11-12 15:44', reviewerId: 'TCH001', subject: '수학', stage: 'B', progress: 58, question: 7, page: 78, type: '특정 장 반복 오류', before: '오답', after: '정답', detail: typeDetails['특정 장 반복 오류'], status: '검토중' },
  { id: 'ERR107', timestamp: '2026-11-11 14:38', reviewerId: 'TCH002', subject: '영어', stage: '3A', progress: 18, question: 4, page: 60, type: '숫자 자리수 오류', before: '정답', after: '오답', detail: typeDetails['숫자 자리수 오류'], status: '수정완료' },
  { id: 'ERR108', timestamp: '2026-11-10 13:20', reviewerId: 'TCH003', subject: '과학', stage: '2A', progress: 25, question: 6, page: 72, type: '기타', before: '오답', after: '정답', detail: typeDetails['기타'], status: '검토중' },
  { id: 'ERR109', timestamp: '2026-11-09 16:40', reviewerId: 'TCH005', subject: '영어', stage: '2A', progress: 64, question: 4, page: 65, type: '글자 오인식', before: '오답', after: '정답', detail: typeDetails['글자 오인식'], status: '수정완료' },
  { id: 'ERR110', timestamp: '2026-11-08 17:14', reviewerId: 'TCH004', subject: '과학', stage: 'A', progress: 92, question: 9, page: 69, type: '특정 장 반복 오류', before: '정답', after: '오답', detail: typeDetails['특정 장 반복 오류'], status: '수정완료' },
]

const errorTypes: ErrorType[] = ['글자 오인식', '숫자 자리수 오류', 'LP 낮음', '특정 장 반복 오류', '기타']

// 기준월 조회용: 기준일이 속한 해 1월 ~ 지난달까지 달마다 9~14건(검수교사 담당 범위 안에서 seed로 생성)
function createPastErrors(): GradingError[] {
  const year = Number(TODAY.slice(0, 4))
  const lastMonth = Number(MONTH_START.slice(5, 7)) - 1
  const rows: GradingError[] = []
  for (let month = 1; month <= lastMonth; month += 1) {
    const count = 9 + (month * 7) % 6
    const days = new Date(Date.UTC(year, month, 0)).getUTCDate()
    for (let index = 0; index < count; index += 1) {
      const seed = month * 97 + index * 31
      const reviewer = initialReviewers[(month + index) % initialReviewers.length]
      const type = errorTypes[seed % errorTypes.length]
      const day = 1 + Math.floor((index + 0.5) * days / count)
      const hour = 9 + seed % 9
      const minute = (seed * 7) % 60
      const toCorrect = seed % 3 !== 0
      rows.push({
        id: `ERR${year}${String(month).padStart(2, '0')}${String(index + 1).padStart(2, '0')}`,
        timestamp: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        reviewerId: reviewer.id,
        subject: reviewer.subject,
        stage: reviewer.stage,
        progress: reviewer.progressFrom + seed % (reviewer.progressTo - reviewer.progressFrom + 1),
        question: 1 + seed % 10,
        page: 60 + seed % 40,
        type,
        before: toCorrect ? '오답' : '정답',
        after: toCorrect ? '정답' : '오답',
        detail: typeDetails[type],
        status: '수정완료',
      })
    }
  }
  return rows
}

export const gradingErrors: GradingError[] = [...normalizedReviewErrors, ...additionalErrors, ...createPastErrors()]
  .sort((a, b) => b.timestamp.localeCompare(a.timestamp))

export function createErrorFromCorrection(error: Omit<GradingError, 'id' | 'timestamp'>): GradingError {
  return { ...error, id: `ERR${Date.now()}`, timestamp: new Date().toISOString().slice(0, 16).replace('T', ' ') }
}
