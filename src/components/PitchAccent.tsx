const CIRCLED = '⓪①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'

const SMALL = 'ぁぃぅぇぉゃゅょゎァィゥェォャュョヮ'

/** Split a kana reading into morae: small kana attach to the previous one. */
function splitMorae(reading: string): string[] {
  const out: string[] = []
  for (const ch of reading) {
    if (out.length > 0 && SMALL.includes(ch)) out[out.length - 1] += ch
    else out.push(ch)
  }
  return out
}

/**
 * Tokyo pitch-accent contour over the reading: a line above high morae and a
 * tick marking the downstep. 平板⓪ rises after mora 1 and never drops;
 * 頭高① starts high and drops; 中高/尾高ⓝ is high from mora 2 through n.
 */
export default function PitchAccent({ reading, accent }: { reading: string; accent: number }) {
  const morae = splitMorae(reading)
  const isHigh = (i: number) =>
    accent === 0 ? i > 0 : accent === 1 ? i === 0 : i > 0 && i < accent
  return (
    <span className="inline-flex items-baseline whitespace-nowrap">
      {morae.map((m, i) => (
        <span
          key={i}
          className={`border-t-2 px-px leading-snug ${
            isHigh(i) ? 'border-accent-deep' : 'border-transparent'
          } ${accent >= 1 && i === accent - 1 && accent <= morae.length ? 'border-r-2 border-r-accent-deep' : ''}`}
        >
          {m}
        </span>
      ))}
      <span className="ml-1.5 text-xs text-accent-deep">
        {CIRCLED[accent] ?? `[${accent}]`}
      </span>
    </span>
  )
}
