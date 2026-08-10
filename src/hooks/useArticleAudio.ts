import { useCallback, useEffect, useRef, useState } from 'react'
import type { Sentence } from '../types'
import { speak, cancelSpeech } from '../lib/tts'
import manifest from '../data/audio-manifest.json'

interface AudioEntry {
  dur: number
  starts: number[]
}

const AUDIO: Record<string, AudioEntry> = (manifest.articles ?? {}) as Record<string, AudioEntry>

/**
 * Reads an article aloud sentence by sentence, reporting which sentence is
 * playing so the view can follow along. Uses the pre-generated neural track
 * when the article has one, else the browser's speech synthesis.
 */
export function useArticleAudio(articleId: string | undefined, sentences: Sentence[]) {
  const [playing, setPlaying] = useState(false)
  const [index, setIndex] = useState(-1)
  const [rate, setRate] = useState(1)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const cursor = useRef(0)
  const entry = articleId ? AUDIO[articleId] : undefined

  const stop = useCallback(() => {
    cancelSpeech()
    audioRef.current?.pause()
    audioRef.current = null
    cursor.current = 0
    setPlaying(false)
    setIndex(-1)
  }, [])

  // Stop when leaving the article or unmounting — audio must never outlive the view.
  useEffect(() => stop, [articleId, stop])

  const speakFrom = useCallback(
    (i: number) => {
      if (i >= sentences.length) {
        setPlaying(false)
        setIndex(-1)
        return
      }
      cursor.current = i
      setIndex(i)
      speak(sentences[i].ja, {
        rate,
        onEnd: () => {
          // A stop() between utterances rewinds the cursor; don't resurrect it.
          if (cursor.current !== i) return
          speakFrom(i + 1)
        },
      })
    },
    [sentences, rate],
  )

  const play = useCallback(
    (from = 0) => {
      if (!sentences.length) return
      setPlaying(true)
      if (entry && articleId) {
        const el = audioRef.current ?? new Audio(`/audio/${articleId}.mp3`)
        audioRef.current = el
        el.playbackRate = rate
        el.currentTime = entry.starts[from] ?? 0
        el.ontimeupdate = () => {
          const t = el.currentTime
          let i = 0
          while (i + 1 < entry.starts.length && entry.starts[i + 1] <= t) i++
          setIndex(i)
        }
        el.onended = () => {
          setPlaying(false)
          setIndex(-1)
        }
        void el.play()
        return
      }
      speakFrom(from)
    },
    [sentences, entry, articleId, rate, speakFrom],
  )

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
    } else {
      cancelSpeech()
    }
    setPlaying(false)
  }, [])

  const toggle = useCallback(() => {
    if (playing) pause()
    else play(audioRef.current ? undefined : Math.max(index, 0))
  }, [playing, pause, play, index])

  const changeRate = useCallback(
    (r: number) => {
      setRate(r)
      if (audioRef.current) audioRef.current.playbackRate = r
    },
    [],
  )

  return { playing, index, rate, play, pause, stop, toggle, setRate: changeRate, neural: Boolean(entry) }
}
