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

export const ruleResults: RuleResult[] = ['자동확정', '검수후확정', '채점센터']

// 저장된 운영기준 묶음: 과목 + 단계 범위 + 진도번호 범위마다 하나의 Rule 목록을 가진다.
export type AppliedRuleSet = {
  id: string
  subject: Subject
  stageFrom: string
  stageTo: string
  progressFrom: number
  progressTo: number
  rules: OperationRule[]
}

// 정답 자동확정 하한, 정답 검수후확정 하한, 오답 검수후확정 하한으로 5개 Rule을 만든다.
function standardRules(autoMin: number, reviewMin: number, wrongReviewMin: number): OperationRule[] {
  return [
    { id: 1, answer: '정답', minLp: autoMin, maxLp: 100, result: '자동확정', enabled: true },
    { id: 2, answer: '정답', minLp: reviewMin, maxLp: autoMin - 1, result: '검수후확정', enabled: true },
    { id: 3, answer: '정답', minLp: 0, maxLp: reviewMin - 1, result: '채점센터', enabled: true },
    { id: 4, answer: '오답', minLp: wrongReviewMin, maxLp: 100, result: '검수후확정', enabled: true },
    { id: 5, answer: '오답', minLp: 0, maxLp: wrongReviewMin - 1, result: '채점센터', enabled: true },
  ]
}

export function ruleSetKey(set: Pick<AppliedRuleSet, 'subject' | 'stageFrom' | 'stageTo' | 'progressFrom' | 'progressTo'>) {
  return `${set.subject}-${set.stageFrom}-${set.stageTo}-${set.progressFrom}-${set.progressTo}`
}

export const initialAppliedRuleSets: AppliedRuleSet[] = [
  { id: 'SET-01', subject: '수학', stageFrom: 'A', stageTo: 'A', progressFrom: 1, progressTo: 30, rules: initialOperationRules },
  { id: 'SET-02', subject: '수학', stageFrom: '4A', stageTo: '2A', progressFrom: 1, progressTo: 200, rules: standardRules(96, 88, 97) },
  { id: 'SET-03', subject: '수학', stageFrom: 'B', stageTo: 'C', progressFrom: 1, progressTo: 120, rules: standardRules(94, 87, 95) },
  { id: 'SET-04', subject: '영어', stageFrom: '5A', stageTo: '3A', progressFrom: 1, progressTo: 150, rules: standardRules(95, 90, 96) },
  { id: 'SET-05', subject: '영어', stageFrom: '2A', stageTo: '2A', progressFrom: 1, progressTo: 200, rules: standardRules(93, 86, 95) },
  { id: 'SET-06', subject: '국어', stageFrom: '4A', stageTo: '2A', progressFrom: 1, progressTo: 80, rules: standardRules(97, 91, 98) },
  { id: 'SET-07', subject: '국어', stageFrom: 'A1', stageTo: 'B2', progressFrom: 1, progressTo: 200, rules: standardRules(95, 89, 96) },
  { id: 'SET-08', subject: '과학', stageFrom: '3A', stageTo: 'A', progressFrom: 1, progressTo: 200, rules: standardRules(94, 88, 96) },
  { id: 'SET-09', subject: '과학', stageFrom: 'B', stageTo: 'D', progressFrom: 1, progressTo: 60, rules: standardRules(95, 90, 97) },
]
import { curriculumStages, type Subject } from './curriculum'

