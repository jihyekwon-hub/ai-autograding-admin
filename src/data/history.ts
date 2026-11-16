import type { ReviewerSubject } from './reviewers'
export type HistoryType = '운영기준 변경' | '검수교사 배정 변경' | '대상 변경' | '시스템 변경'
export type HistoryRecord = { id: string; timestamp: string; type: HistoryType; subtype: string; subject: ReviewerSubject | '전체'; stage: string; scope: string; title: string; before: string; after: string; worker: string; note: string; targetKey: string }
export const historyRecords: HistoryRecord[] = [
  { id: 'HIS001', timestamp: '2026-11-16 13:20', type: '운영기준 변경', subtype: 'Rule 수정', subject: '수학', stage: 'A', scope: '수학 / A / 35', title: '자동확정 LP 기준 변경', before: '정답 + LP ≥ 95', after: '정답 + LP ≥ 93', worker: '운영관리자(admin)', note: '검수 결과 분석 후 조정', targetKey: 'RULE-MATH-A-35' },
  { id: 'HIS002', timestamp: '2026-11-16 11:20', type: '검수교사 배정 변경', subtype: '검수범위 변경', subject: '수학', stage: 'A', scope: '검수교사 A', title: '검수교사 A 검수범위 변경', before: '수학 A 1~30', after: '수학 A 1~40', worker: '운영관리자(admin)', note: '금일 물량 증가 반영', targetKey: 'TCH001-RANGE' },
  { id: 'HIS003', timestamp: '2026-11-16 10:15', type: '검수교사 배정 변경', subtype: '배정 장수 변경', subject: '수학', stage: 'A', scope: '검수교사 B', title: '배정 장수 조정', before: '1,400장', after: '1,600장', worker: '운영관리자(admin)', note: '업무 균형 조정', targetKey: 'TCH002-PAGES' },
  { id: 'HIS004', timestamp: '2026-11-15 16:40', type: '운영기준 변경', subtype: 'Rule 추가', subject: '국어', stage: '2A', scope: '국어 / 2A / 1~50', title: '오답 검수후확정 Rule 추가', before: '-', after: '오답 + LP 95~100 → 검수후확정', worker: '운영관리자(admin)', note: '시범 운영 기준', targetKey: 'RULE-KOR-2A' },
  { id: 'HIS005', timestamp: '2026-11-15 14:10', type: '검수교사 배정 변경', subtype: '근무시간 변경', subject: '영어', stage: '2A', scope: '검수교사 E', title: '근무시간 변경', before: '09:00~13:00', after: '08:30~13:01', worker: '운영관리자(admin)', note: '교사 요청 반영', targetKey: 'TCH005-WORK' },
  { id: 'HIS006', timestamp: '2026-11-14 09:30', type: '시스템 변경', subtype: '알림 설정', subject: '전체', stage: '전체', scope: '운영 알림', title: '운영 알림 임계값 변경', before: '10건', after: '7건', worker: '시스템(auto)', note: '조기 탐지 강화', targetKey: 'SYSTEM-ALERT' },
  { id: 'HIS007', timestamp: '2026-11-13 15:05', type: '검수교사 배정 변경', subtype: '검수교사 추가', subject: '과학', stage: 'A', scope: '검수교사 D', title: '검수교사 추가', before: '-', after: '과학 A 46~100', worker: '운영관리자(admin)', note: '운영 인력 증원', targetKey: 'TCH004-PROFILE' },
  { id: 'HIS008', timestamp: '2026-11-12 11:30', type: '대상 변경', subtype: '대상 추가', subject: '과학', stage: '2A', scope: '과학 / 2A', title: '자동채점 대상 추가', before: '미적용', after: '적용', worker: '운영관리자(admin)', note: '운영 확대', targetKey: 'TARGET-SCI-2A' },
]
export function createHistoryRecord(record: Omit<HistoryRecord, 'id' | 'timestamp'>): HistoryRecord { return { ...record, id: `HIS${Date.now()}`, timestamp: '2026-11-16 14:30' } }
