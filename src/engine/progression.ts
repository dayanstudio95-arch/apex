// התקדמות כפולה עם RIR: קודם חזרות, אחר כך משקל.

export interface PerformedSet { weight: number; reps: number; rir?: number | null }
export interface PerformedSession { date: string; sets: PerformedSet[] }
/** ההיסטוריה של תרגיל אחד, מהאימון האחרון לראשון */
export interface ExerciseHistory { sessions: PerformedSession[] }

export type ProgressionNote =
  | { kind: 'firstTime' }
  | { kind: 'increase'; amount: number }
  | { kind: 'addReps' }
  | { kind: 'hold' }
  | { kind: 'decrease' }
  | { kind: 'advanceVariation' }

export interface Recommendation { weight: number; reps: number; note: ProgressionNote }

export function roundTo(x: number, step: number): number {
  if (step <= 0) return x
  return Math.round(x / step) * step
}

export function recommend(history: ExerciseHistory, opts: {
  repMin: number; repMax: number; targetRIR: number; increment: number; isBodyweight: boolean; hasNextVariation: boolean
}): Recommendation {
  const { repMin, repMax, targetRIR, increment, isBodyweight, hasNextVariation } = opts
  const last = history.sessions[0]
  if (!last || last.sets.length === 0) {
    return { weight: 0, reps: Math.floor((repMin + repMax) / 2), note: { kind: 'firstTime' } }
  }
  const topWeight = Math.max(...last.sets.map((s) => s.weight))
  const topSets = last.sets.filter((s) => s.weight === topWeight)
  const firstReps = topSets[0]?.reps ?? 0
  const bestReps = Math.max(...topSets.map((s) => s.reps))
  const allTop = topSets.every((s) => s.reps >= repMax && (s.rir ?? targetRIR) >= targetRIR)

  if (isBodyweight || increment <= 0) {
    if (allTop) {
      if (hasNextVariation) return { weight: topWeight, reps: repMin, note: { kind: 'advanceVariation' } }
      return { weight: topWeight, reps: bestReps + 1, note: { kind: 'addReps' } }
    }
    return { weight: topWeight, reps: Math.min(Math.max(repMin, bestReps + 1), repMax), note: { kind: 'addReps' } }
  }

  if (allTop) {
    return { weight: roundTo(topWeight + increment, increment), reps: repMin, note: { kind: 'increase', amount: increment } }
  }

  if (firstReps < repMin) {
    if (consecutiveFailures(history, repMin) >= 2) {
      let lowered = roundTo(topWeight * 0.9, increment)
      if (lowered >= topWeight) lowered = Math.max(0, topWeight - increment)
      return { weight: lowered, reps: repMin, note: { kind: 'decrease' } }
    }
    return { weight: topWeight, reps: repMin, note: { kind: 'hold' } }
  }

  return { weight: topWeight, reps: Math.min(repMax, firstReps + 1), note: { kind: 'addReps' } }
}

/** כמה אימונים ברצף (מהאחרון) הסט הראשון במשקל העליון היה מתחת לטווח */
export function consecutiveFailures(history: ExerciseHistory, repMin: number): number {
  let count = 0
  for (const s of history.sessions) {
    if (!s.sets.length) break
    const top = Math.max(...s.sets.map((x) => x.weight))
    const first = s.sets.find((x) => x.weight === top)
    if (first && first.reps < repMin) count++
    else break
  }
  return count
}

/** סטי חימום אוטומטיים לתרגיל הכבד הראשון */
export function warmupSets(workWeight: number, baseWeight: number, increment: number): PerformedSet[] {
  const step = increment > 0 ? Math.min(increment, 2.5) : 2.5
  if (workWeight < 30) return []
  const sets: PerformedSet[] = []
  const w1 = Math.max(baseWeight, roundTo(workWeight * 0.5, step))
  sets.push({ weight: w1, reps: 8 })
  if (workWeight >= 50) {
    const w2 = roundTo(workWeight * 0.75, step)
    if (w2 > w1) sets.push({ weight: w2, reps: 4 })
  }
  return sets
}

/** Epley עם תיקון RIR: w × (1 + (reps + RIR) / 30) */
export function estimate1RM(weight: number, reps: number, rir?: number | null): number {
  if (weight <= 0 || reps <= 0) return 0
  return weight * (1 + (reps + Math.max(0, rir ?? 0)) / 30)
}

export const best1RM = (sets: PerformedSet[]) => Math.max(0, ...sets.map((s) => estimate1RM(s.weight, s.reps, s.rir)))
