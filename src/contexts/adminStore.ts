import { createContext, useContext, type Dispatch, type SetStateAction } from 'react'
import type { HistoryRecord } from '../data/history'
import type { RuleSettings } from '../data/operationRules'

export type AdminDataContextValue = {
  ruleSettings: RuleSettings
  setRuleSettings: Dispatch<SetStateAction<RuleSettings>>
  rulesSavedAt: string
  setRulesSavedAt: Dispatch<SetStateAction<string>>
  history: HistoryRecord[]
  addHistory: (record: Omit<HistoryRecord, 'id' | 'timestamp'>) => void
}

export const AdminDataContext = createContext<AdminDataContextValue | null>(null)
export function useAdminData() { const value = useContext(AdminDataContext); if (!value) throw new Error('AdminDataProvider가 필요합니다.'); return value }
