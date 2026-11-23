import { useState } from 'react'
import { Calendar, Clock, Dumbbell, Ellipsis, Weight, Zap } from 'lucide-react'
import { commit, getData, useData } from '../store'
import { nav } from '../uiState'
import { orderedExercises, orderedSets, sessionDuration, sessionVolume } from '../engine/history'
import { fmtDayMonth, fmtFullDate, fmtMinutes, fmtMonthYear, fmtTime, fmtVolume, fmtWeight, plus, sameDay, sameMonth, WEEKDAY_LETTERS } from '../engine/format'
import type { SetLog, WorkoutSession } from '../engine/types'
import { ChevronBack, ChevronForward, Confirm, Empty, StatTile, Tag } from '../ui/kit'
import { NumberPad } from './Pickers'

export function HistoryScreen() {
  const data = useData()
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d })
  const [selected, setSelected] = useState<Date | null>(null)
  const done = data.sessions.filter((s) => s.isCompleted).sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  const inMonth = done.filter((s) => sameMonth(new Date(s.startedAt), month))
  const shown = selected ? inMonth.filter((s) => sameDay(new Date(s.startedAt), selected)) : inMonth
  const trained = new Set(inMonth.map((s) => new Date(s.startedAt).getDate()))
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(month.getDay()).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const now = new Date()
  const isCurrent = sameMonth(month, now)
  const shift = (d: number) => { setSelected(null); setMonth(new Date(month.getFullYear(), month.getMonth() + d, 1)) }

  return (
    <div className="screen">
      <h1 className="screen-title">היסטוריה</h1>
      <div className="card">
        <div className="row lime">
          <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={() => shift(-1)} aria-label="חודש קודם"><ChevronBack size={18} color="var(--lime)" /></button>
          <b className="headline grow" style={{ textAlign: 'center', color: 'var(--text)' }}>{fmtMonthYear(month)}</b>
          <button className="icon-btn" style={{ width: 36, height: 36, opacity: isCurrent ? 0.3 : 1 }} disabled={isCurrent} onClick={() => shift(1)} aria-label="חודש הבא"><ChevronForward size={18} color="var(--lime)" /></button>
        </div>
        <div className="calendar">
          {WEEKDAY_LETTERS.map((l) => <span key={l} className="dim" style={{ fontSize: 12, fontWeight: 700 }}>{l}</span>)}
          {cells.map((day, i) => {
            if (!day) return <span key={`e${i}`} />
            const date = new Date(month.getFullYear(), month.getMonth(), day)
            const sel = selected && sameDay(selected, date)
            const cls = `d ${trained.has(day) ? 'on' : ''} ${sel ? 'sel' : isCurrent && day === now.getDate() ? 'today' : ''}`
            return <button key={day} className={cls} onClick={() => setSelected(sel ? null : date)}>{day}</button>
          })}
        </div>
      </div>
      <div className="tiles">
        <StatTile title="אימונים" value={inMonth.length} icon={Calendar} />
        <StatTile title="נפח" value={fmtVolume(inMonth.reduce((a, s) => a + sessionVolume(s), 0))} icon={Weight} />
        <StatTile title="זמן" value={Math.round(inMonth.reduce((a, s) => a + sessionDuration(s), 0) / 3600)} unit="שע׳" icon={Clock} />
      </div>
      {shown.length === 0 ? (
        <Empty icon={Dumbbell} title={selected ? 'אין אימון ביום הזה' : 'אין אימונים בחודש הזה'} message="כל אימון שיושלם יופיע כאן עם כל הסטים והשיאים." />
      ) : shown.map((s) => <SessionRow key={s.id} s={s} />)}
    </div>
  )
}

function SessionRow({ s }: { s: WorkoutSession }) {
  const d = new Date(s.startedAt)
  return (
    <button className="card tight" style={{ flexDirection: 'row', alignItems: 'center', gap: 14, textAlign: 'start' }}
            onClick={() => nav.push({ name: 'session', params: { id: s.id } })}>
      <div className="col" style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--surface2)', alignItems: 'center', justifyContent: 'center', gap: 0, flex: 'none' }}>
        <span className="num" style={{ fontSize: 22 }}>{d.getDate()}</span>
        <span className="muted" style={{ fontSize: 11, fontWeight: 600 }}>{d.toLocaleDateString('he-IL', { month: 'short' })}</span>
      </div>
      <div className="grow col" style={{ gap: 4, minWidth: 0 }}>
        <div className="row" style={{ gap: 6 }}><b>{s.templateName}</b>{s.isDeload && <Tag text="דילואד" warn />}</div>
        <span className="caption ellipsis">{s.locationName} · {fmtMinutes(sessionDuration(s))} · {fmtVolume(sessionVolume(s))}</span>
      </div>
      <span className="num lime" style={{ fontSize: 14 }}>{plus(s.xpEarned)}</span>
      <ChevronForward size={16} color="var(--text3)" />
    </button>
  )
}

export function SessionDetail({ id }: { id: string }) {
  const data = useData()
  const s = data.sessions.find((x) => x.id === id)
  const [edit, setEdit] = useState<{ set: SetLog; field: 'weight' | 'reps' } | null>(null)
  const [menu, setMenu] = useState(false)
  const [confirm, setConfirm] = useState(false)
  if (!s) return <div className="screen"><button className="link-btn" onClick={nav.pop}>חזרה</button></div>

  const remove = () => {
    const d = getData()
    d.sessions = d.sessions.filter((x) => x.id !== id)
    d.xpEvents = d.xpEvents.filter((x) => x.sessionID !== id)
    d.records = d.records.filter((x) => x.sessionID !== id)
    commit(true)
    nav.pop()
  }

  return (
    <div className="screen">
      <div className="navbar">
        <button className="icon-btn" onClick={nav.pop} aria-label="חזרה"><ChevronBack size={20} /></button>
        <span className="spacer" />
        <button className="icon-btn" onClick={() => setMenu(true)} aria-label="עוד"><Ellipsis size={18} /></button>
      </div>
      <div className="col" style={{ gap: 4 }}>
        <h1 className="title">{s.templateName}</h1>
        <span className="caption">{fmtFullDate(s.startedAt)} · {fmtTime(s.startedAt)} · {s.locationName}</span>
      </div>
      <div className="tiles">
        <StatTile title="משך" value={fmtMinutes(sessionDuration(s))} icon={Clock} />
        <StatTile title="נפח" value={fmtVolume(sessionVolume(s))} icon={Weight} />
        <StatTile title="XP" value={plus(s.xpEarned)} icon={Zap} />
      </div>
      {orderedExercises(s).map((log) => {
        let n = 0
        return (
          <div key={log.id} className="card">
            <b className="headline">{log.exerciseName}</b>
            {orderedSets(log).filter((x) => x.isCompleted).map((x) => (
              <div key={x.id} className="row num" style={{ fontSize: 16 }}>
                <span style={{ width: 60, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: x.kind === 'warmup' ? 'var(--warning)' : 'var(--text2)' }}>
                  {x.kind === 'warmup' ? 'חימום' : `סט ${++n}`}
                </span>
                <span className="spacer" />
                <button onClick={() => setEdit({ set: x, field: 'weight' })}>{x.weight > 0 ? `${fmtWeight(x.weight)} ק״ג` : 'משקל גוף'}</button>
                <span className="dim">×</span>
                <button onClick={() => setEdit({ set: x, field: 'reps' })}>{x.reps}</button>
                <span className="dim" style={{ width: 50, fontSize: 12, textAlign: 'center' }}>{x.rir != null ? `RIR ${x.rir}` : ''}</span>
              </div>
            ))}
          </div>
        )
      })}
      <span className="caption dim">לחיצה על משקל או על חזרות מאפשרת לתקן אותם. {fmtDayMonth(s.startedAt)}</span>
      {menu && (
        <div className="sheet-backdrop" onClick={() => setMenu(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="grabber" />
            <button className="btn danger" onClick={() => { setMenu(false); setConfirm(true) }}>מחיקת האימון</button>
          </div>
        </div>
      )}
      {confirm && <Confirm title="למחוק את האימון?" message="האימון, ה־XP והשיאים שלו יימחקו. אי אפשר לבטל את זה." confirm="מחיקה" danger onConfirm={remove} onCancel={() => setConfirm(false)} />}
      {edit && (
        <NumberPad title={edit.field === 'weight' ? 'משקל (ק״ג)' : 'חזרות'} initial={edit.field === 'weight' ? edit.set.weight : edit.set.reps}
                   decimal={edit.field === 'weight'} onClose={() => setEdit(null)}
                   onDone={(v) => { if (edit.field === 'weight') edit.set.weight = v; else edit.set.reps = v; commit() }} />
      )}
    </div>
  )
}
