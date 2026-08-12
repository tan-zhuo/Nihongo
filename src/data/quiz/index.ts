import type { QuizQuestion } from '../../types'
import n5 from './n5.json'
import n4 from './n4.json'
import n3 from './n3.json'
import n2 from './n2.json'
import n1 from './n1.json'

export const quizQuestions: QuizQuestion[] = [
  ...(n5 as QuizQuestion[]),
  ...(n4 as QuizQuestion[]),
  ...(n3 as QuizQuestion[]),
  ...(n2 as QuizQuestion[]),
  ...(n1 as QuizQuestion[]),
]
