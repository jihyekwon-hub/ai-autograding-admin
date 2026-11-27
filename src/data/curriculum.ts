export const subjects = ['수학', '영어', '국어', '과학'] as const
export type Subject = typeof subjects[number]

export const curriculumStages: Record<Subject, readonly string[]> = {
  수학: ['4A', '3A', '2A', 'A', 'B', 'C'],
  영어: ['5A', '4A', '3A', '2A'],
  국어: ['4A', '3A', '2A', 'A1', 'A2', 'B1', 'B2'],
  과학: ['3A', '2A', 'A', 'B', 'C', 'D'],
}

export const progressNumbers = Array.from({ length: 200 }, (_, index) => index + 1)
export const TODAY = '2026-11-16'
export const MONTH_START = '2026-11-01'
/** 기준일이 속한 달(YYYY-MM) */
export const CURRENT_MONTH = TODAY.slice(0, 7)
/** 기준월 선택지: 기준일이 속한 해의 1월 ~ 기준일이 속한 달 */
export const monthOptions = Array.from({ length: Number(TODAY.slice(5, 7)) }, (_, index) => `${TODAY.slice(0, 4)}-${String(index + 1).padStart(2, '0')}`)
export const monthLabel = (month: string) => `${Number(month.slice(0, 4))}년 ${Number(month.slice(5, 7))}월`

export function normalizeStage(subject: Subject, current?: string, allowAll = false) {
  if (allowAll && current === '전체') return '전체'
  return current && curriculumStages[subject].includes(current) ? current : curriculumStages[subject][0]
}
