import { useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, Check, ChevronDown, Ellipsis, FlagTriangleRight, History, Info, Minus, Plus, Settings2, SkipForward, Sparkles, Target, Timer, Trash } from 'lucide-react'
import type { ExerciseLog, SetLog, WorkoutSession } from '../engine/types'
import { muscleHe, partHe, partOfPattern, uid } from '../engine/types'
import type { Exercise } from '../engine/catalog'
import { catalog, hidesWeight, isTimed, loadRule } from '../engine/catalog'
import { HistoryIndex, isLogDone, lastSummary, orderedExercises, orderedSets, workSets } from '../engine/history'
import { fillSets, makeLog } from '../engine/session'
import type { SlotInput } from '../engine/session'
import { restBetweenExercises, restBetweenSets, restSettings, saveSetRest, updateRest } from '../engine/prefs'
import { makeBuilder } from '../planning'
import { finishSession, activeProgram } from '../engine/finisher'
import type { FinishResult } from '../engine/finisher'
import { progressionLine } from '../engine/coach'
import { fmtDuration, fmtWeight, ltr } from '../engine/format'
import { isMainLift } from '../engine/types'
import { commit, getData, useData } from '../store'
import { nav } from '../uiState'
import { remaining, restTimer, useRestTimer } from '../timer'
import { ChevronBack, ChevronForward, Confirm, ExerciseImage, RepeatButton, Ring, SecondsStepper, Sheet, Tag, Toggle } from '../ui/kit'
import { ExerciseInfo, ExercisePicker, FavStar, NumberPad } from './Pickers'
import Summary from './Summary'

export default function ActiveWorkout({ session }: { session: WorkoutSession }) {
  const data = useData()
  const profile = data.profile!
  const cat = catalog()
  const [result, setResult] = useState<FinishResult | null>(null)
  const [rirFor, setRirFor] = useState<string | null>(null)
  const [edit, setEdit] = useState<{ set: SetLog; field: 'weight' | 'reps' } | null>(null)
  const [infoFor, setInfoFor] = useState<Exercise | null>(null)
  const [swapFor, setSwapFor] = useState<ExerciseLog | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [menu, setMenu] = useState(false)
  const [confirm, setConfirm] = useState<'finish' | 'cancel' | null>(null)
  const [restFor, setRestFor] = useState<ExerciseLog | null>(null)
  const timer = useRestTimer()
  const [, setTick] = useState(0)

  const history = useMemo(() => new HistoryIndex(data.sessions.filter((s) => s.id !== session.id)), [session.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const exercises = orderedExercises(session)
  const index = Math.min(Math.max(0, session.currentExerciseIndex), Math.max(0, exercises.length - 1))
  const current = exercises[index]
  const location = data.locations.find((l) => l.id === session.locationID)
  const equipment = useMemo(() => new Set(location?.equipment ?? cat.all.flatMap((e) => e.equipment)), [location, cat])
  const limitations = useMemo(() => new Set(profile.limitations), [profile.limitations])

  // שעון כללי + מסך דלוק בזמן אימון
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 500)
    let lock: { release: () => Promise<void> } | null = null
    const acquire = async () => {
      try { lock = await (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen') ?? null } catch { /* לא נתמך */ }
    }
    void acquire()
    const onVis = () => { if (document.visibilityState === 'visible') void acquire() }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); void lock?.release().catch(() => undefined) }
  }, [])

  const setIndex = (i: number) => { session.currentExerciseIndex = i; commit(); document.getElementById('aw-top')?.scrollIntoView({ behavior: 'smooth' }) }
  const completedWork = exercises.flatMap(workSets).filter((s) => s.isCompleted).length
  const pendingWork = exercises.flatMap(workSets).filter((s) => !s.isCompleted).length

  const toggle = (s: SetLog, log: ExerciseLog) => {
    if (s.isCompleted) {
      s.isCompleted = false; s.completedAt = undefined; s.rir = null
      if (rirFor === s.id) setRirFor(null)
      commit(); return
    }
    s.isCompleted = true
    s.completedAt = new Date().toISOString()
    for (const o of orderedSets(log)) {
      if (o.order > s.order && !o.isCompleted && o.kind === s.kind) {
        if (o.weight === s.targetWeight) o.weight = s.weight
        if (o.reps === s.targetReps) o.reps = s.reps
      }
    }
    setRirFor(s.kind === 'work' ? s.id : null)
    commit()
    const allDone = log.sets.every((x) => x.isCompleted)
    if (!profile.restAutoStart || (allDone && index >= exercises.length - 1)) { restTimer.stop(); return }
    const next = orderedSets(log).find((x) => !x.isCompleted)
    const label = allDone && exercises[index + 1] ? `הבא: ${exercises[index + 1].exerciseName}` : next ? `סט הבא: ${next.weight > 0 ? ltr(`${fmtWeight(next.weight)}×${next.reps}`) : `${next.reps} חזרות`}` : ''
    // בין סטים: לפי ההגדרה האישית (או המאמן). אחרי הסט האחרון: מנוחה בין תרגילים
    const seconds = s.kind === 'warmup' ? 60 : allDone ? restBetweenExercises(profile) : restBetweenSets(profile, log.exerciseID, log.restSeconds)
    restTimer.start(seconds, label)
  }

  const addSet = (log: ExerciseLog) => {
    const last = orderedSets(log).at(-1)
    log.sets.push({ id: uid(), order: (last?.order ?? -1) + 1, kind: 'work', weight: last?.weight ?? 0, reps: last?.reps ?? log.repMin,
      rir: null, targetWeight: last?.weight ?? 0, targetReps: last?.reps ?? log.repMin, isCompleted: false })
    commit()
  }
  const removeSet = (log: ExerciseLog) => {
    const last = [...orderedSets(log)].reverse().find((x) => !x.isCompleted)
    if (last) { log.sets = log.sets.filter((x) => x.id !== last.id); commit() }
  }

  const builder = () => makeBuilder(data, location, data.sessions.filter((s) => s.id !== session.id))
  const slotOf = (log: ExerciseLog, ex: Exercise): SlotInput => ({
    slotID: log.slotID, pattern: ex.pattern, priority: log.priority, variant: 0, sets: Math.max(1, workSets(log).length),
    repMin: log.repMin, repMax: log.repMax, rir: log.targetRIR, rest: log.restSeconds,
  })

  const swap = (log: ExerciseLog, ex: Exercise) => {
    const planned = builder().plan(ex, slotOf(log, ex), equipment, session.isDeload)
    if (log.sets.some((x) => x.isCompleted)) {
      // שומרים את הסטים שבוצעו, ומוסיפים את התרגיל החדש אחריו
      log.sets = log.sets.filter((x) => x.isCompleted)
      for (const o of session.exercises) if (o.order > log.order) o.order++
      session.exercises.push(makeLog(planned, log.order + 1))
      session.currentExerciseIndex = index + 1
    } else {
      log.exerciseID = planned.exercise.id
      log.exerciseName = planned.exercise.nameHe
      log.pattern = planned.exercise.pattern
      log.coachNote = progressionLine(planned.note, planned.exercise.nameHe)
      fillSets(log, planned)
    }
    // זוכרים את הבחירה לפעם הבאה במיקום הזה
    const slot = activeProgram(data)?.templates.flatMap((t) => t.slots).find((s) => s.id === log.slotID)
    if (slot && session.locationID) slot.exerciseByLocation[session.locationID] = planned.exercise.id
    commit()
  }

  const addExercise = (ex: Exercise) => {
    const main = isMainLift(ex.pattern) && ex.mechanic === 'compound'
    const slot: SlotInput = { pattern: ex.pattern, priority: 3, variant: 0, sets: 3, repMin: main ? 6 : 10, repMax: main ? 10 : 15, rir: 2, rest: ex.defaultRestSeconds }
    const planned = builder().plan(ex, slot, equipment, session.isDeload)
    session.exercises.push(makeLog(planned, (exercises.at(-1)?.order ?? -1) + 1))
    session.currentExerciseIndex = session.exercises.length - 1
    commit()
  }

  const finish = () => {
    restTimer.stop()
    setConfirm(null)
    setRirFor(null)
    const r = finishSession(getData(), session, cat)
    commit(true)
    setResult(r)
  }

  const cancel = () => {
    restTimer.stop()
    const d = getData()
    d.sessions = d.sessions.filter((s) => s.id !== session.id)
    commit(true)
    nav.endWorkout()
  }

  if (result) return <div className="overlay-full"><Summary result={result} onDone={() => nav.endWorkout()} /></div>

  const ex = current ? cat.exercise(current.exerciseID) : undefined
  const sets = current ? orderedSets(current) : []
  const currentSetID = sets.find((s) => !s.isCompleted)?.id
  let n = 0
  const labels = new Map(sets.map((s) => [s.id, s.kind === 'warmup' ? 'ח' : String(++n)]))
  const last = current ? lastSummary(history.history(current.exerciseID)) : undefined
  const timed = ex ? isTimed(ex) : false
  const noWeight = hidesWeight(ex)
  const rule = ex ? loadRule(ex, location?.limits) : { step: 2.5, max: undefined }
  const step = rule.step > 0 ? rule.step : 2.5
  const maxW = rule.max ?? Infinity

  return (
    <div className="overlay-full">
      <div style={{ padding: 'calc(var(--safe-top) + 6px) var(--gutter) 0', position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg)' }}>
        <div className="row" style={{ paddingBottom: 8 }}>
          <button className="icon-btn" style={{ width: 40, height: 40 }} onClick={() => nav.showWorkout(false)} aria-label="מזעור"><ChevronDown size={18} /></button>
          <div className="grow col" style={{ alignItems: 'center', gap: 1 }}>
            <b className="ellipsis">{session.templateName}</b>
            <span className="num lime" style={{ fontSize: 13 }}>{fmtDuration((Date.now() - new Date(session.startedAt).getTime()) / 1000)}</span>
          </div>
          <button className="icon-btn" style={{ width: 40, height: 40 }} onClick={() => setMenu(true)} aria-label="עוד"><Ellipsis size={18} /></button>
          <button className="pill-btn" onClick={() => setConfirm(completedWork ? 'finish' : 'cancel')}>סיום</button>
        </div>
        <div className="ex-strip" style={{ paddingBottom: 10 }}>
          {exercises.map((l, i) => (
            <button key={l.id} className={`ex-chip ${isLogDone(l) ? 'done' : i === index ? 'cur' : ''}`} onClick={() => setIndex(i)}>
              {isLogDone(l) ? <Check size={12} strokeWidth={4} /> : <span className="num" style={{ fontSize: 12 }}>{i + 1}</span>}
              <span className="ellipsis">{l.exerciseName}</span>
            </button>
          ))}
        </div>
      </div>

      <div id="aw-top" className="col" style={{ padding: `4px var(--gutter) ${timer.endAt ? 250 : 130}px`, gap: 14 }}>
        {current ? <>
          <ExerciseImage exercise={ex} height={190} />
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <div className="grow col" style={{ gap: 6 }}>
              <h2 className="num" style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>{current.exerciseName}</h2>
              {ex && <div className="chips"><Tag text={partHe[partOfPattern(ex.pattern)]} filled />{ex.primaryMuscles.filter((m) => muscleHe[m] !== partHe[partOfPattern(ex.pattern)]).map((m) => <Tag key={m} text={muscleHe[m]} />)}</div>}
            </div>
            {ex && <FavStar id={ex.id} size={40} />}
            {ex && <button className="icon-btn" style={{ width: 40, height: 40 }} onClick={() => setInfoFor(ex)} aria-label="מידע"><Info size={16} color="var(--text2)" /></button>}
            <button className="icon-btn" style={{ width: 40, height: 40 }} onClick={() => setSwapFor(current)} aria-label="החלפה"><ArrowLeftRight size={16} color="var(--lime)" /></button>
          </div>
          <div className="chips">
            <span className="info-pill"><Target size={14} /> {ltr(`${current.repMin}–${current.repMax}`)} {timed ? 'שניות' : 'חזרות'} · RIR {current.targetRIR}</span>
            <button className="info-pill" onClick={() => setRestFor(current)} aria-label="זמני מנוחה">
              <Timer size={14} /> מנוחה {fmtDuration(restBetweenSets(profile, current.exerciseID, current.restSeconds))} <Settings2 size={12} color="var(--lime)" />
            </button>
            {last && <span className="info-pill"><History size={14} /> בפעם הקודמת: {last}</span>}
          </div>
          {current.coachNote && <div className="coach"><Sparkles size={16} color="var(--lime)" style={{ flex: 'none', marginTop: 2 }} /><span style={{ fontSize: 14 }}>{current.coachNote}</span></div>}

          <div className="col" style={{ gap: 8 }}>
            {sets.map((s) => (
              <div key={s.id} className="col" style={{ gap: 8 }}>
                <div className={`set-row ${s.isCompleted ? 'done' : s.id === currentSetID ? 'current' : ''}`}>
                  <span className={`lbl ${s.kind === 'warmup' ? 'warm' : ''}`}>{labels.get(s.id)}</span>
                  {noWeight ? <span className="grow muted" style={{ textAlign: 'center', fontSize: 13, fontWeight: 600 }}>משקל גוף</span> : (
                    <div className="val" style={{ opacity: s.isCompleted ? 0.85 : 1 }}>
                      <RepeatButton className="pm" label="פחות משקל" onStep={() => { if (!s.isCompleted) { s.weight = Math.max(0, Math.round((s.weight - step) * 100) / 100); commit() } }}><Minus size={13} strokeWidth={3} /></RepeatButton>
                      <button className="v" onClick={() => !s.isCompleted && setEdit({ set: s, field: 'weight' })}><b>{fmtWeight(s.weight)}</b><small>ק״ג</small></button>
                      <RepeatButton className="pm" label="יותר משקל" onStep={() => { if (!s.isCompleted) { s.weight = Math.min(maxW, Math.round((s.weight + step) * 100) / 100); commit() } }}><Plus size={13} strokeWidth={3} /></RepeatButton>
                    </div>
                  )}
                  <div className="val" style={{ opacity: s.isCompleted ? 0.85 : 1 }}>
                    <RepeatButton className="pm" label="פחות" onStep={() => { if (!s.isCompleted) { s.reps = Math.max(0, s.reps - (timed ? 5 : 1)); commit() } }}><Minus size={13} strokeWidth={3} /></RepeatButton>
                    <button className="v" onClick={() => !s.isCompleted && setEdit({ set: s, field: 'reps' })}><b>{s.reps}</b><small>{timed ? 'שניות' : 'חזרות'}</small></button>
                    <RepeatButton className="pm" label="יותר" onStep={() => { if (!s.isCompleted) { s.reps += timed ? 5 : 1; commit() } }}><Plus size={13} strokeWidth={3} /></RepeatButton>
                  </div>
                  <button className={`check ${s.isCompleted ? 'on' : s.id === currentSetID ? 'current' : ''}`} onClick={() => toggle(s, current)} aria-label="סימון סט">
                    <Check size={22} strokeWidth={3.5} />
                  </button>
                </div>
                {rirFor === s.id && (
                  <div className="card tight" style={{ borderColor: 'rgba(198,255,61,.35)', gap: 8 }}>
                    <b className="caption" style={{ fontWeight: 700 }}>כמה חזרות נשארו במאגר?</b>
                    <div className="row" style={{ gap: 6 }}>
                      {[0, 1, 2, 3, 4].map((v) => (
                        <button key={v} className="num" onClick={() => { s.rir = v; setRirFor(null); commit() }}
                                style={{ flex: 1, height: 44, borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--line)', fontSize: 17 }}>
                          {v === 4 ? ltr('4+') : v}
                        </button>
                      ))}
                      <button className="dim" style={{ fontSize: 13, fontWeight: 600, padding: '0 4px' }} onClick={() => setRirFor(null)}>דילוג</button>
                    </div>
                    <span className="dim" style={{ fontSize: 11 }}>0 = עד כישלון · 2 = יכולתי עוד שתיים</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="row">
            <button className="btn secondary small" onClick={() => addSet(current)}><Plus size={16} /> סט נוסף</button>
            {sets.length > 1 && sets.some((s) => !s.isCompleted) && <button className="btn secondary small" onClick={() => removeSet(current)}><Minus size={16} /> הסרת סט</button>}
          </div>
        </> : <span className="muted" style={{ textAlign: 'center', padding: 40 }}>אין תרגילים. אפשר להוסיף תרגיל מהתפריט.</span>}
      </div>

      <div className="col" style={{ position: 'fixed', insetInline: 'var(--gutter)', bottom: 'calc(var(--safe-bottom) + 8px)', gap: 10, zIndex: 6 }}>
        {timer.endAt != null && <RestBar onSettings={current ? () => setRestFor(current) : undefined} />}
        <div className="row">
          <button className="btn secondary" style={{ width: 64, minHeight: 52 }} disabled={index === 0} onClick={() => setIndex(index - 1)} aria-label="הקודם">
            <ChevronBack size={20} />
          </button>
          {index < exercises.length - 1 ? (
            <button className={`btn ${current && isLogDone(current) ? 'primary' : 'secondary'}`} style={{ minHeight: 52 }} onClick={() => setIndex(index + 1)}>
              לתרגיל הבא <ChevronForward size={20} />
            </button>
          ) : (
            <button className="btn primary" style={{ minHeight: 52 }} onClick={() => setConfirm(completedWork ? 'finish' : 'cancel')}>
              <FlagTriangleRight size={18} /> סיום האימון
            </button>
          )}
        </div>
      </div>

      {menu && (
        <div className="sheet-backdrop" onClick={() => setMenu(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="grabber" />
            <button className="btn secondary" onClick={() => { setMenu(false); setShowAdd(true) }}><Plus size={18} /> הוספת תרגיל</button>
            <button className="btn danger" onClick={() => { setMenu(false); setConfirm('cancel') }}><Trash size={18} /> ביטול האימון</button>
          </div>
        </div>
      )}
      {confirm === 'finish' && (
        <Confirm title="לסיים את האימון?" confirm="סיום ושמירה" cancel="ממשיכים להתאמן"
                 message={pendingWork > 0 ? `יש ${pendingWork} סטים שלא סומנו. הם לא יישמרו בהיסטוריה.` : 'כל הכבוד, כל הסטים סומנו.'}
                 onConfirm={finish} onCancel={() => setConfirm(null)} />
      )}
      {confirm === 'cancel' && (
        <Confirm title="לבטל את האימון?" message="שום דבר מהאימון הזה לא יישמר." confirm="ביטול האימון ומחיקה" danger cancel="חזרה לאימון"
                 onConfirm={cancel} onCancel={() => setConfirm(null)} />
      )}
      {edit && (
        <NumberPad title={edit.field === 'weight' ? 'משקל (ק״ג)' : timed ? 'שניות' : 'חזרות'} initial={edit.field === 'weight' ? edit.set.weight : edit.set.reps}
                   decimal={edit.field === 'weight'} onClose={() => setEdit(null)}
                   onDone={(v) => { if (edit.field === 'weight') edit.set.weight = v; else edit.set.reps = v; commit() }} />
      )}
      {infoFor && <ExerciseInfo exercise={infoFor} onClose={() => setInfoFor(null)} />}
      {swapFor && (
        <ExercisePicker title="החלפת תרגיל" pattern={swapFor.pattern} part={partOfPattern(swapFor.pattern)} equipment={equipment} limitations={limitations}
                        currentID={swapFor.exerciseID} onClose={() => setSwapFor(null)} onPick={(e) => swap(swapFor, e)} />
      )}
      {showAdd && <ExercisePicker title="הוספת תרגיל" equipment={equipment} limitations={limitations} onClose={() => setShowAdd(false)} onPick={addExercise} />}
      {restFor && <RestSheet log={restFor} onClose={() => setRestFor(null)} />}
    </div>
  )
}

/** הגדרת זמני מנוחה מתוך האימון. נשמר לאימונים הבאים */
export function RestSheet({ log, onClose }: { log: ExerciseLog; onClose: () => void }) {
  const data = useData()
  const p = data.profile!
  const r = restSettings(p)
  const [sets, setSets] = useState(restBetweenSets(p, log.exerciseID, log.restSeconds))
  const [between, setBetween] = useState(r.exercises)
  const [onlyThis, setOnlyThis] = useState(r.byExercise[log.exerciseID] != null)
  const save = () => {
    if (onlyThis) saveSetRest(p, sets, log.exerciseID)
    else {
      const next = restSettings(p)
      delete next.byExercise[log.exerciseID]
      p.rest = next
      saveSetRest(p, sets)
    }
    updateRest(p, { exercises: between })
    commit()
    onClose()
  }
  return (
    <Sheet onClose={onClose}>
      <b className="headline" style={{ textAlign: 'center' }}>זמני מנוחה</b>
      <SecondsStepper label="בין סט לסט" value={sets} onChange={setSets} />
      <Toggle label={`רק ל${log.exerciseName}`} on={onlyThis} onChange={setOnlyThis} />
      <SecondsStepper label="בין תרגיל לתרגיל" value={between} onChange={setBetween} />
      <span className="caption">ההגדרה נשמרת גם לאימונים הבאים. אפשר לשנות בכל רגע בפרופיל, ב״זמני מנוחה״.</span>
      <button className="btn primary" onClick={save}>שמירה</button>
    </Sheet>
  )
}

function RestBar({ onSettings }: { onSettings?: () => void }) {
  const t = useRestTimer()
  const [, setTick] = useState(0)
  useEffect(() => { const i = setInterval(() => setTick((x) => x + 1), 250); return () => clearInterval(i) }, [])
  const rem = remaining(t)
  const progress = t.duration > 0 ? 1 - rem / t.duration : 0
  return (
    <div className="rest-bar">
      <Ring progress={progress} size={42} stroke={5}><Timer size={14} color="var(--lime)" /></Ring>
      <div className="col" style={{ gap: 0 }}>
        <button className="muted row" style={{ fontSize: 12, fontWeight: 600, gap: 4 }} onClick={onSettings} disabled={!onSettings}>
          מנוחה {onSettings && <Settings2 size={11} color="var(--lime)" />}
        </button>
        <span className="num" dir="ltr" style={{ fontSize: 30, lineHeight: 1, color: rem <= 5 ? 'var(--lime)' : 'var(--text)' }}>{fmtDuration(Math.ceil(rem))}</span>
      </div>
      <span className="spacer" />
      <button className="timer-pill" onClick={() => restTimer.add(-15)}>{ltr('−15')}</button>
      <button className="timer-pill" onClick={() => restTimer.add(30)}>{ltr('+30')}</button>
      <button className="timer-pill on" onClick={() => restTimer.stop()} aria-label="דילוג"><SkipForward size={16} fill="#000" /></button>
    </div>
  )
}
