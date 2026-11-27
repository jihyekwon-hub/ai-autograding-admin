import { TODAY } from './curriculum'
import { effectiveResult, type ProgressSetting } from './operationRules'

// 진도번호별 처리결과 mock 데이터. 실제 서비스에서는 처리결과 집계 API가 실시간 값을 내려준다.
// 처리결과 = 회원에게 발송까지 모든 작업이 끝난(완료) 장 수.
// 진도번호는 배정 하나만 가지므로, 제출된 답안지는 모두 그 배정의 처리결과가 된다.
// 오류 = 검수후확정 장 중 검수교사가 AI 판정을 수정한 뒤 확정한 장 수.

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
  daysBetween(start, end).forEach((day) => {
    const seed = hash(`${subject}|${stage}|${progress}|${day}`)
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay()
    const weekdayFactor = weekday === 0 ? 0.35 : weekday === 6 ? 0.6 : 1
    const total = Math.round((6 + (seed % 15)) * weekdayFactor)
    result.total += total
    if (route === '자동확정') result.auto += total
    if (route === '검수후확정') {
      result.review += total
      corrected += total * (0.02 + ((seed >>> 8) % 6) / 100)
    }
    if (route === '채점센터') result.center += total
  })
  result.corrected = Math.round(corrected)
  return result
}
