import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type MouseEvent as ReactMouseEvent } from 'react'
import { AlertCircle, BookOpen, Boxes, ChevronRight, Database, FileCode2, GitBranch, Info, LayoutList, RotateCcw, Search, X } from 'lucide-react'
import { AdminDataProvider } from '../contexts/AdminDataProvider'
import { ReviewerProvider } from '../contexts/ReviewerProvider'
import { DashboardPage } from './DashboardPage'
import { OperationRulePage } from './OperationRulePage'
import { ReviewStatusPage } from './ReviewStatusPage'
import {
  adminFlow,
  allSpecifications,
  dataDictionary,
  entityNotice,
  gradingFlow,
  interactionMap,
  openIssues,
  readmeSections,
  referenceEntities,
  screenDataFlows,
  screenMetadata,
  specificationsByScreen,
  statusDescription,
  type FlowGroup,
  type ScreenKey,
  type ScreenSpecification,
} from '../specs'

type ViewKey = 'overview' | ScreenKey
type OverviewTab = 'readme' | 'flow' | 'dictionary' | 'entities' | 'interaction' | 'issues'
type MarkerPosition = { left: number; top: number; width: number; height: number }

const previewComponents: Record<ScreenKey, ComponentType> = {
  dashboard: DashboardPage,
  standards: OperationRulePage,
  'review-status': ReviewStatusPage,
}

const routeToScreen = new Map(screenMetadata.map((screen) => [screen.url, screen.key]))
const statusClass = (status: string) => status === '확정' ? 'confirmed' : status === '협의 필요' ? 'discussion' : 'development'

export function ScreenSpecPage() {
  const [view, setView] = useState<ViewKey>('overview')
  const [selectedSpecId, setSelectedSpecId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [overviewTab, setOverviewTab] = useState<OverviewTab>('readme')
  const [previewVersion, setPreviewVersion] = useState(0)

  const currentMeta = view === 'overview' ? null : screenMetadata.find((item) => item.key === view)!
  const specs = view === 'overview' ? [] : specificationsByScreen[view]
  const selectedSpec = specs.find((item) => item.id === selectedSpecId) ?? null
  const normalizedQuery = query.trim().toLowerCase()
  const searchResults = useMemo(() => normalizedQuery ? allSpecifications.filter((spec) => JSON.stringify(spec).toLowerCase().includes(normalizedQuery) || screenMetadata.find((screen) => screen.screenId === spec.screenId)?.name.toLowerCase().includes(normalizedQuery)).slice(0, 20) : [], [normalizedQuery])

  const changeView = (next: ViewKey) => { setView(next); setSelectedSpecId(null); setPreviewVersion((value) => value + 1) }
  const openSearchResult = (spec: ScreenSpecification) => {
    const screen = screenMetadata.find((item) => item.screenId === spec.screenId)
    if (!screen) return
    setView(screen.key); setSelectedSpecId(spec.id); setQuery('')
  }

  return <div className="screen-spec-page">
    <header className="screen-spec-hero">
      <div><p><FileCode2 size={16}/> 개발팀 전달용 Reference</p><h1>화면설계서 <span>/ Functional Specification</span></h1><strong>AI 자동채점 Admin</strong><small>본 화면은 개발 참고용 명세이며 실제 Production UI에는 포함하지 않습니다.</small></div>
      <div className="screen-spec-search"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="기능명, LP, Validation, Data field 검색"/>{query && <button type="button" aria-label="검색어 지우기" onClick={() => setQuery('')}><X size={15}/></button>}{query && <div className="screen-spec-search-results">{searchResults.length ? searchResults.map((spec) => { const screen = screenMetadata.find((item) => item.screenId === spec.screenId)!; return <button key={spec.id} onClick={() => openSearchResult(spec)}><span>{String(spec.number).padStart(2, '0')}</span><div><strong>{spec.title}</strong><small>{screen.name} · {spec.screenId}</small></div><em className={statusClass(spec.status)}>{spec.status}</em></button> }) : <p>검색 결과가 없습니다.</p>}</div>}</div>
    </header>

    <div className="screen-spec-workspace">
      <nav className="screen-spec-navigation" aria-label="화면설계서 화면 목록">
        <div className="screen-spec-nav-title"><LayoutList size={17}/><strong>화면 목록</strong></div>
        <button className={view === 'overview' ? 'active' : ''} onClick={() => changeView('overview')}><span>00</span><div><strong>전체 개요</strong><small>System Reference</small></div></button>
        {screenMetadata.map((screen) => <button key={screen.key} className={view === screen.key ? 'active' : ''} onClick={() => changeView(screen.key)}><span>{String(screen.order).padStart(2, '0')}</span><div><strong>{screen.name}</strong><small>{screen.screenId}</small></div></button>)}
        <div className="screen-spec-nav-note"><Info size={15}/><span>운영 화면은 변경하지 않고 동일 React Component를 Preview에 재사용합니다.</span></div>
      </nav>

      <main className="screen-spec-main">
        {view === 'overview' ? <OverviewDocument tab={overviewTab} onTabChange={setOverviewTab}/> : <>
          <ScreenMetadataCard metadata={currentMeta!}/>
          <div className="screen-spec-preview-header"><div><strong>실제 화면 Preview</strong><span>파란 번호를 클릭하면 기능명세가 열립니다.</span></div><button type="button" onClick={() => setPreviewVersion((value) => value + 1)}><RotateCcw size={14}/> Preview 초기화</button></div>
          <InteractivePreview key={`${view}-${previewVersion}`} screen={view} specs={specs} selectedSpecId={selectedSpecId} onSelectSpec={setSelectedSpecId} onNavigate={changeView}/>
        </>}
      </main>

      <aside className="screen-spec-detail">
        {view === 'overview' ? <OverviewAside/> : selectedSpec ? <SpecificationDetail spec={selectedSpec} onClose={() => setSelectedSpecId(null)}/> : <ScreenOverviewPanel metadata={currentMeta!} specs={specs} onSelect={setSelectedSpecId}/>} 
      </aside>
    </div>
  </div>
}

function ScreenMetadataCard({ metadata }: { metadata: NonNullable<ReturnType<typeof screenMetadata.find>> }) {
  return <section className="screen-spec-metadata"><div><span>화면명</span><strong>{metadata.name}</strong></div><div><span>Screen ID</span><strong>{metadata.screenId}</strong></div><div><span>URL</span><strong>{metadata.url}</strong></div><div className="wide"><span>화면 목적</span><strong>{metadata.purpose}</strong></div><div><span>사용자</span><strong>{metadata.user}</strong></div><div><span>CRUD</span><strong>{metadata.crud}</strong></div><div className="wide"><span>관련 화면</span><strong>{metadata.relatedScreens.join(' · ')}</strong></div></section>
}

function InteractivePreview({ screen, specs, selectedSpecId, onSelectSpec, onNavigate }: { screen: ScreenKey; specs: ScreenSpecification[]; selectedSpecId: string | null; onSelectSpec: (id: string) => void; onNavigate: (screen: ViewKey) => void }) {
  const Component = previewComponents[screen]
  const canvasRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const markerRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [positions, setPositions] = useState<Record<string, MarkerPosition>>({})

  const updatePositions = useCallback(() => {
    const canvas = canvasRef.current; const content = contentRef.current
    if (!canvas || !content) return
    const canvasRect = canvas.getBoundingClientRect()
    const zoom = Number((getComputedStyle(canvas) as CSSStyleDeclaration & { zoom: string }).zoom) || 1
    const next: Record<string, MarkerPosition> = {}
    specs.forEach((spec) => {
      const target = content.querySelector(spec.selector) as HTMLElement | null
      if (!target) return
      const rect = target.getBoundingClientRect()
      next[spec.id] = { left: Math.max(4, (rect.left - canvasRect.left) / zoom + 7), top: Math.max(4, (rect.top - canvasRect.top) / zoom + 7), width: rect.width / zoom, height: rect.height / zoom }
    })
    setPositions((current) => JSON.stringify(current) === JSON.stringify(next) ? current : next)
  }, [specs])

  useLayoutEffect(() => {
    updatePositions()
    const content = contentRef.current
    if (!content) return
    const resize = new ResizeObserver(updatePositions); resize.observe(content)
    const mutation = new MutationObserver(updatePositions); mutation.observe(content, { childList: true, subtree: true })
    window.addEventListener('resize', updatePositions)
    return () => { resize.disconnect(); mutation.disconnect(); window.removeEventListener('resize', updatePositions) }
  }, [updatePositions])

  useEffect(() => { const timeout = window.setTimeout(updatePositions, 80); return () => window.clearTimeout(timeout) }, [screen, updatePositions])

  const selectAndScroll = (id: string) => { onSelectSpec(id); window.setTimeout(() => markerRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }), 30) }
  const handlePreviewClick = (event: ReactMouseEvent) => {
    const anchor = (event.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null
    if (!anchor) return
    const linked = routeToScreen.get(anchor.getAttribute('href') ?? '')
    if (linked) { event.preventDefault(); onNavigate(linked) }
  }
  const selectedPosition = selectedSpecId ? positions[selectedSpecId] : null

  return <div className="screen-spec-preview-stage">
    <div className="screen-spec-preview-canvas" ref={canvasRef}>
      <div className="screen-spec-preview-content" ref={contentRef} onClickCapture={handlePreviewClick}><AdminDataProvider><ReviewerProvider><Component/></ReviewerProvider></AdminDataProvider></div>
      {selectedPosition && <div className="screen-spec-highlight" style={{ left: selectedPosition.left - 5, top: selectedPosition.top - 5, width: selectedPosition.width + 10, height: selectedPosition.height + 10 }}/>} 
      {specs.map((spec) => { const position = positions[spec.id]; if (!position) return null; return <button ref={(element) => { markerRefs.current[spec.id] = element }} type="button" key={spec.id} className={`screen-spec-marker ${selectedSpecId === spec.id ? 'active' : ''}`} style={{ left: position.left - 20, top: position.top - 20 }} onClick={() => selectAndScroll(spec.id)} aria-label={`${spec.number}번 ${spec.title}`}>{spec.number}</button> })}
    </div>
  </div>
}

function ScreenOverviewPanel({ metadata, specs, onSelect }: { metadata: NonNullable<ReturnType<typeof screenMetadata.find>>; specs: ScreenSpecification[]; onSelect: (id: string) => void }) {
  return <div className="screen-spec-detail-inner"><div className="spec-detail-heading"><span>SCREEN OVERVIEW</span><h2>{metadata.name}</h2><p>{metadata.purpose}</p></div><div className="spec-flow-summary"><strong>화면 Data Flow</strong>{screenDataFlows[metadata.key].map((item, index) => <div key={item}><span>{index + 1}</span><p>{item}</p>{index < screenDataFlows[metadata.key].length - 1 && <ChevronRight size={14}/>}</div>)}</div><div className="spec-index"><strong>기능 목록 · {specs.length}개</strong>{specs.map((spec) => <button key={spec.id} onClick={() => onSelect(spec.id)}><span>{String(spec.number).padStart(2, '0')}</span><div><b>{spec.title}</b><small>{spec.purpose}</small></div><em className={statusClass(spec.status)}>{spec.status}</em></button>)}</div></div>
}

const detailFields = (spec: ScreenSpecification) => [
  ['① 기능명', [spec.title]], ['② 기능 목적', [spec.purpose]], ['③ 기능 상세', [spec.description]], ['④ Input', spec.input], ['⑤ Output', spec.output], ['⑥ 데이터 정의', spec.dataDefinitions], ['⑦ Business Rule / 계산식', [...(spec.businessRules ?? []), ...(spec.calculationLogic ?? [])]], ['⑧ Validation', spec.validation], ['⑨ 사용자 Interaction', spec.interactions], ['⑩ 저장 / 조회 Trigger', [...(spec.trigger ?? []), ...(spec.saveBehavior ?? [])]], ['⑪ 연계 화면', spec.linkedScreen], ['⑫ 연계 데이터 / 시스템', [...(spec.sourceData ?? []), ...(spec.destinationData ?? []), ...(spec.linkedSystem ?? []), ...(spec.apiRequirement ?? [])]], ['⑬ Data Flow', spec.dataFlow], ['⑭ 권한', spec.permissions], ['⑮ 예외 처리', spec.exceptionHandling], ['⑯ 개발 시 확인 필요사항', [...(spec.developerNotes ?? []), ...(spec.openIssues ?? [])]],
] as const

function SpecificationDetail({ spec, onClose }: { spec: ScreenSpecification; onClose: () => void }) {
  return <div className="screen-spec-detail-inner"><div className="spec-detail-heading"><button type="button" onClick={onClose}><X size={15}/></button><span>{spec.screenId} · #{String(spec.number).padStart(2, '0')}</span><h2>{spec.title}</h2><em className={statusClass(spec.status)}>{spec.status}</em></div><div className="spec-detail-sections">{detailFields(spec).map(([label, values], index) => <section key={label} className={index < 3 ? 'core' : ''}><h3>{label}</h3>{values?.length ? <ul>{values.map((value) => <li key={value}>{value}</li>)}</ul> : <p>-</p>}</section>)}</div></div>
}

function OverviewAside() {
  return <div className="screen-spec-detail-inner"><div className="spec-detail-heading"><span>REFERENCE DOCUMENT</span><h2>문서 안내</h2><p>현재 React 프로토타입을 기준으로 작성된 개발 참고용 기능명세입니다.</p></div><div className="overview-status-list">{Object.entries(statusDescription).map(([status, description]) => <div key={status}><em className={statusClass(status)}>{status}</em><p>{description}</p></div>)}</div><div className="overview-counts"><div><span>화면</span><strong>6</strong></div><div><span>기능명세</span><strong>{allSpecifications.length}</strong></div><div><span>Reference Entity</span><strong>{referenceEntities.length}</strong></div><div><span>미확정사항</span><strong>{openIssues.length}</strong></div></div><div className="overview-caution"><AlertCircle size={17}/><p>API, DB, 인증, 권한, AI 모델, 채점센터 연계는 확정된 Architecture가 아닙니다.</p></div></div>
}

const overviewTabs: { key: OverviewTab; label: string; icon: ComponentType<{ size?: number }> }[] = [
  { key: 'readme', label: 'README', icon: BookOpen }, { key: 'flow', label: '전체 Data Flow', icon: GitBranch }, { key: 'dictionary', label: 'Data Dictionary', icon: Database }, { key: 'entities', label: '데이터 정의', icon: Boxes }, { key: 'interaction', label: 'Interaction Map', icon: ChevronRight }, { key: 'issues', label: '미확정/확인사항', icon: AlertCircle },
]

function OverviewDocument({ tab, onTabChange }: { tab: OverviewTab; onTabChange: (tab: OverviewTab) => void }) {
  return <section className="screen-spec-overview"><div className="overview-heading"><span>AI 자동채점 Admin</span><h2>전체 시스템 화면설계 개요</h2><p>현재 프로토타입의 화면·데이터·연계·미확정사항을 개발 관점에서 정리합니다.</p></div><div className="overview-screen-map">{screenMetadata.map((screen, index) => <div key={screen.key}><span>{String(screen.order).padStart(2, '0')}</span><strong>{screen.name}</strong><small>{screen.screenId}</small>{index < screenMetadata.length - 1 && <ChevronRight size={16}/>}</div>)}</div><div className="overview-tabs">{overviewTabs.map(({ key, label, icon: Icon }) => <button className={tab === key ? 'active' : ''} key={key} onClick={() => onTabChange(key)}><Icon size={15}/>{label}</button>)}</div><div className="overview-document-body">
    {tab === 'readme' && <Readme/>}
    {tab === 'flow' && <DataFlowDocument/>}
    {tab === 'dictionary' && <DictionaryDocument/>}
    {tab === 'entities' && <EntityDocument/>}
    {tab === 'interaction' && <InteractionDocument/>}
    {tab === 'issues' && <OpenIssuesDocument/>}
  </div></section>
}

function Readme() { return <div className="readme-grid">{readmeSections.map((section) => <article key={section.title}><h3>{section.title}</h3><ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}</div> }

function DataFlowDocument() { return <div className="flow-document"><h3>전체 채점 Data Flow</h3><FlowDiagram groups={gradingFlow}/><h3>Admin 연계 Flow</h3><FlowDiagram groups={adminFlow}/></div> }

function FlowDiagram({ groups }: { groups: FlowGroup[] }) { return <div className="flow-diagram">{groups.map((group, groupIndex) => { const branching = group.title === 'Routing' && group.nodes.length > 1; const renderNode = (node: FlowGroup['nodes'][number]) => <article className={`flow-node ${node.tone ?? ''}`}><b>{node.label}</b>{node.note && <small>{node.note}</small>}</article>; return <div className="flow-group" key={group.title}><strong>{group.title}</strong>{branching ? <div><div className="flow-node-wrap">{renderNode(group.nodes[0])}<span className="flow-arrow">↓</span></div><div className="flow-branch">{group.nodes.slice(1).map((node) => <div className="flow-node-wrap" key={node.id}>{renderNode(node)}</div>)}</div></div> : <div>{group.nodes.map((node, index) => <div className="flow-node-wrap" key={node.id}>{renderNode(node)}{index < group.nodes.length - 1 && <span className="flow-arrow">↓</span>}</div>)}</div>}{groupIndex < groups.length - 1 && <span className="flow-group-arrow">→</span>}</div> })}</div> }

function DictionaryDocument() { return <div><div className="document-notice"><Info size={16}/>공통 화면 표기와 코드의 Reference 정의입니다.</div><div className="dictionary-table-wrap"><table className="dictionary-table"><thead><tr><th>분류</th><th>Code / Field</th><th>화면 표시</th><th>정의</th><th>상태</th></tr></thead><tbody>{dataDictionary.map((item) => <tr key={`${item.category}-${item.code}`}><td>{item.category}</td><td><code>{item.code}</code></td><td>{item.display}</td><td>{item.definition}</td><td><em className={statusClass(item.status)}>{item.status}</em></td></tr>)}</tbody></table></div></div> }

function EntityDocument() { return <div><div className="document-warning"><AlertCircle size={17}/>{entityNotice}</div><div className="entity-grid">{referenceEntities.map((entity) => <article key={entity.name}><h3>{entity.name}</h3><p>{entity.description}</p><ul>{entity.fields.map((field) => <li key={field}><code>{field}</code></li>)}</ul></article>)}</div></div> }

function InteractionDocument() { return <div className="interaction-map">{interactionMap.map(([source, destination], index) => <div key={source}><span>{String(index + 1).padStart(2, '0')}</span><article><strong>{source}</strong></article><ChevronRight size={20}/><article className="destination"><strong>{destination}</strong></article></div>)}</div> }

function OpenIssuesDocument() { return <div className="open-issues"><div className="document-warning"><AlertCircle size={17}/>아래 항목은 임의로 확정하지 않으며 개발·운영·AI 담당자 협의가 필요합니다.</div><ol>{openIssues.map((issue, index) => <li key={issue}><span>{String(index + 1).padStart(2, '0')}</span><p>{issue}</p><em className="development">개발 확인 필요</em></li>)}</ol></div> }
