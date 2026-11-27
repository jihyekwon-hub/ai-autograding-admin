import type { FlowGroup } from './types'

export const gradingFlow: FlowGroup[] = [
  { title: '제출·AI 채점', nodes: [
    { id: 'submission', label: '회원 학습지 제출', note: '회원/학습 시스템', tone: 'source' },
    { id: 'worksheet', label: '학습지 이미지 / 문항 데이터', note: 'Image Storage + 콘텐츠 DB', tone: 'source' },
    { id: 'ai', label: 'AI 채점', note: '정오답 · LP · 인식값', tone: 'process' },
  ] },
  { title: 'Routing', nodes: [
    { id: 'rule', label: '운영기준 / Routing Rule', note: '과목·단계·진도·판정·LP', tone: 'decision' },
    { id: 'auto', label: '자동확정', tone: 'result' },
    { id: 'review', label: '검수후확정', tone: 'result' },
    { id: 'center', label: '채점센터', tone: 'result' },
  ] },
  { title: '검수·결과', nodes: [
    { id: 'reviewer', label: '검수교사 검수', note: '정답/오답 판정 수정', tone: 'process' },
    { id: 'confirm', label: '검수 확정', tone: 'process' },
    { id: 'final', label: '최종 채점결과', tone: 'result' },
    { id: 'member', label: '회원 결과화면', tone: 'source' },
  ] },
]

export const adminFlow: FlowGroup[] = [
  { title: '운영기준', nodes: [{ id: 'std', label: '운영기준 설정', tone: 'admin' }, { id: 'routing', label: 'Routing Rule', tone: 'decision' }, { id: 'dash', label: '대시보드', tone: 'admin' }] },
  { title: '검수 운영', nodes: [{ id: 'reviewers', label: '검수교사 관리', tone: 'admin' }, { id: 'assign', label: '검수 대상 배정', tone: 'process' }, { id: 'review-ui', label: '검수화면', tone: 'process' }, { id: 'status', label: '수정내역', tone: 'admin' }] },
  { title: '감사 이력', nodes: [{ id: 'rule-change', label: '운영기준 변경', tone: 'decision' }, { id: 'range-change', label: '검수범위 변경', tone: 'decision' }, { id: 'history', label: '이력관리', tone: 'admin' }] },
]

export const screenDataFlows: Record<string, string[]> = {
  dashboard: ['Performance mock data', '기준월 선택 → 해당 월 집계(기준일이 속한 달은 기준일까지)', '전체 = AI 자동채점 + 채점센터 / AI 자동채점 = 자동확정 + 검수후확정', '박스 6개 · 파이그래프 2개'],
  standards: ['과목·단계 선택 → 진도번호 1~200 목록 + 네 과목 배정 비중', '진도번호별 배정 하나 선택 + LP 범위(초과 ~ 이하) 입력', 'LP 0~100 · 초과값 < 이하값 Validation', '저장 확인 팝업', 'Rule Save API (예정)', 'OPERATING_RULE DB (예정)', 'Routing Engine', '동시에 ADMIN_HISTORY 기록', '처리결과조회: 조회기간별 진도번호 처리결과·오류율 집계(실시간)'],
  reviewers: ['Reviewer/Assignment 조회', '복수 검수범위 편집', '범위 Validation', 'REVIEW_ASSIGNMENT 저장', 'ADMIN_HISTORY 기록'],
  'review-status': ['REVIEW_RESULT + REVIEWER', '기간/교사/과목/단계 Filter([조회] 시 적용)', '수정 내역 Table', '검수 완료 화면 Modal'],
  history: ['OPERATING_RULE/REVIEW_ASSIGNMENT 변경 이벤트', 'ADMIN_HISTORY 적재', '기간/유형/작업자/과목/단계/키워드 Filter', '조회 전용 목록과 상세'],
}

export const interactionMap = [
  ['검수교사 관리 검수범위 보기/수정', '검수범위 설정 Modal'],
  ['수정내역 화면 보기', '검수 완료 화면 Modal'],
  ['운영기준 기준 저장', '저장 확인 팝업 → 이력관리 History 생성'],
  ['검수범위/검수교사 저장', '이력관리 History 생성'],
] as const
