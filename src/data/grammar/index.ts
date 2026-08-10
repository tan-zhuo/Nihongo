import type { GrammarPoint } from '../../types'
import n5 from './n5.json'
import n4 from './n4.json'
import n3 from './n3.json'
import n2 from './n2.json'
import n1 from './n1.json'
import keigo1 from './keigo-1.json'
import keigo2 from './keigo-2.json'

/** JLPT grammar, easiest level first; order within a level is the teaching order. */
export const grammarPoints: GrammarPoint[] = [
  ...(n5 as GrammarPoint[]),
  ...(n4 as GrammarPoint[]),
  ...(n3 as GrammarPoint[]),
  ...(n2 as GrammarPoint[]),
  ...(n1 as GrammarPoint[]),
]

/** The keigo course, in lesson order rather than by level. */
export const keigoLessons: GrammarPoint[] = [
  ...(keigo1 as GrammarPoint[]),
  ...(keigo2 as GrammarPoint[]),
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
