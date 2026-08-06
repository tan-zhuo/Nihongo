import { useCallback, useRef, useState } from 'react'

export type CharStatus = 'correct' | 'wrong' | 'current' | 'pending' | 'untyped'

export interface TypingStats {
  elapsedMs: number
  cpm: number
  accuracy: number
  errors: number
  totalChars: number
}

/** Split article text into typing lines, breaking after punctuation when possible. */
export function splitLines(text: string, max = 22): string[] {
  const lines: string[] = []
  let rest = text
  while (rest.length > max) {
    let cut = -1
    for (let i = max; i >= Math.floor(max / 2); i--) {
      if ('。、！？」）'.includes(rest[i - 1])) {
        cut = i
        break
      }
    }
    if (cut === -1) cut = max
    lines.push(rest.slice(0, cut))
    rest = rest.slice(cut)
  }
  if (rest) lines.push(rest)
  return lines
}

/**
 * Line-by-line IME-aware typing state. One input line per text line; a line
 * commits automatically once fully typed, and characters committed past the
 * end of a line (e.g. a multi-char IME confirmation) carry over to the next
 * line. Characters in an unconfirmed IME composition are "pending" and not
 * graded, so kana-to-kanji conversion never counts as a mistake.
 */
export function useLineTyping(lines: string[]) {
  const [lineIdx, setLineIdx] = useState(0)
  const [current, setCurrent] = useState('')
  const [done, setDone] = useState<string[]>([])
  const [composing, setComposing] = useState(false)
  const [finished, setFinished] = useState(false)
  const [stats, setStats] = useState<TypingStats | null>(null)

  const compositionBase = useRef(0)
  const gradedLen = useRef(0)
  const totalGraded = useRef(0)
  const errorCount = useRef(0)
  const startTime = useRef<number | null>(null)

  const totalChars = lines.reduce((n, l) => n + l.length, 0)

  const finish = useCallback(() => {
    const end = Date.now()
    const start = startTime.current ?? end
    const elapsedMs = Math.max(end - start, 1)
    const total = totalGraded.current
    setStats({
      elapsedMs,
      cpm: Math.round(totalChars / (elapsedMs / 60000)),
      accuracy: total > 0 ? Math.max(0, (total - errorCount.current) / total) : 1,
      errors: errorCount.current,
      totalChars,
    })
    setFinished(true)
  }, [totalChars])

  const handleChange = useCallback(
    (value: string, isComposing: boolean) => {
      if (finished) return
      if (startTime.current === null && value.length > 0) startTime.current = Date.now()
      if (isComposing) {
        setCurrent(value)
        return
      }
      let idx = lineIdx
      const doneArr = [...done]
      let v = value
      if (v.length < gradedLen.current) gradedLen.current = v.length
      // Commit as many full lines as the value covers (IME can confirm
      // several characters at once, crossing a line boundary).
      while (idx < lines.length && v.length >= lines[idx].length) {
        const target = lines[idx]
        for (let i = gradedLen.current; i < target.length; i++) {
          totalGraded.current++
          if (v[i] !== target[i]) errorCount.current++
        }
        doneArr.push(v.slice(0, target.length))
        v = v.slice(target.length)
        idx++
        gradedLen.current = 0
      }
      if (idx >= lines.length) {
        setDone(doneArr)
        setLineIdx(idx)
        setCurrent('')
        finish()
        return
      }
      const target = lines[idx]
      for (let i = gradedLen.current; i < v.length && i < target.length; i++) {
        totalGraded.current++
        if (v[i] !== target[i]) errorCount.current++
      }
      gradedLen.current = v.length
      setDone(doneArr)
      setLineIdx(idx)
      setCurrent(v)
    },
    [finished, lineIdx, done, lines, finish],
  )

  const onCompositionStart = useCallback((valueLen: number) => {
    setComposing(true)
    compositionBase.current = valueLen
  }, [])

  const onCompositionEnd = useCallback(
    (value: string) => {
      setComposing(false)
      handleChange(value, false)
    },
    [handleChange],
  )

  const reset = useCallback(() => {
    setLineIdx(0)
    setCurrent('')
    setDone([])
    setComposing(false)
    setFinished(false)
    setStats(null)
    compositionBase.current = 0
    gradedLen.current = 0
    totalGraded.current = 0
    errorCount.current = 0
    startTime.current = null
  }, [])

  const statusOf = useCallback(
    (line: number, ch: number): CharStatus => {
      if (line < lineIdx) {
        return done[line]?.[ch] === lines[line][ch] ? 'correct' : 'wrong'
      }
      if (line === lineIdx) {
        if (ch < current.length) {
          if (composing && ch >= compositionBase.current) return 'pending'
          return current[ch] === lines[line][ch] ? 'correct' : 'wrong'
        }
        if (ch === current.length && !finished) return 'current'
      }
      return 'untyped'
    },
    [lineIdx, done, current, composing, finished, lines],
  )

  const typedTotal = done.reduce((n, l) => n + l.length, 0) + current.length

  return {
    lineIdx,
    current,
    done,
    finished,
    stats,
    typedTotal,
    totalChars,
    handleChange,
    onCompositionStart,
    onCompositionEnd,
    reset,
    statusOf,
  }
}
