import { Building2, CheckCircle2, Layers3, Sparkles, UserCheck, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { subjects, TODAY, type Subject } from '../data/curriculum'
import { performanceData } from '../data/performance'

const number = new Intl.NumberFormat('ko-KR')
// 기준월 선택지: 기준일(TODAY)이 속한 해의 1월 ~ 기준일이 속한 달
const currentMonth = TODAY.slice(0, 7)
const monthOptions = Array.from({ length: Number(TODAY.slice(5, 7)) }, (_, index) => `${TODAY.slice(0, 4)}-${String(index + 1).padStart(2, '0')}`)
const monthLabel = (month: string) => `${Number(month.slice(0, 4))}년 ${Number(month.slice(5, 7))}월`
const percent = (value: number, base: number) => base ? value / base * 100 : 0

type Tone = 'total' | 'ai' | 'center' | 'auto' | 'review'
/** share: 기준 대비 비율(%), sum: 아래 두 박스의 합계 박스 여부 */
type Kpi = { label: string; value: number; share: number; icon: LucideIcon; tone: Tone; sum?: boolean }
type Slice = { label: string; value: number; tone: Tone }
// 과목별 처리 구성의 표시 순서(기준설정 화면의 과목별 배정 비중과 같은 순서)
const subjectOrder: Subject[] = ['국어', '수학', '영어', '과학'].filter((item): item is Subject => (subjects as readonly string[]).includes(item))

export function DashboardPage() {
  // 대시보드는 선택한 기준월 단위로 집계한다(기준일이 속한 달은 기준일까지 누적).
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const month = performanceData
    .filter((row) => row.date.startsWith(selectedMonth) && row.date <= TODAY)
    .reduce((sum, row) => ({
      auto: sum.auto + row.autoConfirmed,
      review: sum.review + row.reviewConfirmed,
      center: sum.center + row.gradingCenter,
    }), { auto: 0, review: 0, center: 0 })

  // 과목별 처리 구성: 같은 기준월의 실제 처리 답안 장수
  const subjectRows = subjectOrder.map((subject) => {
    const sums = performanceData
      .filter((row) => row.subject === subject && row.date.startsWith(selectedMonth) && row.date <= TODAY)
      .reduce((sum, row) => ({ auto: sum.auto + row.autoConfirmed, review: sum.review + row.reviewConfirmed, center: sum.center + row.gradingCenter }), { auto: 0, review: 0, center: 0 })
    return { subject, ...sums, total: sums.auto + sums.review + sums.center }
  })

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
    <section className="dashboard-subject-card">
      <header>
        <div><strong>과목별 처리 구성 <small>(답안 장수)</small></strong><span>기준월에 실제 처리된 답안지를 과목별로 나눈 비중</span></div>
        <ul>
          {(['auto', 'review', 'center'] as const).map((tone) => <li key={tone}><i style={{ background: toneColors[tone] }}/>{tone === 'auto' ? '자동확정' : tone === 'review' ? '검수후확정' : '채점센터'}</li>)}
        </ul>
      </header>
      <div className="dashboard-subject-rows">
        {subjectRows.map((row) => (
          <div className="dashboard-subject-row" key={row.subject}>
            <strong>{row.subject}</strong>
            <div className="dashboard-subject-bar" role="img" aria-label={`${row.subject} 자동확정 ${percent(row.auto, row.total).toFixed(1)}%, 검수후확정 ${percent(row.review, row.total).toFixed(1)}%, 채점센터 ${percent(row.center, row.total).toFixed(1)}%`}>
              {(['auto', 'review', 'center'] as const).map((tone) => {
                const share = percent(row[tone], row.total)
                return <span key={tone} className={`segment-${tone}`} style={{ width: `${share}%`, background: toneColors[tone] }}>{share >= 8 ? `${share.toFixed(0)}%` : ''}</span>
              })}
            </div>
            <span className="dashboard-subject-total">{number.format(row.total)}장 · <b>AI {percent(row.auto + row.review, row.total).toFixed(1)}%</b></span>
          </div>
        ))}
      </div>
    </section>
  </div>
}

const toneColors: Record<Tone, string> = { total: '#1d3555', ai: '#376fba', center: '#a5b9d0', auto: '#2f5f9e', review: '#77a4d8' }

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
