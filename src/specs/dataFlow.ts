import type { FlowGroup } from './types'

export const gradingFlow: FlowGroup[] = [
  { title: '제출·AI 채점', nodes: [
    { id: 'submission', label: '회원 학습지 제출', note: '회원/학습 시스템', tone: 'source' },
    { id: 'worksheet', label: '학습지 이미지 / 문항 데이터', note: 'Image Storage + 콘텐츠 DB', tone: 'source' },
    { id: 'ai', label: 'AI 채점', note: '정오답 · LP · 인식값', tone: 'process' },
  ] },
  { title: 'Routing', nodes: [
    { id: 'rule', label: '운영기준 / Routing Rule', note: '과목·단계·진도번호 → 배정 · LP 범위', tone: 'decision' },
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
  { title: '배정기준', nodes: [{ id: 'std', label: '기준설정', tone: 'admin' }, { id: 'routing', label: 'Routing Rule', tone: 'decision' }, { id: 'dash', label: '대시보드', tone: 'admin' }] },
  { title: '검수 운영', nodes: [{ id: 'assign', label: '검수 대상 배정', tone: 'process' }, { id: 'review-ui', label: '검수화면', tone: 'process' }, { id: 'status', label: '수정내역', tone: 'admin' }] },
]

export const screenDataFlows: Record<string, string[]> = {
  dashboard: ['Performance mock data(제출량) + 저장된 배정기준 → 자동확정·검수후확정·채점센터 구성', '기준월 선택 → 해당 월 집계(기준일이 속한 달은 기준일까지)', '전체 = AI 자동채점 + 채점센터 / AI 자동채점 = 자동확정 + 검수후확정', '박스 6개 · 파이그래프 2개', '오류율 모니터링: 진도번호 처리결과(progressResults) → 단계 · 과목 오류율', '과목 막대 클릭 → 오류율 상세 팝업 → [기준설정에서 보기] (과목 · 단계 · 기간 · 오류율 정렬 전달)', '과목별 처리 구성 막대 클릭 → 처리 구성 상세 팝업 → [기준설정에서 보기] (전체 제출 정렬 전달)'],
  standards: ['과목·단계 선택 → 진도번호 1~200 목록 + 네 과목 배정 비중', '진도번호별 배정 하나 선택 + LP 범위(초과 ~ 이하) 입력', 'LP 0~100 · 초과값 < 이하값 Validation', '열별 엑셀형 필터·정렬', '저장 확인 팝업', 'Rule Save API (예정)', 'OPERATING_RULE DB (예정)', 'Routing Engine', '엑셀 다운로드(.xlsx)', '처리결과조회: 조회기간별 진도번호 처리결과·오류율 집계(실시간)'],
  'review-status': ['REVIEW_RESULT + REVIEWER', '기준월 선택 → 해당 월 수정 내역', '수정 내역 Table', '열별 엑셀형 필터·정렬', '검수 완료 화면 Modal'],
}

export const interactionMap = [
  ['수정내역 화면 보기', '검수 완료 화면 Modal'],
  ['기준설정 열 필터', '배정기준설정·처리결과조회 행 동시 필터·정렬'],
  ['기준설정 기준 저장', '저장 확인 팝업 → 기준 반영 → 대시보드 처리 구성에 반영'],
  ['기준설정 다운로드', '배정기준설정 + 처리결과조회 엑셀(.xlsx) 파일'],
  ['대시보드 과목별 오류율 막대', '오류율 상세 팝업 → 기준설정(과목·단계·기준월, 오류율 높은 순)'],
  ['대시보드 과목별 처리 구성 막대', '처리 구성 상세 팝업 → 기준설정(과목·단계·기준월, 전체 제출 많은 순)'],
] as const
