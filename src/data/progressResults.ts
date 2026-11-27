import { TODAY } from './curriculum'
import { effectiveResult, type ProgressSetting } from './operationRules'

// 진도번호별 처리결과 mock 데이터. 실제 서비스에서는 처리결과 집계 API가 실시간 값을 내려준다.
// 처리결과 = 회원에게 발송까지 모든 작업이 끝난(완료) 장 수.
// 전체 제출 = 조회기간 동안 해당 진도번호로 제출된 답안 총량.
// 진도번호는 배정 하나만 가지므로, 제출된 답안은 모두 그 배정의 처리결과가 된다(배정이 없으면 채점센터).
// 오류 = 검수후확정 장 중 검수교사가 AI 판정을 수정한 뒤 확정한 장 수.

/** 오류율 관리 기준(%): 이 값을 넘으면 주의 대상 */
export const ERROR_RATE_THRESHOLD = 5

export type ProgressResult = { total: number; auto: number; review: number; center: number; corrected: number }

function hash(text: string) {
  let value = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

function daysBetween(start: string, end: string) {
  const days: string[] = []
  const last = end > TODAY ? TODAY : end
  for (let date = new Date(`${start}T00:00:00Z`); date.toISOString().slice(0, 10) <= last; date.setUTCDate(date.getUTCDate() + 1)) {
    days.push(date.toISOString().slice(0, 10))
  }
  return days
}

export function getProgressResult(subject: string, stage: string, progress: number, setting: ProgressSetting | undefined, start: string, end: string): ProgressResult {
  const route = effectiveResult(setting)
  const result: ProgressResult = { total: 0, auto: 0, review: 0, center: 0, corrected: 0 }
  let corrected = 0
  // 진도번호마다 고유한 기본 오류율(약 2.5%~6.5%, 대부분 5% 이하)을 두고, 달마다 조금씩 낮아진다.
  const unit = (hash(`${subject}|${stage}|${progress}|error`) % 1000) / 1000
  const baseErrorRate = 0.025 + unit ** 3 * 0.04
  daysBetween(start, end).forEach((day) => {
    const seed = hash(`${subject}|${stage}|${progress}|${day}`)
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay()
    const weekdayFactor = weekday === 0 ? 0.35 : weekday === 6 ? 0.6 : 1
    // 진도번호 하루 제출량(mock): 평일 약 120~380장
    const total = Math.round((120 + (seed % 261)) * weekdayFactor)
    result.total += total
    if (route === '자동확정') result.auto += total
    if (route === '검수후확정') {
      result.review += total
      const monthIndex = Math.max(0, (Number(day.slice(0, 4)) - 2026) * 12 + Number(day.slice(5, 7)) - 1)
      const dayNoise = (((seed >>> 9) % 7) - 3) * 0.001
      corrected += total * Math.max(0.005, baseErrorRate - monthIndex * 0.0012 + dayNoise)
    }
    if (route === '채점센터') result.center += total
  })
  result.corrected = Math.round(corrected)
  return result
}
