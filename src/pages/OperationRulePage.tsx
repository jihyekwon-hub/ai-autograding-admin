import { AlertTriangle, CalendarDays, Check, Download, RotateCcw, Save, Search, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAdminData } from '../contexts/adminStore'
import { curriculumStages, MONTH_START, normalizeStage, progressNumbers, subjects, TODAY, type Subject } from '../data/curriculum'
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
  type StandardsLinkState,
} from '../data/operationRules'
import { ColumnFilter, type SortDirection } from '../components/ColumnFilter'
import { getProgressResult, type ProgressResult } from '../data/progressResults'
import { downloadXlsx, type XlsxCell } from '../utils/xlsx'

const number = new Intl.NumberFormat('ko-KR')
const emptyStage: StageSettings = {}
type Period = { start: string; end: string }
const initialPeriod: Period = { start: MONTH_START, end: TODAY }
type ChangedStage = { subject: Subject; stage: string; progresses: number[] }

type BoardColumnKey = 'progress' | RuleResult | 'total' | 'autoCount' | 'reviewCount' | 'centerCount' | 'errorRate'
type BoardColumn = { key: BoardColumnKey; label: string; value: (progress: number, stageSettings: StageSettings) => string; sortValue: (progress: number) => number }
const errorRateValue = (item: ProgressResult) => item.review ? item.corrected / item.review : -1
const errorRateLabel = (item: ProgressResult) => item.review ? `${(item.corrected / item.review * 100).toFixed(1)}%` : '-'

const rate = (value: number, base: number) => base ? `${(value / base * 100).toFixed(1)}%` : '0.0%'
// 과목별 배정 비중 그래프의 표시 순서(운영 요청 순서). 과목 목록 자체는 curriculum.subjects 기준.
const pieSubjects: Subject[] = ['국어', '수학', '영어', '과학'].filter((item): item is Subject => (subjects as readonly string[]).includes(item))
// 대시보드와 같은 파스텔 색: 자동배정=민트, 검수배정=라벤더, 채점배정=피치
const assignmentColors: Record<RuleResult, string> = { 자동확정: '#8fd0bd', 검수후확정: '#c3b5ec', 채점센터: '#f5cba7' }

/** 이력에 남길 요약: 변경한 진도번호의 배정 현황 */
function stageSummary(stageSettings: StageSettings, progresses: number[]) {
  return ruleResults.map((result) => `${resultLabels[result]} ${progresses.filter((progress) => effectiveResult(stageSettings[progress]) === result).length}`).join(' · ')
}

export function OperationRulePage() {
  const { ruleSettings, setRuleSettings, rulesSavedAt, setRulesSavedAt, addHistory } = useAdminData()
  // 대시보드 오류율 상세 등에서 이동하면 과목·단계·조회기간·정렬을 넘겨받는다.
  const linkState = useLocation().state as StandardsLinkState | null
  const link = linkState && (subjects as readonly string[]).includes(linkState.subject) ? linkState : null
  const linkPeriod = link?.period ?? initialPeriod
  const [subject, setSubject] = useState<Subject>(link?.subject ?? '수학')
  const [stage, setStage] = useState(link ? normalizeStage(link.subject, link.stage) : 'A')
  const [draft, setDraft] = useState<RuleSettings>(ruleSettings)
  const [message, setMessage] = useState<{ tone: 'error' | 'success' | 'info'; text: string } | null>(link?.from ? { tone: 'info', text: `${link.from}에서 이동: ${link.subject} ${normalizeStage(link.subject, link.stage)} · ${linkPeriod.start} ~ ${linkPeriod.end}${link.sortKey === 'errorRate' ? ' · 오류율 높은 순' : link.sortKey === 'total' ? ' · 전체 제출 많은 순' : ''}` } : null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [periodDraft, setPeriodDraft] = useState<Period>(linkPeriod)
  const [period, setPeriod] = useState<Period>(linkPeriod)
  const [periodError, setPeriodError] = useState('')
  // 엑셀 자동필터처럼 표의 모든 열에서 필터·정렬(배정기준설정·처리결과조회 공통 행)
  const [columnFilters, setColumnFilters] = useState<Partial<Record<BoardColumnKey, string[] | null>>>({})
  const [boardSort, setBoardSort] = useState<{ key: BoardColumnKey; direction: SortDirection } | null>(link?.sortKey ? { key: link.sortKey, direction: 'desc' } : null)

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
  // 표의 열 정의: 필터 값(문자열)과 정렬 값(숫자)
  const assignmentValue = (stageSettings: StageSettings, progress: number, result: RuleResult) => {
    const setting = stageSettings[progress]
    if (effectiveResult(setting) !== result) return '(미선택)'
    return setting ? `${setting.lpMin}~${setting.lpMax}` : '선택'
  }
  const boardColumns: BoardColumn[] = [
    { key: 'progress', label: '진도번호', value: (progress) => String(progress), sortValue: (progress) => progress },
    ...ruleResults.map((result): BoardColumn => ({
      key: result,
      label: resultLabels[result],
      value: (progress, stageSettings) => assignmentValue(stageSettings, progress, result),
      sortValue: (progress) => effectiveResult(draftStage[progress]) === result ? (draftStage[progress]?.lpMin ?? 0) : -1,
    })),
    { key: 'total', label: '전체 제출', value: (progress) => number.format(results[progress - 1].total), sortValue: (progress) => results[progress - 1].total },
    { key: 'autoCount', label: '자동확정', value: (progress) => number.format(results[progress - 1].auto), sortValue: (progress) => results[progress - 1].auto },
    { key: 'reviewCount', label: '검수후확정', value: (progress) => number.format(results[progress - 1].review), sortValue: (progress) => results[progress - 1].review },
    { key: 'centerCount', label: '채점센터', value: (progress) => number.format(results[progress - 1].center), sortValue: (progress) => results[progress - 1].center },
    { key: 'errorRate', label: '오류율', value: (progress) => errorRateLabel(results[progress - 1]), sortValue: (progress) => errorRateValue(results[progress - 1]) },
  ]
  // 배정 열은 편집 중인 값과 저장된 값 중 하나라도 맞으면 표시(편집 중에 행이 사라지지 않게)
  const matchesColumn = (column: BoardColumn, progress: number) => {
    const selected = columnFilters[column.key]
    if (!selected) return true
    return selected.includes(column.value(progress, draftStage)) || selected.includes(column.value(progress, savedStage))
  }
  const matchesAll = (progress: number, except?: BoardColumnKey) => boardColumns.every((column) => column.key === except || matchesColumn(column, progress))
  const filteredProgresses = progressNumbers.filter((progress) => matchesAll(progress))
  const sortColumn = boardSort ? boardColumns.find((column) => column.key === boardSort.key) : undefined
  const visibleProgresses = sortColumn && boardSort
    ? [...filteredProgresses].sort((a, b) => (sortColumn.sortValue(a) - sortColumn.sortValue(b)) * (boardSort.direction === 'asc' ? 1 : -1))
    : filteredProgresses
  const activeFilterLabels = boardColumns.filter((column) => columnFilters[column.key]).map((column) => column.label)
  const filterActive = activeFilterLabels.length > 0 || !!boardSort
  // 엑셀처럼 다른 열의 필터를 적용한 행에서 값 목록을 만든다.
  const valuesFor = (column: BoardColumn) => {
    const unique = new Map<string, number>()
    progressNumbers.filter((progress) => matchesAll(progress, column.key)).forEach((progress) => {
      const value = column.value(progress, draftStage)
      if (!unique.has(value)) unique.set(value, column.sortValue(progress))
    })
    return [...unique.entries()].sort(([, a], [, b]) => a - b).map(([value]) => value)
  }
  const filterHeader = (key: BoardColumnKey) => {
    const column = boardColumns.find((item) => item.key === key)!
    return (
      <div className="column-filter-head">
        <span>{column.label}</span>
        <ColumnFilter
          label={column.label}
          values={valuesFor(column)}
          selected={columnFilters[key] ?? null}
          sort={boardSort?.key === key ? boardSort.direction : null}
          onApply={(selected) => setColumnFilters((current) => ({ ...current, [key]: selected }))}
          onSort={(direction) => setBoardSort({ key, direction })}
        />
      </div>
    )
  }
  const resetFilters = () => { setColumnFilters({}); setBoardSort(null) }
  const totals = visibleProgresses.reduce((sum, progress) => { const item = results[progress - 1]; return { total: sum.total + item.total, review: sum.review + item.review, corrected: sum.corrected + item.corrected } }, { total: 0, review: 0, corrected: 0 })

  // 배정기준설정 + 처리결과조회를 한 시트의 같은 행으로 내려받는다(현재 화면의 필터·조회기간 기준).
  const downloadExcel = () => {
    const header = (value: string): XlsxCell => ({ value, style: 'header' })
    const rows: XlsxCell[][] = [
      [{ value: `${subject} ${stage}단계 배정기준설정 · 처리결과조회 (조회기간 ${period.start} ~ ${period.end}${activeFilterLabels.length ? ` · 필터: ${activeFilterLabels.join(', ')}` : ''})`, style: 'title' }],
      [header('진도번호'), header('배정기준설정'), header(''), header(''), header('처리결과조회'), ...Array.from({ length: 8 }, () => header(''))],
      [header(''), header('배정'), header('LP 초과'), header('LP 이하'), header('전체 제출'), header('자동확정'), header('자동확정 비율'), header('검수후확정'), header('검수후확정 비율'), header('채점센터'), header('채점센터 비율'), header('오류율'), header('오류 장수')],
      ...visibleProgresses.map((progress): XlsxCell[] => {
        const setting = draftStage[progress]
        const item = results[progress - 1]
        const ratio = (value: number): XlsxCell => ({ value: item.total ? value / item.total : 0, style: 'percent' })
        return [
          { value: progress, style: 'body' },
          { value: resultLabels[effectiveResult(setting)], style: 'body' },
          { value: setting ? setting.lpMin : null, style: 'body' },
          { value: setting ? setting.lpMax : null, style: 'body' },
          { value: item.total, style: 'body' },
          { value: item.auto, style: 'body' }, ratio(item.auto),
          { value: item.review, style: 'body' }, ratio(item.review),
          { value: item.center, style: 'body' }, ratio(item.center),
          item.review ? { value: item.corrected / item.review, style: 'percent' } : { value: null, style: 'body' },
          { value: item.corrected, style: 'body' },
        ]
      }),
    ]
    downloadXlsx(`배정기준설정_${subject}_${stage}_${period.start}_${period.end}`, {
      name: `${subject} ${stage}단계`,
      rows,
      columnWidths: [10, 12, 10, 10, 12, 12, 13, 12, 15, 12, 13, 10, 10],
      merges: ['A1:M1', 'A2:A3', 'B2:D2', 'E2:M2'],
      freezeRows: 3,
    })
  }

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
        note: '배정기준설정 화면에서 저장',
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
      <div className="operation-heading"><div><p>AI 자동채점 관리</p><h1>기준설정</h1><span>과목·단계를 선택하면 진도번호별 배정기준을 설정하고 처리결과를 함께 확인할 수 있습니다.</span></div></div>

      <section className="operation-filter-card" aria-label="운영기준 조회 조건">
        <label>과목<select value={subject} onChange={(event) => changeSubject(event.target.value as Subject)}>{subjects.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>단계<select value={stage} onChange={(event) => setStage(event.target.value)}>{curriculumStages[subject].map((item) => <option key={item}>{item}</option>)}</select></label>
        <div className="operation-subject-pies" aria-label="과목별 배정 비중">
          <div className="operation-subject-pies-head">
            <strong>과목별 배정 비중 <small>(진도번호 수)</small></strong>
            <small>저장된 기준 · 전체 단계</small>
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
                  <div className="board-title-assign">
                    <strong>배정기준설정</strong>
                    <span className="assign-filter-count">진도번호 {visibleProgresses.length}개{activeFilterLabels.length ? ` · 필터: ${activeFilterLabels.join(', ')}` : ''}</span>
                    {filterActive && <button type="button" className="board-filter-reset" onClick={resetFilters}><RotateCcw size={12} /> 필터 초기화</button>}
                  </div>
                  <small>배정 하나를 선택하고 LP 범위를 입력합니다(왼쪽 값 초과 ~ 오른쪽 값 이하). 배정이 없는 진도번호는 채점센터로 이관됩니다.</small>
                </th>
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
                <th rowSpan={2} className="assign-part part-first">{filterHeader('progress')}</th>
                <th colSpan={2} className="assign-part group-ai">AI 채점</th>
                <th className="assign-part group-center part-last">기존 채점</th>
                <th rowSpan={2} className="result-part part-first">{filterHeader('total')}</th>
                <th colSpan={2} className="result-part group-ai">AI 채점</th>
                <th rowSpan={2} className="result-part">{filterHeader('centerCount')}</th>
                <th rowSpan={2} className="result-part part-last">{filterHeader('errorRate')}</th>
              </tr>
              <tr className="board-sub-row">
                {ruleResults.map((result) => <th key={result} className={`assign-part ${result === '채점센터' ? 'part-last' : ''}`}>{filterHeader(result)}</th>)}
                <th className="result-part">{filterHeader('autoCount')}</th>
                <th className="result-part">{filterHeader('reviewCount')}</th>
              </tr>
            </thead>
            <tbody>
              {visibleProgresses.map((progress) => {
                const setting = draftStage[progress]
                const changed = !sameSetting(setting, savedStage[progress])
                const selectedResult = effectiveResult(setting)
                const invalid = !!setting && !isValidRange(setting)
                const item = results[progress - 1]
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
                    <td className="result-part part-first">{number.format(item.total)}</td>
                    <td className="result-part">{number.format(item.auto)}<small>{rate(item.auto, item.total)}</small></td>
                    <td className="result-part">{number.format(item.review)}<small>{rate(item.review, item.total)}</small></td>
                    <td className="result-part">{number.format(item.center)}<small>{rate(item.center, item.total)}</small></td>
                    <td className="result-part part-last">{item.review ? <>{rate(item.corrected, item.review)}<small>{number.format(item.corrected)}장</small></> : <span className="result-empty">-</span>}</td>
                  </tr>
                )
              })}
              {visibleProgresses.length === 0 && <tr><td colSpan={9} className="rule-board-empty">필터 조건에 맞는 진도번호가 없습니다. 필터를 확인해 주세요.</td></tr>}
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
            <button type="button" className="operation-download-button" onClick={downloadExcel}><Download size={15} /> 다운로드</button>
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
