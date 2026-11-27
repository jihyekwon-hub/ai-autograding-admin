import { curriculumStages, progressNumbers, subjects, type Subject } from './curriculum'

// 운영기준(Routing Rule) mock 데이터.
// 과목 · 단계 · 진도번호마다 배정(자동확정/검수후확정/채점센터)을 선택하고, 선택한 배정마다 LP 기준값(이상)을 가진다.
// LP 범위는 기준값으로 계산한다: 높은 기준값부터 위 구간을 차지하고, 어떤 배정에도 속하지 않는 LP 구간은 채점센터로 이관된다.
// 아무 배정도 선택하지 않은 진도번호는 전량 채점센터로 이관된다.

export type RuleResult = '자동확정' | '검수후확정' | '채점센터'
export type LpRange = { min: number; max: number }

export const ruleResults: RuleResult[] = ['자동확정', '검수후확정', '채점센터']
/** 운영기준 설정 화면에서 쓰는 배정 명칭 */
export const resultLabels: Record<RuleResult, string> = { 자동확정: '자동배정', 검수후확정: '검수배정', 채점센터: '채점배정' }
/** 배정을 새로 선택할 때의 기본 LP 기준값 */
export const defaultLp: Record<RuleResult, number> = { 자동확정: 95, 검수후확정: 90, 채점센터: 0 }

/** 한 진도번호의 설정: 선택한 배정 → LP 기준값(이 값 이상) */
export type ProgressSetting = Partial<Record<RuleResult, number>>
/** 한 과목·단계의 설정: 진도번호 → 설정 */
export type StageSettings = Record<number, ProgressSetting>
/** 전체 설정: `과목|단계` → 단계 설정 */
export type RuleSettings = Record<string, StageSettings>

export const stageKey = (subject: Subject, stage: string) => `${subject}|${stage}`

export const hasResult = (setting: ProgressSetting | undefined, result: RuleResult) => typeof setting?.[result] === 'number'
export const isUnset = (setting: ProgressSetting | undefined) => !ruleResults.some((result) => hasResult(setting, result))

/** 선택한 배정만 고정 순서로 남겨 비교와 저장이 쉽도록 만든다. */
export function cleanSetting(setting: ProgressSetting): ProgressSetting {
  const cleaned: ProgressSetting = {}
  ruleResults.forEach((result) => {
    const value = setting[result]
    if (typeof value === 'number') cleaned[result] = value
  })
  return cleaned
}

export function sameSetting(a: ProgressSetting | undefined, b: ProgressSetting | undefined) {
  return JSON.stringify(cleanSetting(a ?? {})) === JSON.stringify(cleanSetting(b ?? {}))
}

/** 기준값으로 배정별 LP 범위를 계산한다. (예: 자동 95, 검수 90, 채점 0 → 95~100, 90~94, 0~89) */
export function lpRanges(setting: ProgressSetting | undefined) {
  const ranges: Partial<Record<RuleResult, LpRange>> = {}
  let upper = 100
  ruleResults
    .filter((result) => hasResult(setting, result))
    .sort((a, b) => (setting?.[b] ?? 0) - (setting?.[a] ?? 0))
    .forEach((result) => {
      const min = setting?.[result] ?? 0
      ranges[result] = { min, max: Math.max(min, upper) }
      upper = min - 1
    })
  return ranges
}

/** 설정 오류: LP 0~100 정수, 자동배정 > 검수배정 > 채점배정 순서 */
export function settingErrors(setting: ProgressSetting | undefined) {
  const errors: string[] = []
  const selected = ruleResults.filter((result) => hasResult(setting, result))
  if (selected.some((result) => { const value = setting?.[result] ?? 0; return !Number.isInteger(value) || value < 0 || value > 100 })) errors.push('LP는 0~100 정수')
  for (let index = 1; index < selected.length; index += 1) {
    const upper = selected[index - 1]
    const lower = selected[index]
    if ((setting?.[upper] ?? 0) <= (setting?.[lower] ?? 0)) errors.push(`${resultLabels[upper]} LP가 ${resultLabels[lower]}보다 커야 함`)
  }
  return errors
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

/** 자동배정 · 검수배정 · 채점배정을 모두 쓰는 조합 */
const standardSetting = (autoMin: number, reviewMin: number): ProgressSetting => ({ 자동확정: autoMin, 검수후확정: reviewMin, 채점센터: 0 })
/** 검수 없이 자동배정과 채점배정으로만 나누는 조합 */
const noReviewSetting = (autoMin: number): ProgressSetting => ({ 자동확정: autoMin, 채점센터: 0 })

type SeedRange = { subject: Subject; stageFrom: string; stageTo: string; progressFrom: number; progressTo: number; setting: ProgressSetting }

// 범위 밖의 진도번호는 배정을 선택하지 않은 상태(전량 채점센터)로 남는다.
const seedRanges: SeedRange[] = [
  { subject: '수학', stageFrom: 'A', stageTo: 'A', progressFrom: 1, progressTo: 30, setting: standardSetting(95, 90) },
  { subject: '수학', stageFrom: 'A', stageTo: 'A', progressFrom: 31, progressTo: 120, setting: standardSetting(96, 88) },
  { subject: '수학', stageFrom: 'A', stageTo: 'A', progressFrom: 121, progressTo: 160, setting: noReviewSetting(94) },
  { subject: '수학', stageFrom: 'A', stageTo: 'A', progressFrom: 161, progressTo: 180, setting: standardSetting(94, 87) },
  { subject: '수학', stageFrom: '4A', stageTo: '2A', progressFrom: 1, progressTo: 200, setting: standardSetting(96, 88) },
  { subject: '수학', stageFrom: 'B', stageTo: 'C', progressFrom: 1, progressTo: 120, setting: standardSetting(94, 87) },
  { subject: '영어', stageFrom: '5A', stageTo: '3A', progressFrom: 1, progressTo: 150, setting: standardSetting(95, 90) },
  { subject: '영어', stageFrom: '2A', stageTo: '2A', progressFrom: 1, progressTo: 200, setting: standardSetting(93, 86) },
  { subject: '국어', stageFrom: '4A', stageTo: '2A', progressFrom: 1, progressTo: 80, setting: standardSetting(97, 91) },
  { subject: '국어', stageFrom: 'A1', stageTo: 'B2', progressFrom: 1, progressTo: 200, setting: standardSetting(95, 89) },
  { subject: '과학', stageFrom: '3A', stageTo: 'A', progressFrom: 1, progressTo: 200, setting: standardSetting(94, 88) },
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
