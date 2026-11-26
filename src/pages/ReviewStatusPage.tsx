import { Eye, RotateCcw, Search, SquarePen, X } from 'lucide-react'
import { useState } from 'react'
import { useReviewers } from '../contexts/reviewerStore'
import { curriculumStages, MONTH_START, subjects, TODAY, type Subject } from '../data/curriculum'
import { gradingErrors, type GradingError } from '../data/errors'
import { createReviewedSheet } from '../data/worksheets'
import { ReviewedSheetView } from '../components/ReviewedWorksheetView'

type Filters = { start: string; end: string; reviewerIds: string[]; subjects: string[]; stages: string[] }
const initialFilters: Filters = { start: MONTH_START, end: TODAY, reviewerIds: [], subjects: [], stages: [] }
const number = new Intl.NumberFormat('ko-KR')

function MultiSelect({ label, options, selected, onChange }: { label: string; options: { value: string; label: string }[]; selected: string[]; onChange: (values: string[]) => void }) {
  const [open, setOpen] = useState(false); const all = selected.length === 0
  const toggle = (value: string) => onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value])
  return <div className="multi-select"><span>{label}</span><button type="button" onClick={() => setOpen(!open)}>{all ? '전체' : selected.length === 1 ? options.find((item) => item.value === selected[0])?.label : `${selected.length}개 선택`} ▾</button>{open && <div className="multi-select-menu"><label><input type="checkbox" checked={all} onChange={() => onChange([])}/> 전체</label>{options.map((option) => <label key={option.value}><input type="checkbox" checked={selected.includes(option.value)} onChange={() => toggle(option.value)}/>{option.label}</label>)}</div>}</div>
}

export function ReviewStatusPage() {
  const { reviewers } = useReviewers()
  const [draft, setDraft] = useState<Filters>(initialFilters)
  const [filters, setFilters] = useState<Filters>(initialFilters)
  const [sheet, setSheet] = useState<GradingError | null>(null)
  const availableStages = [...new Set((draft.subjects.length ? draft.subjects as Subject[] : subjects).flatMap((subject) => curriculumStages[subject]))]
  const corrections = gradingErrors
    .filter((item) => item.timestamp.slice(0, 10) >= filters.start && item.timestamp.slice(0, 10) <= filters.end)
    .filter((item) => !filters.reviewerIds.length || filters.reviewerIds.includes(item.reviewerId))
    .filter((item) => !filters.subjects.length || filters.subjects.includes(item.subject))
    .filter((item) => !filters.stages.length || filters.stages.includes(item.stage))
  const reviewedSheet = sheet ? createReviewedSheet(sheet) : null
  const reset = () => { setDraft(initialFilters); setFilters(initialFilters) }
  return <div className="page review-status-page"><div className="review-status-heading"><div><p>검수 운영 분석</p><h1>수정내역</h1><span>검수교사가 AI 판정을 수정한 내역과 검수 완료 화면을 조회합니다.</span></div></div>
    <section className="review-filter-card">
      <label>시작일<input type="date" value={draft.start} onChange={(event) => setDraft({ ...draft, start: event.target.value })}/></label>
      <label>종료일<input type="date" value={draft.end} min={draft.start} onChange={(event) => setDraft({ ...draft, end: event.target.value })}/></label>
      <MultiSelect label="검수교사" options={reviewers.map((item) => ({ value: item.id, label: item.name }))} selected={draft.reviewerIds} onChange={(values) => setDraft({ ...draft, reviewerIds: values })}/>
      <MultiSelect label="과목" options={subjects.map((item) => ({ value: item, label: item }))} selected={draft.subjects} onChange={(values) => setDraft({ ...draft, subjects: values, stages: [] })}/>
      <MultiSelect label="단계" options={availableStages.map((item) => ({ value: item, label: item }))} selected={draft.stages} onChange={(values) => setDraft({ ...draft, stages: values })}/>
      <div className="review-filter-actions"><button type="button" className="search" onClick={() => setFilters({ ...draft })}><Search size={15}/> 조회</button><button type="button" onClick={reset}><RotateCcw size={15}/> 초기화</button></div>
    </section>
    <section className="review-status-panel correction-list-panel">
      <div className="review-status-panel-heading"><div><SquarePen size={17}/><span><strong>수정 내역 (총 {number.format(corrections.length)}건)</strong><small>조회 조건 기준</small></span></div></div>
      <div className="review-status-table-wrap"><table className="review-status-table"><thead><tr><th>일시</th><th>담당 검수교사</th><th>과목</th><th>단계</th><th>진도번호</th><th>문항번호</th><th>검수화면</th></tr></thead><tbody>{corrections.map((item) => <tr key={item.id}><td>{item.timestamp}</td><td>{reviewers.find((reviewer) => reviewer.id === item.reviewerId)?.name ?? item.reviewerId}</td><td>{item.subject}</td><td>{item.stage}</td><td>{item.progress}</td><td>{item.question}번</td><td><button type="button" className="sheet-view-button" onClick={() => setSheet(item)}><Eye size={13}/> 화면 보기</button></td></tr>)}{corrections.length === 0 && <tr><td className="review-status-empty" colSpan={7}>조회 조건에 맞는 수정 내역이 없습니다.</td></tr>}</tbody></table></div>
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
            <span>담당 검수교사<strong>{reviewers.find((reviewer) => reviewer.id === sheet.reviewerId)?.name ?? sheet.reviewerId}</strong></span>
            <span>수정 문항<strong>{reviewedSheet?.reviewedSide.toUpperCase()}면 {sheet.question}번 · {sheet.before} → {sheet.after}</strong></span>
          </div>
          {reviewedSheet && <ReviewedSheetView sheet={reviewedSheet}/>}
          <p className="sheet-readonly">검수가 완료된 화면으로 수정할 수 없습니다.</p>
        </div>
      </div>
    )}
  </div>
}
