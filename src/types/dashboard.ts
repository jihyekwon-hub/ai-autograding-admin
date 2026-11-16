export type Metric = {
  label: string
  value: string
  change: string
  trend: 'up' | 'down' | 'neutral'
  caption: string
}

export type GradingJob = {
  id: string
  title: string
  course: string
  submitted: number
  graded: number
  status: '채점 중' | '완료' | '검토 필요'
  updatedAt: string
}

export type DailyVolume = {
  day: string
  value: number
}
