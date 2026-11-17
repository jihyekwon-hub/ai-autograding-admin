import { useState, type ReactNode } from 'react'
import { AdminDataContext } from './adminStore'
import { historyRecords, createHistoryRecord, type HistoryRecord } from '../data/history'
import { initialRuleSettings, initialRulesSavedAt, type RuleSettings } from '../data/operationRules'

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [ruleSettings, setRuleSettings] = useState<RuleSettings>(initialRuleSettings)
  const [rulesSavedAt, setRulesSavedAt] = useState(initialRulesSavedAt)
  const [history, setHistory] = useState<HistoryRecord[]>(historyRecords)
  const addHistory = (record: Omit<HistoryRecord, 'id' | 'timestamp'>) => setHistory((items) => [createHistoryRecord(record), ...items])
  return <AdminDataContext.Provider value={{ ruleSettings, setRuleSettings, rulesSavedAt, setRulesSavedAt, history, addHistory }}>{children}</AdminDataContext.Provider>
}
