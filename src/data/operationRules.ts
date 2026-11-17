import { curriculumStages, progressNumbers, subjects, type Subject } from './curriculum'

// 운영기준(Routing Rule) mock 데이터.
// 과목 · 단계 · 진도번호마다 처리 결과(자동확정/검수후확정/채점센터)별 정답·오답 LP 범위를 가진다.
// 어떤 처리 결과에도 LP 범위가 없는 진도번호는 '미설정'이다.

export type RuleResult = '자동확정' | '검수후확정' | '채점센터'
export type AnswerType = '정답' | '오답'
export type LpRange = { min: number; max: number }

export const ruleResults: RuleResult[] = ['자동확정', '검수후확정', '채점센터']
export const answerTypes: AnswerType[] = ['정답', '오답']

/** 한 진도번호의 설정: 처리 결과 → 정답/오답 → LP 범위 */
export type ProgressSetting = Partial<Record<RuleResult, Partial<Record<AnswerType, LpRange>>>>
/** 한 과목·단계의 설정: 진도번호 → 설정 */
export type StageSettings = Record<number, ProgressSetting>
/** 전체 설정: `과목|단계` → 단계 설정 */
export type RuleSettings = Record<string, StageSettings>

export const stageKey = (subject: Subject, stage: string) => `${subject}|${stage}`

export function hasResult(setting: ProgressSetting | undefined, result: RuleResult) {
  const ranges = setting?.[result]
  return !!ranges && answerTypes.some((answer) => ranges[answer])
}

export function isUnset(setting: ProgressSetting | undefined) {
  return !ruleResults.some((result) => hasResult(setting, result))
}

/** 빈 처리 결과·정오답 항목을 정리해 비교와 저장이 쉽도록 만든다. */
export function cleanSetting(setting: ProgressSetting): ProgressSetting {
  const cleaned: ProgressSetting = {}
  ruleResults.forEach((result) => {
    const ranges = setting[result]
    if (!ranges) return
    const kept = Object.fromEntries(answerTypes.filter((answer) => ranges[answer]).map((answer) => [answer, { ...ranges[answer]! }]))
    if (Object.keys(kept).length) cleaned[result] = kept
  })
  return cleaned
}

export function sameSetting(a: ProgressSetting | undefined, b: ProgressSetting | undefined) {
  return JSON.stringify(cleanSetting(a ?? {})) === JSON.stringify(cleanSetting(b ?? {}))
}

/** 같은 정오답 안에서 서로 다른 처리 결과의 LP 범위가 겹치는지 확인한다. */
export function findOverlaps(setting: ProgressSetting) {
  const overlaps: { answer: AnswerType; results: [RuleResult, RuleResult] }[] = []
  answerTypes.forEach((answer) => {
    ruleResults.forEach((first, index) => {
      ruleResults.slice(index + 1).forEach((second) => {
        const a = setting[first]?.[answer]
        const b = setting[second]?.[answer]
        if (a && b && a.min <= b.max && b.min <= a.max) overlaps.push({ answer, results: [first, second] })
      })
    })
  })
  return overlaps
}

/** 진도번호 목록을 "1~30, 45, 181~200"처럼 범위 문자열로 줄인다. */
export function compressProgress(numbers: number[]) {
  const sorted = [...numbers].sort((a, b) => a - b)
  const parts: string[] = []
  for (let index = 0; index < sorted.length; index += 1) {
    const start = sorted[index]
    while (index + 1 < sorted.length && sorted[index + 1] === sorted[index] + 1) index += 1
    parts.push(start === sorted[index] ? String(start) : `${start}~${sorted[index]}`)
  }
  return parts.join(', ')
}

// ── mock 데이터 생성 ──────────────────────────────────────────

/** 일반적인 5개 Rule 조합: 정답 자동확정 하한, 정답 검수후확정 하한, 오답 검수후확정 하한 */
function standardSetting(autoMin: number, reviewMin: number, wrongReviewMin: number): ProgressSetting {
  return {
    자동확정: { 정답: { min: autoMin, max: 100 } },
    검수후확정: { 정답: { min: reviewMin, max: autoMin - 1 }, 오답: { min: wrongReviewMin, max: 100 } },
    채점센터: { 정답: { min: 0, max: reviewMin - 1 }, 오답: { min: 0, max: wrongReviewMin - 1 } },
  }
}

/** 검수 없이 자동확정과 채점센터로만 나누는 조합 */
function noReviewSetting(autoMin: number): ProgressSetting {
  return {
    자동확정: { 정답: { min: autoMin, max: 100 } },
    채점센터: { 정답: { min: 0, max: autoMin - 1 }, 오답: { min: 0, max: 100 } },
  }
}

type SeedRange = { subject: Subject; stageFrom: string; stageTo: string; progressFrom: number; progressTo: number; setting: ProgressSetting }

// 범위 밖의 진도번호는 미설정으로 남는다.
const seedRanges: SeedRange[] = [
  { subject: '수학', stageFrom: 'A', stageTo: 'A', progressFrom: 1, progressTo: 30, setting: standardSetting(95, 90, 95) },
  { subject: '수학', stageFrom: 'A', stageTo: 'A', progressFrom: 31, progressTo: 120, setting: standardSetting(96, 88, 97) },
  { subject: '수학', stageFrom: 'A', stageTo: 'A', progressFrom: 121, progressTo: 160, setting: noReviewSetting(94) },
  { subject: '수학', stageFrom: 'A', stageTo: 'A', progressFrom: 161, progressTo: 180, setting: standardSetting(94, 87, 95) },
  { subject: '수학', stageFrom: '4A', stageTo: '2A', progressFrom: 1, progressTo: 200, setting: standardSetting(96, 88, 97) },
  { subject: '수학', stageFrom: 'B', stageTo: 'C', progressFrom: 1, progressTo: 120, setting: standardSetting(94, 87, 95) },
  { subject: '영어', stageFrom: '5A', stageTo: '3A', progressFrom: 1, progressTo: 150, setting: standardSetting(95, 90, 96) },
  { subject: '영어', stageFrom: '2A', stageTo: '2A', progressFrom: 1, progressTo: 200, setting: standardSetting(93, 86, 95) },
  { subject: '국어', stageFrom: '4A', stageTo: '2A', progressFrom: 1, progressTo: 80, setting: standardSetting(97, 91, 98) },
  { subject: '국어', stageFrom: 'A1', stageTo: 'B2', progressFrom: 1, progressTo: 200, setting: standardSetting(95, 89, 96) },
  { subject: '과학', stageFrom: '3A', stageTo: 'A', progressFrom: 1, progressTo: 200, setting: standardSetting(94, 88, 96) },
  { subject: '과학', stageFrom: 'B', stageTo: 'D', progressFrom: 1, progressTo: 60, setting: noReviewSetting(95) },
]

function buildInitialSettings(): RuleSettings {
  const settings: RuleSettings = {}
  subjects.forEach((subject) => curriculumStages[subject].forEach((stage) => { settings[stageKey(subject, stage)] = {} }))
  seedRanges.forEach((range) => {
    const stages = curriculumStages[range.subject]
    const from = stages.indexOf(range.stageFrom)
    const to = stages.indexOf(range.stageTo)
    stages.slice(from, to + 1).forEach((stage) => {
      progressNumbers
        .filter((progress) => progress >= range.progressFrom && progress <= range.progressTo)
        .forEach((progress) => { settings[stageKey(range.subject, stage)][progress] = cleanSetting(range.setting) })
    })
  })
  return settings
}

export const initialRuleSettings: RuleSettings = buildInitialSettings()
export const initialRulesSavedAt = '2026-11-16 09:30'
