import {
  BarChart3,
  Bell,
  ChevronDown,
  ClipboardList,
  ClipboardCheck,
  GraduationCap,
  History,
  LayoutDashboard,
  Menu,
  FileText,
  SlidersHorizontal,
  UserRoundCheck,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

const navigation = [
  { to: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { to: '/performance', label: '실적관리', icon: BarChart3 },
  { to: '/standards', label: '운영기준 설정', icon: SlidersHorizontal },
  { to: '/reviewers', label: '검수교사 관리', icon: UserRoundCheck },
  { to: '/review-status', label: '수정내역', icon: ClipboardCheck },
  { to: '/history', label: '이력관리', icon: History },
]

export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div className="brand">
          <span className="brand-mark"><GraduationCap size={22} /></span>
          <span>AI 자동채점</span>
        </div>

        <nav className="nav-list" aria-label="주요 메뉴">
          <p className="nav-caption">메인 메뉴</p>
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
          <div className="nav-divider" />
          <p className="nav-caption nav-caption-reference">개발 Reference</p>
          <NavLink
            to="/screen-spec"
            end
            className={({ isActive }) => `nav-item nav-item-reference ${isActive ? 'active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            <FileText size={19} />
            <span>화면설계서</span>
          </NavLink>
        </nav>

        <div className="sidebar-bottom">
          <div className="system-status">
            <span className="status-dot" />
            <div>
              <strong>시스템 정상</strong>
              <small>모든 서비스 운영 중</small>
            </div>
          </div>
        </div>
      </aside>

      {menuOpen && <button className="sidebar-backdrop" aria-label="메뉴 닫기" onClick={() => setMenuOpen(false)} />}

      <div className="main-column">
        <header className="topbar">
          <button className="menu-button" aria-label="메뉴 열기" onClick={() => setMenuOpen(true)}><Menu size={22} /></button>
          <div className="header-title"><ClipboardList size={20} /><strong>AI 자동채점 관리자</strong></div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="알림"><Bell size={19} /><span className="notification-dot" /></button>
            <div className="divider" />
            <button className="profile-button">
              <span className="avatar">관</span>
              <span className="profile-copy"><strong>김관리</strong><small>최고 관리자</small></span>
              <ChevronDown size={16} />
            </button>
          </div>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  )
}
