import { createContext, useContext, type Dispatch, type SetStateAction } from 'react'
import type { HistoryRecord } from '../data/history'
import type { AppliedRuleSet, OperationRule } from '../data/operationRules'
import type { Subject } from '../data/curriculum'

export type OperationSnapshot = { subject: Subject; stage: string; progressFrom: number; progressTo: number; rules: OperationRule[]; savedAt: string }
export type AdminDataContextValue = {
  operation: OperationSnapshot
  setOperation: Dispatch<SetStateAction<OperationSnapshot>>
  ruleSets: AppliedRuleSet[]
  setRuleSets: Dispatch<SetStateAction<AppliedRuleSet[]>>
  history: HistoryRecord[]
  addHistory: (record: Omit<HistoryRecord, 'id' | 'timestamp'>) => void
}

export const AdminDataContext = createContext<AdminDataContextValue | null>(null)
export function useAdminData() { const value = useContext(AdminDataContext); if (!value) throw new Error('AdminDataProvider가 필요합니다.'); return value }
