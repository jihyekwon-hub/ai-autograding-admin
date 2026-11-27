import { curriculumStages, subjects, type Subject } from './curriculum'

export type { Subject } from './curriculum'

export type PerformanceRecord = {
  date: string
  subject: Subject
  stage: string
  total: number
  autoConfirmed: number
  reviewConfirmed: number
  gradingCenter: number
  /** 검수후확정 중 검수교사가 AI 판정을 수정한 장 수 */
  corrected: number
}

export const subjectStages = curriculumStages

const subjectScale: Record<Subject, number> = {
  수학: 1.18,
  국어: 1.02,
  영어: 0.9,
  과학: 0.72,
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function createPerformanceData(): PerformanceRecord[] {
  const records: PerformanceRecord[] = []
  const start = new Date(Date.UTC(2024, 0, 1))
  const end = new Date(Date.UTC(2026, 11, 31))
  for (let date = new Date(start); date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
    const dayIndex = Math.floor((date.getTime() - start.getTime()) / 86_400_000)
    const weekdayFactor = [0.62, 1.02, 1.08, 1.12, 1.1, 1.04, 0.72][date.getUTCDay()]

    subjects.forEach((subject, subjectIndex) => {
      subjectStages[subject].forEach((stage, stageIndex) => {
        const wave = 1 + Math.sin((dayIndex + subjectIndex * 3 + stageIndex) / 9) * 0.12
        const total = Math.round((285 + (dayIndex % 19) * 6) * subjectScale[subject] * weekdayFactor * wave)
        // 초기 운영 단계 예시: AI 자동채점(자동확정+검수후확정)보다 채점센터 이관이 많고,
        // 2026년 1월부터 달마다 AI 자동채점 비중이 조금씩 늘어난다.
        const rampMonths = Math.max(0, (date.getUTCFullYear() - 2026) * 12 + date.getUTCMonth())
        // 과목별 AI 적용 정도 차이(예시): 수학이 가장 높고 국어가 가장 낮다.
        const subjectBias = ({ 수학: 0.06, 영어: 0.03, 과학: -0.02, 국어: -0.05 } as Record<string, number>)[subject] ?? 0
        const autoRate = 0.17 + subjectBias * 0.6 + rampMonths * 0.006 + ((dayIndex + stageIndex) % 8) * 0.005
        const reviewRate = 0.12 + subjectBias * 0.4 + rampMonths * 0.003 + ((dayIndex + subjectIndex) % 6) * 0.004
        const centerRate = 0.56 - subjectBias - rampMonths * 0.009 + ((dayIndex + stageIndex * 2) % 5) * 0.006
        const autoConfirmed = Math.round(total * autoRate)
        const reviewConfirmed = Math.round(total * reviewRate)
        const gradingCenter = Math.round(total * centerRate)
        // 오류율(예시, 관리 기준 3%): 국어만 기준을 넘고 나머지 과목은 기준 이하이며, 달마다 조금씩 낮아진다.
        const errorBase = ({ 국어: 0.039, 과학: 0.029, 영어: 0.027, 수학: 0.023 } as Record<string, number>)[subject] ?? 0.028
        const errorRate = Math.max(0.005, errorBase - rampMonths * 0.0005 + (((dayIndex + stageIndex * 3) % 7) - 3) * 0.002)
        const corrected = Math.round(reviewConfirmed * errorRate)

        records.push({
          date: formatDate(date),
          subject,
          stage,
          total,
          autoConfirmed,
          reviewConfirmed,
          gradingCenter,
          corrected,
        })
      })
    })
  }

  return records
}

export const performanceData = createPerformanceData()
