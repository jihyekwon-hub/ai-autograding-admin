import { ClipboardList } from 'lucide-react'

type PlaceholderPageProps = {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="page basic-page">
      <div className="page-title-block">
        <p>AI 자동채점 관리</p>
        <h1>{title}</h1>
        <span>{description}</span>
      </div>
      <section className="content-card">
        <div className="empty-state-icon"><ClipboardList size={27} /></div>
        <h2>{title} 화면</h2>
        <p>세부 기능은 다음 개발 단계에서 추가할 예정입니다.</p>
      </section>
    </div>
  )
}
