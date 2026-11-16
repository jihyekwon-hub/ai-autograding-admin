import { BookOpen, Calculator, Circle, FlaskConical, Languages, X } from 'lucide-react'
import type { Subject } from '../data/curriculum'
import type { ReviewedSheet, ReviewedWorksheet, WorksheetMark } from '../data/worksheets'

const subjectIcons: Record<Subject, typeof Calculator> = {
  수학: Calculator,
  영어: Languages,
  국어: BookOpen,
  과학: FlaskConical,
}

function MarkBadge({ mark }: { mark: WorksheetMark }) {
  return (
    <span className={`worksheet-mark ${mark}`} aria-label={mark === 'correct' ? '정답' : '오답'}>
      {mark === 'correct' ? <Circle size={20} strokeWidth={3.2} /> : <X size={22} strokeWidth={3.4} />}
    </span>
  )
}

// 채점 결과는 장 단위: A면과 B면을 나란히 보여준다.
export function ReviewedSheetView({ sheet }: { sheet: ReviewedSheet }) {
  return (
    <div className="reviewed-sheet">
      {sheet.sides.map((worksheet) => (
        <section className="reviewed-sheet-side" key={worksheet.side} aria-label={`${worksheet.side.toUpperCase()}면`}>
          <div className="reviewed-sheet-side-label">
            <strong>{worksheet.side.toUpperCase()}면</strong>
            {worksheet.reviewedQuestion !== null && <span>수정 문항 {worksheet.reviewedQuestion}번 포함</span>}
          </div>
          <ReviewedWorksheetView worksheet={worksheet} />
        </section>
      ))}
    </div>
  )
}

// 회원용 결과 화면(한 면): 전 문항 정답이면 큰 동그라미, 정답/오답이 섞이면 문항별 O/X를 표시한다.
function ReviewedWorksheetView({ worksheet }: { worksheet: ReviewedWorksheet }) {
  const Icon = subjectIcons[worksheet.subject]
  const longPrompt = worksheet.subject === '과학'

  return (
    <div className={`reviewed-worksheet ${worksheet.allCorrect ? 'all-correct' : 'mixed'}`}>
      <header className="reviewed-worksheet-header">
        <span className="reviewed-worksheet-code">{worksheet.code}</span>
        <Icon size={28} strokeWidth={1.8} />
        <strong>{worksheet.title}</strong>
      </header>
      <ol className={`reviewed-worksheet-items ${longPrompt ? 'long-prompt' : ''}`}>
        {worksheet.items.map((item) => (
          <li key={item.number}>
            <span className="worksheet-number">{item.number}</span>
            {!worksheet.allCorrect && <MarkBadge mark={item.mark} />}
            <span className="worksheet-prompt">{item.prompt}</span>
            <span className="worksheet-answer">{item.answer}</span>
          </li>
        ))}
      </ol>
      {worksheet.allCorrect && (
        <svg className="worksheet-perfect-circle" viewBox="0 0 400 400" preserveAspectRatio="none" aria-label="전 문항 정답">
          <path d="M226 14 C 340 14, 392 104, 388 202 C 384 306, 300 388, 196 386 C 92 384, 12 304, 14 198 C 16 98, 96 16, 210 18 C 262 19, 300 30, 330 52" />
          <path className="second-stroke" d="M236 26 C 340 34, 380 118, 376 208 C 370 300, 292 376, 192 374 C 98 372, 26 296, 28 196 C 30 108, 104 30, 228 30" />
        </svg>
      )}
    </div>
  )
}
