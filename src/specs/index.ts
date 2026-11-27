import { dashboardSpecs } from './dashboardSpec'
import { reviewStatusSpecs } from './reviewStatusSpec'
import { standardsSpecs } from './standardsSpec'
import type { ScreenKey, ScreenSpecification } from './types'

export const specificationsByScreen: Record<ScreenKey, ScreenSpecification[]> = {
  dashboard: dashboardSpecs,
  standards: standardsSpecs,
  'review-status': reviewStatusSpecs,
}

export const allSpecifications = Object.values(specificationsByScreen).flat()

export * from './common'
export * from './dataDictionary'
export * from './dataFlow'
export * from './overview'
export * from './types'
