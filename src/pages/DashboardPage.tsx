import { Building2, CalendarDays, CheckCircle2, Clock3, FileCheck2, Files, Layers3, PencilLine, Search, UserCheck, WalletCards } from 'lucide-react'
import { Fragment, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAdminData } from '../contexts/adminStore'
import { useReviewers } from '../contexts/reviewerStore'
import { curriculumStages, progressNumbers, subjects, TODAY, type Subject } from '../data/curriculum'
import { answerTypes, isUnset, ruleResults, stageKey, type AnswerType, type RuleResult } from '../data/operationRules'
import { performanceData } from '../data/performance'
import { reviewPerformanceRecords } from '../data/reviewPerformance'

const number = new Intl.NumberFormat('ko-KR')
function PanelTitle({ icon, title, description }: { icon: ReactNode; title: string; description: string }) { return <div className="dashboard-panel-title"><span>{icon}</span><div><h2>{title}</h2><p>{description}</p></div></div> }

export function DashboardPage() {
  const { ruleSettings } = useAdminData(); const { reviewers } = useReviewers()
  const [subject, setSubject] = useState<Subject>('수학'); const [stage, setStage] = useState('A'); const [progress, setProgress] = useState(1)
  const [applied, setApplied] = useState({ subject: '수학' as Subject, stage: 'A', progress: 1 })
  const totals = performanceData.filter((row) => row.date === TODAY).reduce((sum, row) => ({ total: sum.total + row.total, auto: sum.auto + row.autoConfirmed, review: sum.review + row.reviewConfirmed, center: sum.center + row.gradingCenter }), { total: 0, auto: 0, review: 0, center: 0 })
  const allowance = reviewers.reduce((sum, item) => sum + item.expectedAllowance, 0); const autoRate = totals.total ? (totals.auto + totals.review) / totals.total * 100 : 0
  // 운영기준 요약: 운영기준 설정에 저장된 과목·단계·진도번호의 처리결과별 LP 범위를 그대로 보여준다.
  const appliedSetting = ruleSettings[stageKey(applied.subject, applied.stage)]?.[applied.progress]
  const appliedUnset = isUnset(appliedSetting)
  const rangeLabel = (result: RuleResult, answer: AnswerType) => { const range = appliedSetting?.[result]?.[answer]; return range ? `LP ${range.min}~${range.max}` : '해당 없음' }
  const resultIcons: Record<RuleResult, ReactNode> = { 자동확정: <CheckCircle2 size={21}/>, 검수후확정: <UserCheck size={21}/>, 채점센터: <Building2 size={21}/> }
  const todayRecords = reviewPerformanceRecords.filter((item) => item.date === TODAY)
  const totalReviewVolume = reviewers.reduce((sum, item) => sum + item.assignedPages, 0)
  const reviewedPages = reviewers.reduce((sum, item) => sum + item.processedPages, 0)
  const workMinutes = todayRecords.reduce((sum, item) => sum + item.workMinutes, 0)
  const correctionCount = todayRecords.reduce((sum, item) => sum + item.corrections, 0)
  const reviewProgress = totalReviewVolume ? reviewedPages / totalReviewVolume * 100 : 0
  const reviewerStats = reviewers.map((reviewer) => { const record = todayRecords.find((item) => item.reviewerId === reviewer.id); return { name: reviewer.name.replace('검수교사 ', ''), pages: reviewer.processedPages, corrections: record?.corrections ?? 0 } })
  const recentDates = [...new Set(reviewPerformanceRecords.map((item) => item.date))].slice(-7)
  const recentTrend = recentDates.map((date) => ({
    label: date.slice(5),
    pages: date === TODAY ? reviewedPages : reviewPerformanceRecords.filter((item) => item.date === date).reduce((sum, item) => sum + item.reviewedPages, 0),
    corrections: reviewPerformanceRecords.filter((item) => item.date === date).reduce((sum, item) => sum + item.corrections, 0),
  }))
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
    <section className="dashboard-panel standards-panel"><Link to="/standards"><PanelTitle icon={<FileCheck2 size={17}/>} title="운영기준 요약" description="선택한 과목·단계·진도번호의 자동채점 분기 기준" /></Link><div className="dashboard-filters"><strong>조회 조건</strong><label>과목<select value={subject} onChange={(event) => { const next = event.target.value as Subject; setSubject(next); setStage(curriculumStages[next][0]) }}>{subjects.map((item) => <option key={item}>{item}</option>)}</select></label><label>단계<select value={stage} onChange={(event) => setStage(event.target.value)}>{curriculumStages[subject].map((item) => <option key={item}>{item}</option>)}</select></label><label>진도번호<select value={progress} onChange={(event) => setProgress(Number(event.target.value))}>{progressNumbers.map((item) => <option key={item}>{item}</option>)}</select></label><button type="button" onClick={() => setApplied({ subject, stage, progress })}><Search size={15}/> 조회</button></div>{appliedUnset && <p className="dashboard-standards-unset">{applied.subject} {applied.stage}단계 진도번호 {applied.progress}은(는) 운영기준이 설정되지 않았습니다.</p>}<div className="standards-grid">{ruleResults.map((result) => <article key={result}><div>{resultIcons[result]}<strong>{result}</strong></div><dl>{answerTypes.map((answer) => <Fragment key={answer}><dt>{answer}</dt><dd>{rangeLabel(result, answer)}</dd></Fragment>)}</dl></article>)}</div></section>
    <section className="dashboard-panel performance-panel dashboard-review-status-panel"><Link className="dashboard-panel-link" to="/review-status"><PanelTitle icon={<Files size={17}/>} title="검수현황" description="금일 검수 진행 수준과 최근 실적을 확인합니다." /><div className="performance-summary dashboard-review-summary"><div><Clock3 size={18}/><span>금일 총 근무시간<strong>{Math.floor(workMinutes / 60)}시간 {workMinutes % 60}분</strong></span></div><div><Files size={18}/><span>금일 검수 건수<strong>{number.format(reviewedPages)}건</strong></span></div><div><PencilLine size={18}/><span>금일 수정 건수<strong>{number.format(correctionCount)}건</strong></span></div><div><WalletCards size={18}/><span>예상 수당<strong>₩{number.format(allowance)}</strong></span></div></div><div className="dashboard-review-progress"><div><span>오늘 검수 진행률</span><strong>{number.format(reviewedPages)}건 / {number.format(totalReviewVolume)}건 <em>{reviewProgress.toFixed(1)}%</em></strong></div><div className="dashboard-review-progress-track" role="progressbar" aria-label="오늘 검수 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(reviewProgress)}><i style={{ width: `${Math.min(reviewProgress, 100)}%` }}/></div><small>오늘 총 검수량(검수후확정 분량) 대비 현재까지 검수 완료된 건수</small></div><div className="dashboard-review-charts"><TrendChart data={recentTrend}/><ReviewerBars data={reviewerStats}/></div></Link></section>
  </div>
}
function TrendChart({ data }: { data: { label: string; pages: number; corrections: number }[] }) {
  const width = 620; const height = 150; const maxPages = Math.max(...data.map((item) => item.pages), 1); const maxCorrections = Math.max(...data.map((item) => item.corrections), 1)
  const point = (value: number, max: number, index: number) => `${data.length === 1 ? width / 2 : index / (data.length - 1) * width},${height - 18 - value / max * 110}`
  const pagePoints = data.map((item, index) => point(item.pages, maxPages, index)); const correctionPoints = data.map((item, index) => point(item.corrections, maxCorrections, index))
  return <div className="mini-chart dashboard-trend-chart"><h3>최근 검수건수 및 수정건수 추이</h3><div className="dashboard-trend-values">{data.map((item) => <span key={item.label}><b>{number.format(item.pages)}</b><em>{number.format(item.corrections)}</em></span>)}</div><svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none"><polyline className="review-line" points={pagePoints.join(' ')}/><polyline className="correction-line" points={correctionPoints.join(' ')}/>{pagePoints.map((item, index) => { const [x, y] = item.split(','); return <circle className="review-point" key={`review-${data[index].label}`} cx={x} cy={y} r="4"/> })}{correctionPoints.map((item, index) => { const [x, y] = item.split(','); return <circle className="correction-point" key={`correction-${data[index].label}`} cx={x} cy={y} r="4"/> })}</svg><div className="dashboard-trend-labels">{data.map((item) => <span key={item.label}>{item.label}</span>)}</div><ChartLegend/></div>
}
function ReviewerBars({ data }: { data: { name: string; pages: number; corrections: number }[] }) { const pageMax = Math.max(...data.map((item) => item.pages), 1); const correctionMax = Math.max(...data.map((item) => item.corrections), 1); return <div className="mini-chart"><h3>검수교사별 검수건수 및 수정건수</h3><div className="dashboard-dual-bars dashboard-reviewer-bars">{data.map((item) => <div key={item.name}><strong><span>{number.format(item.pages)}</span><em>{number.format(item.corrections)}</em></strong><span><i style={{ height: `${item.pages / pageMax * 100}%` }}/><b style={{ height: `${item.corrections / correctionMax * 100}%` }}/></span><small>{item.name}</small></div>)}</div><ChartLegend/></div> }
function ChartLegend() { return <div className="dashboard-chart-legend"><span><i/>검수 건수</span><span><i/>수정 건수</span></div> }
