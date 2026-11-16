import { BarChart3, Building2, CalendarDays, CheckCircle2, Clock3, FileCheck2, Files, Layers3, PencilLine, Search, UserCheck, WalletCards } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAdminData } from '../contexts/adminStore'
import { useReviewers } from '../contexts/reviewerStore'
import { curriculumStages, progressNumbers, subjects, TODAY, type Subject } from '../data/curriculum'
import { performanceData } from '../data/performance'
import { reviewDetails } from '../data/reviewPerformance'

const number = new Intl.NumberFormat('ko-KR')
const hourlyVolumes = [620, 1050, 1380, 1120, 940, 1260, 990, 460]
const hours = ['08시', '09시', '10시', '11시', '12시', '13시', '14시', '15시']
function PanelTitle({ icon, title, description }: { icon: ReactNode; title: string; description: string }) { return <div className="dashboard-panel-title"><span>{icon}</span><div><h2>{title}</h2><p>{description}</p></div></div> }

export function DashboardPage() {
  const { operation } = useAdminData(); const { reviewers } = useReviewers()
  const [subject, setSubject] = useState<Subject>('수학'); const [stage, setStage] = useState('A'); const [progress, setProgress] = useState(1)
  const [applied, setApplied] = useState({ subject: '수학' as Subject, stage: 'A', progress: 1 })
  const totals = performanceData.filter((row) => row.date === TODAY).reduce((sum, row) => ({ total: sum.total + row.total, auto: sum.auto + row.autoConfirmed, review: sum.review + row.reviewConfirmed, center: sum.center + row.gradingCenter }), { total: 0, auto: 0, review: 0, center: 0 })
  const allowance = reviewers.reduce((sum, item) => sum + item.expectedAllowance, 0); const autoRate = totals.total ? (totals.auto + totals.review) / totals.total * 100 : 0
  const seed = subjects.indexOf(applied.subject) * 19 + curriculumStages[applied.subject].indexOf(applied.stage) * 7 + applied.progress
  const savedApplies = operation.subject === applied.subject && operation.stage === applied.stage && applied.progress >= operation.progressFrom && applied.progress <= operation.progressTo
  const autoMin = savedApplies ? operation.rules.find((rule) => rule.answer === '정답' && rule.result === '자동확정')?.minLp ?? 95 : 93 + seed % 5
  const reviewMin = Math.max(80, autoMin - (4 + seed % 4)); const wrongReviewMin = 94 + seed % 4
  const workMinutes = reviewers.reduce((sum, reviewer) => { const [sh, sm] = reviewer.workStart.split(':').map(Number); const [eh, em] = reviewer.workEnd.split(':').map(Number); return sum + Math.max(0, eh * 60 + em - sh * 60 - sm) }, 0)
  const reviewerStats = reviewers.map((reviewer, index) => ({ name: reviewer.name.replace('검수교사 ', ''), pages: reviewer.assignedPages, corrections: 82 + index * 13 }))
  const correctionBySubject = subjects.map((item, index) => ({ label: item, value: 72 + ((index * 43 + 27) % 110) }))
  const correctionByStage = [...new Set(subjects.flatMap((item) => curriculumStages[item]))].map((item, index) => ({ label: item, value: 38 + ((index * 31 + 19) % 100) })).slice(0, 9)
  const kpis = [
    { label: '전체 물량', value: `${number.format(totals.total)}장`, note: `자동채점 비율 ${autoRate.toFixed(1)}%`, icon: Layers3, to: '/performance' },
    { label: '자동확정 물량', value: `${number.format(totals.auto)}장`, note: `전체의 ${totals.total ? (totals.auto / totals.total * 100).toFixed(1) : 0}%`, icon: CheckCircle2, to: '/performance' },
    { label: '검수후확정 물량', value: `${number.format(totals.review)}장`, note: `전체의 ${totals.total ? (totals.review / totals.total * 100).toFixed(1) : 0}%`, icon: UserCheck, to: '/performance' },
    { label: '채점센터 이관 물량', value: `${number.format(totals.center)}장`, note: `전체의 ${totals.total ? (totals.center / totals.total * 100).toFixed(1) : 0}%`, icon: Building2, to: '/performance' },
    { label: '예상 수당', value: `₩${number.format(allowance)}`, note: '금일 검수 기준', icon: WalletCards, to: '/review-status' },
  ]
  return <div className="page dashboard-page">
    <div className="dashboard-heading"><div><p>AI 자동채점 관리</p><h1>대시보드</h1><span>자동채점 운영 현황과 주요 지표를 한눈에 확인합니다.</span></div><div className="dashboard-date"><CalendarDays size={16}/> 2026년 11월 16일 월요일</div></div>
    <h2 className="dashboard-section-label">주요 운영 지표</h2><section className="kpi-grid dashboard-kpi-five">{kpis.map(({ icon: Icon, ...item }) => <Link className="kpi-card clickable" to={item.to} key={item.label}><div className="kpi-icon"><Icon size={20}/></div><div><span>{item.label}</span><strong>{item.value}</strong><small>{item.note}</small></div></Link>)}</section>
    <section className="dashboard-panel standards-panel"><Link to="/standards"><PanelTitle icon={<FileCheck2 size={17}/>} title="운영기준 요약" description="선택한 과목·단계·진도번호의 자동채점 분기 기준" /></Link><div className="dashboard-filters"><strong>조회 조건</strong><label>과목<select value={subject} onChange={(event) => { const next = event.target.value as Subject; setSubject(next); setStage(curriculumStages[next][0]) }}>{subjects.map((item) => <option key={item}>{item}</option>)}</select></label><label>단계<select value={stage} onChange={(event) => setStage(event.target.value)}>{curriculumStages[subject].map((item) => <option key={item}>{item}</option>)}</select></label><label>진도번호<select value={progress} onChange={(event) => setProgress(Number(event.target.value))}>{progressNumbers.map((item) => <option key={item}>{item}</option>)}</select></label><button type="button" onClick={() => setApplied({ subject, stage, progress })}><Search size={15}/> 조회</button></div><div className="standards-grid"><article><div><CheckCircle2 size={21}/><strong>자동확정</strong></div><dl><dt>정답</dt><dd>LP {autoMin} 이상</dd><dt>오답</dt><dd>해당 없음</dd></dl></article><article><div><UserCheck size={21}/><strong>검수후확정</strong></div><dl><dt>정답</dt><dd>LP {reviewMin}~{autoMin - 1}</dd><dt>오답</dt><dd>LP {wrongReviewMin} 이상</dd></dl></article><article><div><Building2 size={21}/><strong>채점센터</strong></div><dl><dt>정답</dt><dd>LP {reviewMin} 미만</dd><dt>오답</dt><dd>LP {wrongReviewMin} 미만</dd></dl></article></div></section>
    <section className="dashboard-panel performance-panel"><Link to="/review-status"><PanelTitle icon={<Files size={17}/>} title="검수 실적" description="금일 검수 업무의 주요 실적과 통계" /></Link><div className="performance-summary dashboard-review-summary"><div><Clock3 size={18}/><span>금일 총 근무시간<strong>{Math.floor(workMinutes / 60)}시간 {workMinutes % 60}분</strong></span></div><div><Files size={18}/><span>금일 검수 장수<strong>{number.format(reviewers.reduce((sum, item) => sum + item.assignedPages, 0))}장</strong></span></div><div><PencilLine size={18}/><span>금일 수정 건수<strong>{reviewDetails.filter((item) => item.corrected).length}건</strong></span></div><div><WalletCards size={18}/><span>예상 수당<strong>₩{number.format(allowance)}</strong></span></div></div><div className="chart-grid"><div className="mini-chart"><h3>검수교사별 실적</h3><div className="dashboard-dual-bars">{reviewerStats.map((item) => <div key={item.name}><span><i style={{ height: `${item.pages / 1900 * 100}%` }}/><b style={{ height: `${item.corrections / 150 * 100}%` }}/></span><small>{item.name}</small></div>)}</div><div className="dashboard-chart-legend"><span><i/>검수 장수</span><span><i/>수정 건수</span></div></div><div className="mini-chart"><h3>시간대별 검수량</h3><div className="dashboard-hour-bars">{hourlyVolumes.map((value, index) => <div key={hours[index]}><strong>{number.format(value)}</strong><i style={{ height: `${value / 1400 * 100}%` }}/><span>{hours[index]}</span></div>)}</div></div></div></section>
    <section className="dashboard-panel"><Link to="/review-status"><PanelTitle icon={<BarChart3 size={17}/>} title="수정 통계" description="검수교사가 AI 판정을 수정한 건수 분석" /></Link><div className="dashboard-correction-grid"><SimpleBars title="과목별 수정 건수" data={correctionBySubject}/><SimpleBars title="단계별 수정 건수" data={correctionByStage}/></div></section>
  </div>
}
function SimpleBars({ title, data }: { title: string; data: { label: string; value: number }[] }) { const max = Math.max(...data.map((item) => item.value), 1); return <div className="mini-chart"><h3>{title}</h3><div className="dashboard-simple-bars">{data.map((item) => <div key={item.label}><strong>{item.value}</strong><i style={{ height: `${item.value / max * 100}%` }}/><span>{item.label}</span></div>)}</div></div> }
