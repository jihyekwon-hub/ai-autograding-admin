import { curriculumStages, progressNumbers, subjects, type Subject } from './curriculum'

// 운영기준(Routing Rule) mock 데이터.
// 과목 · 단계 · 진도번호마다 배정(자동확정/검수후확정/채점센터) 중 하나만 선택하고, 선택한 배정의 LP 범위를 가진다.
// LP 범위는 lpMin 초과 ~ lpMax 이하(lpMin < LP ≤ lpMax)로, 경계값이 겹치거나 비지 않게 한다.
// 배정을 선택하지 않은 진도번호는 채점센터로 이관된다.

export type RuleResult = '자동확정' | '검수후확정' | '채점센터'

export const ruleResults: RuleResult[] = ['자동확정', '검수후확정', '채점센터']
/** 배정기준설정 화면에서 쓰는 배정 명칭 */
export const resultLabels: Record<RuleResult, string> = { 자동확정: '자동배정', 검수후확정: '검수배정', 채점센터: '채점배정' }
/** 배정을 새로 선택할 때의 기본 LP 범위(초과 ~ 이하) */
export const defaultLp: Record<RuleResult, LpRange> = { 자동확정: { lpMin: 95, lpMax: 100 }, 검수후확정: { lpMin: 90, lpMax: 100 }, 채점센터: { lpMin: 0, lpMax: 100 } }

/** LP 범위: lpMin 초과 ~ lpMax 이하 */
export type LpRange = { lpMin: number; lpMax: number }
/** 한 진도번호의 설정: 선택한 배정 하나와 LP 범위 */
export type ProgressSetting = { result: RuleResult } & LpRange
/** 한 과목·단계의 설정: 진도번호 → 설정 (없으면 채점센터 이관) */
export type StageSettings = Record<number, ProgressSetting | undefined>
/** 전체 설정: `과목|단계` → 단계 설정 */
export type RuleSettings = Record<string, StageSettings>

/** 다른 화면에서 기준설정으로 이동할 때 넘기는 정보(react-router location.state) */
export type StandardsLinkState = { subject: Subject; stage: string; period?: { start: string; end: string }; sortByErrorRate?: boolean; from?: string }

export const stageKey = (subject: Subject, stage: string) => `${subject}|${stage}`

/** 실제로 적용되는 배정: 선택하지 않았으면 채점센터 */
export const effectiveResult = (setting: ProgressSetting | undefined): RuleResult => setting?.result ?? '채점센터'

export function sameSetting(a: ProgressSetting | undefined, b: ProgressSetting | undefined) {
  return a?.result === b?.result && a?.lpMin === b?.lpMin && a?.lpMax === b?.lpMax
}

const isLpValue = (value: number) => Number.isInteger(value) && value >= 0 && value <= 100
/** LP 0~100 정수, 초과값 < 이하값 */
export const isValidRange = (range: LpRange) => isLpValue(range.lpMin) && isLpValue(range.lpMax) && range.lpMin < range.lpMax

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

/** 과목 전체(모든 단계)의 배정별 진도번호 수 */
export function subjectAssignmentCounts(settings: RuleSettings, subject: Subject) {
  const counts: Record<RuleResult, number> = { 자동확정: 0, 검수후확정: 0, 채점센터: 0 }
  curriculumStages[subject].forEach((stage) => {
    const stageSettings = settings[stageKey(subject, stage)] ?? {}
    progressNumbers.forEach((progress) => { counts[effectiveResult(stageSettings[progress])] += 1 })
  })
  return counts
}

// ── mock 데이터 생성 ──────────────────────────────────────────
// 모든 과목·단계의 진도번호를 10개 단위 구간으로 나눠 배정 하나를 정한다.
// 낮은 단계·앞쪽 진도번호일수록 AI 채점(자동·검수배정) 비중이 높고, 과목별로 기본 비중이 다르다.

function hash(text: string) {
  let value = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

/** 과목별 기본 비중(자동배정, 검수배정). 나머지는 채점배정. */
const subjectWeights: Record<Subject, [number, number]> = {
  수학: [0.55, 0.28],
  영어: [0.45, 0.3],
  국어: [0.3, 0.3],
  과학: [0.38, 0.27],
}

function seedSetting(subject: Subject, stage: string, stageIndex: number, block: number): ProgressSetting {
  const roll = hash(`${subject}|${stage}|${block}`) % 1000 / 1000
  const [autoWeight, reviewWeight] = subjectWeights[subject]
  // 낮은 단계·앞쪽 진도번호일수록 자동배정 비중을 높인다.
  const auto = Math.min(0.85, Math.max(0.1, autoWeight - stageIndex * 0.05 + (9.5 - block) * 0.02))
  const review = reviewWeight
  const variation = hash(`${subject}|${stage}|${block}|lp`) % 4
  if (roll < auto) return { result: '자동확정', lpMin: 93 + variation, lpMax: 100 }
  if (roll < auto + review) return { result: '검수후확정', lpMin: 86 + variation, lpMax: 100 }
  return { result: '채점센터', lpMin: 0, lpMax: 100 }
}

function buildInitialSettings(): RuleSettings {
  const settings: RuleSettings = {}
  subjects.forEach((subject) => curriculumStages[subject].forEach((stage, stageIndex) => {
    const stageSettings: StageSettings = {}
    progressNumbers.forEach((progress) => {
      stageSettings[progress] = seedSetting(subject, stage, stageIndex, Math.floor((progress - 1) / 10))
    })
    settings[stageKey(subject, stage)] = stageSettings
  }))
  return settings
}

export const initialRuleSettings: RuleSettings = buildInitialSettings()
export const initialRulesSavedAt = '2026-11-16 09:30'
