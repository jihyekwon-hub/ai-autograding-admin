import { useState, type ReactNode } from 'react'
import { initialReviewers, type Reviewer } from '../data/reviewers'
import { ReviewerContext } from './reviewerStore'

export function ReviewerProvider({ children }: { children: ReactNode }) {
  const [reviewers, setReviewers] = useState<Reviewer[]>(initialReviewers)
  return <ReviewerContext.Provider value={{ reviewers, setReviewers }}>{children}</ReviewerContext.Provider>
}
