/**
 * Japanese speech. Prefers pre-generated neural audio when an article has it;
 * otherwise falls back to the browser's speech synthesis, choosing the best
 * Japanese voice available instead of whatever the platform defaults to.
 */

// Browsers expose their good Japanese voices under these names. The default
// pick is often a low-quality local voice even when a better one is installed.
const PREFERRED_VOICES = [
  'Google 日本語',
  'Microsoft Nanami',
  'Microsoft Ayumi',
  'Microsoft Haruka',
  'Kyoko',
  'O-ren',
  'Hattori',
  'Otoya',
]

let cached: SpeechSynthesisVoice | null | undefined

function rank(v: SpeechSynthesisVoice): number {
  const i = PREFERRED_VOICES.findIndex((name) => v.name.includes(name))
  if (i !== -1) return i
  // Network voices are generally better than local ones.
  return PREFERRED_VOICES.length + (v.localService ? 1 : 0)
}

export function bestJapaneseVoice(): SpeechSynthesisVoice | null {
  if (cached !== undefined) return cached
  if (typeof speechSynthesis === 'undefined') return (cached = null)
  const ja = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('ja'))
  if (ja.length === 0) return null // voices may not be loaded yet; don't cache
  cached = ja.sort((a, b) => rank(a) - rank(b))[0]
  return cached
}

if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.addEventListener?.('voiceschanged', () => {
    cached = undefined
  })
}

/**
 * Play a pre-generated kana clip when one exists, else synthesize it.
 * `key` is the kana's primary romaji (the audio filename stem).
 */
export function speakKana(kana: string, key: string, available: readonly string[]) {
  if (available.includes(key)) {
    cancelSpeech()
    const el = new Audio(`/audio/kana/${key}.mp3`)
    el.play().catch(() => speak(kana, { rate: 0.85 }))
    return
  }
  speak(kana, { rate: 0.85 })
}

/** Play several kana clips back to back. Returns a cancel function. */
export function playKanaSequence(
  items: { kana: string; key: string }[],
  available: readonly string[],
  onIndex?: (i: number) => void,
): () => void {
  let cancelled = false
  let current: HTMLAudioElement | null = null

  const step = (i: number) => {
    if (cancelled || i >= items.length) {
      onIndex?.(-1)
      return
    }
    onIndex?.(i)
    const { kana, key } = items[i]
    if (!available.includes(key)) {
      speak(kana, { rate: 0.85, onEnd: () => step(i + 1) })
      return
    }
    const el = new Audio(`/audio/kana/${key}.mp3`)
    current = el
    el.onended = () => step(i + 1)
    el.onerror = () => step(i + 1)
    el.play().catch(() => step(i + 1))
  }
  step(0)

  return () => {
    cancelled = true
    current?.pause()
    cancelSpeech()
    onIndex?.(-1)
  }
}

export function speak(text: string, opts: { rate?: number; onEnd?: () => void } = {}) {
  if (typeof speechSynthesis === 'undefined') return
  try {
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ja-JP'
    u.rate = opts.rate ?? 0.95
    const voice = bestJapaneseVoice()
    if (voice) u.voice = voice
    if (opts.onEnd) {
      u.onend = opts.onEnd
      u.onerror = opts.onEnd
    }
    speechSynthesis.speak(u)
  } catch {
    opts.onEnd?.()
  }
}

export function cancelSpeech() {
  try {
    speechSynthesis?.cancel()
  } catch {
    // nothing to cancel
  }
}
