import type { AppData, PersonalRecord, PRKind, Program, WorkoutSession } from './types'
import { isMainLift, uid } from './types'
import type { ExerciseCatalog } from './catalog'
import { HistoryIndex, completedWorkSets, orderedExercises, sessionVolume, sessionWorkSets } from './history'
import { best1RM, consecutiveFailures, estimate1RM } from './progression'
import type { Achievement, AchievementContext, LevelInfo, StreakEntry, StreakState, XPItem } from './motivation'
import { computeStreak, emptyAchievementContext, levelInfo, newlyUnlocked, sessionXP } from './motivation'
import { addWeeks, fmtVolume, fmtWeight, ltr, sameWeek, startOfWeek, weeksBetween } from './format'
import { daySeed, summaryLine } from './coach'

export interface PRHit {
  exerciseName: string
  kind: PRKind
  value: number
  previous: number
  weight: number
  reps: number
}

export function prLabel(p: PRHit): string {
  switch (p.kind) {
    case 'maxWeight': return `${fmtWeight(p.weight)} ק״ג × ${p.reps}`
    case 'e1rm': return `1RM משוער: ${fmtWeight(Math.round(p.value * 10) / 10)} ק״ג`
    case 'maxReps': return `${p.reps} חזרות`
    case 'sessionVolume': return fmtVolume(p.value)
  }
}
export const prDelta = (p: PRHit) =>
  p.kind === 'maxReps' ? ltr(`+${Math.round(p.value - p.previous)}`) : `${ltr(`+${fmtWeight(Math.round((p.value - p.previous) * 10) / 10)}`)} ק״ג`

export interface FinishResult {
  session: WorkoutSession
  xpItems: XPItem[]
  levelBefore: LevelInfo
  levelAfter: LevelInfo
  prs: PRHit[]
  achievements: Achievement[]
  streak: StreakState
  weeklyGoalHit: boolean
  coachLine: string
}
export const totalXP = (r: FinishResult) => r.xpItems.reduce((a, x) => a + x.amount, 0)

export const activeProgram = (d: AppData) => d.programs.find((p) => p.isActive)
export const totalXPOf = (d: AppData) => d.xpEvents.reduce((a, x) => a + x.amount, 0)
export const streakEntries = (sessions: WorkoutSession[]): StreakEntry[] =>
  sessions.filter((s) => s.isCompleted).map((s) => ({ date: new Date(s.startedAt), goal: s.weeklyGoalSnapshot }))

export function isDeloadWeek(p: Program | undefined, now = new Date()): boolean {
  return !!p?.deloadWeekStart && sameWeek(new Date(p.deloadWeekStart), now)
}

/** אחרי שבוע דילואד מתחילים מחזור חדש */
export function refreshCycle(p: Program, now = new Date()) {
  if (!p.deloadWeekStart) return
  const end = addWeeks(new Date(p.deloadWeekStart), 1)
  if (now >= end) {
    p.cycleStart = startOfWeek(now).toISOString()
    p.deloadWeekStart = undefined
  }
}

/** רשומות שיא שאינן הראשונות של אותו תרגיל וסוג (הראשונה היא נקודת בסיס) */
export function realPRs(records: PersonalRecord[]): PersonalRecord[] {
  const first = new Map<string, PersonalRecord>()
  for (const r of records) {
    const k = `${r.exerciseID}|${r.kind}`
    const cur = first.get(k)
    if (!cur || r.date < cur.date) first.set(k, r)
  }
  const baseline = new Set([...first.values()].map((r) => r.id))
  return records.filter((r) => !baseline.has(r.id) && r.kind !== 'e1rm').sort((a, b) => b.date.localeCompare(a.date))
}

export function finishSession(data: AppData, session: WorkoutSession, catalog: ExerciseCatalog, now = new Date()): FinishResult {
  const goal = data.profile?.weeklyGoal ?? 3
  const previous = data.sessions.filter((s) => s.isCompleted && s.id !== session.id)
  const xpBefore = totalXPOf(data)
  const levelBefore = levelInfo(xpBefore)
  const streakBefore = computeStreak(streakEntries(previous), goal, now)

  // ניקוי: סטים שלא בוצעו לא נשמרים בהיסטוריה
  for (const log of session.exercises) log.sets = log.sets.filter((s) => s.isCompleted)
  session.exercises = session.exercises.filter((l) => l.sets.length > 0)
  session.endedAt = now.toISOString()
  session.isCompleted = true

  // שיאים
  const prevHistory = new HistoryIndex(previous)
  const prs: PRHit[] = []
  for (const log of orderedExercises(session)) {
    const sets = completedWorkSets(log)
    if (!sets.length) continue
    const ex = catalog.exercise(log.exerciseID)
    const hadHistory = prevHistory.history(log.exerciseID).sessions.length > 0
    const mine = data.records.filter((r) => r.exerciseID === log.exerciseID)
    const best = (k: PRKind) => {
      const v = mine.filter((r) => r.kind === k).map((r) => r.value)
      return v.length ? Math.max(...v) : undefined
    }
    const isBW = ex ? ex.isBodyweight : sets.every((s) => s.weight === 0)
    const hits: PRHit[] = []
    const record = (kind: PRKind, value: number, weight: number, reps: number) => {
      const prev = best(kind)
      if (prev !== undefined && value <= prev + 0.001) return
      data.records.push({ id: uid(), exerciseID: log.exerciseID, exerciseName: log.exerciseName, kind, value, weight, reps,
        date: now.toISOString(), sessionID: session.id })
      if (hadHistory && prev !== undefined) hits.push({ exerciseName: log.exerciseName, kind, value, previous: prev, weight, reps })
    }
    const maxW = Math.max(...sets.map((s) => s.weight))
    if (!isBW && maxW > 0) {
      record('maxWeight', maxW, maxW, Math.max(...sets.filter((s) => s.weight === maxW).map((s) => s.reps)))
      const bestSet = [...sets].sort((a, b) => estimate1RM(b.weight, b.reps, b.rir) - estimate1RM(a.weight, a.reps, a.rir))[0]
      record('e1rm', best1RM(sets), bestSet.weight, bestSet.reps)
    } else {
      const maxR = Math.max(...sets.map((s) => s.reps))
      record('maxReps', maxR, 0, maxR)
    }
    const top = hits.find((h) => h.kind === 'maxWeight') ?? hits.find((h) => h.kind === 'e1rm') ?? hits[0]
    if (top) prs.push(top)
  }

  // התקדמות בתוכנית ודילואד
  const program = activeProgram(data)
  if (program) {
    refreshCycle(program, now)
    const ordered = [...program.templates].sort((a, b) => a.order - b.order)
    const idx = ordered.findIndex((t) => t.id === session.templateID)
    if (idx >= 0) program.nextIndex = idx + 1
    if (!program.deloadWeekStart && !session.isDeload) {
      const weeks = weeksBetween(new Date(program.cycleStart), now)
      const withCurrent = new HistoryIndex([...previous, session])
      const stalled = session.exercises.filter((l) => l.priority === 1 && isMainLift(l.pattern) &&
        consecutiveFailures(withCurrent.history(l.exerciseID), l.repMin) >= 2).length
      if (weeks >= 5 || stalled >= 2) program.deloadWeekStart = addWeeks(startOfWeek(now), 1).toISOString()
    }
  }

  // רצף, XP ורמה
  const completed = [...previous, session]
  const streakAfter = computeStreak(streakEntries(completed), goal, now)
  const weeklyGoalHit = streakBefore.thisWeekCount < goal && streakAfter.thisWeekCount >= goal
  const items = sessionXP(sessionWorkSets(session).length, prs.length, weeklyGoalHit, streakAfter.current)
  for (const it of items) data.xpEvents.push({ id: uid(), amount: it.amount, reason: it.reason, date: now.toISOString(), sessionID: session.id })
  const gained = items.reduce((a, x) => a + x.amount, 0)
  session.xpEarned = gained
  const levelAfter = levelInfo(xpBefore + gained)

  // הישגים
  const ctx = achievementContext(data, catalog, completed, streakAfter, levelAfter.level)
  const already = new Set(data.achievements.map((a) => a.id))
  const newOnes = newlyUnlocked(ctx, already)
  for (const a of newOnes) data.achievements.push({ id: a.id, date: now.toISOString() })

  if (!data.sessions.includes(session)) data.sessions.push(session)

  return {
    session, xpItems: items, levelBefore, levelAfter, prs, achievements: newOnes, streak: streakAfter, weeklyGoalHit,
    coachLine: summaryLine(prs.length, weeklyGoalHit, session.isDeload, daySeed(now)),
  }
}

export interface Bests { bench: number; squat: number; deadlift: number; ohp: number; pullupReps: number; pushupReps: number }

export function bests(sessions: WorkoutSession[], catalog: ExerciseCatalog): Bests {
  const b: Bests = { bench: 0, squat: 0, deadlift: 0, ohp: 0, pullupReps: 0, pushupReps: 0 }
  for (const s of sessions.filter((x) => x.isCompleted)) {
    for (const log of s.exercises) {
      const ex = catalog.exercise(log.exerciseID)
      if (!ex) continue
      const sets = completedWorkSets(log)
      if (!sets.length) continue
      const maxW = Math.max(...sets.map((x) => x.weight))
      const maxR = Math.max(...sets.map((x) => x.reps))
      const eq = new Set(ex.equipment)
      if (ex.pattern === 'horizontalPush') {
        if (eq.has('barbell') && eq.has('bench')) b.bench = Math.max(b.bench, maxW)
        if (ex.isBodyweight && eq.size === 0) b.pushupReps = Math.max(b.pushupReps, maxR)
      } else if (ex.pattern === 'squat' && eq.has('barbell')) b.squat = Math.max(b.squat, maxW)
      else if (ex.pattern === 'hinge' && eq.has('barbell')) b.deadlift = Math.max(b.deadlift, maxW)
      else if (ex.pattern === 'verticalPush' && eq.has('barbell')) b.ohp = Math.max(b.ohp, maxW)
      else if (ex.pattern === 'verticalPull' && ex.isBodyweight && eq.has('pullupBar')) b.pullupReps = Math.max(b.pullupReps, maxR)
    }
  }
  return b
}

export function achievementContext(data: AppData, catalog: ExerciseCatalog, sessions: WorkoutSession[],
                                   streak: StreakState, level: number): AchievementContext {
  const done = sessions.filter((s) => s.isCompleted)
  const metrics = [...data.metrics].sort((a, b) => b.date.localeCompare(a.date))
  const b = bests(done, catalog)
  const c = emptyAchievementContext()
  c.totalWorkouts = done.length
  c.currentStreak = streak.current
  c.bestStreak = streak.best
  c.totalVolume = done.reduce((a, s) => a + sessionVolume(s), 0)
  c.maxSessionVolume = Math.max(0, ...done.map(sessionVolume))
  c.totalPRs = realPRs(data.records).length
  c.bodyweight = metrics.find((m) => m.weight != null)?.weight ?? 0
  c.bestBench = b.bench; c.bestSquat = b.squat; c.bestDeadlift = b.deadlift; c.bestOHP = b.ohp
  c.maxPullupReps = b.pullupReps; c.maxPushupReps = b.pushupReps
  c.distinctLocations = new Set(done.map((s) => s.locationID).filter(Boolean)).size
  c.hadEarlyWorkout = done.some((s) => new Date(s.startedAt).getHours() < 7)
  c.hadLateWorkout = done.some((s) => {
    const d = new Date(s.startedAt)
    return d.getHours() > 21 || (d.getHours() === 21 && d.getMinutes() >= 30)
  })
  c.level = level
  c.bodyMetricsCount = data.metrics.length
  c.photosCount = data.photos.length
  c.deloadsCompleted = new Set(done.filter((s) => s.isDeload).map((s) => startOfWeek(new Date(s.startedAt)).getTime())).size
  return c
}

/** בדיקת הישגים מחוץ לאימון (למשל אחרי מדידה או תמונה) */
export function refreshAchievements(data: AppData, catalog: ExerciseCatalog): Achievement[] {
  const streak = computeStreak(streakEntries(data.sessions), data.profile?.weeklyGoal ?? 3)
  const ctx = achievementContext(data, catalog, data.sessions, streak, levelInfo(totalXPOf(data)).level)
  const newOnes = newlyUnlocked(ctx, new Set(data.achievements.map((a) => a.id)))
  for (const a of newOnes) data.achievements.push({ id: a.id, date: new Date().toISOString() })
  return newOnes
}
