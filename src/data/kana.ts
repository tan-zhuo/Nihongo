// Complete kana chart with romaji (accepted typing variants first-listed as primary).

export interface KanaCell {
  h: string // hiragana
  k: string // katakana
  r: string[] // romaji variants, primary first
}

export interface KanaRow {
  name: string
  cells: (KanaCell | null)[]
}

export type KanaSection = 'seion' | 'dakuon' | 'yoon'

const c = (h: string, k: string, ...r: string[]): KanaCell => ({ h, k, r })

export const SEION: KanaRow[] = [
  { name: 'あ行', cells: [c('あ', 'ア', 'a'), c('い', 'イ', 'i'), c('う', 'ウ', 'u'), c('え', 'エ', 'e'), c('お', 'オ', 'o')] },
  { name: 'か行', cells: [c('か', 'カ', 'ka'), c('き', 'キ', 'ki'), c('く', 'ク', 'ku'), c('け', 'ケ', 'ke'), c('こ', 'コ', 'ko')] },
  { name: 'さ行', cells: [c('さ', 'サ', 'sa'), c('し', 'シ', 'shi', 'si'), c('す', 'ス', 'su'), c('せ', 'セ', 'se'), c('そ', 'ソ', 'so')] },
  { name: 'た行', cells: [c('た', 'タ', 'ta'), c('ち', 'チ', 'chi', 'ti'), c('つ', 'ツ', 'tsu', 'tu'), c('て', 'テ', 'te'), c('と', 'ト', 'to')] },
  { name: 'な行', cells: [c('な', 'ナ', 'na'), c('に', 'ニ', 'ni'), c('ぬ', 'ヌ', 'nu'), c('ね', 'ネ', 'ne'), c('の', 'ノ', 'no')] },
  { name: 'は行', cells: [c('は', 'ハ', 'ha'), c('ひ', 'ヒ', 'hi'), c('ふ', 'フ', 'fu', 'hu'), c('へ', 'ヘ', 'he'), c('ほ', 'ホ', 'ho')] },
  { name: 'ま行', cells: [c('ま', 'マ', 'ma'), c('み', 'ミ', 'mi'), c('む', 'ム', 'mu'), c('め', 'メ', 'me'), c('も', 'モ', 'mo')] },
  { name: 'や行', cells: [c('や', 'ヤ', 'ya'), null, c('ゆ', 'ユ', 'yu'), null, c('よ', 'ヨ', 'yo')] },
  { name: 'ら行', cells: [c('ら', 'ラ', 'ra'), c('り', 'リ', 'ri'), c('る', 'ル', 'ru'), c('れ', 'レ', 're'), c('ろ', 'ロ', 'ro')] },
  { name: 'わ行', cells: [c('わ', 'ワ', 'wa'), null, null, null, c('を', 'ヲ', 'wo', 'o')] },
  { name: 'ん', cells: [c('ん', 'ン', 'n', 'nn'), null, null, null, null] },
]

export const DAKUON: KanaRow[] = [
  { name: 'が行', cells: [c('が', 'ガ', 'ga'), c('ぎ', 'ギ', 'gi'), c('ぐ', 'グ', 'gu'), c('げ', 'ゲ', 'ge'), c('ご', 'ゴ', 'go')] },
  { name: 'ざ行', cells: [c('ざ', 'ザ', 'za'), c('じ', 'ジ', 'ji', 'zi'), c('ず', 'ズ', 'zu'), c('ぜ', 'ゼ', 'ze'), c('ぞ', 'ゾ', 'zo')] },
  { name: 'だ行', cells: [c('だ', 'ダ', 'da'), c('ぢ', 'ヂ', 'ji', 'di'), c('づ', 'ヅ', 'zu', 'du'), c('で', 'デ', 'de'), c('ど', 'ド', 'do')] },
  { name: 'ば行', cells: [c('ば', 'バ', 'ba'), c('び', 'ビ', 'bi'), c('ぶ', 'ブ', 'bu'), c('べ', 'ベ', 'be'), c('ぼ', 'ボ', 'bo')] },
  { name: 'ぱ行', cells: [c('ぱ', 'パ', 'pa'), c('ぴ', 'ピ', 'pi'), c('ぷ', 'プ', 'pu'), c('ぺ', 'ペ', 'pe'), c('ぽ', 'ポ', 'po')] },
]

export const YOON: KanaRow[] = [
  { name: 'きゃ', cells: [c('きゃ', 'キャ', 'kya'), c('きゅ', 'キュ', 'kyu'), c('きょ', 'キョ', 'kyo')] },
  { name: 'しゃ', cells: [c('しゃ', 'シャ', 'sha', 'sya'), c('しゅ', 'シュ', 'shu', 'syu'), c('しょ', 'ショ', 'sho', 'syo')] },
  { name: 'ちゃ', cells: [c('ちゃ', 'チャ', 'cha', 'tya'), c('ちゅ', 'チュ', 'chu', 'tyu'), c('ちょ', 'チョ', 'cho', 'tyo')] },
  { name: 'にゃ', cells: [c('にゃ', 'ニャ', 'nya'), c('にゅ', 'ニュ', 'nyu'), c('にょ', 'ニョ', 'nyo')] },
  { name: 'ひゃ', cells: [c('ひゃ', 'ヒャ', 'hya'), c('ひゅ', 'ヒュ', 'hyu'), c('ひょ', 'ヒョ', 'hyo')] },
  { name: 'みゃ', cells: [c('みゃ', 'ミャ', 'mya'), c('みゅ', 'ミュ', 'myu'), c('みょ', 'ミョ', 'myo')] },
  { name: 'りゃ', cells: [c('りゃ', 'リャ', 'rya'), c('りゅ', 'リュ', 'ryu'), c('りょ', 'リョ', 'ryo')] },
  { name: 'ぎゃ', cells: [c('ぎゃ', 'ギャ', 'gya'), c('ぎゅ', 'ギュ', 'gyu'), c('ぎょ', 'ギョ', 'gyo')] },
  { name: 'じゃ', cells: [c('じゃ', 'ジャ', 'ja', 'zya', 'jya'), c('じゅ', 'ジュ', 'ju', 'zyu', 'jyu'), c('じょ', 'ジョ', 'jo', 'zyo', 'jyo')] },
  { name: 'びゃ', cells: [c('びゃ', 'ビャ', 'bya'), c('びゅ', 'ビュ', 'byu'), c('びょ', 'ビョ', 'byo')] },
  { name: 'ぴゃ', cells: [c('ぴゃ', 'ピャ', 'pya'), c('ぴゅ', 'ピュ', 'pyu'), c('ぴょ', 'ピョ', 'pyo')] },
]

export const SECTIONS: { key: KanaSection; rows: KanaRow[] }[] = [
  { key: 'seion', rows: SEION },
  { key: 'dakuon', rows: DAKUON },
  { key: 'yoon', rows: YOON },
]

export function allCells(sections: KanaSection[] = ['seion', 'dakuon', 'yoon']): KanaCell[] {
  return SECTIONS.filter((s) => sections.includes(s.key))
    .flatMap((s) => s.rows)
    .flatMap((r) => r.cells)
    .filter((cell): cell is KanaCell => cell !== null)
}
