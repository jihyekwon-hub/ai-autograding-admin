export type RuleResult = '자동확정' | '검수후확정' | '채점센터'
export type AnswerType = '정답' | '오답'

export type OperationRule = {
  id: number
  answer: AnswerType
  minLp: number | null
  maxLp: number | null
  result: RuleResult
  enabled: boolean
}

export const operationSubjects = curriculumStages

export type OperationSubject = Subject

export const initialOperationRules: OperationRule[] = [
  { id: 1, answer: '정답', minLp: 95, maxLp: 100, result: '자동확정', enabled: true },
  { id: 2, answer: '정답', minLp: 90, maxLp: 94, result: '검수후확정', enabled: true },
  { id: 3, answer: '정답', minLp: 0, maxLp: 89, result: '채점센터', enabled: true },
  { id: 4, answer: '오답', minLp: 95, maxLp: 100, result: '검수후확정', enabled: true },
  { id: 5, answer: '오답', minLp: 0, maxLp: 94, result: '채점센터', enabled: true },
]
import { curriculumStages, type Subject } from './curriculum'

