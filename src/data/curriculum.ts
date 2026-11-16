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

export function normalizeStage(subject: Subject, current?: string, allowAll = false) {
  if (allowAll && current === '전체') return '전체'
  return current && curriculumStages[subject].includes(current) ? current : curriculumStages[subject][0]
}
