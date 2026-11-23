import type { Equipment, BodyArea, ExerciseLog, LocationProfile, MovementPattern, TemplateSlot, WorkoutSession, WorkoutTemplate } from './types'
import { uid } from './types'
import type { Exercise, ExerciseCatalog } from './catalog'
import { baseWeight, isAvailable, isSafe, isTimed, wantsWarmup } from './catalog'
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
}

export const slotInput = (slot: TemplateSlot, locationID?: string): SlotInput => ({
  slotID: slot.id, pattern: slot.pattern, priority: slot.priority, variant: slot.variant, sets: slot.sets,
  repMin: slot.repMin, repMax: slot.repMax, rir: slot.targetRIR, rest: slot.restSeconds,
  mappedExerciseID: locationID ? slot.exerciseByLocation[locationID] : undefined,
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
}

export interface PlannedSession { exercises: PlannedExercise[]; isDeload: boolean; estimatedSeconds: number }

/** מתאים אימון מתבנית לציוד, לזמן ולהיסטוריה, ברגע שמתחילים */
export class SessionBuilder {
  private catalog: ExerciseCatalog
  private history: HistoryIndex

  constructor(catalog: ExerciseCatalog, history: HistoryIndex) {
    this.catalog = catalog
    this.history = history
  }

  build(slots: SlotInput[], equipment: Set<Equipment>, limitations: Set<BodyArea>, minutes: number,
        isDeload: boolean, overrides: Record<string, Exercise> = {}): PlannedSession {
    const used = new Set<string>()
    const planned: PlannedExercise[] = []
    for (const slot of slots) {
      const chosen = (slot.slotID && overrides[slot.slotID]) || this.resolve(slot, equipment, limitations, used)
      if (!chosen) continue
      used.add(chosen.id)
      planned.push(this.plan(chosen, slot, equipment, isDeload))
    }
    this.applyWarmups(planned)
    this.trim(planned, minutes)
    return { exercises: planned, isDeload, estimatedSeconds: estimateSeconds(planned) }
  }

  resolve(slot: SlotInput, equipment: Set<Equipment>, limitations: Set<BodyArea>, used: Set<string>): Exercise | undefined {
    if (slot.mappedExerciseID && !used.has(slot.mappedExerciseID)) {
      const e = this.catalog.exercise(slot.mappedExerciseID)
      if (e && isAvailable(e, equipment) && isSafe(e, limitations)) return e
    }
    const cands = this.catalog.candidates(slot.pattern, equipment, limitations).filter((e) => !used.has(e.id))
    if (!cands.length) return undefined
    return cands[Math.min(slot.variant, cands.length - 1)]
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
    const rec = recommend(h, {
      repMin: slot.repMin, repMax: slot.repMax, targetRIR: slot.rir, increment: exercise.increment,
      isBodyweight: exercise.isBodyweight, hasNextVariation: !!next,
    })
    if (rec.note.kind === 'advanceVariation' && next) {
      ex = next
      const nh = this.history.history(next.id).sessions[0]
      if (nh) rec.reps = Math.min(slot.repMax, Math.max(slot.repMin, Math.max(...nh.sets.map((s) => s.reps)) + 1))
    }
    let sets = slot.sets
    if (isDeload) {
      sets = Math.max(1, Math.round(sets * 0.6))
      if (rec.weight > 0) rec.weight = roundTo(rec.weight * 0.9, Math.max(ex.increment, 1))
    }
    return {
      key: uid(), slot, exercise: ex, warmups: [], workSets: sets, weight: rec.weight, reps: rec.reps,
      note: rec.note, lastSummary: lastSummary(this.history.history(ex.id)),
    }
  }

  private applyWarmups(planned: PlannedExercise[]) {
    const p = planned.find((x) => wantsWarmup(x.exercise) && x.weight >= 30)
    if (p) p.warmups = warmupSets(p.weight, baseWeight(p.exercise), p.exercise.increment)
  }

  /** קיצוץ לפי זמן: קודם סטים בעדיפות 3, אחר כך תרגילי עדיפות 3, ואז עדיפות 2 */
  private trim(planned: PlannedExercise[], minutes: number) {
    const budget = minutes * 60
    const over = () => estimateSeconds(planned) > budget
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

export function estimateSeconds(planned: PlannedExercise[]): number {
  let total = 180
  for (const p of planned) total += 60 + p.warmups.length * (40 + 45) + p.workSets * (40 + p.slot.rest)
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
    for (const p of plan.exercises) {
      const slot = template.slots.find((s) => s.id === p.slot.slotID)
      if (slot) slot.exerciseByLocation[location.id] = p.exercise.id
    }
  }
  return session
}
