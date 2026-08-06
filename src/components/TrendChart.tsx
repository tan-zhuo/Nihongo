import { useMemo, useRef, useState } from 'react'

interface Props {
  title: string
  values: number[]
  labels: string[]
  unit?: string
  /** validated chart series color (see dataviz palette check) */
  color?: string
  yMax?: number
  yMin?: number
}

const W = 320
const H = 120
const PAD = { t: 14, r: 12, b: 18, l: 34 }

function niceMax(v: number): number {
  if (v <= 0) return 10
  const mag = Math.pow(10, Math.floor(Math.log10(v)))
  return Math.ceil((v * 1.15) / mag) * mag
}

export default function TrendChart({
  title,
  values,
  labels,
  unit = '',
  color = '#2e8b61',
  yMax,
  yMin = 0,
}: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const { points, top, bottom, ticks } = useMemo(() => {
    const top = yMax ?? niceMax(Math.max(...values))
    const bottom = yMin
    const iw = W - PAD.l - PAD.r
    const ih = H - PAD.t - PAD.b
    const points = values.map((v, i) => ({
      x: PAD.l + (values.length === 1 ? iw / 2 : (i / (values.length - 1)) * iw),
      y: PAD.t + ih - ((v - bottom) / (top - bottom || 1)) * ih,
    }))
    const ticks = [bottom, (bottom + top) / 2, top]
    return { points, top, bottom, ticks }
  }, [values, yMax, yMin])

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('')
  const area = `${line}L${points[points.length - 1].x.toFixed(1)},${H - PAD.b}L${points[0].x.toFixed(1)},${H - PAD.b}Z`

  const yFor = (v: number) =>
    PAD.t + (H - PAD.t - PAD.b) - ((v - bottom) / (top - bottom || 1)) * (H - PAD.t - PAD.b)

  const onMove = (e: React.PointerEvent) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientX - rect.left) / rect.width) * W
    let best = 0
    for (let i = 1; i < points.length; i++) {
      if (Math.abs(points[i].x - x) < Math.abs(points[best].x - x)) best = i
    }
    setHover(best)
  }

  const last = points[points.length - 1]

  return (
    <div className="card relative p-4">
      <h3 className="mb-2 text-xs font-semibold text-stone-500">{title}</h3>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {/* recessive grid */}
        {ticks.map((tv) => (
          <g key={tv}>
            <line x1={PAD.l} x2={W - PAD.r} y1={yFor(tv)} y2={yFor(tv)} stroke="#e7e5e4" strokeWidth="1" />
            <text x={PAD.l - 6} y={yFor(tv) + 3} textAnchor="end" fontSize="9" fill="#a8a29e">
              {Math.round(tv)}
            </text>
          </g>
        ))}
        {/* area + line */}
        <path d={area} fill={color} opacity="0.08" />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          className="chart-line"
        />
        {/* last value, direct label */}
        <circle cx={last.x} cy={last.y} r="3" fill={color} />
        <text
          x={Math.min(last.x, W - PAD.r - 4)}
          y={last.y - 7}
          textAnchor="end"
          fontSize="10"
          fontWeight="600"
          fill="#57534e"
        >
          {values[values.length - 1]}
          {unit}
        </text>
        {/* hover marker: ≥8px target with surface ring */}
        {hover !== null && (
          <g>
            <line
              x1={points[hover].x}
              x2={points[hover].x}
              y1={PAD.t}
              y2={H - PAD.b}
              stroke="#d6d3d1"
              strokeWidth="1"
            />
            <circle cx={points[hover].x} cy={points[hover].y} r="5" fill={color} stroke="#ffffff" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -top-1 rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-lift"
          style={{
            left: `${Math.min((points[hover].x / W) * 100, 70)}%`,
          }}
        >
          <span className="font-semibold">
            {values[hover]}
            {unit}
          </span>
          <span className="ml-1.5 opacity-70">{labels[hover]}</span>
        </div>
      )}
    </div>
  )
}
