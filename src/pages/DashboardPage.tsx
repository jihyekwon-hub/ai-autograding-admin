import { AlertTriangle, ArrowRight, Building2, CheckCircle2, ChevronRight, Layers3, PencilLine, ShieldCheck, Sparkles, UserCheck, X, type LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminData } from '../contexts/adminStore'
import { CURRENT_MONTH, curriculumStages, monthLabel, monthOptions, progressNumbers, subjects, TODAY, type Subject } from '../data/curriculum'
import { effectiveResult, resultLabels, stageKey, type RuleResult, type RuleSettings, type StandardsLinkState } from '../data/operationRules'
import { ERROR_RATE_THRESHOLD, getProgressResult } from '../data/progressResults'
import { performanceData } from '../data/performance'

const number = new Intl.NumberFormat('ko-KR')
const percent = (value: number, base: number) => base ? value / base * 100 : 0
// 화면에 보이는 값(소수 첫째 자리)과 판정이 어긋나지 않도록 반올림한 값으로 비교한다.
const roundRate = (value: number) => Math.round(value * 10) / 10
/** 기준월의 마지막 날(기준일이 속한 달은 기준일까지) */
const monthEnd = (month: string) => {
  const last = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10)
  return last > TODAY ? TODAY : last
}

type Tone = 'total' | 'ai' | 'center' | 'auto' | 'review'
/** share: 기준 대비 비율(%), sum: 아래 두 박스의 합계 박스 여부 */
type Kpi = { label: string; value: number; share: number; icon: LucideIcon; tone: Tone; sum?: boolean }
type Slice = { label: string; value: number; tone: Tone }
/** 진도번호 처리결과(기준설정 화면과 같은 값). rate는 검수배정일 때만 의미가 있다. */
type ProgressStat = { stage: string; progress: number; route: RuleResult; total: number; review: number; corrected: number; rate: number }
type Composition = { total: number; auto: number; review: number; center: number }
type StageStat = Composition & { stage: string; corrected: number; rate: number; progresses: ProgressStat[] }
type SubjectStat = Composition & { subject: Subject; corrected: number; rate: number; stages: StageStat[]; overCount: number; reviewProgresses: number }
// 과목별 처리 구성의 표시 순서(기준설정 화면의 과목별 배정 비중과 같은 순서)
const subjectOrder: Subject[] = ['국어', '수학', '영어', '과학'].filter((item): item is Subject => (subjects as readonly string[]).includes(item))

export function DashboardPage() {
  // 대시보드는 선택한 기준월 단위로 집계한다(기준일이 속한 달은 기준일까지 누적).
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH)
  const { ruleSettings } = useAdminData()
  // 처리 구성·오류율: 저장된 배정 기준으로 과목·단계·진도번호를 한 번에 집계해 모든 영역이 같은 값을 쓴다.
  const subjectStats = useMemo(() => buildSubjectStats(ruleSettings, selectedMonth), [ruleSettings, selectedMonth])
  const month = subjectStats.reduce((sum, item) => ({ auto: sum.auto + item.auto, review: sum.review + item.review, center: sum.center + item.center }), { auto: 0, review: 0, center: 0 })
  const [errorSubject, setErrorSubject] = useState<Subject | null>(null)
  const [compositionSubject, setCompositionSubject] = useState<Subject | null>(null)
  const errorDetail = subjectStats.find((item) => item.subject === errorSubject)
  const compositionDetail = subjectStats.find((item) => item.subject === compositionSubject)

  // 오류율 = 검수후확정 중 검수교사가 수정한 장 수 / 검수후확정 × 100
  const monthCorrected = subjectStats.reduce((sum, item) => sum + item.corrected, 0)
  const monthReview = month.review
  const monthErrorRate = roundRate(percent(monthCorrected, monthReview))
  const worstSubject = subjectStats.reduce((worst, item) => item.rate > worst.rate ? item : worst, subjectStats[0])
  // 기준 초과 진도번호: 저장된 기준이 검수배정인 진도번호 중 기준월 오류율이 관리 기준을 넘는 수
  const overThreshold = {
    count: subjectStats.reduce((sum, item) => sum + item.overCount, 0),
    reviewProgresses: subjectStats.reduce((sum, item) => sum + item.reviewProgresses, 0),
  }
  const errorOk = monthErrorRate <= ERROR_RATE_THRESHOLD
  const barMax = Math.max(ERROR_RATE_THRESHOLD * 1.6, ...subjectStats.map((item) => item.rate))

  // 전체 = AI 자동채점 + 채점센터, AI 자동채점 = 자동확정 + 검수후확정
  const ai = month.auto + month.review
  const total = ai + month.center

  const totalKpis: Kpi[] = [
    { label: '전체', value: total, share: 100, icon: Layers3, tone: 'total', sum: true },
    { label: 'AI 자동채점', value: ai, share: percent(ai, total), icon: Sparkles, tone: 'ai' },
    { label: '채점센터', value: month.center, share: percent(month.center, total), icon: Building2, tone: 'center' },
  ]
  const aiKpis: Kpi[] = [
    { label: 'AI 자동채점', value: ai, share: 100, icon: Sparkles, tone: 'ai', sum: true },
    { label: '자동확정', value: month.auto, share: percent(month.auto, ai), icon: CheckCircle2, tone: 'auto' },
    { label: '검수후확정', value: month.review, share: percent(month.review, ai), icon: UserCheck, tone: 'review' },
  ]

  return <div className="page dashboard-page">
    <div className="dashboard-heading"><div><p>AI 자동채점 관리</p><h1>대시보드</h1><span>자동채점 운영 현황과 주요 지표를 월 단위로 확인합니다.</span></div></div>
    <div className="dashboard-section-head">
      <label className="dashboard-month-select">기준월<select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>{monthOptions.map((item) => <option key={item} value={item}>{monthLabel(item)}</option>)}</select></label>
    </div>
    <section className="dashboard-split">
      <SplitPanel
        title="전체 처리 구성"
        formula="전체 = AI 자동채점 + 채점센터"
        kpis={totalKpis}
        centerLabel="전체"
        slices={[{ label: 'AI 자동채점', value: ai, tone: 'ai' }, { label: '채점센터', value: month.center, tone: 'center' }]}
      />
      <SplitPanel
        title="AI 자동채점 구성"
        formula="AI 자동채점 = 자동확정 + 검수후확정"
        kpis={aiKpis}
        centerLabel="AI 자동채점"
        slices={[{ label: '자동확정', value: month.auto, tone: 'auto' }, { label: '검수후확정', value: month.review, tone: 'review' }]}
      />
    </section>
    <section className="dashboard-error-card">
      <header>
        <div><strong>오류율 모니터링</strong><span>검수후확정 중 검수교사가 AI 판정을 수정한 비율 · 기준월</span></div>
        <em>관리 기준 {ERROR_RATE_THRESHOLD.toFixed(1)}% 이하</em>
      </header>
      <div className="dashboard-error-tiles">
        <div className={`dashboard-error-tile ${errorOk ? 'is-ok' : 'is-alert'}`}>
          <div className="kpi-icon">{errorOk ? <ShieldCheck size={20}/> : <AlertTriangle size={20}/>}</div>
          <div><span>이번 달 오류율</span><strong>{monthErrorRate.toFixed(1)}%</strong><small>{errorOk ? '정상 · 기준 이하' : '주의 · 기준 초과'}</small></div>
        </div>
        <div className="dashboard-error-tile">
          <div className="kpi-icon"><PencilLine size={20}/></div>
          <div><span>수정 장수</span><strong>{number.format(monthCorrected)}장</strong><small>검수후확정 {number.format(monthReview)}장 중</small></div>
        </div>
        <div className={`dashboard-error-tile ${overThreshold.count > 0 ? 'is-warn' : 'is-ok'}`}>
          <div className="kpi-icon"><AlertTriangle size={20}/></div>
          <div><span>기준 초과 진도번호</span><strong>{number.format(overThreshold.count)}개</strong><small>검수배정 {number.format(overThreshold.reviewProgresses)}개 중 · {ERROR_RATE_THRESHOLD.toFixed(1)}% 초과</small></div>
        </div>
        <div className="dashboard-error-tile">
          <div className="kpi-icon"><Layers3 size={20}/></div>
          <div><span>가장 높은 과목</span><strong>{worstSubject?.subject ?? '-'}</strong><small>오류율 {worstSubject ? worstSubject.rate.toFixed(1) : '0.0'}%</small></div>
        </div>
      </div>
      <div className="dashboard-error-subjects">
        <div className="dashboard-error-subjects-title">과목별 오류율 <small>점선 = 관리 기준 {ERROR_RATE_THRESHOLD.toFixed(1)}% · 막대를 누르면 단계·진도번호별 상세</small></div>
        {subjectStats.map((item) => (
          <button type="button" className="dashboard-error-row" key={item.subject} onClick={() => setErrorSubject(item.subject)} aria-label={`${item.subject} 오류율 상세 보기`}>
            <strong>{item.subject}</strong>
            <div className="dashboard-error-track" role="img" aria-label={`${item.subject} 오류율 ${item.rate.toFixed(1)}%`}>
              <i className={item.rate > ERROR_RATE_THRESHOLD ? 'over' : ''} style={{ width: `${item.rate / barMax * 100}%` }}/>
              <b style={{ left: `${ERROR_RATE_THRESHOLD / barMax * 100}%` }}/>
            </div>
            <span className={`dashboard-error-value ${item.rate > ERROR_RATE_THRESHOLD ? 'over' : ''}`}>수정 {number.format(item.corrected)}장 · <b>{item.rate.toFixed(1)}%</b><ChevronRight size={15}/></span>
          </button>
        ))}
      </div>
    </section>
    <section className="dashboard-subject-card">
      <header>
        <div><strong>과목별 처리 구성 <small>(답안 장수)</small></strong><span>기준월에 처리된 답안지를 저장된 배정 기준으로 나눈 비중 · 막대를 누르면 단계·진도번호별 상세</span></div>
        <ul>
          {(['auto', 'review', 'center'] as const).map((tone) => <li key={tone}><i style={{ background: toneColors[tone] }}/>{tone === 'auto' ? '자동확정' : tone === 'review' ? '검수후확정' : '채점센터'}</li>)}
        </ul>
      </header>
      <div className="dashboard-subject-rows">
        {subjectStats.map((row) => (
          <button type="button" className="dashboard-subject-row" key={row.subject} onClick={() => setCompositionSubject(row.subject)} aria-label={`${row.subject} 처리 구성 상세 보기`}>
            <strong>{row.subject}</strong>
            <div className="dashboard-subject-bar" role="img" aria-label={`${row.subject} 자동확정 ${percent(row.auto, row.total).toFixed(1)}%, 검수후확정 ${percent(row.review, row.total).toFixed(1)}%, 채점센터 ${percent(row.center, row.total).toFixed(1)}%`}>
              {(['auto', 'review', 'center'] as const).map((tone) => {
                const share = percent(row[tone], row.total)
                return <span key={tone} className={`segment-${tone}`} style={{ width: `${share}%`, background: toneColors[tone] }}>{share >= 8 ? `${share.toFixed(0)}%` : ''}</span>
              })}
            </div>
            <span className="dashboard-subject-total">{number.format(row.total)}장 · <b>AI {percent(row.auto + row.review, row.total).toFixed(1)}%</b><ChevronRight size={15}/></span>
          </button>
        ))}
      </div>
    </section>
    {errorDetail && <ErrorDetailModal key={`${errorDetail.subject}-${selectedMonth}`} detail={errorDetail} month={selectedMonth} onClose={() => setErrorSubject(null)}/>}
    {compositionDetail && <CompositionDetailModal key={`${compositionDetail.subject}-${selectedMonth}`} detail={compositionDetail} month={selectedMonth} onClose={() => setCompositionSubject(null)}/>}
  </div>
}

// 과목·단계·진도번호 처리 구성과 오류율.
// - 단계 장 수: 대시보드 실적(performanceData)의 단계별 제출량
// - 구성: 단계 장 수를 저장된 배정별 진도번호 처리량 비중으로 나눈다(기준설정 배정이 바뀌면 함께 바뀜)
// - 오류율: 검수배정 진도번호의 처리결과(progressResults)로 계산. 진도번호 값은 기준설정 화면과 같다.
// 프로토타입은 두 mock의 장 수 규모가 다르다(진도번호 장 수 = 기준설정 처리결과 규모). 실제 서비스는 같은 집계 API에서 내려받는다.
function buildSubjectStats(ruleSettings: RuleSettings, month: string): SubjectStat[] {
  const start = `${month}-01`
  const end = monthEnd(month)
  const monthRows = performanceData.filter((row) => row.date >= start && row.date <= end)
  return subjectOrder.map((subject) => {
    let overCount = 0
    let reviewProgresses = 0
    const stages = curriculumStages[subject].map((stage): StageStat => {
      const stageSettings = ruleSettings[stageKey(subject, stage)] ?? {}
      const progresses = progressNumbers.map((progress): ProgressStat => {
        const route = effectiveResult(stageSettings[progress])
        const result = getProgressResult(subject, stage, progress, stageSettings[progress], start, end)
        const rate = route === '검수후확정' ? roundRate(percent(result.corrected, result.review)) : 0
        if (route === '검수후확정') {
          reviewProgresses += 1
          if (result.review > 0 && rate > ERROR_RATE_THRESHOLD) overCount += 1
        }
        return { stage, progress, route, total: result.total, review: result.review, corrected: result.corrected, rate }
      })
      const routeVolume = (route: RuleResult) => progresses.filter((item) => item.route === route).reduce((sum, item) => sum + item.total, 0)
      const rawTotal = progresses.reduce((sum, item) => sum + item.total, 0)
      const rawReview = routeVolume('검수후확정')
      const rawCorrected = progresses.reduce((sum, item) => sum + item.corrected, 0)
      const total = monthRows.filter((row) => row.subject === subject && row.stage === stage).reduce((sum, row) => sum + row.total, 0)
      const auto = rawTotal ? Math.round(total * routeVolume('자동확정') / rawTotal) : 0
      const review = rawTotal ? Math.round(total * rawReview / rawTotal) : 0
      const center = total - auto - review
      const corrected = rawReview ? Math.round(review * rawCorrected / rawReview) : 0
      return { stage, total, auto, review, center, corrected, rate: roundRate(percent(corrected, review)), progresses }
    })
    const sum = (key: 'total' | 'auto' | 'review' | 'center' | 'corrected') => stages.reduce((value, item) => value + item[key], 0)
    const review = sum('review')
    const corrected = sum('corrected')
    return { subject, total: sum('total'), auto: sum('auto'), review, center: sum('center'), corrected, rate: roundRate(percent(corrected, review)), stages, overCount, reviewProgresses }
  })
}

const TOP_PROGRESS_COUNT = 10

// 과목 오류율 상세 팝업: 단계별 오류율과 오류율 높은 진도번호
function ErrorDetailModal({ detail, month, onClose }: { detail: SubjectStat; month: string; onClose: () => void }) {
  const navigate = useNavigate()
  const [stageFilter, setStageFilter] = useState('전체')
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const over = detail.rate > ERROR_RATE_THRESHOLD
  const stageMax = Math.max(ERROR_RATE_THRESHOLD * 1.6, ...detail.stages.map((item) => item.rate))
  const topRows = detail.stages
    .flatMap((item) => item.progresses)
    .filter((item) => item.route === '검수후확정' && item.review > 0 && (stageFilter === '전체' || item.stage === stageFilter))
    .sort((a, b) => b.rate - a.rate || b.corrected - a.corrected)
    .slice(0, TOP_PROGRESS_COUNT)
  // 기준설정은 단계 단위 화면이라, 단계를 고르지 않았으면 오류율이 가장 높은 진도번호의 단계로 이동한다.
  const targetStage = stageFilter !== '전체' ? stageFilter : topRows[0]?.stage ?? detail.stages[0]?.stage
  const goStandards = () => {
    const state: StandardsLinkState = { subject: detail.subject, stage: targetStage, period: { start: `${month}-01`, end: monthEnd(month) }, sortKey: 'errorRate', from: '대시보드 오류율 상세' }
    navigate('/standards', { state })
  }

  return <div className="reviewer-modal-backdrop" onClick={onClose}>
    <div className="dashboard-error-modal" role="dialog" aria-modal="true" aria-labelledby="dashboard-error-modal-title" onClick={(event) => event.stopPropagation()}>
      <header>
        <div>
          <h2 id="dashboard-error-modal-title">{detail.subject} 오류율 상세 <em className={over ? 'over' : 'ok'}>{over ? '주의' : '정상'}</em></h2>
          <p>{monthLabel(month)} · 관리 기준 {ERROR_RATE_THRESHOLD.toFixed(1)}% · 검수배정 진도번호 기준</p>
        </div>
        <button type="button" aria-label="닫기" onClick={onClose}><X size={18}/></button>
      </header>
      <div className="dashboard-error-modal-tiles">
        <div className={over ? 'over' : ''}><span>오류율</span><strong>{detail.rate.toFixed(1)}%</strong></div>
        <div><span>수정 장수</span><strong>{number.format(detail.corrected)}장</strong></div>
        <div><span>검수후확정</span><strong>{number.format(detail.review)}장</strong></div>
        <div><span>기준 초과 진도번호</span><strong>{number.format(detail.overCount)}개</strong><small>검수배정 {number.format(detail.reviewProgresses)}개 중</small></div>
      </div>
      <section className="dashboard-error-modal-stages">
        <h3>단계별 오류율 <small>단계를 누르면 아래 목록이 그 단계로 바뀝니다</small></h3>
        {detail.stages.map((item) => {
          const stageOver = item.rate > ERROR_RATE_THRESHOLD
          return <button type="button" key={item.stage} className={`dashboard-error-stage ${stageFilter === item.stage ? 'is-selected' : ''}`} onClick={() => setStageFilter(stageFilter === item.stage ? '전체' : item.stage)}>
            <strong>{item.stage}</strong>
            <div className="dashboard-error-track" role="img" aria-label={`${item.stage} 오류율 ${item.rate.toFixed(1)}%`}>
              <i className={stageOver ? 'over' : ''} style={{ width: `${item.rate / stageMax * 100}%` }}/>
              <b style={{ left: `${ERROR_RATE_THRESHOLD / stageMax * 100}%` }}/>
            </div>
            <span className={`dashboard-error-value ${stageOver ? 'over' : ''}`}>수정 {number.format(item.corrected)}장 · <b>{item.rate.toFixed(1)}%</b></span>
          </button>
        })}
      </section>
      <section className="dashboard-error-modal-progress">
        <div className="dashboard-error-modal-progress-head">
          <h3>오류율 높은 진도번호 <small>상위 {TOP_PROGRESS_COUNT}개 · 오류율 높은 순 · 기준설정 처리결과 기준</small></h3>
          <label>단계<select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}><option>전체</option>{detail.stages.map((item) => <option key={item.stage}>{item.stage}</option>)}</select></label>
        </div>
        <div className="dashboard-error-modal-table">
          <table>
            <thead><tr><th>단계</th><th>진도번호</th><th>검수후확정</th><th>수정</th><th>오류율</th></tr></thead>
            <tbody>
              {topRows.map((row) => (
                <tr key={`${row.stage}-${row.progress}`}>
                  <td>{row.stage}</td>
                  <td>{row.progress}</td>
                  <td>{number.format(row.review)}</td>
                  <td>{number.format(row.corrected)}</td>
                  <td className={row.rate > ERROR_RATE_THRESHOLD ? 'over' : ''}>{row.rate.toFixed(1)}%</td>
                </tr>
              ))}
              {topRows.length === 0 && <tr><td colSpan={5} className="empty">검수배정 진도번호가 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <footer>
        <button type="button" className="primary" onClick={goStandards} disabled={!targetStage}>기준설정에서 보기 ({detail.subject} {targetStage}) <ArrowRight size={15}/></button>
        <button type="button" onClick={onClose}>닫기</button>
      </footer>
    </div>
  </div>
}

const compositionTones = ['auto', 'review', 'center'] as const
const toneLabels: Record<(typeof compositionTones)[number], string> = { auto: '자동확정', review: '검수후확정', center: '채점센터' }
const routeTone: Record<RuleResult, (typeof compositionTones)[number]> = { 자동확정: 'auto', 검수후확정: 'review', 채점센터: 'center' }

// 과목 처리 구성 상세 팝업: 단계별 구성과 처리량 많은 진도번호(기본: 채점배정 = AI 전환 후보)
function CompositionDetailModal({ detail, month, onClose }: { detail: SubjectStat; month: string; onClose: () => void }) {
  const navigate = useNavigate()
  const [stageFilter, setStageFilter] = useState('전체')
  const [routeFilter, setRouteFilter] = useState<RuleResult | '전체'>('채점센터')
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const allProgresses = detail.stages.flatMap((item) => item.progresses)
  const topRows = allProgresses
    .filter((item) => (routeFilter === '전체' || item.route === routeFilter) && (stageFilter === '전체' || item.stage === stageFilter))
    .sort((a, b) => b.total - a.total)
    .slice(0, TOP_PROGRESS_COUNT)
  const targetStage = stageFilter !== '전체' ? stageFilter : topRows[0]?.stage ?? detail.stages[0]?.stage
  const goStandards = () => {
    const state: StandardsLinkState = { subject: detail.subject, stage: targetStage, period: { start: `${month}-01`, end: monthEnd(month) }, sortKey: 'total', from: '대시보드 처리 구성 상세' }
    navigate('/standards', { state })
  }

  return <div className="reviewer-modal-backdrop" onClick={onClose}>
    <div className="dashboard-error-modal dashboard-subject-modal" role="dialog" aria-modal="true" aria-labelledby="dashboard-subject-modal-title" onClick={(event) => event.stopPropagation()}>
      <header>
        <div>
          <h2 id="dashboard-subject-modal-title">{detail.subject} 처리 구성 상세</h2>
          <p>{monthLabel(month)} · 답안 장수 기준 · 저장된 배정 기준</p>
        </div>
        <button type="button" aria-label="닫기" onClick={onClose}><X size={18}/></button>
      </header>
      <div className="dashboard-error-modal-tiles">
        <div><span>전체</span><strong>{number.format(detail.total)}장</strong><small>AI <b>{percent(detail.auto + detail.review, detail.total).toFixed(1)}%</b></small></div>
        {compositionTones.map((tone) => (
          <div key={tone}><span>{toneLabels[tone]}</span><strong>{number.format(detail[tone])}장</strong><small>{percent(detail[tone], detail.total).toFixed(1)}%</small></div>
        ))}
      </div>
      <section className="dashboard-error-modal-stages">
        <div className="dashboard-subject-modal-head">
          <h3>단계별 처리 구성 <small>단계를 누르면 아래 목록이 그 단계로 바뀝니다</small></h3>
          <ul className="dashboard-subject-modal-legend">{compositionTones.map((tone) => <li key={tone}><i style={{ background: toneColors[tone] }}/>{toneLabels[tone]}</li>)}</ul>
        </div>
        {detail.stages.map((item) => (
          <button type="button" key={item.stage} className={`dashboard-error-stage ${stageFilter === item.stage ? 'is-selected' : ''}`} onClick={() => setStageFilter(stageFilter === item.stage ? '전체' : item.stage)}>
            <strong>{item.stage}</strong>
            <div className="dashboard-subject-bar" role="img" aria-label={compositionTones.map((tone) => `${toneLabels[tone]} ${percent(item[tone], item.total).toFixed(1)}%`).join(', ')}>
              {compositionTones.map((tone) => {
                const share = percent(item[tone], item.total)
                return <span key={tone} className={`segment-${tone}`} style={{ width: `${share}%`, background: toneColors[tone] }}>{share >= 10 ? `${share.toFixed(0)}%` : ''}</span>
              })}
            </div>
            <span className="dashboard-error-value">{number.format(item.total)}장 · <b>AI {percent(item.auto + item.review, item.total).toFixed(0)}%</b></span>
          </button>
        ))}
      </section>
      <section className="dashboard-error-modal-progress">
        <div className="dashboard-error-modal-progress-head">
          <h3>처리량 많은 진도번호 <small>상위 {TOP_PROGRESS_COUNT}개 · 전체 제출 많은 순 · 기준설정 처리결과 기준</small></h3>
          <div className="dashboard-subject-modal-filters">
            <label>배정<select value={routeFilter} onChange={(event) => setRouteFilter(event.target.value as RuleResult | '전체')}><option value="전체">전체</option>{(['자동확정', '검수후확정', '채점센터'] as RuleResult[]).map((route) => <option key={route} value={route}>{resultLabels[route]}</option>)}</select></label>
            <label>단계<select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}><option>전체</option>{detail.stages.map((item) => <option key={item.stage}>{item.stage}</option>)}</select></label>
          </div>
        </div>
        <div className="dashboard-error-modal-table">
          <table>
            <thead><tr><th>단계</th><th>진도번호</th><th>배정</th><th>전체 제출</th></tr></thead>
            <tbody>
              {topRows.map((row) => (
                <tr key={`${row.stage}-${row.progress}`}>
                  <td>{row.stage}</td>
                  <td>{row.progress}</td>
                  <td><span className={`dashboard-route-pill route-${routeTone[row.route]}`}>{resultLabels[row.route]}</span></td>
                  <td>{number.format(row.total)}</td>
                </tr>
              ))}
              {topRows.length === 0 && <tr><td colSpan={4} className="empty">조건에 맞는 진도번호가 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <footer>
        <button type="button" className="primary" onClick={goStandards} disabled={!targetStage}>기준설정에서 보기 ({detail.subject} {targetStage}) <ArrowRight size={15}/></button>
        <button type="button" onClick={onClose}>닫기</button>
      </footer>
    </div>
  </div>
}

// 파스텔 팔레트: 자동확정=민트, 검수후확정=라벤더, 채점센터=피치, AI 자동채점=하늘, 전체=슬레이트
const toneColors: Record<Tone, string> = { total: '#a9b4c4', ai: '#9cc2ea', center: '#f5cba7', auto: '#8fd0bd', review: '#c3b5ec' }

function SplitPanel({ title, formula, kpis, centerLabel, slices }: { title: string; formula: string; kpis: Kpi[]; centerLabel: string; slices: Slice[] }) {
  const sum = slices.reduce((value, slice) => value + slice.value, 0)
  const first = percent(slices[0].value, sum)
  const gradient = `conic-gradient(${toneColors[slices[0].tone]} 0 ${first}%, ${toneColors[slices[1].tone]} ${first}% 100%)`
  return <article className="dashboard-split-panel">
    <header><strong>{title}</strong><small>{formula}</small></header>
    <div className="dashboard-split-body">
      <div className="dashboard-kpi-stack">
        {kpis.map(({ icon: Icon, ...item }) => (
          <div className={`kpi-card dashboard-kpi-${item.tone} ${item.sum ? 'is-sum' : ''}`} key={item.label}>
            <div className="kpi-icon"><Icon size={20}/></div>
            <div><span>{item.label}</span><strong>{number.format(item.value)}장</strong><small>{item.share.toFixed(1)}%</small></div>
          </div>
        ))}
      </div>
      <div className="dashboard-pie">
        <div className="dashboard-pie-chart" style={{ background: gradient }} role="img" aria-label={slices.map((slice) => `${slice.label} ${percent(slice.value, sum).toFixed(1)}%`).join(', ')}>
          <span><small>{centerLabel}</small><strong>{number.format(sum)}</strong></span>
        </div>
        <ul>
          {slices.map((slice) => (
            <li key={slice.label}><i style={{ background: toneColors[slice.tone] }}/><span>{slice.label}</span><strong>{percent(slice.value, sum).toFixed(1)}%</strong></li>
          ))}
        </ul>
      </div>
    </div>
  </article>
}
