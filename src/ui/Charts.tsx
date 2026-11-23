// גרפים פשוטים ב-SVG. ציר הזמן תמיד משמאל לימין, כמקובל.
import { fmtDayMonth } from '../engine/format'

export interface Pt { x: Date; y: number }

function niceTicks(min: number, max: number, count = 4): number[] {
  if (max <= min) return [min]
  const raw = (max - min) / count
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  const ticks: number[] = []
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100)
  return ticks
}

/** גרף קו עם שטח מתחת. אפשר להוסיף קו שני (למשל ממוצע נע) */
export function LineChart({ points, line2, height = 220, area = true, dots = true }: {
  points: Pt[]; line2?: Pt[]; height?: number; area?: boolean; dots?: boolean
}) {
  const W = 340, H = height, padL = 6, padR = 36, padT = 12, padB = 28
  if (!points.length) return null
  const all = [...points, ...(line2 ?? [])]
  const ys = all.map((p) => p.y)
  let lo = Math.min(...ys), hi = Math.max(...ys)
  const pad = Math.max(1, (hi - lo) * 0.12)
  lo = Math.floor(lo - pad); hi = Math.ceil(hi + pad)
  const xs = all.map((p) => p.x.getTime())
  const x0 = Math.min(...xs), x1 = Math.max(...xs) || x0 + 1
  const sx = (t: number) => padL + ((t - x0) / Math.max(1, x1 - x0)) * (W - padL - padR)
  const sy = (v: number) => padT + (1 - (v - lo) / Math.max(1e-9, hi - lo)) * (H - padT - padB)
  const path = (ps: Pt[]) => ps.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x.getTime()).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ')
  const ticks = niceTicks(lo, hi)
  const xTicks = points.length > 1 ? [0, 1, 2, 3].map((i) => x0 + ((x1 - x0) * i) / 3) : [x0]
  return (
    <div dir="ltr"><svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(198,255,61,.32)" /><stop offset="1" stopColor="rgba(198,255,61,0)" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - padR} y1={sy(t)} y2={sy(t)} stroke="#2a2e25" strokeWidth="1" />
          <text x={W - padR + 6} y={sy(t) + 4} fill="#9aa190" fontSize="11">{t}</text>
        </g>
      ))}
      {xTicks.map((t, i) => (
        <text key={i} x={sx(t)} y={H - 8} fill="#9aa190" fontSize="11" textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}>
          {fmtDayMonth(new Date(t))}
        </text>
      ))}
      {area && points.length > 1 && (
        <path d={`${path(points)} L${sx(points.at(-1)!.x.getTime())},${H - padB} L${sx(points[0].x.getTime())},${H - padB} Z`} fill="url(#areaG)" />
      )}
      {line2 ? (
        <>
          {dots && points.map((p, i) => <circle key={i} cx={sx(p.x.getTime())} cy={sy(p.y)} r="3" fill="#9aa190" opacity=".7" />)}
          <path d={path(line2)} fill="none" stroke="#c6ff3d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <path d={path(points)} fill="none" stroke="#c6ff3d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {dots && points.map((p, i) => <circle key={i} cx={sx(p.x.getTime())} cy={sy(p.y)} r="3.5" fill="#c6ff3d" />)}
        </>
      )}
    </svg></div>
  )
}

/** עמודות לאורך זמן (למשל נפח שבועי) */
export function BarChart({ bars, height = 200, highlightLast = true }: { bars: { label: string; value: number }[]; height?: number; highlightLast?: boolean }) {
  const W = 340, H = height, padB = 24, padT = 10
  const max = Math.max(1, ...bars.map((b) => b.value))
  const bw = (W / bars.length) * 0.62
  return (
    <div dir="ltr"><svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
      {bars.map((b, i) => {
        const x = (W / bars.length) * i + (W / bars.length - bw) / 2
        const h = (b.value / max) * (H - padB - padT)
        const last = highlightLast && i === bars.length - 1
        return (
          <g key={i}>
            <rect x={x} y={H - padB - h} width={bw} height={Math.max(h, b.value > 0 ? 2 : 0)} rx="4" fill={last ? '#c6ff3d' : 'rgba(198,255,61,.5)'} />
            {(i % 3 === 0 || i === bars.length - 1) && <text x={x + bw / 2} y={H - 6} fill="#9aa190" fontSize="10" textAnchor="middle">{b.label}</text>}
          </g>
        )
      })}
    </svg></div>
  )
}

/** עמודות אופקיות (סטים לפי שריר), עם טווח יעד מסומן */
export function HBars({ rows, targetMin = 10, targetMax = 20 }: { rows: { name: string; value: number }[]; targetMin?: number; targetMax?: number }) {
  const max = Math.max(targetMax + 2, ...rows.map((r) => r.value))
  return (
    <div className="col" style={{ gap: 8 }}>
      {rows.map((r) => (
        <div key={r.name} className="row" style={{ gap: 10 }}>
          <span style={{ width: 84, fontSize: 13, fontWeight: 600, flex: 'none' }} className="ellipsis">{r.name}</span>
          <div className="grow" style={{ position: 'relative', height: 18 }}>
            <div style={{ position: 'absolute', insetBlock: 0, insetInlineStart: `${(targetMin / max) * 100}%`, width: `${((targetMax - targetMin) / max) * 100}%`, background: 'rgba(198,255,61,.08)', borderRadius: 4 }} />
            <div style={{ position: 'absolute', insetBlock: 2, insetInlineStart: 0, width: `${(r.value / max) * 100}%`, background: r.value >= targetMin ? 'var(--lime)' : 'rgba(198,255,61,.45)', borderRadius: 5 }} />
          </div>
          <span className="num muted" style={{ width: 24, fontSize: 12 }}>{r.value}</span>
        </div>
      ))}
    </div>
  )
}
