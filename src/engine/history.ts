import type { ExerciseLog, WorkoutSession } from './types'
import type { ExerciseHistory } from './progression'
import { fmtWeight, ltr } from './format'

export const orderedExercises = (s: WorkoutSession) => [...s.exercises].sort((a, b) => a.order - b.order)
export const orderedSets = (l: ExerciseLog) => [...l.sets].sort((a, b) => a.order - b.order)
export const workSets = (l: ExerciseLog) => orderedSets(l).filter((s) => s.kind === 'work')
export const completedWorkSets = (l: ExerciseLog) => workSets(l).filter((s) => s.isCompleted)
export const isLogDone = (l: ExerciseLog) => workSets(l).length > 0 && workSets(l).every((s) => s.isCompleted)

export const sessionWorkSets = (s: WorkoutSession) => orderedExercises(s).flatMap(completedWorkSets)
export const sessionVolume = (s: WorkoutSession) => sessionWorkSets(s).reduce((a, x) => a + x.weight * x.reps, 0)
export const sessionDuration = (s: WorkoutSession, now = new Date()) =>
  ((s.endedAt ? new Date(s.endedAt) : now).getTime() - new Date(s.startedAt).getTime()) / 1000

/** אינדקס היסטוריה לפי תרגיל, מכל האימונים שהושלמו */
export class HistoryIndex {
  private map = new Map<string, ExerciseHistory>()

  constructor(sessions: WorkoutSession[]) {
    const done = sessions.filter((s) => s.isCompleted).sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    for (const s of done) {
      for (const log of orderedExercises(s)) {
        const sets = completedWorkSets(log).map((x) => ({ weight: x.weight, reps: x.reps, rir: x.rir }))
        if (!sets.length) continue
        const h = this.map.get(log.exerciseID) ?? { sessions: [] }
        h.sessions.push({ date: s.startedAt, sets })
        this.map.set(log.exerciseID, h)
      }
    }
  }

  history(id: string): ExerciseHistory {
    return this.map.get(id) ?? { sessions: [] }
  }
}

/** "80×8 · 80×8 · 80×7" */
export function lastSummary(h: ExerciseHistory): string | undefined {
  const last = h.sessions[0]
  if (!last) return undefined
  return last.sets.map((s) => ltr(s.weight > 0 ? `${fmtWeight(s.weight)}×${s.reps}` : `${s.reps}`)).join(' · ')
}
