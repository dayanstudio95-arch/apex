import { useMemo, useState } from 'react'
import { ArrowLeftRight, Footprints, Leaf, Sparkles, Zap } from 'lucide-react'
import { commit, useData } from '../store'
import { nav } from '../uiState'
import type { Exercise } from '../engine/catalog'
import { partOf } from '../engine/catalog'
import { activeProgram, isDeloadWeek } from '../engine/finisher'
import { nextTemplate } from '../engine/program'
import { startSession } from '../engine/session'
import type { PlannedExercise } from '../engine/session'
import type { BodyPart } from '../engine/types'
import { partHe } from '../engine/types'
import { fmtKg, ltr } from '../engine/format'
import { hasFlex, makeBuilder, templateSlots } from '../planning'
import { Chip, ExerciseThumb, Sheet, SheetHeader, Tag } from '../ui/kit'
import { locationIcon } from '../ui/icons'
import { ExercisePicker, FavStar, NoEquipmentHint } from './Pickers'

/** כותרת אזור לפני כל קבוצת תרגילים רצופה מאותו אזור */
export function partOfPlanned(p: PlannedExercise): BodyPart {
  return p.slot.part ?? partOf(p.exercise)
}

export default function PreWorkout() {
  const data = useData()
  const profile = data.profile!
  const program = activeProgram(data)
  const [templateID, setTemplateID] = useState(program ? nextTemplate(program)?.id : undefined)
  const [locationID, setLocationID] = useState(profile.lastLocationID ?? data.locations[0]?.id)
  const [minutes, setMinutes] = useState(profile.preferredMinutes)
  const [overrides, setOverrides] = useState<Record<string, Exercise>>({})
  const [swap, setSwap] = useState<PlannedExercise | null>(null)
  const [abs, setAbs] = useState(true)
  const [finisher, setFinisher] = useState(true)

  const template = program?.templates.find((t) => t.id === templateID) ?? (program ? nextTemplate(program) : undefined)
  const location = data.locations.find((l) => l.id === locationID) ?? data.locations[0]
  const equipment = useMemo(() => new Set(location?.equipment ?? []), [location?.equipment]) // eslint-disable-line react-hooks/exhaustive-deps
  const limitations = useMemo(() => new Set(profile.limitations), [profile.limitations])
  const deload = isDeloadWeek(program)

  const favKey = (data.favorites ?? []).join(',')
  const plan = useMemo(() => {
    if (!template) return undefined
    return makeBuilder(data, location).build(templateSlots(template, location?.id, { abs, finisher }),
      equipment, limitations, minutes, deload, overrides)
  }, [template, location, equipment, limitations, minutes, deload, overrides, data.sessions, abs, finisher, favKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => {
    if (!plan) return
    const session = startSession(plan, template, location, minutes, profile.weeklyGoal)
    data.sessions.push(session)
    profile.lastLocationID = location?.id
    commit(true)
    nav.beginWorkout(session.id)
  }

  const label = (p: PlannedExercise) => {
    const reps = ltr(`${p.workSets}×${p.reps}`)
    if (p.exercise.increment === 0) return reps
    return p.weight > 0 ? `${reps} · ${fmtKg(p.weight)}` : `${reps} · משקל לבחירה`
  }

  return (
    <Sheet onClose={nav.closePreWorkout} full>
      <SheetHeader title="לפני האימון" onClose={nav.closePreWorkout} closeLabel="ביטול" />
      {program && (
        <section className="col" style={{ gap: 10 }}>
          <b className="muted" style={{ fontSize: 15 }}>איזה אימון?</b>
          <div className="chips scroll">
            {[...program.templates].sort((a, b) => a.order - b.order).map((t) => (
              <Chip key={t.id} title={t.name} icon={t.id === nextTemplate(program)?.id ? Sparkles : undefined}
                    on={t.id === template?.id} onClick={() => { setTemplateID(t.id); setOverrides({}) }} />
            ))}
          </div>
        </section>
      )}
      <section className="col" style={{ gap: 10 }}>
        <b className="muted" style={{ fontSize: 15 }}>איפה מתאמנים?</b>
        <div className="chips">
          {data.locations.map((l) => (
            <Chip key={l.id} title={l.name} icon={locationIcon[l.icon] ?? locationIcon.pin} on={l.id === location?.id}
                  onClick={() => { setLocationID(l.id); setOverrides({}) }} />
          ))}
        </div>
      </section>
      <section className="col" style={{ gap: 10 }}>
        <b className="muted" style={{ fontSize: 15 }}>כמה זמן יש?</b>
        <div className="chips">{[30, 45, 60, 75, 90].map((m) => <Chip key={m} title={`${m} דק׳`} on={minutes === m} onClick={() => setMinutes(m)} />)}</div>
      </section>
      {(hasFlex(template, 'abs') || hasFlex(template, 'cardio')) && (
        <section className="col" style={{ gap: 10 }}>
          <b className="muted" style={{ fontSize: 15 }}>תוספות (נכנסות אם יש זמן)</b>
          <div className="chips">
            {hasFlex(template, 'abs') && <Chip title="בטן" icon={Sparkles} on={abs} onClick={() => setAbs(!abs)} />}
            {hasFlex(template, 'cardio') && <Chip title="פינישר אירובי" icon={Footprints} on={finisher} onClick={() => setFinisher(!finisher)} />}
          </div>
        </section>
      )}
      <NoEquipmentHint location={location} onSettings={() => { nav.closePreWorkout(); nav.tab('profile'); nav.push({ name: 'locations' }) }} />
      {deload && (
        <div className="row" style={{ padding: 14, borderRadius: 14, background: 'rgba(255,176,32,.12)', color: 'var(--warning)', fontSize: 14, fontWeight: 600, alignItems: 'flex-start' }}>
          <Leaf size={16} style={{ flex: 'none', marginTop: 2 }} /> שבוע דילואד: פחות סטים ו־10% פחות משקל. ההתאוששות היא חלק מהתוכנית.
        </div>
      )}
      {plan && (
        <section className="col" style={{ gap: 10, paddingBottom: 90 }}>
          <div className="row"><b className="headline grow">התוכנית להיום</b><span className="num lime" style={{ fontSize: 14 }}>~{Math.round(plan.estimatedSeconds / 60)} דק׳</span></div>
          {!plan.exercises.length && <span className="muted">אין תרגילים מתאימים לציוד במיקום הזה. אפשר להוסיף ציוד בהגדרות המיקום.</span>}
          {plan.exercises.map((p, i) => (
            <div key={p.key} className="col" style={{ gap: 8 }}>
            {(i === 0 || partOfPlanned(plan.exercises[i - 1]) !== partOfPlanned(p)) && (
              <b className="caption lime" style={{ fontWeight: 800, marginTop: i ? 6 : 0 }}>{partHe[partOfPlanned(p)]}</b>
            )}
            <div className="list-row">
              <ExerciseThumb exercise={p.exercise} size={52} />
              <div className="grow col" style={{ gap: 4, minWidth: 0 }}>
                <b style={{ fontSize: 16 }}>{p.exercise.nameHe}</b>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  <span className="num muted" style={{ fontSize: 13 }}>{label(p)}</span>
                  {p.note.kind === 'increase' && <Tag text="▲ משקל" />}
                  {p.note.kind === 'firstTime' && <Tag text="חדש" warn />}
                  {p.note.kind === 'advanceVariation' && <Tag text="וריאציה קשה יותר" />}
                  {p.note.kind === 'maxedOut' && <Tag text="מקסימום משקל: + חזרות" />}
                </div>
              </div>
              <FavStar id={p.exercise.id} size={36} />
              <button className="icon-btn" style={{ width: 40, height: 40 }} onClick={() => setSwap(p)} aria-label="החלפת תרגיל">
                <ArrowLeftRight size={16} color="var(--lime)" />
              </button>
            </div>
            </div>
          ))}
        </section>
      )}
      <div style={{ position: 'fixed', insetInline: 16, bottom: 'calc(var(--safe-bottom) + 12px)', zIndex: 2 }}>
        <button className="btn primary" disabled={!plan?.exercises.length} onClick={start}><Zap size={18} fill="#000" /> יאללה</button>
      </div>
      {swap && (
        <ExercisePicker title="החלפת תרגיל" pattern={swap.exercise.pattern} part={partOfPlanned(swap)} equipment={equipment} limitations={limitations}
                        currentID={swap.exercise.id} onClose={() => setSwap(null)}
                        onPick={(e) => swap.slot.slotID && setOverrides((o) => ({ ...o, [swap.slot.slotID!]: e }))} />
      )}
    </Sheet>
  )
}
