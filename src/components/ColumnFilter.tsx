import { ArrowDownAZ, ArrowUpAZ, ChevronDown, Filter, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// 엑셀 자동필터처럼 표 머리글에서 값 목록을 체크해 행을 거르는 드롭다운.
// - 값 검색, (모두 선택), 값별 체크, 오름차순/내림차순 정렬, [확인]/[취소]
// - 목록 값은 다른 열의 필터를 적용한 결과에서 뽑아 엑셀처럼 연쇄 필터링된다.
// - 메뉴는 body에 portal로 띄워 고정 머리글·스크롤 영역에 가려지지 않게 한다.

export type SortDirection = 'asc' | 'desc'

type ColumnFilterProps = {
  label: string
  /** 선택할 수 있는 값(정렬된 상태로 전달) */
  values: string[]
  /** null = 필터 없음(전체), 배열 = 선택된 값만 표시 */
  selected: string[] | null
  sort: SortDirection | null
  onApply: (selected: string[] | null) => void
  onSort: (direction: SortDirection) => void
}

export function ColumnFilter({ label, values, selected, sort, onApply, onSort }: ColumnFilterProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<Set<string>>(new Set())
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const active = selected !== null

  const openMenu = () => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) setPosition({ top: rect.bottom + 4, left: Math.max(8, Math.min(rect.left, window.innerWidth - 248)) })
    setDraft(new Set(selected ?? values))
    setQuery('')
    setOpen(true)
  }

  // 바깥 클릭·스크롤·창 크기 변경 시 닫는다(표 스크롤 영역에 잘리지 않도록 화면 고정 위치로 띄움).
  useEffect(() => {
    if (!open) return
    const close = (event: Event) => {
      if (event.type === 'mousedown' && (menuRef.current?.contains(event.target as Node) || buttonRef.current?.contains(event.target as Node))) return
      if (event.type === 'scroll' && menuRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  const visible = values.filter((value) => value.toLowerCase().includes(query.trim().toLowerCase()))
  const allVisibleChecked = visible.length > 0 && visible.every((value) => draft.has(value))

  const toggleAll = () => setDraft((current) => {
    const next = new Set(current)
    visible.forEach((value) => { if (allVisibleChecked) next.delete(value); else next.add(value) })
    return next
  })
  const toggle = (value: string) => setDraft((current) => {
    const next = new Set(current)
    if (next.has(value)) next.delete(value); else next.add(value)
    return next
  })
  const apply = () => {
    // 전부 선택이면 필터 해제와 같다.
    onApply(values.every((value) => draft.has(value)) ? null : values.filter((value) => draft.has(value)))
    setOpen(false)
  }

  return (
    <>
      <button ref={buttonRef} type="button" className={`column-filter-button ${active ? 'active' : ''} ${sort ? 'sorted' : ''}`} aria-label={`${label} 필터`} aria-expanded={open} onClick={() => (open ? setOpen(false) : openMenu())}>
        {active ? <Filter size={12} /> : <ChevronDown size={13} />}
      </button>
      {open && createPortal(
        <div ref={menuRef} className="column-filter-menu" style={{ top: position.top, left: position.left }} role="dialog" aria-label={`${label} 필터`}>
          <button type="button" className={sort === 'asc' ? 'on' : ''} onClick={() => { onSort('asc'); setOpen(false) }}><ArrowDownAZ size={14} /> 오름차순 정렬</button>
          <button type="button" className={sort === 'desc' ? 'on' : ''} onClick={() => { onSort('desc'); setOpen(false) }}><ArrowUpAZ size={14} /> 내림차순 정렬</button>
          <div className="column-filter-search"><Search size={13} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="검색" autoFocus /></div>
          <div className="column-filter-list">
            <label><input type="checkbox" checked={allVisibleChecked} onChange={toggleAll} /> (모두 선택)</label>
            {visible.map((value) => (
              <label key={value}><input type="checkbox" checked={draft.has(value)} onChange={() => toggle(value)} /> {value || '(빈 값)'}</label>
            ))}
            {visible.length === 0 && <p>일치하는 값이 없습니다.</p>}
          </div>
          <div className="column-filter-actions">
            <button type="button" className="confirm" disabled={draft.size === 0} onClick={apply}>확인</button>
            <button type="button" onClick={() => setOpen(false)}>취소</button>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
