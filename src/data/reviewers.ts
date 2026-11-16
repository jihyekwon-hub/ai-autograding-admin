export type ReviewerStatus = '근무중' | '휴식중' | '미배정'
import { curriculumStages, type Subject } from './curriculum'
export type ReviewerSubject = Subject

export type ReviewerRange = { id: string; subject: ReviewerSubject; stage: string; progressFrom: number; progressTo: number }

export type Reviewer = {
  id: string
  name: string
  status: ReviewerStatus
  subject: ReviewerSubject
  stage: string
  progressFrom: number
  progressTo: number
  assignedPages: number
  processedPages: number
  workStart: string
  workEnd: string
  hourlyCapacity: number
  expectedAllowance: number
  phone: string
  email: string
  note: string
  ranges: ReviewerRange[]
}

export const reviewerStages = curriculumStages

export const initialReviewers: Reviewer[] = [
  { id: 'TCH001', name: '검수교사 A', status: '근무중', subject: '수학', stage: 'A', progressFrom: 1, progressTo: 30, assignedPages: 1800, processedPages: 1296, workStart: '08:00', workEnd: '13:12', hourlyCapacity: 345, expectedAllowance: 259200, phone: '010-1234-5678', email: 'a.teacher@edu.kr', note: '외부 검수교사', ranges: [{ id: 'R-A1', subject: '수학', stage: 'A', progressFrom: 1, progressTo: 30 }, { id: 'R-A2', subject: '수학', stage: 'B', progressFrom: 50, progressTo: 80 }, { id: 'R-A3', subject: '국어', stage: '2A', progressFrom: 1, progressTo: 50 }, { id: 'R-A4', subject: '과학', stage: 'A', progressFrom: 100, progressTo: 150 }] },
  { id: 'TCH002', name: '검수교사 B', status: '근무중', subject: '수학', stage: 'A', progressFrom: 31, progressTo: 60, assignedPages: 1600, processedPages: 1040, workStart: '08:20', workEnd: '13:36', hourlyCapacity: 323, expectedAllowance: 288600, phone: '010-2345-6789', email: 'b.teacher@edu.kr', note: '외부 검수교사', ranges: [{ id: 'R-B1', subject: '수학', stage: 'A', progressFrom: 31, progressTo: 60 }, { id: 'R-B2', subject: '영어', stage: '3A', progressFrom: 1, progressTo: 40 }] },
  { id: 'TCH003', name: '검수교사 C', status: '근무중', subject: '국어', stage: '2A', progressFrom: 51, progressTo: 90, assignedPages: 1400, processedPages: 812, workStart: '08:10', workEnd: '13:12', hourlyCapacity: 303, expectedAllowance: 181600, phone: '010-3456-7890', email: 'c.teacher@edu.kr', note: '내부 검수교사', ranges: [{ id: 'R-C1', subject: '국어', stage: '2A', progressFrom: 51, progressTo: 90 }, { id: 'R-C2', subject: '과학', stage: '2A', progressFrom: 1, progressTo: 45 }] },
  { id: 'TCH004', name: '검수교사 D', status: '휴식중', subject: '과학', stage: 'A', progressFrom: 46, progressTo: 100, assignedPages: 1520, processedPages: 927, workStart: '08:15', workEnd: '13:09', hourlyCapacity: 306, expectedAllowance: 195800, phone: '010-4567-8901', email: 'd.teacher@edu.kr', note: '외부 검수교사', ranges: [{ id: 'R-D1', subject: '과학', stage: 'A', progressFrom: 46, progressTo: 100 }] },
  { id: 'TCH005', name: '검수교사 E', status: '근무중', subject: '영어', stage: '2A', progressFrom: 41, progressTo: 90, assignedPages: 1500, processedPages: 705, workStart: '08:30', workEnd: '13:01', hourlyCapacity: 319, expectedAllowance: 162400, phone: '010-5678-9012', email: 'e.teacher@edu.kr', note: '외부 검수교사', ranges: [{ id: 'R-E1', subject: '영어', stage: '2A', progressFrom: 41, progressTo: 90 }] },
]
