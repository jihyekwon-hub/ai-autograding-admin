import { useState, type ReactNode } from 'react'
import { AdminDataContext, type OperationSnapshot } from './adminStore'
import { historyRecords, createHistoryRecord, type HistoryRecord } from '../data/history'
import { initialOperationRules } from '../data/operationRules'

const initialOperation: OperationSnapshot = { subject: '수학', stage: 'A', progressFrom: 1, progressTo: 30, rules: initialOperationRules, savedAt: '2026-11-16 09:30' }

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [operation, setOperation] = useState(initialOperation)
  const [history, setHistory] = useState<HistoryRecord[]>(historyRecords)
  const addHistory = (record: Omit<HistoryRecord, 'id' | 'timestamp'>) => setHistory((items) => [createHistoryRecord(record), ...items])
  return <AdminDataContext.Provider value={{ operation, setOperation, history, addHistory }}>{children}</AdminDataContext.Provider>
}
