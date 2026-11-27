import { AlertTriangle, CalendarDays, Check, ListChecks, Save, Search, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAdminData } from '../contexts/adminStore'
import { curriculumStages, MONTH_START, progressNumbers, subjects, TODAY, type Subject } from '../data/curriculum'
import {
  compressProgress,
  defaultLp,
  hasResult,
  isUnset,
  lpRanges,
  resultLabels,
  ruleResults,
  sameSetting,
  settingErrors,
  stageKey,
  type ProgressSetting,
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

/** 이력에 남길 요약: 변경한 진도번호의 배정 선택 현황 */
function stageSummary(stageSettings: StageSettings, progresses: number[]) {
  const counts = ruleResults.map((result) => `${resultLabels[result]} ${progresses.filter((progress) => hasResult(stageSettings[progress], result)).length}`).join(' · ')
  const none = progresses.filter((progress) => isUnset(stageSettings[progress])).length
  return `${counts} / 미선택(채점센터 이관) ${none}`
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

  // 처리결과는 저장된 기준과 조회기간으로 집계한다(편집 중인 기준은 반영하지 않음).
  const results = useMemo(() => progressNumbers.map((progress) => getProgressResult(subject, stage, progress, savedStage[progress], period.start, period.end)), [subject, stage, savedStage, period])
  const totals = results.reduce((sum, item) => ({
    total: sum.total + item.total,
    auto: sum.auto + item.auto,
    review: sum.review + item.review,
    center: sum.center + item.center,
    corrected: sum.corrected + item.corrected,
  }), { total: 0, auto: 0, review: 0, center: 0, corrected: 0 })
  const aiCount = progressNumbers.filter((progress) => hasResult(draftStage[progress], '자동확정') || hasResult(draftStage[progress], '검수후확정')).length

  const changeSubject = (next: Subject) => {
    setSubject(next)
    setStage(curriculumStages[next][0])
  }

  const updateProgress = (progress: number, update: (setting: ProgressSetting) => ProgressSetting) => {
    setDraft((current) => {
      const stageSettings = current[key] ?? {}
      return { ...current, [key]: { ...stageSettings, [progress]: update({ ...(stageSettings[progress] ?? {}) }) } }
    })
    setMessage(null)
  }

  const toggleResult = (progress: number, result: RuleResult, checked: boolean) => updateProgress(progress, (setting) => {
    if (checked) setting[result] = defaultLp[result]
    else delete setting[result]
    return setting
  })

  const setLp = (progress: number, result: RuleResult, value: number) => updateProgress(progress, (setting) => ({ ...setting, [result]: value }))

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
        settingErrors(draft[stageKey(item.subject, item.stage)]?.[progress]).forEach((error) => problems.push(`${item.subject} ${item.stage} 진도 ${progress}: ${error}`))
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
      </section>

      <section className="operation-panel rule-list-panel">
        <div className="operation-panel-heading">
          <div><ListChecks size={18} /><span><strong>{subject} {stage}단계 · 진도번호 1~{progressNumbers.length}</strong><small>AI 채점 진도번호 {aiCount}개 · 배정을 선택하지 않은 진도번호와 LP 구간은 채점센터로 이관됩니다.</small></span></div>
        </div>

        <div className="rule-board">
          <div className="rule-board-inner">
            <div className="rule-board-head rule-board-head-assign">
              <strong>배정기준설정</strong>
              <small>배정을 체크하고 LP 기준값(이상)을 입력합니다.</small>
            </div>
            <div className="rule-board-head rule-board-head-result">
              <strong>처리결과조회</strong>
              <div className="rule-period">
                <CalendarDays size={14} />
                <input type="date" aria-label="처리결과 조회 시작일" value={periodDraft.start} max={TODAY} onChange={(event) => setPeriodDraft({ ...periodDraft, start: event.target.value })} />
                <span>~</span>
                <input type="date" aria-label="처리결과 조회 종료일" value={periodDraft.end} min={periodDraft.start} max={TODAY} onChange={(event) => setPeriodDraft({ ...periodDraft, end: event.target.value })} />
                <button type="button" onClick={applyPeriod}><Search size={13} /> 조회</button>
              </div>
              {periodError
                ? <em className="rule-period-note error">{periodError}</em>
                : <em className="rule-period-note">{period.start} ~ {period.end} · 전체 {number.format(totals.total)}장 · 오류율 {rate(totals.corrected, totals.review)}</em>}
            </div>

            <div className="rule-board-scroll">
              <table className="rule-assign-table">
                <thead>
                  <tr>
                    <th rowSpan={2}>진도번호</th>
                    <th colSpan={2} className="group-ai">AI 채점</th>
                    <th className="group-center">기존 채점</th>
                    <th rowSpan={2}>상태</th>
                  </tr>
                  <tr>
                    {ruleResults.map((result) => <th key={result}>{resultLabels[result]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {progressNumbers.map((progress) => {
                    const setting = draftStage[progress]
                    const changed = !sameSetting(setting, savedStage[progress])
                    const errors = settingErrors(setting)
                    const ranges = lpRanges(setting)
                    return (
                      <tr key={progress} className={`${changed ? 'is-changed' : ''} ${errors.length ? 'has-error' : ''}`}>
                        <td><b>{progress}</b></td>
                        {ruleResults.map((result) => {
                          const selected = hasResult(setting, result)
                          const range = ranges[result]
                          return (
                            <td key={result} className={`assign-cell ${selected ? 'is-selected' : ''}`}>
                              <label className="assign-check">
                                <input type="checkbox" checked={selected} aria-label={`진도 ${progress} ${resultLabels[result]}`} onChange={(event) => toggleResult(progress, result, event.target.checked)} />
                              </label>
                              <input className="assign-lp" type="number" min="0" max="100" disabled={!selected} aria-label={`진도 ${progress} ${resultLabels[result]} LP 기준값`} value={selected ? setting?.[result] : ''} placeholder="LP" onChange={(event) => setLp(progress, result, Number(event.target.value))} />
                              <span className="assign-range">{selected && range ? `${range.min}~${range.max}` : ''}</span>
                            </td>
                          )
                        })}
                        <td className="row-state">
                          {errors.length > 0 && <span className="state-badge error" title={errors.join(', ')}><AlertTriangle size={13} /> {errors[0]}</span>}
                          {errors.length === 0 && changed && <span className="state-badge changed">변경 · 저장 전</span>}
                          {errors.length === 0 && !changed && isUnset(setting) && <span className="state-badge center-only">전량 채점센터</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <table className="rule-result-table">
                <thead>
                  <tr>
                    <th rowSpan={2}>전체 제출</th>
                    <th colSpan={2} className="group-ai">AI 채점</th>
                    <th rowSpan={2}>채점센터</th>
                    <th rowSpan={2}>오류율</th>
                  </tr>
                  <tr><th>자동확정</th><th>검수후확정</th></tr>
                </thead>
                <tbody>
                  {results.map((item, index) => (
                    <tr key={progressNumbers[index]}>
                      <td><b>{number.format(item.total)}</b></td>
                      <td>{number.format(item.auto)}<small>{rate(item.auto, item.total)}</small></td>
                      <td>{number.format(item.review)}<small>{rate(item.review, item.total)}</small></td>
                      <td>{number.format(item.center)}<small>{rate(item.center, item.total)}</small></td>
                      <td>{item.review ? <>{rate(item.corrected, item.review)}<small>{number.format(item.corrected)}장</small></> : <span className="result-empty">-</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
