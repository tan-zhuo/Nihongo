// Gojūon row filtering: map the first kana of a reading to its row.

export const KANA_ROWS = [
  { key: 'a', label: 'あ行', kana: 'あいうえお' },
  { key: 'ka', label: 'か行', kana:'かきくけこ' },
  { key: 'sa', label: 'さ行', kana: 'さしすせそ' },
  { key: 'ta', label: 'た行', kana: 'たちつてと' },
  { key: 'na', label: 'な行', kana: 'なにぬねの' },
  { key: 'ha', label: 'は行', kana: 'はひふへほ' },
  { key: 'ma', label: 'ま行', kana: 'まみむめも' },
  { key: 'ya', label: 'や行', kana: 'やゆよ' },
  { key: 'ra', label: 'ら行', kana: 'らりるれろ' },
  { key: 'wa', label: 'わ行', kana: 'わをん' },
] as const

export type RowKey = (typeof KANA_ROWS)[number]['key']

const VOICED_TO_BASE: Record<string, string> = {
  が: 'か', ぎ: 'き', ぐ: 'く', げ: 'け', ご: 'こ',
  ざ: 'さ', じ: 'し', ず: 'す', ぜ: 'せ', ぞ: 'そ',
  だ: 'た', ぢ: 'ち', づ: 'つ', で: 'て', ど: 'と',
  ば: 'は', び: 'ひ', ぶ: 'ふ', べ: 'へ', ぼ: 'ほ',
  ぱ: 'は', ぴ: 'ひ', ぷ: 'ふ', ぺ: 'へ', ぽ: 'ほ',
  ゃ: 'や', ゅ: 'ゆ', ょ: 'よ', っ: 'つ',
  ぁ: 'あ', ぃ: 'い', ぅ: 'う', ぇ: 'え', ぉ: 'お',
}

function katakanaToHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60),
  )
}

export function rowOfReading(reading: string): RowKey | null {
  if (!reading) return null
  let first = katakanaToHiragana(reading[0])
  first = VOICED_TO_BASE[first] ?? first
  for (const row of KANA_ROWS) {
    if (row.kana.includes(first)) return row.key
  }
  return null
}

// Loose match for meaning answers: case-insensitive, trims punctuation,
// accepts any one sense from a "; " / "；" separated meaning string.
export function meaningMatches(input: string, ...meanings: string[]): boolean {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[\s。．.、，,；;！!？?（）()「」]/g, '')
  const given = norm(input)
  if (!given) return false
  return meanings.some((m) =>
    m.split(/[;；、，/]/).some((sense) => {
      const s = norm(sense)
      return s.length > 0 && (s === given || (s.length >= 2 && (s.includes(given) ? given.length >= Math.ceil(s.length / 2) : false)))
    }),
  )
}
