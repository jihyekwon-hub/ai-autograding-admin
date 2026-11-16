import type { Subject } from './curriculum'
import type { GradingError } from './errors'

// 검수 완료 후 회원에게 보여지는 학습지 결과 화면용 mock 데이터.
// 수정 내역(GradingError)마다 항상 같은 학습지가 나오도록 id 기반 seed로 생성한다.

export type WorksheetMark = 'correct' | 'wrong'

export type WorksheetItem = {
  number: number
  prompt: string
  answer: string
  mark: WorksheetMark
}

export type ReviewedWorksheet = {
  code: string
  title: string
  subject: Subject
  items: WorksheetItem[]
  allCorrect: boolean
}

const QUESTION_COUNT = 10

type Question = { prompt: string; correct: string; wrong: string }

function hash(text: string) {
  let value = 0
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0
  return value
}

function createRandom(seed: number) {
  let state = seed || 1
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state / 2147483648
  }
}

function shuffle<T>(items: readonly T[], random: () => number) {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

function mathQuestions(random: () => number): { title: string; questions: Question[] } {
  const subtraction = random() < 0.5
  const questions = Array.from({ length: QUESTION_COUNT }, () => {
    const a = 3 + Math.floor(random() * 15)
    const b = 1 + Math.floor(random() * Math.min(a - 1, 9))
    const correct = subtraction ? a - b : a + b
    const wrong = correct + (random() < 0.5 && correct > 0 ? -1 : 1)
    return { prompt: `${a} ${subtraction ? '−' : '+'} ${b} =`, correct: String(correct), wrong: String(wrong) }
  })
  return { title: subtraction ? '뺄셈을 하세요' : '덧셈을 하세요', questions }
}

const englishWords: [string, string, string][] = [
  ['사과', 'apple', 'aple'], ['고양이', 'cat', 'cet'], ['학교', 'school', 'scool'], ['책', 'book', 'bok'],
  ['물', 'water', 'woter'], ['친구', 'friend', 'frend'], ['하늘', 'sky', 'ski'], ['연필', 'pencil', 'pensil'],
  ['꽃', 'flower', 'flawer'], ['집', 'house', 'hous'], ['달', 'moon', 'mun'], ['빨강', 'red', 'rad'],
]

const koreanOpposites: [string, string, string][] = [
  ['크다', '작다', '적다'], ['높다', '낮다', '얕다'], ['많다', '적다', '작다'], ['길다', '짧다', '작다'],
  ['덥다', '춥다', '차다'], ['빠르다', '느리다', '늦다'], ['밝다', '어둡다', '검다'], ['무겁다', '가볍다', '얇다'],
  ['넓다', '좁다', '작다'], ['깊다', '얕다', '낮다'], ['두껍다', '얇다', '가늘다'], ['멀다', '가깝다', '짧다'],
]

const scienceBlanks: [string, string, string][] = [
  ['물이 얼면 (　　　)이 됩니다.', '얼음', '눈'], ['해는 (　　　)쪽에서 뜹니다.', '동', '서'],
  ['자석은 (　　　)을 끌어당깁니다.', '철', '나무'], ['물이 끓으면 (　　　)가 됩니다.', '수증기', '구름'],
  ['곤충의 다리는 (　　　)개입니다.', '6', '8'], ['소리는 물체의 (　　　)으로 생깁니다.', '떨림', '바람'],
  ['얼음이 녹으면 (　　　)이 됩니다.', '물', '얼음'], ['식물이 자라려면 물과 (　　　)이 필요합니다.', '햇빛', '바람'],
  ['지구는 (　　　) 주위를 돕니다.', '태양', '달'], ['거미의 다리는 (　　　)개입니다.', '8', '6'],
  ['달은 (　　　) 주위를 돕니다.', '지구', '태양'], ['물고기는 (　　　)로 숨을 쉽니다.', '아가미', '폐'],
]

function bankQuestions(bank: [string, string, string][], random: () => number, format: (word: string) => string): Question[] {
  return shuffle(bank, random).slice(0, QUESTION_COUNT).map(([prompt, correct, wrong]) => ({ prompt: format(prompt), correct, wrong }))
}

function questionsFor(subject: Subject, random: () => number) {
  if (subject === '수학') return mathQuestions(random)
  if (subject === '영어') return { title: '우리말을 영어로 쓰세요', questions: bankQuestions(englishWords, random, (word) => `${word} →`) }
  if (subject === '국어') return { title: '반대말을 쓰세요', questions: bankQuestions(koreanOpposites, random, (word) => `${word} ↔`) }
  return { title: '알맞은 말을 쓰세요', questions: bankQuestions(scienceBlanks, random, (sentence) => sentence) }
}

export function createReviewedWorksheet(error: GradingError): ReviewedWorksheet {
  const seed = hash(error.id)
  const random = createRandom(seed)
  const { title, questions } = questionsFor(error.subject, random)
  const reviewedIndex = Math.min(Math.max(error.question, 1), QUESTION_COUNT) - 1
  const allCorrect = error.after === '정답' && seed % 3 === 0

  const marks: WorksheetMark[] = questions.map((_, index) => {
    if (index === reviewedIndex) return error.after === '정답' ? 'correct' : 'wrong'
    if (allCorrect) return 'correct'
    return random() < 0.3 ? 'wrong' : 'correct'
  })
  if (!allCorrect && !marks.includes('wrong')) marks[(reviewedIndex + 3) % QUESTION_COUNT] = 'wrong'

  return {
    code: `${error.subject} ${error.stage} ${error.progress}${error.page % 2 === 0 ? 'a' : 'b'}`,
    title,
    subject: error.subject,
    allCorrect,
    items: questions.map((question, index) => ({
      number: index + 1,
      prompt: question.prompt,
      answer: marks[index] === 'correct' ? question.correct : question.wrong,
      mark: marks[index],
    })),
  }
}
