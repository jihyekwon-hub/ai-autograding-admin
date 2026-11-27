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
        // 초기 운영 단계 예시: AI 자동채점(자동확정+검수후확정)보다 채점센터 이관이 많다.
        const autoRate = 0.17 + ((dayIndex + stageIndex) % 8) * 0.005
        const reviewRate = 0.12 + ((dayIndex + subjectIndex) % 6) * 0.004
        const centerRate = 0.56 + ((dayIndex + stageIndex * 2) % 5) * 0.006
        const autoConfirmed = Math.round(total * autoRate)
        const reviewConfirmed = Math.round(total * reviewRate)
        const gradingCenter = Math.round(total * centerRate)

        records.push({
          date: formatDate(date),
          subject,
          stage,
          total,
          autoConfirmed,
          reviewConfirmed,
          gradingCenter,
        })
      })
    })
  }

  return records
}

export const performanceData = createPerformanceData()
