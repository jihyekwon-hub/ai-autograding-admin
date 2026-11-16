import { BarChart3, Download, FileSpreadsheet, RotateCcw, Search, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { performanceData, subjectStages, type PerformanceRecord, type Subject } from '../data/performance'

type QueryUnit = 'daily' | 'monthly' | 'yearly' | 'custom'
type SubjectFilter = '전체' | Subject

type Filters = {
  unit: QueryUnit
  startDate: string
  endDate: string
  startMonth: string
  endMonth: string
  startYear: string
  endYear: string
  subject: SubjectFilter
  stage: string
}

type AggregatedRow = {
  key: string
  label: string
  total: number
  autoConfirmed: number
  reviewConfirmed: number
  gradingCenter: number
}

const defaultFilters: Filters = {
  unit: 'daily',
  startDate: '2026-11-01',
  endDate: '2026-11-16',
  startMonth: '2026-01',
  endMonth: '2026-11',
  startYear: '2026',
  endYear: '2026',
  subject: '전체',
  stage: '전체',
}

const number = new Intl.NumberFormat('ko-KR')

function rate(value: number, total: number) {
  return total === 0 ? 0 : (value / total) * 100
}

function getAutoGraded(row: Pick<AggregatedRow, 'autoConfirmed' | 'reviewConfirmed'>) {
  return row.autoConfirmed + row.reviewConfirmed
}

function filterRecords(filters: Filters) {
  return performanceData.filter((record) => {
    const subjectMatch = filters.subject === '전체' || record.subject === filters.subject
    const stageMatch = filters.stage === '전체' || record.stage === filters.stage
    let periodMatch: boolean

    if (filters.unit === 'daily' || filters.unit === 'custom') {
      periodMatch = record.date >= filters.startDate && record.date <= filters.endDate
    } else if (filters.unit === 'monthly') {
      const month = record.date.slice(0, 7)
      periodMatch = month >= filters.startMonth && month <= filters.endMonth
    } else {
      const year = record.date.slice(0, 4)
      periodMatch = year >= filters.startYear && year <= filters.endYear
    }

    return subjectMatch && stageMatch && periodMatch
  })
}

function aggregateRecords(records: PerformanceRecord[], unit: QueryUnit): AggregatedRow[] {
  const groups = new Map<string, AggregatedRow>()

  records.forEach((record) => {
    const key = unit === 'monthly' ? record.date.slice(0, 7) : unit === 'yearly' ? record.date.slice(0, 4) : record.date
    const current = groups.get(key) ?? { key, label: key, total: 0, autoConfirmed: 0, reviewConfirmed: 0, gradingCenter: 0 }
    current.total += record.total
    current.autoConfirmed += record.autoConfirmed
    current.reviewConfirmed += record.reviewConfirmed
    current.gradingCenter += record.gradingCenter
    groups.set(key, current)
  })

  return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key))
}

function sumRows(rows: AggregatedRow[]): AggregatedRow {
  return rows.reduce<AggregatedRow>((sum, row) => ({
    key: '합계',
    label: '합계',
    total: sum.total + row.total,
    autoConfirmed: sum.autoConfirmed + row.autoConfirmed,
    reviewConfirmed: sum.reviewConfirmed + row.reviewConfirmed,
    gradingCenter: sum.gradingCenter + row.gradingCenter,
  }), { key: '합계', label: '합계', total: 0, autoConfirmed: 0, reviewConfirmed: 0, gradingCenter: 0 })
}

function formatChartLabel(value: string, unit: QueryUnit) {
  if (unit === 'yearly') return value
  if (unit === 'monthly') return value.replace('-', '.')
  return value.slice(5)
}

export function PerformancePage() {
  const [draft, setDraft] = useState<Filters>(defaultFilters)
  const [applied, setApplied] = useState<Filters>(defaultFilters)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const rows = useMemo(() => aggregateRecords(filterRecords(applied), applied.unit), [applied])
  const totals = useMemo(() => sumRows(rows), [rows])
  const autoGraded = getAutoGraded(totals)
  const other = Math.max(0, totals.total - totals.autoConfirmed - totals.reviewConfirmed - totals.gradingCenter)
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const visibleRows = rows.slice((page - 1) * pageSize, page * pageSize)
  const maxTotal = Math.max(1, ...rows.map((row) => row.total))
  const chartWidth = Math.max(760, 84 + rows.length * 72)
  const linePoints = rows.map((row, index) => {
    const x = 42 + index * 72
    const y = Math.max(35, Math.min(185, 190 - rate(getAutoGraded(row), row.total) * 1.25))
    return `${x},${y}`
  }).join(' ')

  const stageOptions = draft.subject === '전체' ? [] : subjectStages[draft.subject]

  const applyQuery = () => {
    setApplied(draft)
    setPage(1)
  }

  const resetQuery = () => {
    setDraft(defaultFilters)
    setApplied(defaultFilters)
    setPage(1)
  }

  const downloadCsv = () => {
    const header = ['구분', '전체 물량', '자동채점 물량', '자동채점 비율', '자동확정 물량', '자동확정 비율', '검수후확정 물량', '검수후확정 비율', '채점센터 이관 물량', '채점센터 이관 비율']
    const body = rows.map((row) => [row.label, row.total, getAutoGraded(row), `${rate(getAutoGraded(row), row.total).toFixed(1)}%`, row.autoConfirmed, `${rate(row.autoConfirmed, row.total).toFixed(1)}%`, row.reviewConfirmed, `${rate(row.reviewConfirmed, row.total).toFixed(1)}%`, row.gradingCenter, `${rate(row.gradingCenter, row.total).toFixed(1)}%`])
    const csv = `\uFEFF${[header, ...body].map((line) => line.join(',')).join('\n')}`
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = '자동채점_실적.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const kpis = [
    ['전체 물량', `${number.format(totals.total)}장`],
    ['자동채점 물량', `${number.format(autoGraded)}장`],
    ['자동채점 비율', `${rate(autoGraded, totals.total).toFixed(1)}%`],
    ['자동확정 물량', `${number.format(totals.autoConfirmed)}장`],
    ['자동확정 비율', `${rate(totals.autoConfirmed, totals.total).toFixed(1)}%`],
    ['검수후확정 물량', `${number.format(totals.reviewConfirmed)}장`],
    ['검수후확정 비율', `${rate(totals.reviewConfirmed, totals.total).toFixed(1)}%`],
    ['채점센터 이관 물량', `${number.format(totals.gradingCenter)}장`],
    ['채점센터 이관 비율', `${rate(totals.gradingCenter, totals.total).toFixed(1)}%`],
  ]

  return (
    <div className="page performance-page">
      <div className="performance-heading">
        <div><p>AI 자동채점 관리</p><h1>실적관리</h1><span>전체 제출 물량의 자동채점 적용 범위와 기간별 추이를 조회합니다.</span></div>
      </div>

      <section className="performance-filter-card" aria-label="실적 조회 조건">
        <div className="filter-title"><Search size={16} /> 조회 조건</div>
        <div className="performance-filter-fields">
          <label>조회단위<select value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value as QueryUnit })}><option value="daily">일별</option><option value="monthly">월별</option><option value="yearly">연별</option><option value="custom">기간 지정</option></select></label>
          {(draft.unit === 'daily' || draft.unit === 'custom') && <div className="period-fields"><label>시작일<input type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} /></label><span>~</span><label>종료일<input type="date" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} /></label></div>}
          {draft.unit === 'monthly' && <div className="period-fields"><label>시작 월<input type="month" value={draft.startMonth} onChange={(event) => setDraft({ ...draft, startMonth: event.target.value })} /></label><span>~</span><label>종료 월<input type="month" value={draft.endMonth} onChange={(event) => setDraft({ ...draft, endMonth: event.target.value })} /></label></div>}
          {draft.unit === 'yearly' && <div className="period-fields"><label>시작 연도<select value={draft.startYear} onChange={(event) => setDraft({ ...draft, startYear: event.target.value })}><option>2026</option></select></label><span>~</span><label>종료 연도<select value={draft.endYear} onChange={(event) => setDraft({ ...draft, endYear: event.target.value })}><option>2026</option></select></label></div>}
          <label>과목<select value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value as SubjectFilter, stage: '전체' })}><option>전체</option><option>수학</option><option>영어</option><option>국어</option><option>과학</option></select></label>
          <label>단계<select value={draft.stage} onChange={(event) => setDraft({ ...draft, stage: event.target.value })}><option>전체</option>{stageOptions.map((stage) => <option key={stage}>{stage}</option>)}</select></label>
        </div>
        <div className="filter-actions"><button type="button" className="query-button" onClick={applyQuery}><Search size={15} /> 조회</button><button type="button" className="reset-button" onClick={resetQuery}><RotateCcw size={15} /> 초기화</button></div>
      </section>

      <section className="performance-kpi-grid" aria-label="조회 실적 요약">
        {kpis.map(([label, value], index) => <article key={label} className={index === 0 ? 'primary' : ''}><span>{label}</span><strong>{value}</strong></article>)}
      </section>

      <div className="performance-charts-grid">
        <section className="performance-panel trend-panel">
          <div className="performance-panel-heading"><div><TrendingUp size={18} /><span><strong>자동채점 실적 추이</strong><small>전체 물량과 처리 결과, 자동채점 비율</small></span></div><div className="chart-legend"><span><i className="total" />전체</span><span><i className="auto" />자동확정</span><span><i className="review" />검수후확정</span><span><i className="center" />센터 이관</span><span><i className="line" />자동채점 비율</span></div></div>
          <div className="trend-chart-scroll">
            <div className="trend-chart" style={{ width: `${chartWidth}px` }}>
              <div className="trend-grid-lines"><i /><i /><i /><i /><i /></div>
              <div className="trend-bars" style={{ gridTemplateColumns: `repeat(${rows.length}, 72px)` }}>
                {rows.map((row) => {
                  const scale = 160 / maxTotal
                  return <div className="trend-column" key={row.key}><div className="trend-bar-shell" style={{ height: `${row.total * scale}px` }}><div className="trend-stack"><i className="center" style={{ height: `${row.gradingCenter * scale}px` }} /><i className="review" style={{ height: `${row.reviewConfirmed * scale}px` }} /><i className="auto" style={{ height: `${row.autoConfirmed * scale}px` }} /></div></div><b>{formatChartLabel(row.label, applied.unit)}</b></div>
                })}
              </div>
              <svg className="trend-line" viewBox={`0 0 ${chartWidth} 220`} preserveAspectRatio="none" aria-label="자동채점 비율 선 그래프"><polyline points={linePoints} />{rows.map((row, index) => <circle key={row.key} cx={42 + index * 72} cy={Math.max(35, Math.min(185, 190 - rate(getAutoGraded(row), row.total) * 1.25))} r="4" />)}</svg>
            </div>
          </div>
        </section>

        <section className="performance-panel share-panel">
          <div className="performance-panel-heading"><div><BarChart3 size={18} /><span><strong>처리 비중</strong><small>조회기간 전체 기준</small></span></div></div>
          <div className="share-chart-wrap">
            <div className="share-donut" style={{ background: `conic-gradient(#376fba 0 ${rate(totals.autoConfirmed, totals.total)}%, #77a4d8 ${rate(totals.autoConfirmed, totals.total)}% ${rate(totals.autoConfirmed + totals.reviewConfirmed, totals.total)}%, #a5b9d0 ${rate(totals.autoConfirmed + totals.reviewConfirmed, totals.total)}% ${rate(totals.autoConfirmed + totals.reviewConfirmed + totals.gradingCenter, totals.total)}%, #e1e6ed ${rate(totals.autoConfirmed + totals.reviewConfirmed + totals.gradingCenter, totals.total)}% 100%)` }}><span><strong>{number.format(totals.total)}</strong>전체 물량</span></div>
            <ul><li><i className="auto" /><span>자동확정</span><strong>{rate(totals.autoConfirmed, totals.total).toFixed(1)}%</strong></li><li><i className="review" /><span>검수후확정</span><strong>{rate(totals.reviewConfirmed, totals.total).toFixed(1)}%</strong></li><li><i className="center" /><span>채점센터 이관</span><strong>{rate(totals.gradingCenter, totals.total).toFixed(1)}%</strong></li><li><i className="other" /><span>기타 또는 미적용</span><strong>{rate(other, totals.total).toFixed(1)}%</strong></li></ul>
          </div>
        </section>
      </div>

      <section className="performance-panel detail-panel">
        <div className="performance-panel-heading"><div><FileSpreadsheet size={18} /><span><strong>{applied.unit === 'monthly' ? '월별' : applied.unit === 'yearly' ? '연별' : '일별'} 실적 상세</strong><small>조회 조건에 따른 처리 물량과 비율</small></span></div><div className="table-tools"><label>페이지당<select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }}><option value="10">10건</option><option value="15">15건</option><option value="20">20건</option></select></label><button type="button" onClick={downloadCsv}><Download size={15} /> 엑셀 다운로드</button></div></div>
        <div className="performance-table-wrap"><table className="performance-table"><thead><tr><th>{applied.unit === 'monthly' ? '월' : applied.unit === 'yearly' ? '연도' : '일자'}</th><th>전체 물량</th><th>자동채점 물량</th><th>자동채점 비율</th><th>자동확정 물량</th><th>자동확정 비율</th><th>검수후확정 물량</th><th>검수후확정 비율</th><th>센터 이관 물량</th><th>센터 이관 비율</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.key}><td><strong>{row.label}</strong></td><td>{number.format(row.total)}</td><td>{number.format(getAutoGraded(row))}</td><td>{rate(getAutoGraded(row), row.total).toFixed(1)}%</td><td>{number.format(row.autoConfirmed)}</td><td>{rate(row.autoConfirmed, row.total).toFixed(1)}%</td><td>{number.format(row.reviewConfirmed)}</td><td>{rate(row.reviewConfirmed, row.total).toFixed(1)}%</td><td>{number.format(row.gradingCenter)}</td><td>{rate(row.gradingCenter, row.total).toFixed(1)}%</td></tr>)}</tbody><tfoot><tr><td>조회기간 합계</td><td>{number.format(totals.total)}</td><td>{number.format(autoGraded)}</td><td>{rate(autoGraded, totals.total).toFixed(1)}%</td><td>{number.format(totals.autoConfirmed)}</td><td>{rate(totals.autoConfirmed, totals.total).toFixed(1)}%</td><td>{number.format(totals.reviewConfirmed)}</td><td>{rate(totals.reviewConfirmed, totals.total).toFixed(1)}%</td><td>{number.format(totals.gradingCenter)}</td><td>{rate(totals.gradingCenter, totals.total).toFixed(1)}%</td></tr></tfoot></table></div>
        <div className="pagination"><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>이전</button><span>{page} / {totalPages}</span><button type="button" disabled={page === totalPages} onClick={() => setPage((value) => value + 1)}>다음</button></div>
      </section>
    </div>
  )
}
