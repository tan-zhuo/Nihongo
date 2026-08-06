import { useCallback, useRef, useState } from 'react'

export type CharStatus = 'correct' | 'wrong' | 'current' | 'pending' | 'untyped'

export interface TypingStats {
  elapsedMs: number
  cpm: number
  accuracy: number
  errors: number
  totalChars: number
}

/**
 * IME-aware typing state. Characters that are part of an unconfirmed IME
 * composition are shown as "pending" and not graded until the conversion
 * is committed, so kana-to-kanji conversion never counts as a mistake.
 */
export function useTyping(target: string) {
  const [typed, setTyped] = useState('')
  const [composing, setComposing] = useState(false)
  const [finished, setFinished] = useState(false)
  const [stats, setStats] = useState<TypingStats | null>(null)
  // Bumped on grading so char statuses re-render even when refs change.
  const [, setTick] = useState(0)

  const compositionBase = useRef(0)
  const gradedLen = useRef(0)
  const totalGraded = useRef(0)
  const errorCount = useRef(0)
  const startTime = useRef<number | null>(null)

  const grade = useCallback(
    (value: string) => {
      if (value.length < gradedLen.current) {
        gradedLen.current = value.length
        return
      }
      for (let i = gradedLen.current; i < value.length && i < target.length; i++) {
        totalGraded.current++
        if (value[i] !== target[i]) errorCount.current++
      }
      gradedLen.current = value.length
      setTick((n) => n + 1)
    },
    [target],
  )

  const finish = useCallback(
    (value: string) => {
      const end = Date.now()
      const start = startTime.current ?? end
      const elapsedMs = Math.max(end - start, 1)
      const total = totalGraded.current
      setStats({
        elapsedMs,
        cpm: Math.round(target.length / (elapsedMs / 60000)),
        accuracy: total > 0 ? Math.max(0, (total - errorCount.current) / total) : 1,
        errors: errorCount.current,
        totalChars: value.length,
      })
      setFinished(true)
    },
    [target],
  )

  const onChange = useCallback(
    (value: string, isComposing: boolean) => {
      if (finished) return
      if (startTime.current === null && value.length > 0) startTime.current = Date.now()
      setTyped(value)
      if (!isComposing) {
        grade(value)
        if (value.length >= target.length) finish(value)
      }
    },
    [finished, grade, finish, target],
  )

  const onCompositionStart = useCallback((valueLen: number) => {
    setComposing(true)
    compositionBase.current = valueLen
  }, [])

  const onCompositionEnd = useCallback(
    (value: string) => {
      setComposing(false)
      grade(value)
      if (value.length >= target.length && !finished) finish(value)
    },
    [grade, finish, finished, target],
  )

  const reset = useCallback(() => {
    setTyped('')
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
    (index: number): CharStatus => {
      if (index < typed.length) {
        if (composing && index >= compositionBase.current) return 'pending'
        return typed[index] === target[index] ? 'correct' : 'wrong'
      }
      if (index === typed.length && !finished) return 'current'
      return 'untyped'
    },
    [typed, composing, finished, target],
  )

  return { typed, finished, stats, onChange, onCompositionStart, onCompositionEnd, reset, statusOf }
}
