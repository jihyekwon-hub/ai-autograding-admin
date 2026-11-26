import { TODAY } from './curriculum'
import type { RuleResult } from './operationRules'

// 진도번호별 처리결과 mock 데이터.
// 처리결과 = 회원에게 발송까지 모든 작업이 끝난(완료) 장 수.
// 수정 = 검수배정(검수후확정) 장 중 검수교사가 AI 판정을 수정한 뒤 확정한 장 수.
// 실제 서비스에서는 처리결과 집계 API가 실시간 값을 내려준다.

export type ProgressResult = { completed: number; corrected: number }

const resultScale: Record<RuleResult, number> = { 자동확정: 1.6, 검수후확정: 0.55, 채점센터: 0.9 }

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

export function getProgressResult(subject: string, stage: string, progress: number, result: RuleResult, start: string, end: string): ProgressResult {
  let completed = 0
  let corrected = 0
  daysBetween(start, end).forEach((day) => {
    const seed = hash(`${subject}|${stage}|${progress}|${result}|${day}`)
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay()
    const weekdayFactor = weekday === 0 ? 0.35 : weekday === 6 ? 0.6 : 1
    const count = Math.round((4 + (seed % 17)) * resultScale[result] * weekdayFactor)
    completed += count
    if (result === '검수후확정') corrected += Math.round(count * (0.02 + ((seed >>> 8) % 6) / 100))
  })
  return { completed, corrected }
}
