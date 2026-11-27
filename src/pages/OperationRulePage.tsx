import { AlertTriangle, CalendarDays, Check, Save, Search, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAdminData } from '../contexts/adminStore'
import { curriculumStages, MONTH_START, progressNumbers, subjects, TODAY, type Subject } from '../data/curriculum'
import {
  compressProgress,
  defaultLp,
  effectiveResult,
  isValidRange,
  resultLabels,
  ruleResults,
  sameSetting,
  stageKey,
  subjectAssignmentCounts,
  type LpRange,
  type RuleResult,
  type RuleSettings,
  type StageSettings,
} from '../data/operationRules'
import { getProgressResult } from '../data/progressResults'

const number = new Intl.NumberFormat('ko-KR')
const emptyStage: StageSettings = {}
type Period = { start: string; end: string }
const initialPeriod: Period = { start: MONTH_START, end: TODAY }
type ChangedStage = { subject: Subject; stage: string; progresses: number[] }

const rate = (value: number, base: number) => base ? `${(value / base * 100).toFixed(1)}%` : '0.0%'
// 과목별 배정 비중 그래프의 표시 순서(운영 요청 순서). 과목 목록 자체는 curriculum.subjects 기준.
const pieSubjects: Subject[] = ['국어', '수학', '영어', '과학'].filter((item): item is Subject => (subjects as readonly string[]).includes(item))
const assignmentColors: Record<RuleResult, string> = { 자동확정: '#2f5f9e', 검수후확정: '#77a4d8', 채점센터: '#b7c3d1' }

/** 이력에 남길 요약: 변경한 진도번호의 배정 현황 */
function stageSummary(stageSettings: StageSettings, progresses: number[]) {
  return ruleResults.map((result) => `${resultLabels[result]} ${progresses.filter((progress) => effectiveResult(stageSettings[progress]) === result).length}`).join(' · ')
}

export function OperationRulePage() {
  const { ruleSettings, setRuleSettings, rulesSavedAt, setRulesSavedAt, addHistory } = useAdminData()
  const [subject, setSubject] = useState<Subject>('수학')
  const [stage, setStage] = useState('A')
  const [draft, setDraft] = useState<RuleSettings>(ruleSettings)
  const [message, setMessage] = useState<{ tone: 'error' | 'success' | 'info'; text: string } | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [periodDraft, setPeriodDraft] = useState<Period>(initialPeriod)
  const [period, setPeriod] = useState<Period>(initialPeriod)
  const [periodError, setPeriodError] = useState('')

  const key = stageKey(subject, stage)
  const savedStage = ruleSettings[key] ?? emptyStage
  const draftStage = draft[key] ?? emptyStage

  // 저장되지 않은 변경: 바뀐 단계만 진도번호 단위로 비교한다.
  const changedStages = useMemo<ChangedStage[]>(() => Object.keys(draft)
    .filter((itemKey) => draft[itemKey] !== ruleSettings[itemKey])
    .map((itemKey) => {
      const [itemSubject, itemStage] = itemKey.split('|') as [Subject, string]
      const progresses = progressNumbers.filter((progress) => !sameSetting(draft[itemKey]?.[progress], ruleSettings[itemKey]?.[progress]))
      return { subject: itemSubject, stage: itemStage, progresses }
    })
    .filter((item) => item.progresses.length > 0), [draft, ruleSettings])
  const changedCount = changedStages.reduce((sum, item) => sum + item.progresses.length, 0)

  // 과목별(모든 단계) 배정 비중: 저장된 기준 기준, 네 과목을 한 번에 보여준다.
  const subjectPies = useMemo(() => pieSubjects.map((item) => {
    const counts = subjectAssignmentCounts(ruleSettings, item)
    const total = ruleResults.reduce((sum, result) => sum + counts[result], 0)
    const autoEnd = total ? counts.자동확정 / total * 100 : 0
    const reviewEnd = total ? (counts.자동확정 + counts.검수후확정) / total * 100 : 0
    const background = `conic-gradient(${assignmentColors.자동확정} 0 ${autoEnd}%, ${assignmentColors.검수후확정} ${autoEnd}% ${reviewEnd}%, ${assignmentColors.채점센터} ${reviewEnd}% 100%)`
    return { subject: item, counts, total, background }
  }), [ruleSettings])

  // 처리결과는 저장된 기준과 조회기간으로 집계한다(편집 중인 기준은 반영하지 않음).
  const results = useMemo(() => progressNumbers.map((progress) => getProgressResult(subject, stage, progress, savedStage[progress], period.start, period.end)), [subject, stage, savedStage, period])
  const totals = results.reduce((sum, item) => ({ total: sum.total + item.total, review: sum.review + item.review, corrected: sum.corrected + item.corrected }), { total: 0, review: 0, corrected: 0 })

  const changeSubject = (next: Subject) => {
    setSubject(next)
    setStage(curriculumStages[next][0])
  }

  const updateProgress = (progress: number, result: RuleResult, range: LpRange) => {
    setDraft((current) => ({ ...current, [key]: { ...(current[key] ?? {}), [progress]: { result, lpMin: range.lpMin, lpMax: range.lpMax } } }))
    setMessage(null)
  }

  const applyPeriod = () => {
    if (!periodDraft.start || !periodDraft.end || periodDraft.start > periodDraft.end) { setPeriodError('시작일은 종료일보다 늦을 수 없습니다.'); return }
    setPeriodError('')
    setPeriod({ ...periodDraft })
  }

  const requestSave = () => {
    if (changedCount === 0) { setMessage({ tone: 'info', text: '변경된 내용이 없습니다.' }); return }
    const problems: string[] = []
    changedStages.forEach((item) => {
      item.progresses.forEach((progress) => {
        const setting = draft[stageKey(item.subject, item.stage)]?.[progress]
        if (setting && !isValidRange(setting)) problems.push(`${item.subject} ${item.stage} 진도 ${progress}: LP는 0~100 정수, 초과값 < 이하값`)
      })
    })
    if (problems.length) {
      setMessage({ tone: 'error', text: `저장할 수 없습니다. ${problems.slice(0, 3).join(' / ')}${problems.length > 3 ? ` 외 ${problems.length - 3}건` : ''}` })
      return
    }
    setMessage(null)
    setConfirmOpen(true)
  }

  const confirmSave = () => {
    const timestamp = `${TODAY} ${new Date().toTimeString().slice(0, 5)}`
    changedStages.forEach((item) => {
      const itemKey = stageKey(item.subject, item.stage)
      addHistory({
        type: '운영기준 변경',
        subtype: '진도별 기준 변경',
        subject: item.subject,
        stage: item.stage,
        scope: `${item.subject} / ${item.stage} / ${compressProgress(item.progresses)}`,
        title: `${item.subject} ${item.stage} 운영기준 변경 (진도번호 ${item.progresses.length}개)`,
        before: stageSummary(ruleSettings[itemKey] ?? {}, item.progresses),
        after: stageSummary(draft[itemKey] ?? {}, item.progresses),
        worker: '운영관리자(admin)',
        note: '운영기준 설정 화면에서 저장',
        targetKey: `RULE-${itemKey}`,
      })
    })
    setRuleSettings(draft)
    setRulesSavedAt(timestamp)
    setConfirmOpen(false)
    setMessage({ tone: 'success', text: '저장된 기준이 화면에 반영되었습니다. 처리결과는 저장된 기준으로 다시 집계됩니다.' })
  }

  return (
    <div className="page operation-rule-page">
      <div className="operation-heading"><div><p>AI 자동채점 관리</p><h1>운영기준 설정</h1><span>과목·단계를 선택하면 진도번호별 배정기준을 설정하고 처리결과를 함께 확인할 수 있습니다.</span></div></div>

      <section className="operation-filter-card" aria-label="운영기준 조회 조건">
        <label>과목<select value={subject} onChange={(event) => changeSubject(event.target.value as Subject)}>{subjects.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>단계<select value={stage} onChange={(event) => setStage(event.target.value)}>{curriculumStages[subject].map((item) => <option key={item}>{item}</option>)}</select></label>
        <div className="operation-subject-pies" aria-label="과목별 배정 비중">
          <div className="operation-subject-pies-head">
            <strong>과목별 배정 비중</strong>
            <small>전체 단계 기준</small>
            <ul>
              {ruleResults.map((result) => <li key={result}><i style={{ background: assignmentColors[result] }} />{resultLabels[result]}</li>)}
            </ul>
          </div>
          {subjectPies.map((pie) => (
            <div key={pie.subject} role="img" className={`operation-subject-pie ${pie.subject === subject ? 'active' : ''}`} aria-label={`${pie.subject} ${ruleResults.map((result) => `${resultLabels[result]} ${rate(pie.counts[result], pie.total)}`).join(', ')}`}>
              <span className="operation-subject-pie-chart" style={{ background: pie.background }}><b>{pie.subject}</b></span>
              <span className="operation-subject-pie-values">
                {ruleResults.map((result) => <span key={result}><i style={{ background: assignmentColors[result] }} />{rate(pie.counts[result], pie.total)}</span>)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="operation-panel rule-list-panel">

        <div className="rule-board">
          <table className="rule-board-table">
            <thead>
              <tr className="board-title-row">
                <th colSpan={4} className="assign-part board-title part-first part-last">
                  <strong>배정기준설정</strong>
                  <small>배정 하나를 선택하고 LP 범위를 입력합니다(왼쪽 값 초과 ~ 오른쪽 값 이하). 배정이 없는 진도번호는 채점센터로 이관됩니다.</small>
                </th>
                <th className="board-gap" rowSpan={3} />
                <th colSpan={5} className="result-part board-title part-first part-last">
                  <div className="board-title-result">
                    <strong>처리결과조회</strong>
                    <div className="rule-period">
                      <CalendarDays size={14} />
                      <input type="date" aria-label="처리결과 조회 시작일" value={periodDraft.start} max={TODAY} onChange={(event) => setPeriodDraft({ ...periodDraft, start: event.target.value })} />
                      <span>~</span>
                      <input type="date" aria-label="처리결과 조회 종료일" value={periodDraft.end} min={periodDraft.start} max={TODAY} onChange={(event) => setPeriodDraft({ ...periodDraft, end: event.target.value })} />
                      <button type="button" onClick={applyPeriod}><Search size={13} /> 조회</button>
                    </div>
                  </div>
                  {periodError
                    ? <small className="rule-period-note error">{periodError}</small>
                    : <small className="rule-period-note">{period.start} ~ {period.end} · 전체 {number.format(totals.total)}장 · 오류율 {rate(totals.corrected, totals.review)}</small>}
                </th>
              </tr>
              <tr className="board-group-row">
                <th rowSpan={2} className="assign-part part-first">진도번호</th>
                <th colSpan={2} className="assign-part group-ai">AI 채점</th>
                <th className="assign-part group-center part-last">기존 채점</th>
                <th rowSpan={2} className="result-part part-first">전체 제출</th>
                <th colSpan={2} className="result-part group-ai">AI 채점</th>
                <th rowSpan={2} className="result-part">채점센터</th>
                <th rowSpan={2} className="result-part part-last">오류율</th>
              </tr>
              <tr className="board-sub-row">
                {ruleResults.map((result) => <th key={result} className={`assign-part ${result === '채점센터' ? 'part-last' : ''}`}>{resultLabels[result]}</th>)}
                <th className="result-part">자동확정</th>
                <th className="result-part">검수후확정</th>
              </tr>
            </thead>
            <tbody>
              {progressNumbers.map((progress, index) => {
                const setting = draftStage[progress]
                const changed = !sameSetting(setting, savedStage[progress])
                const selectedResult = effectiveResult(setting)
                const invalid = !!setting && !isValidRange(setting)
                const item = results[index]
                return (
                  <tr key={progress} className={`${changed ? 'is-changed' : ''} ${invalid ? 'has-error' : ''}`}>
                    <td className="assign-part part-first progress-cell"><b>{progress}</b>{changed && <span className="changed-dot" title="저장 전 변경" />}</td>
                    {ruleResults.map((result) => {
                      const selected = selectedResult === result
                      const range: LpRange = selected && setting ? setting : defaultLp[result]
                      return (
                        <td key={result} className={`assign-part assign-cell ${selected ? 'is-selected' : ''} ${result === '채점센터' ? 'part-last' : ''}`}>
                          <input type="radio" name={`assign-${progress}`} checked={selected} aria-label={`진도 ${progress} ${resultLabels[result]}`} onChange={() => updateProgress(progress, result, setting?.result === result ? setting : defaultLp[result])} />
                          <span className="assign-range">
                            <input className={`assign-lp ${selected && invalid ? 'invalid' : ''}`} type="number" min="0" max="100" disabled={!selected} aria-label={`진도 ${progress} ${resultLabels[result]} LP 초과값`} value={selected ? range.lpMin : ''} onChange={(event) => updateProgress(progress, result, { ...range, lpMin: Number(event.target.value) })} />
                            <em>~</em>
                            <input className={`assign-lp ${selected && invalid ? 'invalid' : ''}`} type="number" min="0" max="100" disabled={!selected} aria-label={`진도 ${progress} ${resultLabels[result]} LP 이하값`} value={selected ? range.lpMax : ''} onChange={(event) => updateProgress(progress, result, { ...range, lpMax: Number(event.target.value) })} />
                          </span>
                        </td>
                      )
                    })}
                    <td className="board-gap" />
                    <td className="result-part part-first">{number.format(item.total)}</td>
                    <td className="result-part">{number.format(item.auto)}<small>{rate(item.auto, item.total)}</small></td>
                    <td className="result-part">{number.format(item.review)}<small>{rate(item.review, item.total)}</small></td>
                    <td className="result-part">{number.format(item.center)}<small>{rate(item.center, item.total)}</small></td>
                    <td className="result-part part-last">{item.review ? <>{rate(item.corrected, item.review)}<small>{number.format(item.corrected)}장</small></> : <span className="result-empty">-</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="rule-editor-footer">
          <div>
            {message
              ? <span className={`operation-message ${message.tone}`}>{message.tone === 'success' ? <Check size={15} /> : message.tone === 'error' ? <AlertTriangle size={15} /> : <ShieldCheck size={15} />} {message.text}</span>
              : <span>마지막 저장: {rulesSavedAt}</span>}
          </div>
          <div>
            {changedCount > 0 && <span className="pending-count">저장 전 변경 {changedCount}건</span>}
            <button type="button" className="operation-save-button" onClick={requestSave}><Save size={15} /> 기준 저장</button>
          </div>
        </div>
      </section>

      {confirmOpen && (
        <div className="reviewer-modal-backdrop" onClick={() => setConfirmOpen(false)}>
          <div className="operation-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="operation-confirm-title" onClick={(event) => event.stopPropagation()}>
            <div className="operation-confirm-body">
              <span className="operation-confirm-icon"><Save size={20} /></span>
              <h2 id="operation-confirm-title">운영기준을 저장하시겠습니까?</h2>
              <p>아래 진도번호의 배정기준이 변경됩니다.</p>
              <dl>
                {changedStages.map((item) => (
                  <div key={`${item.subject}-${item.stage}`}><dt>{item.subject} {item.stage}단계</dt><dd>진도번호 {item.progresses.length}개 ({compressProgress(item.progresses)})</dd></div>
                ))}
              </dl>
            </div>
            <div className="operation-confirm-actions">
              <button type="button" className="cancel" onClick={() => setConfirmOpen(false)}>아니오</button>
              <button type="button" className="confirm" autoFocus onClick={confirmSave}>예</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
