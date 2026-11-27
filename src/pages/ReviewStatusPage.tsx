import { Eye, RotateCcw, SquarePen, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ColumnFilter, type SortDirection } from '../components/ColumnFilter'
import { useReviewers } from '../contexts/reviewerStore'
import { CURRENT_MONTH, monthLabel, monthOptions } from '../data/curriculum'
import { gradingErrors, type GradingError } from '../data/errors'
import { createReviewedSheet } from '../data/worksheets'
import { ReviewedSheetView } from '../components/ReviewedWorksheetView'

const number = new Intl.NumberFormat('ko-KR')

type ColumnKey = 'date' | 'reviewer' | 'subject' | 'stage' | 'progress' | 'question'
type Column = { key: ColumnKey; label: string; filterValue: (item: GradingError) => string; sortValue: (item: GradingError) => string | number; render: (item: GradingError) => string }

export function ReviewStatusPage() {
  const { reviewers } = useReviewers()
  const [sheet, setSheet] = useState<GradingError | null>(null)
  // 기준월 단위로 조회한다(목록이 계속 쌓이지 않도록). 기본값은 기준일이 속한 달.
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH)
  const monthErrors = useMemo(() => gradingErrors.filter((item) => item.timestamp.startsWith(selectedMonth)), [selectedMonth])
  // 열별 필터(null = 전체)와 정렬: 엑셀 자동필터처럼 표 머리글에서 설정한다.
  const [filters, setFilters] = useState<Partial<Record<ColumnKey, string[] | null>>>({})
  const [sort, setSort] = useState<{ key: ColumnKey; direction: SortDirection } | null>(null)

  const reviewerName = (id: string) => reviewers.find((reviewer) => reviewer.id === id)?.name ?? id
  const columns: Column[] = [
    // 일시는 엑셀의 날짜 필터처럼 날짜(일) 단위로 거른다.
    { key: 'date', label: '일시', filterValue: (item) => item.timestamp.slice(0, 10), sortValue: (item) => item.timestamp, render: (item) => item.timestamp },
    { key: 'reviewer', label: '담당 검수교사', filterValue: (item) => reviewerName(item.reviewerId), sortValue: (item) => reviewerName(item.reviewerId), render: (item) => reviewerName(item.reviewerId) },
    { key: 'subject', label: '과목', filterValue: (item) => item.subject, sortValue: (item) => item.subject, render: (item) => item.subject },
    { key: 'stage', label: '단계', filterValue: (item) => item.stage, sortValue: (item) => item.stage, render: (item) => item.stage },
    { key: 'progress', label: '진도번호', filterValue: (item) => String(item.progress), sortValue: (item) => item.progress, render: (item) => String(item.progress) },
    { key: 'question', label: '문항번호', filterValue: (item) => `${item.question}번`, sortValue: (item) => item.question, render: (item) => `${item.question}번` },
  ]
  const columnOf = (key: ColumnKey) => columns.find((column) => column.key === key)!

  const matches = (item: GradingError, except?: ColumnKey) => columns.every((column) => {
    if (column.key === except) return true
    const selected = filters[column.key]
    return !selected || selected.includes(column.filterValue(item))
  })

  const corrections = useMemo(() => {
    const rows = monthErrors.filter((item) => matches(item))
    if (!sort) return rows
    const column = columnOf(sort.key)
    const direction = sort.direction === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const left = column.sortValue(a)
      const right = column.sortValue(b)
      return (typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right), 'ko')) * direction
    })
    // columns·matches는 reviewers와 filters에서 계산되므로 두 값을 의존성으로 둔다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthErrors, filters, sort, reviewers])

  // 엑셀처럼 다른 열의 필터를 적용한 결과에서 값 목록을 만든다.
  const valuesFor = (column: Column) => {
    const rows = monthErrors.filter((item) => matches(item, column.key))
    const unique = new Map<string, string | number>()
    rows.forEach((item) => { if (!unique.has(column.filterValue(item))) unique.set(column.filterValue(item), column.sortValue(item)) })
    return [...unique.entries()]
      .sort(([, a], [, b]) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'ko')))
      .map(([value]) => value)
  }

  const activeCount = Object.values(filters).filter(Boolean).length
  const reset = () => { setFilters({}); setSort(null) }
  // 다른 달의 날짜 필터는 의미가 없으므로 기준월을 바꾸면 일시 필터만 해제한다.
  const changeMonth = (month: string) => {
    setSelectedMonth(month)
    setFilters((current) => ({ ...current, date: null }))
  }
  const reviewedSheet = sheet ? createReviewedSheet(sheet) : null

  return <div className="page review-status-page"><div className="review-status-heading"><div><p>검수 운영 분석</p><h1>수정내역</h1><span>검수교사가 AI 판정을 수정한 내역과 검수 완료 화면을 월 단위로 조회합니다.</span></div></div>
    <div className="review-status-section-head">
      <label className="review-status-month-select">기준월<select value={selectedMonth} onChange={(event) => changeMonth(event.target.value)}>{monthOptions.map((item) => <option key={item} value={item}>{monthLabel(item)}</option>)}</select></label>
    </div>
    <section className="review-status-panel correction-list-panel">
      <div className="review-status-panel-heading">
        <div><SquarePen size={17}/><span><strong>수정 내역 ({monthLabel(selectedMonth)} · 총 {number.format(corrections.length)}건)</strong><small>머리글의 ▾를 눌러 엑셀처럼 열마다 필터·정렬할 수 있습니다.</small></span></div>
        {(activeCount > 0 || sort) && <button type="button" className="column-filter-reset" onClick={reset}><RotateCcw size={14}/> 필터 초기화{activeCount > 0 ? ` (${activeCount})` : ''}</button>}
      </div>
      <div className="review-status-table-wrap"><table className="review-status-table correction-table">
        <thead><tr>
          {columns.map((column) => (
            <th key={column.key}>
              <div className="column-filter-head">
                <span>{column.label}</span>
                <ColumnFilter
                  label={column.label}
                  values={valuesFor(column)}
                  selected={filters[column.key] ?? null}
                  sort={sort?.key === column.key ? sort.direction : null}
                  onApply={(selected) => setFilters((current) => ({ ...current, [column.key]: selected }))}
                  onSort={(direction) => setSort({ key: column.key, direction })}
                />
              </div>
            </th>
          ))}
          <th>검수화면</th>
        </tr></thead>
        <tbody>
          {corrections.map((item) => <tr key={item.id}>{columns.map((column) => <td key={column.key}>{column.render(item)}</td>)}<td><button type="button" className="sheet-view-button" onClick={() => setSheet(item)}><Eye size={13}/> 화면 보기</button></td></tr>)}
          {corrections.length === 0 && <tr><td className="review-status-empty" colSpan={7}>{monthErrors.length ? '필터 조건에 맞는 수정 내역이 없습니다.' : `${monthLabel(selectedMonth)} 수정 내역이 없습니다.`}</td></tr>}
        </tbody>
      </table></div>
    </section>
    {sheet && (
      <div className="reviewer-modal-backdrop" onClick={() => setSheet(null)}>
        <div className="review-sheet-modal" role="dialog" aria-modal="true" aria-label="검수 완료 화면" onClick={(event) => event.stopPropagation()}>
          <div className="reviewer-modal-title">
            <div><h2>검수 완료 화면</h2><p>검수 완료 후 회원이 확인하는 학습지 화면</p></div>
            <button type="button" aria-label="닫기" onClick={() => setSheet(null)}><X size={17}/></button>
          </div>
          <div className="sheet-meta">
            <span>검수일시<strong>{sheet.timestamp}</strong></span>
            <span>담당 검수교사<strong>{reviewerName(sheet.reviewerId)}</strong></span>
            <span>수정 문항<strong>{reviewedSheet?.reviewedSide.toUpperCase()}면 {sheet.question}번 · {sheet.before} → {sheet.after}</strong></span>
          </div>
          {reviewedSheet && <ReviewedSheetView sheet={reviewedSheet}/>}
          <p className="sheet-readonly">검수가 완료된 화면으로 수정할 수 없습니다.</p>
        </div>
      </div>
    )}
  </div>
}
