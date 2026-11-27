import { dashboardSpecs } from './dashboardSpec'
import { historySpecs } from './historySpec'
import { reviewersSpecs } from './reviewersSpec'
import { reviewStatusSpecs } from './reviewStatusSpec'
import { standardsSpecs } from './standardsSpec'
import type { ScreenKey, ScreenSpecification } from './types'

export const specificationsByScreen: Record<ScreenKey, ScreenSpecification[]> = {
  dashboard: dashboardSpecs,
  standards: standardsSpecs,
  reviewers: reviewersSpecs,
  'review-status': reviewStatusSpecs,
  history: historySpecs,
}

export const allSpecifications = Object.values(specificationsByScreen).flat()

export * from './common'
export * from './dataDictionary'
export * from './dataFlow'
export * from './overview'
export * from './types'
