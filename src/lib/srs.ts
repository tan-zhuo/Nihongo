/**
 * Leitner-box review state for 标准日本语 textbook words.
 *
 * Each word sits in a box 0–5. Getting it right moves it up one box, getting
 * it wrong drops it back to box 1 (never all the way to 0 — 0 means "never
 * studied"). A word is due for review once its box's interval has elapsed.
 */

const KEY = 'nihongo.textbook.srs.v1'

/** Days a word rests in each box before it comes up for review again. */
const INTERVAL_DAYS = [0, 1, 2, 4, 8, 16]
const DAY_MS = 86_400_000

/** From this box up, a word counts as learned in the progress rings. */
export const MASTERED_BOX = 3
export const MAX_BOX = INTERVAL_DAYS.length - 1

export interface SrsEntry {
  /** current Leitner box, 1–5 (absent word = box 0, never studied) */
  b: number
  /** timestamp of the last answer */
  t: number
}

export type SrsState = Record<string, SrsEntry>

let cache: SrsState | null = null

export function loadSrs(): SrsState {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    cache = raw ? (JSON.parse(raw) as SrsState) : {}
  } catch {
    cache = {}
  }
  return cache
}

function persist(state: SrsState) {
  cache = state
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // storage full or unavailable — progress is best-effort
  }
}

export function boxOf(id: string, state?: SrsState): number {
  return (state ?? loadSrs())[id]?.b ?? 0
}

/** Record one answer. Right → next box; wrong → back to box 1. */
export function grade(id: string, correct: boolean): number {
  const state = { ...loadSrs() }
  const box = state[id]?.b ?? 0
  const next = correct ? Math.min(box + 1, MAX_BOX) : 1
  state[id] = { b: next, t: Date.now() }
  persist(state)
  return next
}

export function isDue(id: string, state?: SrsState, now = Date.now()): boolean {
  const entry = (state ?? loadSrs())[id]
  if (!entry) return true // never studied
  return now - entry.t >= INTERVAL_DAYS[entry.b] * DAY_MS
}

export interface Progress {
  total: number
  /** studied at least once */
  seen: number
  /** in box MASTERED_BOX or higher */
  mastered: number
  /** due for review right now, among words already studied */
  due: number
}

export function progressOf(words: { id: string }[], state?: SrsState): Progress {
  const s = state ?? loadSrs()
  const now = Date.now()
  let seen = 0
  let mastered = 0
  let due = 0
  for (const w of words) {
    const entry = s[w.id]
    if (!entry) continue
    seen++
    if (entry.b >= MASTERED_BOX) mastered++
    if (isDue(w.id, s, now)) due++
  }
  return { total: words.length, seen, mastered, due }
}

/** Reset every word in the given list back to "never studied". */
export function resetProgress(words: { id: string }[]) {
  const state = { ...loadSrs() }
  for (const w of words) delete state[w.id]
  persist(state)
}
