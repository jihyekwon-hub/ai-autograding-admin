import { BarChart3, CheckCircle2, Clock3, Eye, RotateCcw, Search, SquarePen, WalletCards, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useReviewers } from '../contexts/reviewerStore'
import { curriculumStages, MONTH_START, subjects, TODAY, type Subject } from '../data/curriculum'
import { gradingErrors, type GradingError } from '../data/errors'
import { reviewPerformanceRecords } from '../data/reviewPerformance'
import { createReviewedSheet } from '../data/worksheets'
import { ReviewedSheetView } from '../components/ReviewedWorksheetView'

type PeriodUnit = '일별' | '월별' | '기간별'
const number = new Intl.NumberFormat('ko-KR')
const minutesLabel = (value: number) => `${Math.floor(value / 60)}시간 ${String(value % 60).padStart(2, '0')}분`

function MultiSelect({ label, options, selected, onChange }: { label: string; options: { value: string; label: string }[]; selected: string[]; onChange: (values: string[]) => void }) {
  const [open, setOpen] = useState(false); const all = selected.length === 0
  const toggle = (value: string) => onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value])
  return <div className="multi-select"><span>{label}</span><button type="button" onClick={() => setOpen(!open)}>{all ? '전체' : selected.length === 1 ? options.find((item) => item.value === selected[0])?.label : `${selected.length}개 선택`} ▾</button>{open && <div className="multi-select-menu"><label><input type="checkbox" checked={all} onChange={() => onChange([])}/> 전체</label>{options.map((option) => <label key={option.value}><input type="checkbox" checked={selected.includes(option.value)} onChange={() => toggle(option.value)}/>{option.label}</label>)}</div>}</div>
}

export function ReviewStatusPage() {
  const { reviewers } = useReviewers(); const [unit, setUnit] = useState<PeriodUnit>('기간별'); const [start, setStart] = useState(MONTH_START); const [end, setEnd] = useState(TODAY)
  const [reviewerIds, setReviewerIds] = useState<string[]>([]); const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]); const [selectedStages, setSelectedStages] = useState<string[]>([]); const [sheet, setSheet] = useState<GradingError | null>(null)
  const availableStages = [...new Set((selectedSubjects.length ? selectedSubjects as Subject[] : subjects).flatMap((subject) => curriculumStages[subject]))]
  const filteredReviewers = reviewers.filter((reviewer) => !reviewerIds.length || reviewerIds.includes(reviewer.id)).filter((reviewer) => !selectedSubjects.length || reviewer.ranges.some((range) => selectedSubjects.includes(range.subject))).filter((reviewer) => !selectedStages.length || reviewer.ranges.some((range) => selectedStages.includes(range.stage)))
  const ids = new Set(filteredReviewers.map((item) => item.id)); const records = reviewPerformanceRecords.filter((item) => ids.has(item.reviewerId) && item.date >= start && item.date <= end)
  const totalPages = records.reduce((sum, item) => sum + item.reviewedPages, 0); const totalCorrections = records.reduce((sum, item) => sum + item.corrections, 0); const totalMinutes = records.reduce((sum, item) => sum + item.workMinutes, 0); const allowance = filteredReviewers.reduce((sum, item) => sum + item.expectedAllowance, 0); const speed = totalMinutes ? totalPages / (totalMinutes / 60) : 0
  const dates = [...new Set(records.map((item) => item.date))]; const daily = dates.map((date) => ({ label: date.slice(5), pages: records.filter((item) => item.date === date).reduce((sum, item) => sum + item.reviewedPages, 0), corrections: records.filter((item) => item.date === date).reduce((sum, item) => sum + item.corrections, 0) }))
  const reviewerStats = filteredReviewers.map((reviewer) => ({ reviewer, pages: records.filter((item) => item.reviewerId === reviewer.id).reduce((sum, item) => sum + item.reviewedPages, 0), corrections: records.filter((item) => item.reviewerId === reviewer.id).reduce((sum, item) => sum + item.corrections, 0) }))
  const corrections = gradingErrors.filter((item) => ids.has(item.reviewerId) && item.timestamp.slice(0, 10) >= start && item.timestamp.slice(0, 10) <= end).filter((item) => !selectedSubjects.length || selectedSubjects.includes(item.subject)).filter((item) => !selectedStages.length || selectedStages.includes(item.stage))
  const reviewedSheet = sheet ? createReviewedSheet(sheet) : null
  const reset = () => { setUnit('기간별'); setStart(MONTH_START); setEnd(TODAY); setReviewerIds([]); setSelectedSubjects([]); setSelectedStages([]) }
  return <div className="page review-status-page"><div className="review-status-heading"><div><p>검수 운영 분석</p><h1>검수현황</h1><span>검수교사별 실적과 AI 판정 수정 내역을 조회합니다.</span></div></div>
    <section className="review-filter-card"><div className="review-unit-tabs">{(['일별', '월별', '기간별'] as PeriodUnit[]).map((item) => <button className={unit === item ? 'active' : ''} key={item} onClick={() => setUnit(item)}>{item}</button>)}</div><label>시작일<input type="date" value={start} onChange={(event) => setStart(event.target.value)}/></label><label>종료일<input type="date" value={end} min={start} onChange={(event) => setEnd(event.target.value)}/></label><MultiSelect label="검수교사" options={reviewers.map((item) => ({ value: item.id, label: item.name }))} selected={reviewerIds} onChange={setReviewerIds}/><MultiSelect label="과목" options={subjects.map((item) => ({ value: item, label: item }))} selected={selectedSubjects} onChange={(values) => { setSelectedSubjects(values); setSelectedStages([]) }}/><MultiSelect label="단계" options={availableStages.map((item) => ({ value: item, label: item }))} selected={selectedStages} onChange={setSelectedStages}/><div className="review-filter-actions"><button className="search"><Search size={15}/> 조회</button><button onClick={reset}><RotateCcw size={15}/> 초기화</button></div></section>
    <section className="review-status-kpis five"><Kpi icon={<CheckCircle2/>} label="총 검수 장수" value={`${number.format(totalPages)}장`}/><Kpi icon={<SquarePen/>} label="총 수정 건수" value={`${number.format(totalCorrections)}건`}/><Kpi icon={<Clock3/>} label="총 업무시간" value={minutesLabel(totalMinutes)}/><Kpi icon={<BarChart3/>} label="평균 처리속도" value={`${speed.toFixed(1)}장/시간`}/><Kpi icon={<WalletCards/>} label="예상 수당" value={`₩${number.format(allowance)}`}/></section>
    <div className="review-chart-grid"><section className="review-status-panel reviewer-ranking"><Title title="검수교사별 실적"/><DualBars data={reviewerStats.map((item) => ({ label: item.reviewer.name.replace('검수교사 ', ''), first: item.pages, second: item.corrections }))}/></section><section className="review-status-panel"><Title title="검수 장수 추이"/><LineChart data={daily.map((item) => ({ label: item.label, value: item.pages }))}/></section><section className="review-status-panel"><Title title="수정 건수 추이"/><LineChart data={daily.map((item) => ({ label: item.label, value: item.corrections }))}/></section></div>
    <section className="review-status-panel correction-list-panel"><Title title="수정 내역"/><div className="review-status-table-wrap"><table className="review-status-table"><thead><tr><th>일시</th><th>담당 검수교사</th><th>과목</th><th>단계</th><th>진도번호</th><th>문항번호</th><th>검수화면</th></tr></thead><tbody>{corrections.map((item) => <tr key={item.id}><td>{item.timestamp}</td><td>{reviewers.find((reviewer) => reviewer.id === item.reviewerId)?.name}</td><td>{item.subject}</td><td>{item.stage}</td><td>{item.progress}</td><td>{item.question}번</td><td><button className="sheet-view-button" onClick={() => setSheet(item)}><Eye size={13}/> 화면 보기</button></td></tr>)}</tbody></table></div></section>
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
function Kpi({ icon, label, value }: { icon: ReactNode; label: string; value: string }) { return <article>{icon}<span>{label}<strong>{value}</strong><small>조회 조건 기준</small></span></article> }
function Title({ title }: { title: string }) { return <div className="review-status-panel-heading"><div><BarChart3 size={17}/><span><strong>{title}</strong><small>조회 조건 기준</small></span></div></div> }
function DualBars({ data }: { data: { label: string; first: number; second: number }[] }) { const max = Math.max(...data.map((item) => item.first), 1); return <div className="review-dual-bars">{data.map((item) => <div key={item.label}><span><i style={{ height: `${item.first / max * 100}%` }}/><b style={{ height: `${Math.max(5, item.second / max * 650)}%` }}/></span><small>{item.label}</small></div>)}</div> }
function LineChart({ data }: { data: { label: string; value: number }[] }) { const max = Math.max(...data.map((item) => item.value), 1); const points = data.map((item, index) => `${data.length === 1 ? 210 : index / (data.length - 1) * 420},${145 - item.value / max * 120}`).join(' '); return <div className="review-line-chart"><div>{data.map((item) => <span key={item.label}>{number.format(item.value)}</span>)}</div><svg viewBox="0 0 420 160" preserveAspectRatio="none"><polyline points={points} fill="none" stroke="#3978d3" strokeWidth="3"/>{data.map((item, index) => { const [x,y] = points.split(' ')[index].split(','); return <circle key={item.label} cx={x} cy={y} r="4" fill="#fff" stroke="#3978d3" strokeWidth="2"/> })}</svg><footer>{data.map((item) => <span key={item.label}>{item.label}</span>)}</footer></div> }
