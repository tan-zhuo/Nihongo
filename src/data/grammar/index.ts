import type { GrammarPoint } from '../../types'
import n5 from './n5.json'
import n5b from './n5-b.json'
import n4 from './n4.json'
import n4b from './n4-b.json'
import n4c from './n4-c.json'
import n3 from './n3.json'
import n3b from './n3-b.json'
import n3c from './n3-c.json'
import n2 from './n2.json'
import n2b from './n2-b.json'
import n2c from './n2-c.json'
import n2d from './n2-d.json'
import n1 from './n1.json'
import n1b from './n1-b.json'
import n1c from './n1-c.json'
import n1d from './n1-d.json'
import keigo1 from './keigo-1.json'
import keigo2 from './keigo-2.json'
import keigo3 from './keigo-3.json'

/** JLPT grammar, easiest level first; order within a level is the teaching order. */
export const grammarPoints: GrammarPoint[] = [
  ...(n5 as GrammarPoint[]),
  ...(n5b as GrammarPoint[]),
  ...(n4 as GrammarPoint[]),
  ...(n4b as GrammarPoint[]),
  ...(n4c as GrammarPoint[]),
  ...(n3 as GrammarPoint[]),
  ...(n3b as GrammarPoint[]),
  ...(n3c as GrammarPoint[]),
  ...(n2 as GrammarPoint[]),
  ...(n2b as GrammarPoint[]),
  ...(n2c as GrammarPoint[]),
  ...(n2d as GrammarPoint[]),
  ...(n1 as GrammarPoint[]),
  ...(n1b as GrammarPoint[]),
  ...(n1c as GrammarPoint[]),
  ...(n1d as GrammarPoint[]),
]

/** The keigo course, in lesson order rather than by level. */
export const keigoLessons: GrammarPoint[] = [
  ...(keigo1 as GrammarPoint[]),
  ...(keigo2 as GrammarPoint[]),
  ...(keigo3 as GrammarPoint[]),
]

/** Consecutive runs of the same `group`, preserving the authored order. */
export function byGroup(points: GrammarPoint[]): { group: string; items: GrammarPoint[] }[] {
  const out: { group: string; items: GrammarPoint[] }[] = []
  for (const p of points) {
    const last = out[out.length - 1]
    if (last && last.group === p.group) last.items.push(p)
    else out.push({ group: p.group, items: [p] })
  }
  return out
}
