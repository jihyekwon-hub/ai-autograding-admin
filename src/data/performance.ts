import { curriculumStages, subjects, type Subject } from './curriculum'

export type { Subject } from './curriculum'

export type PerformanceRecord = {
  date: string
  subject: Subject
  stage: string
  /** 제출 답안 장 수. 자동확정·검수후확정·채점센터 구성은 저장된 배정 기준으로 대시보드에서 나눈다. */
  total: number
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
        records.push({
          date: formatDate(date),
          subject,
          stage,
          total,
        })
      })
    })
  }

  return records
}

export const performanceData = createPerformanceData()
