import { useMemo } from 'react'
import { parseFurigana } from '../lib/furigana'

interface Props {
  text: string
  /** annotated form: "{漢字|かんじ}を..." */
  furigana?: string
  show?: boolean
  className?: string
}

/** Japanese text with optional ruby readings above its kanji. */
export default function Furigana({ text, furigana, show = true, className }: Props) {
  const segs = useMemo(() => parseFurigana(furigana, text), [furigana, text])
  return (
    <span className={className}>
      {segs.map((seg, i) =>
        seg.ruby && show ? (
          <ruby
            key={i}
            className="[&>rt]:select-none [&>rt]:text-[0.55em] [&>rt]:font-sans [&>rt]:font-normal [&>rt]:text-stone-400"
          >
            {seg.text}
            <rt>{seg.ruby}</rt>
          </ruby>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </span>
  )
}
