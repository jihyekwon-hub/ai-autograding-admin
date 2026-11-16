export const readmeSections = [
  { title: '프로젝트 목적', items: ['본 프로젝트는 AI 자동채점 운영 시스템 개발을 위한 Reference UI Prototype이다.', '현재 운영 화면과 mock interaction을 개발팀이 기능·데이터·연계 관점에서 이해하도록 돕는다.'] },
  { title: '중요', items: ['현재 구현된 화면, mock data, field name, route, 계산 예시는 개발 이해를 위한 Reference이다.', '실제 Production DB Schema나 API Specification 확정안이 아니다.'] },
  { title: '프로토타입 구현 범위', items: ['화면 Navigation', '조회 및 Filter', '운영기준·검수교사 설정', 'Modal', 'mock interaction 및 mock data', 'validation 예시'] },
  { title: '미구현 범위', items: ['실제 DB와 AI Model API', '인증·권한·개인정보 처리', '실제 검수 배정 Engine', '실제 수당 정산', '실제 회원 데이터', '실제 채점센터 Interface'] },
  { title: '실제 개발 시 필요한 연계', items: ['회원 학습지 제출 데이터', '학습지 이미지 Storage', 'AI 채점 결과 및 LP', 'Routing Engine와 운영기준 DB', 'Reviewer Master / Review Assignment / Review Result', 'Admin User/Auth와 History Log', '기존 채점센터 Interface'] },
]

export const openIssues = [
  '‘장’ 단위의 정확한 데이터 Key 정의',
  'A/B 양면 데이터가 동일 Sheet로 연결되는 방식',
  'LP의 정확한 AI 기술 정의 및 저장 필드',
  'Routing Rule 충돌 시 우선순위',
  '운영기준 변경 시 기존 제출 건 소급 여부',
  '검수 대상 배정 방식: 사전 배정 / Queue / 혼합',
  '검수 확정 전 동시접근 Lock 필요 여부',
  '검수완료 학습지 이미지 보존기간',
  '검수 작업시간 산정 방식',
  '검수 수당 실제 산식 및 정산 기준',
  'Admin 권한 Level',
  'History 보존기간',
  '회원 개인정보 Masking 범위',
  '채점센터 이관 API/Interface',
  '실적 Dashboard 집계 방식: 실시간 / 주기 Batch',
  '운영기준 관리 주체: Routing API / Admin DB',
  '검수 수정건의 Ground Truth 활용 여부',
  'AI 모델 개선용 데이터 Pipeline 연계 여부',
]
