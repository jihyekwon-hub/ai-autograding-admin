import { BarChart3, Check, CheckCircle2, Plus, RotateCcw, Save, Search, Settings2, ShieldCheck, Trash2, UserCheck, Warehouse } from 'lucide-react'
import { useMemo, useState } from 'react'
import { operationSubjects, type OperationRule, type OperationSubject, type RuleResult } from '../data/operationRules'
import { progressNumbers } from '../data/curriculum'
import { useAdminData } from '../contexts/adminStore'

type RuleContext = {
  subject: OperationSubject
  stage: string
  progressFrom: number
  progressTo: number
}

const number = new Intl.NumberFormat('ko-KR')

function conditionText(rule: OperationRule) {
  if (rule.minLp === null || rule.maxLp === null) return `${rule.answer} · LP 전체`
  return `${rule.answer} · LP ${rule.minLp}~${rule.maxLp}`
}

export function OperationRulePage() {
  const { operation, setOperation, addHistory } = useAdminData()
  const [context, setContext] = useState<RuleContext>({ subject: operation.subject, stage: operation.stage, progressFrom: operation.progressFrom, progressTo: operation.progressTo })
  const [appliedContext, setAppliedContext] = useState<RuleContext>({ subject: operation.subject, stage: operation.stage, progressFrom: operation.progressFrom, progressTo: operation.progressTo })
  const [draftRules, setDraftRules] = useState<OperationRule[]>(operation.rules)
  const [savedRules, setSavedRules] = useState<OperationRule[]>(operation.rules)
  const [savedAt, setSavedAt] = useState(operation.savedAt)
  const [savedMessage, setSavedMessage] = useState(false)
  const [validationMessage, setValidationMessage] = useState('')

  const stages = operationSubjects[context.subject]
  const rangeCount = Math.max(1, context.progressTo - context.progressFrom + 1)

  const impact = useMemo(() => {
    const result: Record<RuleResult, number> = { 자동확정: 0, 검수후확정: 0, 채점센터: 0 }
    const baseVolumes = [0, 1624, 1078, 414, 322]
    draftRules.forEach((rule) => {
      if (rule.enabled) result[rule.result] += Math.round((baseVolumes[rule.id] ?? 520 + rule.id * 80) * (rangeCount / 30))
    })
    return result
  }, [draftRules, rangeCount])

  const totalImpact = impact.자동확정 + impact.검수후확정 + impact.채점센터

  const updateRule = (id: number, patch: Partial<OperationRule>) => {
    setDraftRules((rules) => rules.map((rule) => rule.id === id ? { ...rule, ...patch } : rule))
    setSavedMessage(false)
    setValidationMessage('')
  }

  const addRule = () => setDraftRules((rules) => [...rules, { id: Math.max(0, ...rules.map((rule) => rule.id)) + 1, answer: '정답', minLp: 0, maxLp: 100, result: '검수후확정', enabled: true }])
  const deleteRule = (id: number) => setDraftRules((rules) => rules.filter((rule) => rule.id !== id).map((rule, index) => ({ ...rule, id: index + 1 })))

  const applyContext = () => {
    setAppliedContext(context)
    setSavedMessage(false)
  }

  const saveRules = () => {
    const invalidRange = draftRules.some((rule) => rule.minLp === null || rule.maxLp === null || rule.minLp < 0 || rule.maxLp > 100 || rule.minLp > rule.maxLp)
    const duplicate = draftRules.some((rule, index) => draftRules.some((other, otherIndex) => otherIndex !== index && rule.answer === other.answer && rule.minLp === other.minLp && rule.maxLp === other.maxLp))
    if (invalidRange || duplicate || context.progressFrom > context.progressTo) { setValidationMessage(invalidRange ? 'LP 범위는 0~100이며 최솟값이 최댓값보다 클 수 없습니다.' : duplicate ? '동일한 채점 결과와 LP 범위가 중복되었습니다.' : '진도번호 범위를 확인해주세요.'); return }
    const before = savedRules.map(conditionText).join(' / '); const after = draftRules.map(conditionText).join(' / ')
    setSavedRules(draftRules.map((rule) => ({ ...rule })))
    setAppliedContext(context)
    const timestamp = '2026-11-16 14:30'; setSavedAt(timestamp)
    setOperation({ ...context, rules: draftRules.map((rule) => ({ ...rule })), savedAt: timestamp })
    addHistory({ type: '운영기준 변경', subtype: 'Rule 저장', subject: context.subject, stage: context.stage, scope: `${context.subject} / ${context.stage} / ${context.progressFrom}~${context.progressTo}`, title: '운영기준 Rule 변경', before, after, worker: '운영관리자(admin)', note: '운영기준 설정 화면에서 저장', targetKey: `RULE-${context.subject}-${context.stage}-${context.progressFrom}-${context.progressTo}` })
    setSavedMessage(true)
    setValidationMessage('')
  }

  const resetRules = () => {
    setDraftRules(savedRules.map((rule) => ({ ...rule })))
    setSavedMessage(false)
  }

  const distribution = Array.from({ length: Math.min(10, rangeCount) }, (_, index) => ({
    label: context.progressFrom + index,
    value: Math.max(420, 1180 - index * 72 + (index % 3) * 110),
  }))

  return (
    <div className="page operation-rule-page">
      <div className="operation-heading"><div><p>AI 자동채점 관리</p><h1>운영기준 설정</h1><span>과목·단계·진도번호별 자동채점 처리 기준을 설정합니다.</span></div></div>

      <section className="operation-context-card" aria-label="운영기준 조회 조건">
        <div className="operation-context-fields">
          <label>과목<select value={context.subject} onChange={(event) => { const subject = event.target.value as OperationSubject; setContext({ ...context, subject, stage: operationSubjects[subject][0] }) }}>{Object.keys(operationSubjects).map((subject) => <option key={subject}>{subject}</option>)}</select></label>
          <label>단계<select value={context.stage} onChange={(event) => setContext({ ...context, stage: event.target.value })}>{stages.map((stage) => <option key={stage}>{stage}</option>)}</select></label>
          <div className="operation-progress-fields"><label>시작 진도번호<select value={String(context.progressFrom)} onChange={(event) => { const value = Number(event.target.value); setContext({ ...context, progressFrom: value, progressTo: Math.max(value, context.progressTo) }) }}>{progressNumbers.map((value) => <option key={value}>{value}</option>)}</select></label><span>~</span><label>종료 진도번호<select value={String(context.progressTo)} onChange={(event) => setContext({ ...context, progressTo: Number(event.target.value) })}>{progressNumbers.filter((value) => value >= context.progressFrom).map((value) => <option key={value}>{value}</option>)}</select></label></div>
        </div>
        <div className="operation-context-summary"><span>현재 조회</span><strong>{appliedContext.subject} · {appliedContext.stage} · {appliedContext.progressFrom}~{appliedContext.progressTo}번</strong></div>
        <button type="button" onClick={applyContext}><Search size={15} /> 조회 적용</button>
      </section>

      <div className="operation-main-grid">
        <section className="operation-panel rule-editor-panel">
          <div className="operation-panel-heading"><div><Settings2 size={18} /><span><strong>분기 기준 설정</strong><small>정답 여부와 LP 값을 조합해 처리방식을 설정합니다.</small></span></div><button type="button" className="operation-add-rule" onClick={addRule}><Plus size={14}/> 기준 추가</button></div>
          <div className="rule-help"><ShieldCheck size={16} /> 위에서부터 순서대로 조건을 확인하며, 첫 번째로 일치한 규칙의 처리 결과를 적용합니다.</div>
          <div className="rule-editor-header"><span>순서</span><span>채점 결과</span><span>LP 최솟값</span><span>LP 최댓값</span><span>처리 결과</span><span>사용</span></div>
          <div className="rule-editor-list">
            {draftRules.map((rule) => (
              <div className="rule-editor-row" key={rule.id}>
                <b>{rule.id}</b>
                <select value={rule.answer} onChange={(event) => updateRule(rule.id, { answer: event.target.value as OperationRule['answer'], minLp: rule.minLp ?? 0, maxLp: rule.maxLp ?? 100 })}><option>정답</option><option>오답</option></select>
                <input aria-label={`${rule.id}번 규칙 LP 최솟값`} type="number" min="0" max="100" value={rule.minLp ?? 0} onChange={(event) => updateRule(rule.id, { minLp: Number(event.target.value) })} />
                <input aria-label={`${rule.id}번 규칙 LP 최댓값`} type="number" min="0" max="100" value={rule.maxLp ?? 100} onChange={(event) => updateRule(rule.id, { maxLp: Number(event.target.value) })} />
                <select className={`result-select result-${rule.result}`} value={rule.result} onChange={(event) => updateRule(rule.id, { result: event.target.value as RuleResult })}><option>자동확정</option><option>검수후확정</option><option>채점센터</option></select>
                <div className="rule-enabled-actions"><label className="rule-toggle"><input type="checkbox" checked={rule.enabled} onChange={(event) => updateRule(rule.id, { enabled: event.target.checked })} /><span /></label><button type="button" aria-label={`${rule.id}번 규칙 삭제`} onClick={() => deleteRule(rule.id)}><Trash2 size={13}/></button></div>
              </div>
            ))}
          </div>
          <div className="rule-editor-footer">
            <div>{validationMessage ? <span className="operation-validation">{validationMessage}</span> : savedMessage ? <span className="save-confirmation"><Check size={15} /> 저장된 기준이 화면에 반영되었습니다.</span> : <span>마지막 저장: {savedAt}</span>}</div>
            <div><button type="button" className="operation-reset-button" onClick={resetRules}><RotateCcw size={15} /> 되돌리기</button><button type="button" className="operation-save-button" onClick={saveRules}><Save size={15} /> 기준 저장</button></div>
          </div>
        </section>

        <section className="operation-panel impact-panel">
          <div className="operation-panel-heading"><div><BarChart3 size={18} /><span><strong>예상 영향 분석</strong><small>현재 설정을 적용했을 때의 예상 처리 물량</small></span></div></div>
          <div className="impact-kpis">
            <article><CheckCircle2 size={19} /><span>자동확정<strong>{number.format(impact.자동확정)}장</strong><small>{totalImpact ? ((impact.자동확정 / totalImpact) * 100).toFixed(1) : '0.0'}%</small></span></article>
            <article><UserCheck size={19} /><span>검수후확정<strong>{number.format(impact.검수후확정)}장</strong><small>{totalImpact ? ((impact.검수후확정 / totalImpact) * 100).toFixed(1) : '0.0'}%</small></span></article>
            <article><Warehouse size={19} /><span>채점센터<strong>{number.format(impact.채점센터)}장</strong><small>{totalImpact ? ((impact.채점센터 / totalImpact) * 100).toFixed(1) : '0.0'}%</small></span></article>
          </div>
          <div className="impact-charts">
            <div className="progress-volume-chart"><h3>진도번호별 예상 물량</h3><div>{distribution.map((item) => <span key={item.label}><b>{number.format(item.value)}</b><i style={{ height: `${(item.value / 1300) * 100}%` }} /><small>{item.label}</small></span>)}</div></div>
            <div className="impact-donut-wrap"><div className="impact-donut" style={{ background: `conic-gradient(#376fba 0 ${totalImpact ? impact.자동확정 / totalImpact * 100 : 0}%, #77a4d8 ${totalImpact ? impact.자동확정 / totalImpact * 100 : 0}% ${totalImpact ? (impact.자동확정 + impact.검수후확정) / totalImpact * 100 : 0}%, #b2c1d2 ${totalImpact ? (impact.자동확정 + impact.검수후확정) / totalImpact * 100 : 0}% 100%)` }}><span><strong>{number.format(totalImpact)}</strong>예상 물량</span></div></div>
          </div>
        </section>
      </div>

      <section className="operation-panel applied-rules-panel">
        <div className="operation-panel-heading"><div><ShieldCheck size={18} /><span><strong>현재 적용 중인 운영기준</strong><small>저장된 과목·단계·진도번호별 처리 기준입니다.</small></span></div><div className="applied-context-badge">{appliedContext.subject} · {appliedContext.stage} · {appliedContext.progressFrom}~{appliedContext.progressTo}번</div></div>
        <div className="operation-table-wrap"><table className="operation-table"><thead><tr><th>순서</th><th>과목</th><th>단계</th><th>진도번호</th><th>적용 조건</th><th>처리 결과</th><th>사용 여부</th><th>마지막 수정</th><th>수정자</th></tr></thead><tbody>{savedRules.map((rule) => <tr key={rule.id}><td>{rule.id}</td><td>{appliedContext.subject}</td><td>{appliedContext.stage}</td><td>{appliedContext.progressFrom}~{appliedContext.progressTo}</td><td><strong>{conditionText(rule)}</strong></td><td><span className={`result-badge result-${rule.result}`}>{rule.result}</span></td><td>{rule.enabled ? '사용' : '미사용'}</td><td>{savedAt}</td><td>운영관리자</td></tr>)}</tbody></table></div>
      </section>
    </div>
  )
}
