import { useTranslation } from 'react-i18next'
import { LEVELS, type Level } from '../types'

interface Props {
  value: Level | 'all'
  onChange: (v: Level | 'all') => void
}

export default function LevelFilter({ value, onChange }: Props) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap gap-2">
      <button className={value === 'all' ? 'chip-on' : 'chip-off'} onClick={() => onChange('all')}>
        {t('levels.all')}
      </button>
      {LEVELS.map((lv) => (
        <button key={lv} className={value === lv ? 'chip-on' : 'chip-off'} onClick={() => onChange(lv)}>
          {lv}
        </button>
      ))}
    </div>
  )
}
