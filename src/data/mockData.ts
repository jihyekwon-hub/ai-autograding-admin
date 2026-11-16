import type { DailyVolume, GradingJob, Metric } from '../types/dashboard'

export const metrics: Metric[] = [
  { label: '오늘 채점 완료', value: '1,284', change: '+12.8%', trend: 'up', caption: '어제 대비' },
  { label: '평균 처리 시간', value: '2.4초', change: '-0.6초', trend: 'down', caption: '최근 7일 평균' },
  { label: '검토 대기', value: '23', change: '5건 감소', trend: 'down', caption: '담당자 확인 필요' },
  { label: '채점 정확도', value: '96.8%', change: '+1.2%', trend: 'up', caption: '교수자 검수 기준' },
]

export const gradingJobs: GradingJob[] = [
  { id: 'EX-24018', title: '중간고사 서술형 평가', course: '데이터 구조', submitted: 142, graded: 118, status: '채점 중', updatedAt: '방금 전' },
  { id: 'EX-24017', title: '3주차 알고리즘 과제', course: '알고리즘 기초', submitted: 86, graded: 86, status: '완료', updatedAt: '12분 전' },
  { id: 'EX-24016', title: '프롬프트 설계 실습', course: '생성형 AI 활용', submitted: 64, graded: 61, status: '검토 필요', updatedAt: '31분 전' },
  { id: 'EX-24015', title: '기말 프로젝트 제안서', course: '소프트웨어 공학', submitted: 103, graded: 103, status: '완료', updatedAt: '1시간 전' },
]

export const dailyVolumes: DailyVolume[] = [
  { day: '월', value: 62 },
  { day: '화', value: 78 },
  { day: '수', value: 54 },
  { day: '목', value: 91 },
  { day: '금', value: 74 },
  { day: '토', value: 44 },
  { day: '일', value: 68 },
]
