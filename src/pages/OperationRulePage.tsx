import { Check, Plus, Save, Search, Settings2, ShieldCheck, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { operationSubjects, ruleResults, ruleSetKey, type AppliedRuleSet, type OperationRule, type OperationSubject, type RuleResult } from '../data/operationRules'
import { curriculumStages, progressNumbers, subjects, TODAY } from '../data/curriculum'
import { useAdminData } from '../contexts/adminStore'

type RuleContext = {
  subject: OperationSubject
  stage: string
  progressFrom: number
  progressTo: number
}

function conditionText(rule: OperationRule) {
  if (rule.minLp === null || rule.maxLp === null) return `${rule.answer} · LP 전체`
  return `${rule.answer} · LP ${rule.minLp}~${rule.maxLp}`
}

const rangeText = (from: string | number, to: string | number) => from === to ? String(from) : `${from}~${to}`

function compareRuleRows(a: { set: AppliedRuleSet; rule: OperationRule }, b: { set: AppliedRuleSet; rule: OperationRule }) {
  return subjects.indexOf(a.set.subject) - subjects.indexOf(b.set.subject)
    || curriculumStages[a.set.subject].indexOf(a.set.stageFrom) - curriculumStages[b.set.subject].indexOf(b.set.stageFrom)
    || a.set.progressFrom - b.set.progressFrom
    || a.set.progressTo - b.set.progressTo
    || a.rule.answer.localeCompare(b.rule.answer)
    || (b.rule.minLp ?? 0) - (a.rule.minLp ?? 0)
}

export function OperationRulePage() {
  const { operation, setOperation, ruleSets, setRuleSets, addHistory } = useAdminData()
  const [context, setContext] = useState<RuleContext>({ subject: operation.subject, stage: operation.stage, progressFrom: operation.progressFrom, progressTo: operation.progressTo })
  const [appliedContext, setAppliedContext] = useState<RuleContext>({ subject: operation.subject, stage: operation.stage, progressFrom: operation.progressFrom, progressTo: operation.progressTo })
  const [draftRules, setDraftRules] = useState<OperationRule[]>(operation.rules)
  const [savedAt, setSavedAt] = useState(operation.savedAt)
  const [savedMessage, setSavedMessage] = useState(false)
  const [validationMessage, setValidationMessage] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [resultFilter, setResultFilter] = useState<RuleResult>('자동확정')

  const stages = operationSubjects[context.subject]
  const contextKey = ruleSetKey({ subject: context.subject, stageFrom: context.stage, stageTo: context.stage, progressFrom: context.progressFrom, progressTo: context.progressTo })
  const existingSet = ruleSets.find((set) => ruleSetKey(set) === contextKey)

  // 현재 적용 중인 운영기준: 저장된 모든 기준 묶음에서 선택한 처리 결과의 사용 중인 Rule만 모은다.
  const appliedRows = useMemo(() => ruleSets
    .flatMap((set) => set.rules.filter((rule) => rule.enabled).map((rule) => ({ key: `${set.id}-${rule.id}`, set, rule })))
    .sort(compareRuleRows), [ruleSets])
  const resultCounts = Object.fromEntries(ruleResults.map((result) => [result, appliedRows.filter((row) => row.rule.result === result).length])) as Record<RuleResult, number>
  const visibleRows = appliedRows.filter((row) => row.rule.result === resultFilter)

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

  // [기준 저장]: 먼저 검증하고, 통과하면 저장 여부를 묻는 확인 팝업을 띄운다.
  const requestSave = () => {
    const invalidRange = draftRules.some((rule) => rule.minLp === null || rule.maxLp === null || rule.minLp < 0 || rule.maxLp > 100 || rule.minLp > rule.maxLp)
    const duplicate = draftRules.some((rule, index) => draftRules.some((other, otherIndex) => otherIndex !== index && rule.answer === other.answer && rule.minLp === other.minLp && rule.maxLp === other.maxLp))
    if (invalidRange || duplicate || context.progressFrom > context.progressTo) { setValidationMessage(invalidRange ? 'LP 범위는 0~100이며 최솟값이 최댓값보다 클 수 없습니다.' : duplicate ? '동일한 채점 결과와 LP 범위가 중복되었습니다.' : '진도번호 범위를 확인해주세요.'); return }
    setValidationMessage('')
    setConfirmOpen(true)
  }

  // 확인 팝업에서 [예]: 같은 과목·단계·진도 범위의 기준이 있으면 덮어쓰고, 없으면 새로 추가한다.
  const confirmSave = () => {
    const rules = draftRules.map((rule) => ({ ...rule }))
    const before = existingSet ? existingSet.rules.map(conditionText).join(' / ') : '-'
    const after = rules.map(conditionText).join(' / ')
    setRuleSets((sets) => existingSet
      ? sets.map((set) => set.id === existingSet.id ? { ...set, rules } : set)
      : [...sets, { id: `SET-${Date.now()}`, subject: context.subject, stageFrom: context.stage, stageTo: context.stage, progressFrom: context.progressFrom, progressTo: context.progressTo, rules }])
    setAppliedContext(context)
    const timestamp = `${TODAY} ${new Date().toTimeString().slice(0, 5)}`
    setSavedAt(timestamp)
    setOperation({ ...context, rules, savedAt: timestamp })
    addHistory({ type: '운영기준 변경', subtype: existingSet ? 'Rule 저장' : 'Rule 추가', subject: context.subject, stage: context.stage, scope: `${context.subject} / ${context.stage} / ${context.progressFrom}~${context.progressTo}`, title: '운영기준 Rule 변경', before, after, worker: '운영관리자(admin)', note: '운영기준 설정 화면에서 저장', targetKey: `RULE-${contextKey}` })
    setConfirmOpen(false)
    setSavedMessage(true)
  }

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
            <div><button type="button" className="operation-save-button" onClick={requestSave}><Save size={15} /> 기준 저장</button></div>
          </div>
        </section>
      </div>

      <section className="operation-panel applied-rules-panel">
        <div className="operation-panel-heading">
          <div><ShieldCheck size={18} /><span><strong>현재 적용 중인 운영기준</strong><small>처리 결과별로 저장된 전체 기준을 확인합니다.</small></span></div>
          <div className="applied-result-tabs" role="tablist" aria-label="처리 결과 선택">
            {ruleResults.map((result) => (
              <button key={result} type="button" role="tab" aria-selected={resultFilter === result} className={`result-${result} ${resultFilter === result ? 'active' : ''}`} onClick={() => setResultFilter(result)}>
                {result}<span>{resultCounts[result]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="operation-table-wrap">
          <table className="operation-table applied-rules-table">
            <thead><tr><th>과목</th><th>단계 범위</th><th>진도번호 범위</th><th>정오답 여부</th><th>LP 범위</th></tr></thead>
            <tbody>
              {visibleRows.map(({ key, set, rule }) => (
                <tr key={key}>
                  <td>{set.subject}</td>
                  <td>{rangeText(set.stageFrom, set.stageTo)}</td>
                  <td>{rangeText(set.progressFrom, set.progressTo)}</td>
                  <td><span className={`answer-badge ${rule.answer === '정답' ? 'correct' : 'wrong'}`}>{rule.answer}</span></td>
                  <td><strong>{rule.minLp ?? 0}~{rule.maxLp ?? 100}</strong></td>
                </tr>
              ))}
              {visibleRows.length === 0 && <tr><td className="applied-rules-empty" colSpan={5}>{resultFilter}로 설정된 기준이 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {confirmOpen && (
        <div className="reviewer-modal-backdrop" onClick={() => setConfirmOpen(false)}>
          <div className="operation-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="operation-confirm-title" onClick={(event) => event.stopPropagation()}>
            <div className="operation-confirm-body">
              <span className="operation-confirm-icon"><Save size={20} /></span>
              <h2 id="operation-confirm-title">운영기준을 저장하시겠습니까?</h2>
              <p>{existingSet ? '같은 범위에 저장된 기준을 지금 설정한 내용으로 바꿉니다.' : '이 범위의 기준이 새로 추가됩니다.'}</p>
              <dl>
                <div><dt>적용 범위</dt><dd>{context.subject} · {context.stage} · {context.progressFrom}~{context.progressTo}번</dd></div>
                <div><dt>분기 기준</dt><dd>{draftRules.length}개 (사용 {draftRules.filter((rule) => rule.enabled).length}개)</dd></div>
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
