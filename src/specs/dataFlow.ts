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
  { title: '운영기준', nodes: [{ id: 'std', label: '운영기준 설정', tone: 'admin' }, { id: 'routing', label: 'Routing Rule', tone: 'decision' }, { id: 'perf', label: '실적관리', tone: 'admin' }, { id: 'dash', label: '대시보드', tone: 'admin' }] },
  { title: '검수 운영', nodes: [{ id: 'reviewers', label: '검수교사 관리', tone: 'admin' }, { id: 'assign', label: '검수 대상 배정', tone: 'process' }, { id: 'review-ui', label: '검수화면', tone: 'process' }, { id: 'status', label: '검수현황', tone: 'admin' }] },
  { title: '감사 이력', nodes: [{ id: 'rule-change', label: '운영기준 변경', tone: 'decision' }, { id: 'range-change', label: '검수범위 변경', tone: 'decision' }, { id: 'history', label: '이력관리', tone: 'admin' }] },
]

export const screenDataFlows: Record<string, string[]> = {
  dashboard: ['Performance mock data + Reviewer/Review log + 저장된 운영기준(ruleSettings)', '당일 집계 및 계산', '운영 KPI · 운영기준 요약 · 검수 진행률 · 추이 그래프'],
  performance: ['제출 실적 + Routing 결과', '조회조건 Filter', '일/월/연 집계', 'KPI · Trend(숫자 라벨) · 구성비 · 상세표 · CSV'],
  standards: ['과목·단계·처리결과(미설정 포함) 조회', '진도번호별 정답/오답 LP 범위 직접 수정 또는 일괄 입력', 'LP 0~100 · 처리결과 간 겹침 Validation', '저장 확인 팝업', 'Rule Save API (예정)', 'OPERATING_RULE DB (예정)', 'Routing Engine', '동시에 ADMIN_HISTORY 기록'],
  reviewers: ['Reviewer/Assignment 조회', '복수 검수범위 편집', '범위 Validation', 'REVIEW_ASSIGNMENT 저장', 'ADMIN_HISTORY 기록'],
  'review-status': ['REVIEW_RESULT + REVIEW_WORK_LOG + REVIEWER', '기간/교사/과목/단계 Filter', 'Aggregation', 'KPI · Chart · 수정 내역'],
  history: ['OPERATING_RULE/REVIEW_ASSIGNMENT 변경 이벤트', 'ADMIN_HISTORY 적재', '기간/유형/작업자/과목/단계/키워드 Filter', '조회 전용 목록과 상세'],
}

export const interactionMap = [
  ['대시보드 전체·자동확정·검수후확정·센터 KPI', '실적관리'],
  ['대시보드 운영기준 요약', '운영기준 설정'],
  ['대시보드 예상 수당·검수현황', '검수현황'],
  ['검수교사 관리 검수범위 보기/수정', '검수범위 설정 Modal'],
  ['검수현황 수정내역 화면 보기', '검수 완료 화면 Modal'],
  ['운영기준 설정 미설정 경고 아이콘', '미설정 진도번호 안내 Tooltip'],
  ['운영기준 기준 저장', '저장 확인 팝업 → 이력관리 History 생성'],
  ['검수범위/검수교사 저장', '이력관리 History 생성'],
] as const
