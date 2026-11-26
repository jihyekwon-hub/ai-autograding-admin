import { AlertCircle, AlertTriangle, CalendarDays, Check, Copy, ListChecks, Plus, Save, Search, ShieldCheck, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAdminData } from '../contexts/adminStore'
import { curriculumStages, MONTH_START, progressNumbers, subjects, TODAY, type Subject } from '../data/curriculum'
import { getProgressResult, type ProgressResult } from '../data/progressResults'
import {
  answerTypes,
  cleanSetting,
  compressProgress,
  findOverlaps,
  hasResult,
  isUnset,
  ruleResults,
  sameSetting,
  stageKey,
  type AnswerType,
  type LpRange,
  type ProgressSetting,
  type RuleResult,
  type RuleSettings,
  type StageSettings,
} from '../data/operationRules'

type ViewKey = RuleResult | '미설정'
const viewKeys: ViewKey[] = [...ruleResults, '미설정']

// 이 화면에서는 처리결과를 '배정' 명칭으로 표시한다. (데이터 값은 자동확정/검수후확정/채점센터 유지)
const resultLabels: Record<RuleResult, string> = { 자동확정: '자동배정', 검수후확정: '검수배정', 채점센터: '채점배정' }
const viewLabel = (item: ViewKey) => item === '미설정' ? item : resultLabels[item]
const number = new Intl.NumberFormat('ko-KR')
type Period = { start: string; end: string }
const initialPeriod: Period = { start: MONTH_START, end: TODAY }

// 범위를 새로 추가할 때 처리 결과별 기본 LP 값
const defaultRanges: Record<RuleResult, Record<AnswerType, LpRange>> = {
  자동확정: { 정답: { min: 95, max: 100 }, 오답: { min: 98, max: 100 } },
  검수후확정: { 정답: { min: 90, max: 94 }, 오답: { min: 95, max: 100 } },
  채점센터: { 정답: { min: 0, max: 89 }, 오답: { min: 0, max: 94 } },
}

type ChangedStage = { subject: Subject; stage: string; progresses: number[] }

const emptyStage: StageSettings = {}

function stageSummary(stageSettings: StageSettings, progresses: number[]) {
  const unset = progresses.filter((progress) => isUnset(stageSettings[progress])).length
  const counts = ruleResults.map((result) => `${resultLabels[result]} ${progresses.filter((progress) => hasResult(stageSettings[progress], result)).length}`).join(' · ')
  return `미설정 ${unset}개 / ${counts}`
}

function settingSummary(setting: ProgressSetting | undefined) {
  if (isUnset(setting)) return '미설정'
  return ruleResults
    .filter((result) => hasResult(setting, result))
    .map((result) => `${resultLabels[result]} ${answerTypes.filter((answer) => setting?.[result]?.[answer]).map((answer) => `${answer} ${setting?.[result]?.[answer]?.min}~${setting?.[result]?.[answer]?.max}`).join(', ')}`)
    .join(' · ')
}

// 받침 유무에 따라 '과/와'를 붙인다. (예: 자동확정과, 채점센터와)
function withGwa(word: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  return `${word}${code >= 0 && code <= 11171 && code % 28 !== 0 ? '과' : '와'}`
}

function rangeError(range: LpRange) {
  return range.min < 0 || range.max > 100 || range.min > range.max
}

export function OperationRulePage() {
  const { ruleSettings, setRuleSettings, rulesSavedAt, setRulesSavedAt, addHistory } = useAdminData()
  const [subject, setSubject] = useState<Subject>('수학')
  const [stage, setStage] = useState('A')
  const [view, setView] = useState<ViewKey>('자동확정')
  const [draft, setDraft] = useState<RuleSettings>(ruleSettings)
  const [bulk, setBulk] = useState({ from: 1, to: 30, answer: '정답' as AnswerType, min: 95, max: 100, source: 0 })
  const [message, setMessage] = useState<{ tone: 'error' | 'success' | 'info'; text: string } | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [periodDraft, setPeriodDraft] = useState<Period>(initialPeriod)
  const [period, setPeriod] = useState<Period>(initialPeriod)
  const [periodError, setPeriodError] = useState('')

  const key = stageKey(subject, stage)
  const savedStage = ruleSettings[key] ?? emptyStage
  const draftStage = draft[key] ?? emptyStage

  const counts = useMemo(() => {
    const result = Object.fromEntries(viewKeys.map((item) => [item, 0])) as Record<ViewKey, number>
    progressNumbers.forEach((progress) => {
      const setting = draftStage[progress]
      if (isUnset(setting)) result.미설정 += 1
      ruleResults.forEach((item) => { if (hasResult(setting, item)) result[item] += 1 })
    })
    return result
  }, [draftStage])
  const unsetProgresses = useMemo(() => progressNumbers.filter((progress) => isUnset(draftStage[progress])), [draftStage])

  // 저장 전후 어느 쪽이든 해당되는 진도번호는 목록에 남겨, 편집 중에 행이 사라지지 않게 한다.
  const rows = useMemo(() => progressNumbers.filter((progress) => view === '미설정'
    ? isUnset(draftStage[progress]) || isUnset(savedStage[progress])
    : hasResult(draftStage[progress], view) || hasResult(savedStage[progress], view)), [draftStage, savedStage, view])

  // 진도번호별 처리결과(완료 장 수)와 수정 장 수: 저장된 기준에 해당 배정이 있는 진도번호만 집계한다.
  const results = useMemo(() => {
    if (view === '미설정') return new Map<number, ProgressResult>()
    const result = view
    return new Map(rows
      .filter((progress) => hasResult(savedStage[progress], result))
      .map((progress): [number, ProgressResult] => [progress, getProgressResult(subject, stage, progress, result, period.start, period.end)]))
  }, [rows, savedStage, view, subject, stage, period])
  const totalCompleted = [...results.values()].reduce((sum, item) => sum + item.completed, 0)
  const totalCorrected = [...results.values()].reduce((sum, item) => sum + item.corrected, 0)
  const correctionRate = (completed: number, corrected: number) => completed ? `${(corrected / completed * 100).toFixed(1)}%` : '0.0%'

  const applyPeriod = () => {
    if (!periodDraft.start || !periodDraft.end || periodDraft.start > periodDraft.end) { setPeriodError('시작일은 종료일보다 늦을 수 없습니다.'); return }
    setPeriodError('')
    setPeriod({ ...periodDraft })
  }

  const configuredProgresses = useMemo(() => progressNumbers.filter((progress) => !isUnset(draftStage[progress])), [draftStage])

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

  const firstBlock = (list: number[]) => {
    if (!list.length) return { from: 1, to: 1 }
    let end = 0
    while (end + 1 < list.length && list[end + 1] === list[end] + 1) end += 1
    return { from: list[0], to: list[end] }
  }

  // 과목·단계·처리결과를 바꾸면 일괄 입력 기본값을 현재 목록에 맞춘다.
  const resetBulk = (nextView: ViewKey, nextStage: StageSettings) => {
    const list = progressNumbers.filter((progress) => nextView === '미설정' ? isUnset(nextStage[progress]) : hasResult(nextStage[progress], nextView))
    const block = firstBlock(list)
    const configured = progressNumbers.filter((progress) => !isUnset(nextStage[progress]))
    const answer: AnswerType = '정답'
    const range = nextView === '미설정' ? { min: 0, max: 100 } : defaultRanges[nextView][answer]
    setBulk({ ...block, answer, ...range, source: configured[configured.length - 1] ?? 0 })
  }

  const changeSubject = (next: Subject) => {
    const nextStage = curriculumStages[next][0]
    setSubject(next)
    setStage(nextStage)
    resetBulk(view, draft[stageKey(next, nextStage)] ?? {})
  }
  const changeStage = (next: string) => {
    setStage(next)
    resetBulk(view, draft[stageKey(subject, next)] ?? {})
  }
  const changeView = (next: ViewKey) => {
    setView(next)
    resetBulk(next, draftStage)
  }

  const updateStage = (update: (stageSettings: StageSettings) => StageSettings) => {
    setDraft((current) => ({ ...current, [key]: update(current[key] ?? {}) }))
    setMessage(null)
  }

  const setRange = (progress: number, result: RuleResult, answer: AnswerType, range: LpRange | undefined) => updateStage((stageSettings) => {
    const current = stageSettings[progress] ?? {}
    return { ...stageSettings, [progress]: cleanSetting({ ...current, [result]: { ...current[result], [answer]: range } }) }
  })

  const applyBulk = () => {
    const from = Math.min(bulk.from, bulk.to)
    const to = Math.max(bulk.from, bulk.to)
    const targets = progressNumbers.filter((progress) => progress >= from && progress <= to)
    if (view === '미설정') {
      const source = draftStage[bulk.source]
      if (!source || isUnset(source)) { setMessage({ tone: 'error', text: '복사할 기준 진도번호를 선택해주세요.' }); return }
      updateStage((stageSettings) => ({ ...stageSettings, ...Object.fromEntries(targets.map((progress) => [progress, cleanSetting(source)])) }))
      setMessage({ tone: 'info', text: `진도번호 ${compressProgress(targets)}에 진도번호 ${bulk.source}의 기준을 적용했습니다. 저장해야 반영됩니다.` })
      return
    }
    const range = { min: bulk.min, max: bulk.max }
    if (rangeError(range)) { setMessage({ tone: 'error', text: 'LP 범위는 0~100이며 최솟값이 최댓값보다 클 수 없습니다.' }); return }
    const result = view
    updateStage((stageSettings) => ({ ...stageSettings, ...Object.fromEntries(targets.map((progress) => {
      const current = stageSettings[progress] ?? {}
      return [progress, cleanSetting({ ...current, [result]: { ...current[result], [bulk.answer]: range } })]
    })) }))
    setMessage({ tone: 'info', text: `진도번호 ${compressProgress(targets)}의 ${resultLabels[result]} ${bulk.answer} LP 범위를 변경했습니다(${range.min}~${range.max}). 저장해야 반영됩니다.` })
  }

  const clearBulk = () => {
    if (view === '미설정') return
    const from = Math.min(bulk.from, bulk.to)
    const to = Math.max(bulk.from, bulk.to)
    const result = view
    updateStage((stageSettings) => ({ ...stageSettings, ...Object.fromEntries(progressNumbers.filter((progress) => progress >= from && progress <= to).map((progress) => {
      const current = stageSettings[progress] ?? {}
      return [progress, cleanSetting({ ...current, [result]: { ...current[result], [bulk.answer]: undefined } })]
    })) }))
    setMessage({ tone: 'info', text: `진도번호 ${from}~${to}의 ${resultLabels[result]} ${bulk.answer} 범위를 해제했습니다. 저장해야 반영됩니다.` })
  }

  const requestSave = () => {
    if (changedCount === 0) { setMessage({ tone: 'info', text: '변경된 내용이 없습니다.' }); return }
    const problems: string[] = []
    changedStages.forEach((item) => {
      item.progresses.forEach((progress) => {
        const setting = draft[stageKey(item.subject, item.stage)]?.[progress] ?? {}
        const invalid = ruleResults.some((result) => answerTypes.some((answer) => { const range = setting[result]?.[answer]; return range ? rangeError(range) : false }))
        if (invalid) problems.push(`${item.subject} ${item.stage} 진도 ${progress}: LP 범위 오류(0~100, 최솟값 ≤ 최댓값)`)
        findOverlaps(setting).forEach((overlap) => problems.push(`${item.subject} ${item.stage} 진도 ${progress}: ${overlap.answer} LP 범위가 ${overlap.results.map((result) => resultLabels[result]).join('·')}에서 겹침`))
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
    setMessage({ tone: 'success', text: '저장된 기준이 화면에 반영되었습니다.' })
  }

  const viewTitle = view === '미설정' ? '기준이 없는 진도번호' : `${resultLabels[view]} LP 범위`
  const isReviewView = view === '검수후확정'
  const columnCount = view === '미설정' ? 3 : isReviewView ? 6 : 5

  return (
    <div className="page operation-rule-page">
      <div className="operation-heading"><div><p>AI 자동채점 관리</p><h1>운영기준 설정</h1><span>과목·단계·처리결과별로 진도번호의 정오답 LP 범위를 확인하고 수정합니다.</span></div></div>

      <section className="operation-filter-card" aria-label="운영기준 조회 조건">
        <label>과목<select value={subject} onChange={(event) => changeSubject(event.target.value as Subject)}>{subjects.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>단계<select value={stage} onChange={(event) => changeStage(event.target.value)}>{curriculumStages[subject].map((item) => <option key={item}>{item}</option>)}</select></label>
        <div className="operation-view-field">
          <span>처리결과</span>
          <div className="operation-view-select">
            <div className="operation-view-tabs" role="tablist" aria-label="처리결과 선택">
              {viewKeys.map((item) => (
                <button key={item} type="button" role="tab" aria-selected={view === item} className={`view-${item} ${view === item ? 'active' : ''}`} onClick={() => changeView(item)}>
                  {viewLabel(item)}<span>{counts[item]}</span>
                </button>
              ))}
            </div>
            {counts.미설정 > 0 && (
              <span className="unset-alert" tabIndex={0} role="img" aria-label={`미설정 진도번호 ${counts.미설정}개`} aria-describedby="unset-alert-tip">
                <AlertCircle size={20} />
                <span className="unset-alert-tip" role="tooltip" id="unset-alert-tip">
                  <strong>미설정 진도번호가 있습니다</strong>
                  {subject} {stage}단계에서 어떤 처리결과도 설정되지 않은 진도번호가 {counts.미설정}개 있습니다.
                  <em>진도번호 {compressProgress(unsetProgresses)}</em>
                  '미설정'을 선택해 확인하고 기준을 지정하세요.
                </span>
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="operation-period-card" aria-label="처리결과 조회기간">
        <strong><CalendarDays size={15} /> 처리결과 조회기간</strong>
        <label>시작일<input type="date" value={periodDraft.start} max={TODAY} onChange={(event) => setPeriodDraft({ ...periodDraft, start: event.target.value })} /></label>
        <span>~</span>
        <label>종료일<input type="date" value={periodDraft.end} min={periodDraft.start} max={TODAY} onChange={(event) => setPeriodDraft({ ...periodDraft, end: event.target.value })} /></label>
        <button type="button" onClick={applyPeriod}><Search size={14} /> 조회</button>
        {periodError
          ? <em className="operation-period-error">{periodError}</em>
          : <small>{period.start} ~ {period.end} · 회원 발송까지 완료된 장 수를 실시간으로 집계합니다. 검수배정은 검수교사가 수정 후 확정한 비율(수정율)도 함께 표시합니다.</small>}
      </section>

      <section className="operation-panel rule-list-panel">
        <div className="operation-panel-heading">
          <div><ListChecks size={18} /><span><strong>{subject} {stage}단계 · {viewTitle}</strong><small>진도번호 {rows.length}개{view !== '미설정' && ` · 같은 정오답 안에서 처리결과별 LP 범위는 겹칠 수 없습니다.`}</small></span></div>
          {view !== '미설정' && (
            <div className="rule-result-total">
              <span>처리결과 합계<b>{number.format(totalCompleted)}장</b></span>
              {isReviewView && <span>수정율<b>{correctionRate(totalCompleted, totalCorrected)}</b></span>}
            </div>
          )}
        </div>

        <div className="rule-bulk-bar">
          <strong>일괄 입력</strong>
          <label>진도번호<input type="number" min="1" max="200" value={bulk.from} onChange={(event) => setBulk({ ...bulk, from: Number(event.target.value) })} /></label>
          <span>~</span>
          <label className="no-caption"><input type="number" min="1" max="200" aria-label="종료 진도번호" value={bulk.to} onChange={(event) => setBulk({ ...bulk, to: Number(event.target.value) })} /></label>
          {view === '미설정' ? (
            <>
              <label>기준 복사<select value={bulk.source} onChange={(event) => setBulk({ ...bulk, source: Number(event.target.value) })}>
                {configuredProgresses.length === 0 && <option value={0}>설정된 진도번호 없음</option>}
                {configuredProgresses.map((progress) => <option key={progress} value={progress}>진도번호 {progress}</option>)}
              </select></label>
              <button type="button" className="bulk-apply" onClick={applyBulk}><Copy size={14} /> 같은 기준으로 설정</button>
            </>
          ) : (
            <>
              <label>정오답<select value={bulk.answer} onChange={(event) => { const answer = event.target.value as AnswerType; setBulk({ ...bulk, answer, ...defaultRanges[view][answer] }) }}>{answerTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>LP<input type="number" min="0" max="100" value={bulk.min} onChange={(event) => setBulk({ ...bulk, min: Number(event.target.value) })} /></label>
              <span>~</span>
              <label className="no-caption"><input type="number" min="0" max="100" aria-label="LP 최댓값" value={bulk.max} onChange={(event) => setBulk({ ...bulk, max: Number(event.target.value) })} /></label>
              <button type="button" className="bulk-apply" onClick={applyBulk}><Check size={14} /> 적용</button>
              <button type="button" className="bulk-clear" onClick={clearBulk}><X size={14} /> 해제</button>
            </>
          )}
        </div>

        <div className="rule-list-wrap">
          <table className="rule-list-table">
            <thead>
              {view === '미설정'
                ? <tr><th>진도번호</th><th>상태</th><th>설정 내용</th></tr>
                : <tr><th>진도번호</th><th>정답 LP 범위</th><th>오답 LP 범위</th><th className="result-col">처리결과</th>{isReviewView && <th className="result-col">수정율</th>}<th>상태</th></tr>}
            </thead>
            <tbody>
              {rows.map((progress) => {
                const setting = draftStage[progress]
                const changed = !sameSetting(setting, savedStage[progress])
                if (view === '미설정') {
                  const unset = isUnset(setting)
                  return (
                    <tr key={progress} className={changed ? 'is-changed' : ''}>
                      <td><b>{progress}</b></td>
                      <td>{unset ? <span className="state-badge unset"><AlertCircle size={13} /> 미설정</span> : <span className="state-badge changed">설정됨 · 저장 전</span>}</td>
                      <td className="setting-summary">{unset ? '-' : settingSummary(setting)}</td>
                    </tr>
                  )
                }
                const result = view
                const overlaps = findOverlaps(setting ?? {}).filter((overlap) => overlap.results.includes(result))
                const removed = !hasResult(setting, result)
                const progressResult = results.get(progress)
                return (
                  <tr key={progress} className={`${changed ? 'is-changed' : ''} ${overlaps.length ? 'has-error' : ''}`}>
                    <td><b>{progress}</b></td>
                    {answerTypes.map((answer) => {
                      const range = setting?.[result]?.[answer]
                      return (
                        <td key={answer}>
                          {range ? (
                            <div className={`lp-range-editor ${rangeError(range) ? 'invalid' : ''}`}>
                              <input type="number" min="0" max="100" aria-label={`진도 ${progress} ${answer} LP 최솟값`} value={range.min} onChange={(event) => setRange(progress, result, answer, { ...range, min: Number(event.target.value) })} />
                              <span>~</span>
                              <input type="number" min="0" max="100" aria-label={`진도 ${progress} ${answer} LP 최댓값`} value={range.max} onChange={(event) => setRange(progress, result, answer, { ...range, max: Number(event.target.value) })} />
                              <button type="button" aria-label={`진도 ${progress} ${answer} 범위 해제`} onClick={() => setRange(progress, result, answer, undefined)}><X size={13} /></button>
                            </div>
                          ) : (
                            <button type="button" className="lp-add" onClick={() => setRange(progress, result, answer, { ...defaultRanges[result][answer] })}><Plus size={13} /> {answer} 범위 추가</button>
                          )}
                        </td>
                      )
                    })}
                    <td className="result-col">{progressResult ? <b>{number.format(progressResult.completed)}장</b> : <span className="result-empty">-</span>}</td>
                    {isReviewView && <td className="result-col">{progressResult ? <><b>{correctionRate(progressResult.completed, progressResult.corrected)}</b><small>{number.format(progressResult.corrected)}장 수정</small></> : <span className="result-empty">-</span>}</td>}
                    <td className="row-state">
                      {overlaps.length > 0 && <span className="state-badge error"><AlertTriangle size={13} /> {overlaps.map((overlap) => { const other = overlap.results.find((item) => item !== result); return `${overlap.answer} ${other ? withGwa(resultLabels[other]) : ''} 겹침` }).join(', ')}</span>}
                      {overlaps.length === 0 && removed && <span className="state-badge removed">{resultLabels[result]} 해제 · 저장 전</span>}
                      {overlaps.length === 0 && !removed && changed && <span className="state-badge changed">변경 · 저장 전</span>}
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && <tr><td className="rule-list-empty" colSpan={columnCount}>{view === '미설정' ? '미설정 진도번호가 없습니다. 모든 진도번호에 기준이 있습니다.' : `${resultLabels[view]}으로 설정된 진도번호가 없습니다. 위 일괄 입력으로 추가할 수 있습니다.`}</td></tr>}
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
              <p>아래 진도번호의 기준이 변경됩니다.</p>
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
