import type { ScreenMetadata, ScreenSpecification } from './types'

export const screenMetadata: ScreenMetadata[] = [
  { key: 'dashboard', order: 1, name: '대시보드', screenId: 'ADM-DASH-001', url: '/dashboard', purpose: 'AI 자동채점 처리 물량을 월 단위로 전체·AI 자동채점·채점센터, 자동확정·검수후확정 구성으로 요약 조회', user: '운영관리자', crud: 'Read', relatedScreens: [] },
  { key: 'standards', order: 2, name: '운영기준 설정', screenId: 'ADM-STD-001', url: '/standards', purpose: '과목·단계의 진도번호별 배정(자동배정·검수배정·채점배정 중 하나)과 LP 범위를 설정하고, 같은 행에서 기간별 처리결과·오류율과 과목 배정 비중을 조회', user: '운영관리자', crud: 'Read / Update', relatedScreens: ['이력관리'] },
  { key: 'reviewers', order: 3, name: '검수교사 관리', screenId: 'ADM-REV-001', url: '/reviewers', purpose: '검수교사 인력정보와 복수 검수 대상 범위 관리', user: '운영관리자', crud: 'Read / Create / Update / Delete', relatedScreens: ['수정내역', '이력관리'] },
  { key: 'review-status', order: 4, name: '수정내역', screenId: 'ADM-STAT-001', url: '/review-status', purpose: '검수교사가 AI 판정을 수정한 내역과 검수 완료 화면 조회', user: '운영관리자', crud: 'Read', relatedScreens: ['검수교사 관리'] },
  { key: 'history', order: 5, name: '이력관리', screenId: 'ADM-HIST-001', url: '/history', purpose: 'Admin 내부에서 발생한 운영기준과 검수교사 배정 변경 이력 조회', user: '운영관리자', crud: 'Read', relatedScreens: ['운영기준 설정', '검수교사 관리'] },
]

export const createSpec = (spec: ScreenSpecification): ScreenSpecification => spec

export const defaultSpecValue = ['-']

export const statusDescription = {
  확정: '현재 프로토타입에서 동작과 데이터 정의가 확인된 항목',
  '협의 필요': '운영 정책 또는 사용자 요구 확정이 필요한 항목',
  '개발 확인 필요': 'API·DB·보안·외부 연계 등 기술 설계 확인이 필요한 항목',
} as const
