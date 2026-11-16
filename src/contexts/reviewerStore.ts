import { createContext, useContext, type Dispatch, type SetStateAction } from 'react'
import type { Reviewer } from '../data/reviewers'

type ReviewerContextValue = {
  reviewers: Reviewer[]
  setReviewers: Dispatch<SetStateAction<Reviewer[]>>
}

export const ReviewerContext = createContext<ReviewerContextValue | null>(null)

export function useReviewers() {
  const context = useContext(ReviewerContext)
  if (!context) throw new Error('useReviewers는 ReviewerProvider 내부에서 사용해야 합니다.')
  return context
}
