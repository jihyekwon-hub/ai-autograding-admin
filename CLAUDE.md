# CLAUDE.md

AI 자동채점 서비스의 운영자용 Admin 프론트엔드 **Reference UI 프로토타입**이다. 백엔드·API·DB·인증은 없고 모든 데이터는 `src/data/`의 mock 데이터와 클라이언트 메모리 상태로 동작한다(새로고침 시 초기화). 이 저장소는 OpenAI Codex와 Claude Code가 함께 사용한다.

## 명령어

패키지 매니저는 **pnpm**이다(`pnpm-lock.yaml`, Vercel 빌드 기준). npm/yarn으로 lock 파일을 만들지 않는다. Node는 `24.x`.

```bash
pnpm install
pnpm run dev       # http://localhost:5173
pnpm run build     # tsc -b && vite build
pnpm run lint      # eslint .
```

테스트 프레임워크는 아직 없다. 변경 후에는 최소한 `pnpm run build`와 `pnpm run lint`가 통과해야 한다.

사용자 PC는 회사 보안 규정상 Node.js를 설치할 수 없다. Claude Code는 로컬에서 Node/pnpm을 설치·실행하지 않고, 브랜치를 push한 뒤 Vercel Preview 빌드(`tsc -b && vite build`)와 Preview URL 화면으로 검증한다(lint는 로컬에서 실행되지 않음).

운영기준 설정 화면은 처리결과를 자동배정/검수배정/채점배정으로 표기하지만, 데이터 값(`RuleResult`)과 다른 화면은 자동확정/검수후확정/채점센터를 유지한다. 진도번호별 처리결과·수정율 mock은 `data/progressResults.ts`.

## 기술 스택

- React 19 + TypeScript 5.9 (strict, `noUnusedLocals`/`noUnusedParameters`)
- Vite 8, react-router-dom 7 (`BrowserRouter`), lucide-react 아이콘
- UI·차트 라이브러리 없음: 차트는 SVG/CSS로 직접 구현
- 스타일은 단일 전역 파일 `src/styles/global.css` (`:root`의 `--font-size-*`, `--font-weight-*`, 색상 토큰 사용)
- 배포: Vercel (`vercel.json`, SPA rewrite)

## 구조

```
src/
  App.tsx                 라우트 정의 (AdminLayout 하위)
  layouts/AdminLayout.tsx 사이드바 메뉴(navigation 배열) + 상단바
  contexts/               전역 상태 — Provider(.tsx)와 store(.ts: createContext + useXxx 훅) 분리
    AdminDataProvider / adminStore     운영기준(ruleSettings: 과목|단계 → 진도번호 → 처리결과 → 정답/오답 LP 범위), 이력(history, addHistory)
    ReviewerProvider / reviewerStore   검수교사 목록(reviewers)
  data/                   mock 데이터와 도메인 타입
    curriculum.ts         과목·단계·진도번호(1~200), TODAY, MONTH_START
  pages/                  화면 컴포넌트 (named export: `export function XxxPage`)
  specs/                  화면설계서 데이터 (화면별 명세, 데이터 사전, 데이터 흐름, 미결 이슈)
```

| 메뉴 | 경로 | 페이지 | 명세 |
|---|---|---|---|
| 대시보드 | `/dashboard` | DashboardPage | dashboardSpec |
| 실적관리 | `/performance` | PerformancePage | performanceSpec |
| 운영기준 설정 | `/standards` | OperationRulePage | standardsSpec |
| 검수교사 관리 | `/reviewers` | ReviewerManagementPage | reviewersSpec |
| 수정내역 | `/review-status` | ReviewStatusPage | reviewStatusSpec |
| 이력관리 | `/history` | HistoryPage | historySpec |
| 화면설계서 (개발 Reference) | `/screen-spec` | ScreenSpecPage | specs/index.ts |

데이터 흐름: 운영기준 저장·검수교사 변경 시 Context 상태를 갱신하고 `addHistory`로 이력을 남긴다 → 이력관리 등에 반영된다. 새 변경 기능을 추가하면 이력 기록도 함께 추가한다.

## 반드시 지킬 규칙

1. **화면설계서와 DOM이 연결되어 있다.** `src/specs/*Spec.ts`의 각 항목은 `selector`(예: `.dashboard-kpi-five .kpi-card:nth-child(1)`)로 실제 페이지 요소를 가리키고, ScreenSpecPage가 이를 `querySelector`로 찾아 마커를 그린다. 페이지의 className·요소 순서·구조를 바꾸면 해당 spec의 selector를 함께 갱신하고, 기능·규칙이 바뀌면 spec 내용(businessRules, validation 등)도 갱신한다.
2. 새 화면을 추가하면 `App.tsx` 라우트, `AdminLayout`의 `navigation`, `specs/common.ts`의 `screenMetadata`, `specs/index.ts`, `ScreenSpecPage`의 `previewComponents`, `specs/types.ts`의 `ScreenKey`를 모두 맞춘다.
3. 과목·단계·진도번호 목록은 `data/curriculum.ts`만 기준으로 사용한다(하드코딩 금지).
4. 기준일은 `TODAY`/`MONTH_START` 상수를 사용한다. 기존 코드에 남아 있는 하드코딩 날짜(`'2026-11-16 14:30'`, 대시보드 날짜 문구)는 손댈 때 상수로 정리한다.
5. CSS는 단일 전역 파일이므로 페이지 접두어 클래스(`dashboard-*`, `operation-*`, `reviewer-*`, `review-status-*`, `history-*`, `performance-*`, `screen-spec-*`)를 사용하고, 공용 클래스 수정 시 다른 페이지 영향을 확인한다. 글자 크기·굵기는 토큰 변수를 사용한다.
6. 반응형(모바일 사이드바 포함)을 깨뜨리지 않는다.

## 코딩 스타일

- 작은따옴표, 세미콜론 없음, 2칸 들여쓰기
- UI 문구·도메인 리터럴 타입은 한국어(`'자동확정' | '검수후확정' | '채점센터'` 등)
- 숫자 표기는 `new Intl.NumberFormat('ko-KR')`
- 필터 화면은 `draft` 상태 → [조회] 버튼 → `applied` 상태 패턴을 따른다
- 일부 페이지는 여러 문장을 한 줄에 압축해 작성되어 있다. 새 코드는 읽기 쉽게 풀어 쓰되, 관련 없는 기존 코드를 일괄 재포맷하지 않는다(diff 최소화)

## Git 작업

- `main`은 GitHub `origin/main`과 동기화되어 있고 Vercel 배포와 연결될 수 있다. 기능 단위 브랜치(`feature/...`, `fix/...`)에서 작업하고 PR로 병합한다.
- Codex와 병행 작업하므로 작업 시작 전 원격 최신 상태를 확인한다.
- 사용자 요청 없이 commit/push하지 않는다.

## 알려진 이슈 / 미사용 코드

- `src/data/mockData.ts`, `src/types/dashboard.ts`, `src/pages/PlaceholderPage.tsx`는 현재 어디서도 사용하지 않는다(README의 mockData 설명은 오래된 내용).
- 검수교사 추가/수정 모달에서 이름 미입력 검증 메시지가 표시되지 않는다(`message`가 범위 모달에서만 렌더링됨).
- 신규 검수교사 ID(`TCH${reviewers.length + 1}`)가 삭제 후 추가 시 중복될 수 있다.
- 운영기준 설정 화면의 편집 내용(draft)은 페이지 상태라, 저장하지 않고 다른 메뉴로 이동하면 사라진다(이탈 경고 없음).
- 운영기준 검증은 처리결과 간 LP 겹침만 막는다. LP 0~100 중 어떤 처리결과에도 속하지 않는 누락 구간은 아직 검사하지 않는다.
- 운영 정책 미결 사항은 `src/specs/overview.ts`의 `openIssues` 참고.
