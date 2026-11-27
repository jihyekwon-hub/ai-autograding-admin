export type SpecificationStatus = '확정' | '협의 필요' | '개발 확인 필요'

export type ScreenKey = 'dashboard' | 'standards' | 'review-status'

export type ScreenMetadata = {
  key: ScreenKey
  order: number
  name: string
  screenId: string
  url: string
  purpose: string
  user: string
  crud: string
  relatedScreens: string[]
}

export type ScreenSpecification = {
  id: string
  screenId: string
  number: number
  title: string
  status: SpecificationStatus
  selector: string
  purpose: string
  description: string
  input?: string[]
  output?: string[]
  dataDefinitions?: string[]
  sourceData?: string[]
  destinationData?: string[]
  businessRules?: string[]
  calculationLogic?: string[]
  validation?: string[]
  interactions?: string[]
  trigger?: string[]
  saveBehavior?: string[]
  linkedScreen?: string[]
  linkedSystem?: string[]
  apiRequirement?: string[]
  permissions?: string[]
  exceptionHandling?: string[]
  dataFlow?: string[]
  developerNotes?: string[]
  openIssues?: string[]
}

export type DictionaryEntry = {
  category: string
  code: string
  display: string
  definition: string
  status: SpecificationStatus
}

export type ReferenceEntity = {
  name: string
  description: string
  fields: string[]
}

export type FlowNode = {
  id: string
  label: string
  note?: string
  tone?: 'source' | 'process' | 'decision' | 'result' | 'admin'
}

export type FlowGroup = {
  title: string
  nodes: FlowNode[]
}
