import { TODAY } from './curriculum'
import { effectiveResult, type ProgressSetting } from './operationRules'

// 진도번호별 처리결과 mock 데이터. 실제 서비스에서는 처리결과 집계 API가 실시간 값을 내려준다.
// 처리결과 = 회원에게 발송까지 모든 작업이 끝난(완료) 장 수.
// 전체 제출 = 해당 진도번호로 제출된 스마트구몬 답안 전체량.
// 선택한 배정(자동·검수)은 LP 기준값 이상인 답안만 처리하고, 기준 미만은 채점센터로 이관된다.
// 채점배정이거나 배정이 없으면 전량 채점센터.
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

/** LP가 기준값 이상인 답안 비율(mock). 기준값이 낮을수록 더 많이 포함되고, 일자별로 조금씩 흔들린다. */
function shareAtOrAbove(lp: number, seed: number) {
  const base = 0.62 + (95 - lp) * 0.045
  const noise = ((seed >>> 4) % 17 - 8) / 100
  return Math.min(0.9, Math.max(0.2, base + noise))
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
    const routed = route === '채점센터' || !setting ? 0 : Math.round(total * shareAtOrAbove(setting.lp, seed))
    result.total += total
    if (route === '자동확정') result.auto += routed
    if (route === '검수후확정') {
      result.review += routed
      corrected += routed * (0.02 + ((seed >>> 8) % 6) / 100)
    }
    result.center += total - routed
  })
  result.corrected = Math.round(corrected)
  return result
}
