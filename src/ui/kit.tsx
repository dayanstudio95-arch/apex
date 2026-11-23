import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Check, ChevronLeft, ChevronRight, Circle, CircleCheck, Dumbbell, Minus, Plus, Zap } from 'lucide-react'
import type { Exercise } from '../engine/catalog'
import { imageURL } from '../engine/catalog'
import { fmtWeight, WEEKDAY_LETTERS } from '../engine/format'

/** חץ "קדימה" בעברית מצביע שמאלה */
export const ChevronForward = ChevronLeft
/** חץ "אחורה" בעברית מצביע ימינה */
export const ChevronBack = ChevronRight

export function Card({ children, hl, tight, className = '', onClick }: {
  children: ReactNode; hl?: boolean; tight?: boolean; className?: string; onClick?: () => void
}) {
  const cls = `card ${hl ? 'hl' : ''} ${tight ? 'tight' : ''} ${className}`
  return onClick ? <button className={cls} onClick={onClick} style={{ textAlign: 'start', width: '100%' }}>{children}</button>
    : <div className={cls}>{children}</div>
}

export function Chip({ title, icon: Icon, on, onClick }: { title: string; icon?: LucideIcon; on: boolean; onClick: () => void }) {
  return (
    <button className={`chip ${on ? 'on' : ''}`} onClick={onClick}>
      {Icon && <Icon size={15} strokeWidth={2.5} />}
      {title}
    </button>
  )
}

export function SelectCard({ title, subtitle, icon: Icon, on, onClick }: {
  title: string; subtitle?: string; icon: LucideIcon; on: boolean; onClick: () => void
}) {
  return (
    <button className={`select-card ${on ? 'on' : ''}`} onClick={onClick}>
      <span className="ico"><Icon size={22} strokeWidth={2.4} /></span>
      <span className="grow col" style={{ gap: 3 }}>
        <b style={{ fontSize: 17 }}>{title}</b>
        {subtitle && <span className="muted" style={{ fontSize: 14 }}>{subtitle}</span>}
      </span>
      {on ? <CircleCheck size={24} color="var(--lime)" /> : <Circle size={24} color="var(--text3)" />}
    </button>
  )
}

export function StatTile({ title, value, unit, icon: Icon, accent = 'var(--lime)' }: {
  title: string; value: ReactNode; unit?: string; icon?: LucideIcon; accent?: string
}) {
  return (
    <div className="tile">
      <span className="t">{Icon && <Icon size={13} strokeWidth={2.6} color={accent} />}{title}</span>
      <span className="v">{value}{unit && <span className="u">{unit}</span>}</span>
    </div>
  )
}

export function Tag({ text, filled, warn }: { text: string; filled?: boolean; warn?: boolean }) {
  return <span className={`tag ${filled ? 'filled' : ''} ${warn ? 'warn' : ''}`}>{text}</span>
}

export function Bar({ progress, height = 10 }: { progress: number; height?: number }) {
  const p = Math.max(0, Math.min(1, progress))
  return <div className="bar" style={{ height }}><div style={{ width: `${p * 100}%`, opacity: p > 0 ? 1 : 0 }} /></div>
}

export function Ring({ progress, size = 96, stroke = 10, children }: { progress: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(1, progress))
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface2)" strokeWidth={stroke} fill="none" />
        {p > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--lime)" strokeWidth={stroke} fill="none" strokeLinecap="round"
                  strokeDasharray={c} strokeDashoffset={c * (1 - p)}
                  style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(.2,.8,.2,1)', filter: 'drop-shadow(0 0 5px rgba(198,255,61,.5))' }} />
        )}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>{children}</div>
    </div>
  )
}

export function LevelBadge({ level, size = 48 }: { level: number; size?: number }) {
  return <div className="level-badge" style={{ width: size, height: size, fontSize: size * 0.42 }}>{level}</div>
}

export function ApexLogo({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.86} viewBox="0 0 100 86" style={{ filter: `drop-shadow(0 0 ${size * 0.18}px rgba(198,255,61,.55))`, flex: 'none' }}>
      <defs>
        <linearGradient id="apexg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d8ff6b" /><stop offset="1" stopColor="#a8e61c" />
        </linearGradient>
      </defs>
      <path fill="url(#apexg)" d="M4 86 L50 0 L96 86 L74 86 L50 36.1 L26 86 Z M39 56.8 L61 56.8 L65.2 65.4 L34.8 65.4 Z" />
    </svg>
  )
}

export function Empty({ icon: Icon, title, message }: { icon: LucideIcon; title: string; message: string }) {
  return (
    <div className="col" style={{ alignItems: 'center', textAlign: 'center', padding: 30 }}>
      <Icon size={40} color="var(--lime)" strokeWidth={2.4} />
      <b className="headline">{title}</b>
      <span className="muted">{message}</span>
    </div>
  )
}

export function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className="toggle" onClick={() => onChange(!on)} style={{ width: '100%' }}>
      <span>{label}</span>
      <span className={`switch ${on ? 'on' : ''}`} />
    </button>
  )
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map(([v, l]) => <button key={v} className={v === value ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  )
}

/** כפתור שחוזר על הפעולה בלחיצה ארוכה */
export function RepeatButton({ onStep, children, className = '', label }: { onStep: () => void; children: ReactNode; className?: string; label: string }) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const stop = () => clearTimeout(timer.current)
  const start = () => {
    onStep()
    const loop = (delay: number) => { timer.current = setTimeout(() => { onStep(); loop(Math.max(60, delay * 0.8)) }, delay) }
    loop(400)
  }
  useEffect(() => stop, [])
  return (
    <button className={className} aria-label={label}
            onPointerDown={(e) => { e.preventDefault(); start() }} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
            onContextMenu={(e) => e.preventDefault()}>
      {children}
    </button>
  )
}

export function NumberField({ title, value, onChange, unit, step = 1, min = 0, max = 1000 }: {
  title: string; value: number; onChange: (v: number) => void; unit: string; step?: number; min?: number; max?: number
}) {
  const clamp = (v: number) => Math.round(Math.min(max, Math.max(min, v)) * 100) / 100
  return (
    <div className="card tight" style={{ flexDirection: 'row', alignItems: 'center' }}>
      <b className="grow">{title}</b>
      <RepeatButton className="icon-btn" label="פחות" onStep={() => onChange(clamp(value - step))}><Minus size={16} color="var(--lime)" strokeWidth={3} /></RepeatButton>
      <span className="num" style={{ minWidth: 86, textAlign: 'center', fontSize: 24 }}>
        {fmtWeight(value)} <small className="caption">{unit}</small>
      </span>
      <RepeatButton className="icon-btn" label="יותר" onStep={() => onChange(clamp(value + step))}><Plus size={16} color="var(--lime)" strokeWidth={3} /></RepeatButton>
    </div>
  )
}

export function BigStepper({ value, onChange, min, max, unit }: { value: number; onChange: (v: number) => void; min: number; max: number; unit: string }) {
  const btn = (icon: ReactNode, d: number) => (
    <button className="icon-btn" style={{ width: 60, height: 60 }} onClick={() => onChange(Math.min(max, Math.max(min, value + d)))}>{icon}</button>
  )
  return (
    <div className="row" style={{ justifyContent: 'center', gap: 22 }}>
      {btn(<Minus size={22} color="var(--lime)" strokeWidth={3} />, -1)}
      <div className="col" style={{ alignItems: 'center', gap: 0, minWidth: 100 }}>
        <span className="num" style={{ fontSize: 64, lineHeight: 1 }}>{value}</span>
        <span className="caption">{unit}</span>
      </div>
      {btn(<Plus size={22} color="var(--lime)" strokeWidth={3} />, 1)}
    </div>
  )
}

export function WeekdayPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  return (
    <div className="row" style={{ gap: 6 }}>
      {WEEKDAY_LETTERS.map((l, i) => {
        const d = i + 1
        const on = value.includes(d)
        return (
          <button key={d} onClick={() => onChange(on ? value.filter((x) => x !== d) : [...value, d].sort())}
                  style={{ flex: 1, height: 48, borderRadius: 14, fontWeight: 700, background: on ? 'var(--lime)' : 'var(--surface2)', color: on ? '#000' : 'var(--text)' }}>
            {l}
          </button>
        )
      })}
    </div>
  )
}

/** גיליון שעולה מלמטה */
export function Sheet({ children, onClose, full }: { children: ReactNode; onClose: () => void; full?: boolean }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className={`sheet ${full ? 'full' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        {children}
      </div>
    </div>
  )
}

export function SheetHeader({ title, onClose, closeLabel = 'סגירה', action }: { title: string; onClose: () => void; closeLabel?: string; action?: ReactNode }) {
  return (
    <div className="row">
      <button className="link-btn" onClick={onClose} style={{ minWidth: 60, textAlign: 'start' }}>{closeLabel}</button>
      <b className="grow" style={{ textAlign: 'center', fontSize: 17 }}>{title}</b>
      <div style={{ minWidth: 60, textAlign: 'end' }}>{action}</div>
    </div>
  )
}

export function Confirm({ title, message, confirm, danger, onConfirm, onCancel, cancel = 'ביטול' }: {
  title: string; message?: string; confirm: string; danger?: boolean; onConfirm: () => void; onCancel: () => void; cancel?: string
}) {
  return (
    <Sheet onClose={onCancel}>
      <div className="col" style={{ alignItems: 'center', textAlign: 'center', gap: 8, padding: '6px 0' }}>
        <b className="headline">{title}</b>
        {message && <span className="muted">{message}</span>}
      </div>
      <button className={`btn ${danger ? 'danger' : 'primary'}`} onClick={onConfirm}>{confirm}</button>
      <button className="btn secondary" onClick={onCancel}>{cancel}</button>
    </Sheet>
  )
}

/** הדגמה: שתי תמונות (התחלה וסוף) שמתחלפות בהצלבה איטית */
export function ExerciseImage({ exercise, height = 200 }: { exercise?: Exercise; height?: number }) {
  const [second, setSecond] = useState(false)
  const imgs = exercise?.images ?? []
  useEffect(() => {
    setSecond(false)
    if (imgs.length < 2) return
    const t = setInterval(() => setSecond((s) => !s), 1400)
    return () => clearInterval(t)
  }, [exercise?.id, imgs.length])
  if (!imgs.length) {
    return <div className="ex-img placeholder" style={{ height }}><Dumbbell size={44} strokeWidth={2.4} /></div>
  }
  return (
    <div className="ex-img" style={{ height }}>
      <img src={imageURL(imgs[0])} alt="" />
      {imgs[1] && <img src={imageURL(imgs[1])} alt="" style={{ opacity: second ? 1 : 0 }} />}
    </div>
  )
}

export function ExerciseThumb({ exercise, size = 48 }: { exercise?: Exercise; size?: number }) {
  const img = exercise?.images[0]
  return (
    <div style={{ width: size, height: size, borderRadius: 12, overflow: 'hidden', flex: 'none', background: img ? '#fff' : 'var(--surface2)', display: 'grid', placeItems: 'center' }}>
      {img ? <img src={imageURL(img)} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <Dumbbell size={size * 0.4} color="var(--lime)" />}
    </div>
  )
}

export function Toast({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2600); return () => clearTimeout(t) }, [onDone])
  return <div className="toast">{text}</div>
}

export { Check, Zap }
