import type { DictionaryEntry, ReferenceEntity } from './types'

export const dataDictionary: DictionaryEntry[] = [
  { category: '과목', code: 'MATH', display: '수학', definition: '수학 과목 코드. 공통 curriculum의 단계값 4A, 3A, 2A, A, B, C를 사용한다.', status: '확정' },
  { category: '과목', code: 'ENGLISH', display: '영어', definition: '영어 과목 코드. 단계값 5A, 4A, 3A, 2A를 사용한다.', status: '확정' },
  { category: '과목', code: 'KOREAN', display: '국어', definition: '국어 과목 코드. 단계값 4A, 3A, 2A, A1, A2, B1, B2를 사용한다.', status: '확정' },
  { category: '과목', code: 'SCIENCE', display: '과학', definition: '과학 과목 코드. 단계값 3A, 2A, A, B, C, D를 사용한다.', status: '확정' },
  { category: '진도번호', code: 'progressNo', display: '1~200', definition: '모든 과목과 단계에서 공통으로 사용하는 진도 범위. 실제 콘텐츠 식별키와의 관계는 확인이 필요하다.', status: '협의 필요' },
  { category: 'AI 판정', code: 'CORRECT', display: '정답', definition: 'AI가 답안을 정답으로 판정한 상태.', status: '확정' },
  { category: 'AI 판정', code: 'INCORRECT', display: '오답', definition: 'AI가 답안을 오답으로 판정한 상태.', status: '확정' },
  { category: 'AI 신뢰도', code: 'lp', display: 'LP 0~100', definition: 'AI 판정 신뢰도 계열 값. 정확한 모델 의미·산출식·보정 여부는 AI 개발팀 확인이 필요하다.', status: '개발 확인 필요' },
  { category: 'Routing', code: 'AI_GRADED', display: 'AI 자동채점', definition: '운영기준상 AI 채점 대상(자동확정·검수후확정)으로 분기된 답안지. AI 자동채점 = 자동확정 + 검수후확정, 전체 = AI 자동채점 + 채점센터.', status: '확정' },
  { category: 'Routing', code: 'AUTO_CONFIRM', display: '자동확정', definition: '운영기준을 통과해 별도 검수 없이 최종 결과로 확정되는 처리 경로. 배정기준설정 화면에서는 "자동배정"으로 표기.', status: '확정' },
  { category: 'Routing', code: 'REVIEW_CONFIRM', display: '검수후확정', definition: '검수교사 확인 후 최종 결과를 확정하는 처리 경로. 배정기준설정 화면에서는 "검수배정"으로 표기.', status: '확정' },
  { category: 'Routing', code: 'CENTER', display: '채점센터', definition: '기존 채점센터 또는 별도 수동 처리 시스템으로 이관되는 경로. 배정기준설정 화면에서는 "채점배정"으로 표기.', status: '개발 확인 필요' },
  { category: '운영기준', code: 'CENTER_ONLY', display: '배정 미선택', definition: '진도번호에 배정을 선택하지 않은 상태. 별도 미설정 상태로 관리하지 않고 채점센터로 이관한다(샘플 데이터는 모든 진도번호에 배정 하나가 선택되어 있음).', status: '확정' },
  { category: '운영기준', code: 'completed', display: '처리결과', definition: '진도번호별로 회원 발송까지 모든 작업이 완료된 장 수. 배정기준설정의 처리결과조회 표에서 전체 제출·자동확정·검수후확정·채점센터 수와 비율로 조회기간 기준 실시간 집계.', status: '개발 확인 필요' },
  { category: '운영기준', code: 'errorRate', display: '오류율', definition: '검수후확정 장 수 중 검수교사가 AI 판정을 수정한 뒤 확정한 장 수의 비율(%).', status: '협의 필요' },
  { category: '검수 수정', code: 'modified', display: '수정 건', definition: 'AI 최초 정오답 판정과 검수교사의 최종 정오답 판정이 다른 문항.', status: '확정' },
]

export const referenceEntities: ReferenceEntity[] = [
  { name: 'SUBMISSION', description: '회원 학습지 제출 Reference Entity', fields: ['submissionId', 'memberId', 'subject', 'level', 'progressNo', 'submittedAt'] },
  { name: 'AI_GRADING_RESULT', description: 'AI 문항별 채점 결과 Reference Entity', fields: ['submissionId', 'questionNo', 'aiResult', 'lp', 'recognizedValue'] },
  { name: 'ROUTING_RESULT', description: '운영기준 적용 결과 Reference Entity', fields: ['submissionId', 'routingStatus', 'appliedRuleId', 'routedAt'] },
  { name: 'OPERATING_RULE', description: '과목·단계·진도번호별로 배정(자동확정·검수후확정·채점센터) 하나와 LP 범위(lpMin 초과 ~ lpMax 이하)를 저장하는 분기 기준 Reference Entity. 정답/오답 구분이 없다.', fields: ['subject', 'level', 'progressNo', 'routingResult', 'lpMin(초과)', 'lpMax(이하)', 'updatedAt', 'updatedBy'] },
  { name: 'REVIEWER', description: '검수교사 Master Reference Entity', fields: ['reviewerId', 'reviewerName', 'workingHours', 'status'] },
  { name: 'REVIEW_ASSIGNMENT', description: '검수교사별 복수 담당 범위와 물량 Reference Entity', fields: ['assignmentId', 'reviewerId', 'subject', 'level', 'progressStart', 'progressEnd', 'allocatedSheets'] },
  { name: 'REVIEW_RESULT', description: '문항별 검수 확정 결과 Reference Entity', fields: ['submissionId', 'questionNo', 'reviewerId', 'aiResult', 'finalResult', 'modified', 'confirmedAt'] },
  { name: 'REVIEW_WORK_LOG', description: '검수 작업시간과 처리량 Reference Entity', fields: ['reviewerId', 'startedAt', 'endedAt', 'reviewedSheets'] },
  { name: 'ADMIN_HISTORY', description: 'Admin 설정 변경 감사이력 Reference Entity', fields: ['historyId', 'changeType', 'target', 'beforeValue', 'afterValue', 'changedBy', 'changedAt'] },
]

export const entityNotice = '위 Entity와 field명은 개발 이해를 위한 Reference Data Model이며 실제 Production DB Schema 확정안이 아닙니다.'
