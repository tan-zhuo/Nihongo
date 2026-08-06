import type { VocabWord } from '../../types'
import n5 from './n5.json'
import n4 from './n4.json'
import n3 from './n3.json'
import n2 from './n2.json'
import n1 from './n1.json'

export const vocab: VocabWord[] = [
  ...(n5 as VocabWord[]),
  ...(n4 as VocabWord[]),
  ...(n3 as VocabWord[]),
  ...(n2 as VocabWord[]),
  ...(n1 as VocabWord[]),
]
