import type { BodyArea, BodyPart, Equipment, ExerciseLog, LocationLimits, LocationProfile, MovementPattern, TemplateSlot, WorkoutSession, WorkoutTemplate } from './types'
import { uid } from './types'
import type { Exercise, ExerciseCatalog } from './catalog'
import { baseWeight, isAvailable, isSafe, isTimed, loadRule, usesStack, wantsWarmup } from './catalog'
import { focusPrefer } from './split'
import type { HistoryIndex } from './history'
import { lastSummary } from './history'
import type { PerformedSet, ProgressionNote } from './progression'
import { recommend, roundTo, warmupSets } from './progression'
import { progressionLine } from './coach'

export interface SlotInput {
  slotID?: string
  pattern: MovementPattern
  priority: number
  variant: number
  sets: number
  repMin: number
  repMax: number
  rir: number
  rest: number
  mappedExerciseID?: string
  part?: BodyPart
  focus?: string
  flex?: boolean
}

export const slotInput = (slot: TemplateSlot, locationID?: string): SlotInput => ({
  slotID: slot.id, pattern: slot.pattern, priority: slot.priority, variant: slot.variant, sets: slot.sets,
  repMin: slot.repMin, repMax: slot.repMax, rir: slot.targetRIR, rest: slot.restSeconds,
  mappedExerciseID: locationID ? slot.exerciseByLocation[locationID] : undefined,
  part: slot.part, focus: slot.focus, flex: slot.flex,
})

export interface PlannedExercise {
  key: string
  slot: SlotInput
  exercise: Exercise
  warmups: PerformedSet[]
  workSets: number
  weight: number
  reps: number
  note: ProgressionNote
  lastSummary?: string
  /** התרגיל נבחר ידנית (החלפה), ולכן נשמר בתבנית */
  explicit?: boolean
}

export interface PlannedSession { exercises: PlannedExercise[]; isDeload: boolean; estimatedSeconds: number }

export interface BuilderOptions {
  /** תרגילים מועדפים: נבחרים לפני ההמלצה הרגילה */
  favorites?: Set<string>
  /** מגבלות ציוד במיקום (משקולות עד X, ערימה בצעדים) */
  limits?: LocationLimits
  /** מנוחה בפועל בין סטים, לפי ההגדרות האישיות */
  restFor?: (exerciseID: string, coachSeconds: number) => number
}

/** מתאים אימון מתבנית לציוד, לזמן ולהיסטוריה, ברגע שמתחילים */
export class SessionBuilder {
  private catalog: ExerciseCatalog
  private history: HistoryIndex
  private opts: BuilderOptions

  constructor(catalog: ExerciseCatalog, history: HistoryIndex, opts: BuilderOptions = {}) {
    this.catalog = catalog
    this.history = history
    this.opts = opts
  }

  /**
   * בחירת תרגיל לכל משבצת, בשלבים כדי שהתוצאה לא תלויה בסדר:
   * החלפה ידנית → תרגיל ששמור למיקום → מועדף שמתאים לסוג → מועדף מאותה תנועה → התרגיל המועדף לסוג → לפי עדיפות.
   */
  build(slots: SlotInput[], equipment: Set<Equipment>, limitations: Set<BodyArea>, minutes: number,
        isDeload: boolean, overrides: Record<string, Exercise> = {}): PlannedSession {
    const used = new Set<string>()
    const chosen: (Exercise | undefined)[] = slots.map(() => undefined)
    const explicit = slots.map(() => false)
    const take = (i: number, e: Exercise | undefined, isExplicit = false) => {
      if (!e || chosen[i]) return
      chosen[i] = e
      explicit[i] = isExplicit
      used.add(e.id)
    }
    slots.forEach((slot, i) => take(i, slot.slotID ? overrides[slot.slotID] : undefined, true))
    slots.forEach((slot, i) => {
      if (chosen[i] || !slot.mappedExerciseID || used.has(slot.mappedExerciseID)) return
      const e = this.catalog.exercise(slot.mappedExerciseID)
      if (e && isAvailable(e, equipment) && isSafe(e, limitations)) take(i, e)
    })
    // מועדף הולך למשבצת שהוא הכי מתאים לה (למשל לחיצה במכונה → "לחיצת חזה נוספת", ולא במקום הלחיצה עם משקולות)
    const fav = this.opts.favorites ?? new Set<string>()
    const matches: { i: number; e: Exercise; rank: number }[] = []
    slots.forEach((slot, i) => {
      if (chosen[i]) return
      const cands = this.catalog.candidates(slot.pattern, equipment, limitations)
      focusPrefer(slot.focus).forEach((id, rank) => {
        const e = fav.has(id) ? cands.find((c) => c.id === id) : undefined
        if (e) matches.push({ i, e, rank })
      })
    })
    matches.sort((x, y) => x.rank - y.rank || x.i - y.i)
    for (const m of matches) if (!chosen[m.i] && !used.has(m.e.id)) take(m.i, m.e)
    for (const stage of [1, 2, 3] as const) {
      slots.forEach((slot, i) => { if (!chosen[i]) take(i, this.pick(slot, equipment, limitations, used, stage)) })
    }
    const planned: PlannedExercise[] = []
    slots.forEach((slot, i) => {
      const e = chosen[i]
      if (!e) return
      const p = this.plan(e, slot, equipment, isDeload)
      if (explicit[i]) p.explicit = true
      planned.push(p)
    })
    this.applyWarmups(planned)
    this.trim(planned, minutes)
    return { exercises: planned, isDeload, estimatedSeconds: this.estimate(planned) }
  }

  private pick(slot: SlotInput, equipment: Set<Equipment>, limitations: Set<BodyArea>, used: Set<string>,
               stage: 1 | 2 | 3): Exercise | undefined {
    const cands = this.catalog.candidates(slot.pattern, equipment, limitations).filter((e) => !used.has(e.id))
    if (!cands.length) return undefined
    const fav = this.opts.favorites ?? new Set<string>()
    const prefer = focusPrefer(slot.focus)
    const byID = (id: string) => cands.find((e) => e.id === id)
    switch (stage) {
      case 1: return cands.find((e) => fav.has(e.id))
      case 2: return prefer.map(byID).find(Boolean)
      case 3: return cands[Math.min(slot.variant, cands.length - 1)]
    }
  }

  /** מנוחה בפועל לתרגיל (הגדרה אישית או המלצת המאמן) */
  restOf(p: PlannedExercise): number {
    return this.opts.restFor ? this.opts.restFor(p.exercise.id, p.slot.rest) : p.slot.rest
  }

  estimate(planned: PlannedExercise[]): number {
    return estimateSeconds(planned, (p) => this.restOf(p))
  }

  /** המלצה לתרגיל (משמש גם בהחלפת תרגיל באמצע אימון) */
  plan(exercise: Exercise, inputSlot: SlotInput, equipment: Set<Equipment>, isDeload: boolean): PlannedExercise {
    const slot = { ...inputSlot }
    const h = this.history.history(exercise.id)
    if (isTimed(exercise)) {
      // תרגיל בזמן: "חזרות" = שניות, מתקדמים ב-5 שניות
      slot.repMin = 30
      slot.repMax = 60
      const best = h.sessions[0] ? Math.max(...h.sessions[0].sets.map((s) => s.reps)) : undefined
      let sets = slot.sets
      if (isDeload) sets = Math.max(1, Math.round(sets * 0.6))
      return {
        key: uid(), slot, exercise, warmups: [], workSets: sets,
        weight: h.sessions[0] ? Math.max(...h.sessions[0].sets.map((s) => s.weight)) : 0,
        reps: best != null ? Math.min(slot.repMax + 30, best + 5) : 30,
        note: best == null ? { kind: 'firstTime' } : { kind: 'addReps' }, lastSummary: lastSummary(h),
      }
    }
    let ex = exercise
    const next = this.catalog.nextInChain(exercise, equipment)
    const rule = loadRule(exercise, this.opts.limits)
    const rec = recommend(h, {
      repMin: slot.repMin, repMax: slot.repMax, targetRIR: slot.rir, increment: rule.step,
      isBodyweight: exercise.isBodyweight, hasNextVariation: !!next, max: rule.max,
    })
    if (rec.note.kind === 'advanceVariation' && next) {
      ex = next
      const nh = this.history.history(next.id).sessions[0]
      if (nh) rec.reps = Math.min(slot.repMax, Math.max(slot.repMin, Math.max(...nh.sets.map((s) => s.reps)) + 1))
    }
    let sets = slot.sets
    if (isDeload) {
      sets = Math.max(1, Math.round(sets * 0.6))
      if (rec.weight > 0) rec.weight = roundTo(rec.weight * 0.9, Math.max(rule.step, 1))
    }
    return {
      key: uid(), slot, exercise: ex, warmups: [], workSets: sets, weight: rec.weight, reps: rec.reps,
      note: rec.note, lastSummary: lastSummary(this.history.history(ex.id)),
    }
  }

  private applyWarmups(planned: PlannedExercise[]) {
    const p = planned.find((x) => wantsWarmup(x.exercise) && x.weight >= 30)
    if (!p) return
    const stack = !!this.opts.limits?.stackStep && usesStack(p.exercise)
    p.warmups = warmupSets(p.weight, baseWeight(p.exercise), loadRule(p.exercise, this.opts.limits).step, stack)
  }

  /** קיצוץ לפי זמן: קודם סטים בעדיפות 3, אחר כך תרגילי עדיפות 3, ואז עדיפות 2 */
  private trim(planned: PlannedExercise[], minutes: number) {
    const budget = minutes * 60
    const over = () => this.estimate(planned) > budget
    const lastIndex = (f: (p: PlannedExercise) => boolean) => {
      for (let i = planned.length - 1; i >= 0; i--) if (f(planned[i])) return i
      return -1
    }
    for (const pr of [3, 2]) {
      let i: number
      while (over() && (i = lastIndex((p) => p.slot.priority === pr && p.workSets > 2)) >= 0) planned[i].workSets--
      while (over() && (i = lastIndex((p) => p.slot.priority === pr)) >= 0) planned.splice(i, 1)
    }
    let j: number
    while (over() && (j = lastIndex((p) => p.workSets > 2)) >= 0) planned[j].workSets--
  }
}

export function estimateSeconds(planned: PlannedExercise[], restOf: (p: PlannedExercise) => number = (p) => p.slot.rest): number {
  let total = 180
  for (const p of planned) total += 60 + p.warmups.length * (40 + 45) + p.workSets * (40 + restOf(p))
  return total
}

export function makeLog(p: PlannedExercise, order: number): ExerciseLog {
  const log: ExerciseLog = {
    id: uid(), order, exerciseID: p.exercise.id, exerciseName: p.exercise.nameHe, slotID: p.slot.slotID,
    pattern: p.exercise.pattern, priority: p.slot.priority, repMin: p.slot.repMin, repMax: p.slot.repMax,
    targetRIR: p.slot.rir, restSeconds: p.slot.rest, coachNote: progressionLine(p.note, p.exercise.nameHe),
    note: '', sets: [],
  }
  fillSets(log, p)
  return log
}

export function fillSets(log: ExerciseLog, p: PlannedExercise) {
  let order = 0
  const mk = (kind: 'warmup' | 'work', weight: number, reps: number) => ({
    id: uid(), order: order++, kind, weight, reps, rir: null, targetWeight: weight, targetReps: reps, isCompleted: false,
  })
  log.sets = [
    ...p.warmups.map((w) => mk('warmup', w.weight, w.reps)),
    ...Array.from({ length: Math.max(1, p.workSets) }, () => mk('work', p.weight, p.reps)),
  ]
}

/** יוצר אימון חדש מתכנון, ושומר את בחירת התרגיל לכל מיקום בתבנית */
export function startSession(plan: PlannedSession, template: WorkoutTemplate | undefined,
                             location: LocationProfile | undefined, minutes: number, weeklyGoal: number,
                             now = new Date()): WorkoutSession {
  const session: WorkoutSession = {
    id: uid(), startedAt: now.toISOString(), kind: 'strength', templateName: template?.name ?? 'אימון חופשי',
    templateID: template?.id, locationID: location?.id, locationName: location?.name ?? '', plannedMinutes: minutes,
    note: '', xpEarned: 0, isDeload: plan.isDeload, isCompleted: false, weeklyGoalSnapshot: weeklyGoal,
    currentExerciseIndex: 0, exercises: plan.exercises.map((p, i) => makeLog(p, i)),
  }
  if (template && location) {
    // שומרים רק בחירה ידנית או מעבר לווריאציה קשה יותר. בחירה אוטומטית מתעדכנת לבד (למשל כשמסמנים מועדף)
    for (const p of plan.exercises) {
      if (!p.explicit && p.note.kind !== 'advanceVariation') continue
      const slot = template.slots.find((s) => s.id === p.slot.slotID)
      if (slot) slot.exerciseByLocation[location.id] = p.exercise.id
    }
  }
  return session
}
