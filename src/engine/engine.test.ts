import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { recommend, consecutiveFailures, warmupSets, estimate1RM } from './progression'
import type { ExerciseHistory } from './progression'
import { generateProgram } from './program'
import { ExerciseCatalog } from './catalog'
import type { Exercise } from './catalog'
import { HistoryIndex } from './history'
import { SessionBuilder } from './session'
import type { SlotInput } from './session'
import { computeStreak, levelInfo, levelTitle, newlyUnlocked, sessionXP, stepXP, emptyAchievementContext } from './motivation'
import type { StreakEntry } from './motivation'
import { addDays, addWeeks, startOfWeek } from './format'
import { EQUIPMENT, PATTERNS } from './types'
import type { BodyArea, Equipment, MovementPattern } from './types'

const hist = (...sessions: [number, number, number | null][][]): ExerciseHistory => ({
  sessions: sessions.map((sets, i) => ({ date: new Date(Date.now() - i * 86_400_000).toISOString(),
    sets: sets.map(([weight, reps, rir]) => ({ weight, reps, rir })) })),
})
const opts = (o: Partial<Parameters<typeof recommend>[1]> = {}) =>
  ({ repMin: 6, repMax: 10, targetRIR: 2, increment: 2.5, isBodyweight: false, hasNextVariation: false, ...o })

describe('ProgressionEngine', () => {
  it('first time has no weight', () => {
    const r = recommend({ sessions: [] }, opts())
    expect(r.note.kind).toBe('firstTime'); expect(r.weight).toBe(0); expect(r.reps).toBe(8)
  })
  it('increases when all sets hit top with enough RIR', () => {
    const r = recommend(hist([[80, 10, 2], [80, 10, 2], [80, 10, 3]]), opts())
    expect(r.note).toEqual({ kind: 'increase', amount: 2.5 }); expect(r.weight).toBe(82.5); expect(r.reps).toBe(6)
  })
  it('holds weight when grinding at top reps', () => {
    const r = recommend(hist([[80, 10, 0], [80, 10, 0]]), opts())
    expect(r.weight).toBe(80); expect(r.note.kind).toBe('addReps')
  })
  it('adds a rep inside the range', () => {
    const r = recommend(hist([[80, 7, 2], [80, 7, 2]]), opts())
    expect(r.weight).toBe(80); expect(r.reps).toBe(8)
  })
  it('holds after a single failure', () => {
    const r = recommend(hist([[100, 4, 0]], [[100, 7, 1]]), opts({ increment: 5 }))
    expect(r.note.kind).toBe('hold'); expect(r.weight).toBe(100)
  })
  it('decreases after two failures in a row', () => {
    const h = hist([[100, 4, 0]], [[100, 5, 0]])
    const r = recommend(h, opts({ increment: 5 }))
    expect(r.note.kind).toBe('decrease'); expect(r.weight).toBe(90); expect(consecutiveFailures(h, 6)).toBe(2)
  })
  it('bodyweight adds reps and advances variation at the ceiling', () => {
    expect(recommend(hist([[0, 12, 2], [0, 11, 2]]), opts({ repMin: 8, repMax: 15, increment: 0, isBodyweight: true, hasNextVariation: true })).reps).toBe(13)
    const adv = recommend(hist([[0, 15, 2], [0, 15, 3]]), opts({ repMin: 8, repMax: 15, increment: 0, isBodyweight: true, hasNextVariation: true }))
    expect(adv.note.kind).toBe('advanceVariation'); expect(adv.reps).toBe(8)
  })
  it('warmups scale with weight', () => {
    expect(warmupSets(20, 20, 2.5)).toEqual([])
    const w = warmupSets(100, 20, 2.5)
    expect(w.map((s) => s.weight)).toEqual([50, 75])
  })
  it('1RM uses RIR', () => {
    expect(Math.abs(estimate1RM(100, 5, 0) - 100 * (1 + 5 / 30))).toBeLessThan(1e-9)
    expect(estimate1RM(100, 5, 2)).toBeGreaterThan(estimate1RM(100, 5, 0))
    expect(estimate1RM(0, 10, 1)).toBe(0)
  })
})

describe('ProgramGenerator', () => {
  it.each([[2, 'fullBody'], [3, 'fullBody'], [4, 'upperLower'], [5, 'pushPullLegs'], [6, 'pushPullLegs']])(
    'weekly goal %i → %s', (goal, split) => {
      expect(generateProgram({ goals: new Set(['muscle']), level: 'intermediate', weeklyGoal: goal }).split).toBe(split)
    })
  it('fat loss adds a finisher', () => {
    const w = generateProgram({ goals: new Set(['muscle', 'fatLoss']), level: 'intermediate', weeklyGoal: 3 })
    const wo = generateProgram({ goals: new Set(['muscle']), level: 'intermediate', weeklyGoal: 3 })
    expect(w.templates.every((t) => t.slots.at(-1)?.pattern === 'conditioning')).toBe(true)
    expect(wo.templates.every((t) => !t.slots.some((s) => s.pattern === 'conditioning'))).toBe(true)
  })
  it('main lifts use heavier ranges', () => {
    const bp = generateProgram({ goals: new Set(['muscle']), level: 'intermediate', weeklyGoal: 3 })
    expect(bp.templates[0].slots[0]).toMatchObject({ repMin: 6, repMax: 10 })
    const st = generateProgram({ goals: new Set(['strength']), level: 'intermediate', weeklyGoal: 3 })
    expect(st.templates[0].slots[0].repMax).toBe(6)
  })
})

const ex = (id: string, pattern: MovementPattern, equipment: Equipment[], priority = 5,
            o: { bw?: boolean; chain?: string; order?: number; loads?: BodyArea[] } = {}): Exercise => ({
  id, nameHe: id, nameEn: id, pattern, equipment, primaryMuscles: ['chest'], secondaryMuscles: [],
  mechanic: ['horizontalPush', 'squat'].includes(pattern) ? 'compound' : 'isolation', level: 'intermediate',
  instructionsHe: [], images: [], increment: o.bw ? 0 : 2.5, isBodyweight: !!o.bw, progressionChain: o.chain ?? null,
  progressionOrder: o.order ?? null, loadsAreas: o.loads ?? [], priority, defaultRestSeconds: 90,
})

describe('SessionBuilder', () => {
  const cat = new ExerciseCatalog([
    ex('bench', 'horizontalPush', ['barbell', 'bench', 'rack'], 10), ex('db_bench', 'horizontalPush', ['dumbbell', 'bench'], 8),
    ex('pushup', 'horizontalPush', [], 7, { bw: true, chain: 'pushup', order: 2 }),
    ex('squat', 'squat', ['barbell', 'rack'], 10, { loads: ['knee'] }), ex('goblet', 'squat', ['dumbbell'], 8, { loads: ['knee'] }),
    ex('curl', 'biceps', ['dumbbell'], 6), ex('plank_x', 'core', [], 6, { bw: true }),
  ])
  const slots = (): SlotInput[] => [
    { slotID: 'a', pattern: 'horizontalPush', priority: 1, variant: 0, sets: 3, repMin: 6, repMax: 10, rir: 2, rest: 150 },
    { slotID: 'b', pattern: 'squat', priority: 1, variant: 0, sets: 3, repMin: 6, repMax: 10, rir: 2, rest: 150 },
    { slotID: 'c', pattern: 'biceps', priority: 3, variant: 0, sets: 3, repMin: 10, repMax: 15, rir: 1, rest: 75 },
    { slotID: 'd', pattern: 'core', priority: 3, variant: 0, sets: 3, repMin: 10, repMax: 20, rir: 2, rest: 45 },
  ]
  const b = new SessionBuilder(cat, new HistoryIndex([]))
  it('picks the best exercise for the equipment', () => {
    expect(b.build(slots(), new Set(EQUIPMENT), new Set(), 90, false).exercises.map((p) => p.exercise.id)).toEqual(['bench', 'squat', 'curl', 'plank_x'])
    expect(b.build(slots(), new Set(['dumbbell', 'bench']), new Set(), 90, false).exercises.map((p) => p.exercise.id)).toEqual(['db_bench', 'goblet', 'curl', 'plank_x'])
    expect(b.build(slots(), new Set(), new Set(), 90, false).exercises.map((p) => p.exercise.id)).toEqual(['pushup', 'plank_x'])
  })
  it('respects limitations', () => {
    expect(b.build(slots(), new Set(EQUIPMENT), new Set(['knee']), 90, false).exercises.some((p) => p.exercise.pattern === 'squat')).toBe(false)
  })
  it('trims to the time budget', () => {
    const long = b.build(slots(), new Set(EQUIPMENT), new Set(), 90, false)
    const short = b.build(slots(), new Set(EQUIPMENT), new Set(), 30, false)
    expect(short.estimatedSeconds).toBeLessThanOrEqual(1800)
    expect(short.exercises.reduce((a, p) => a + p.workSets, 0)).toBeLessThan(long.exercises.reduce((a, p) => a + p.workSets, 0))
    expect(short.exercises.some((p) => p.exercise.id === 'bench')).toBe(true)
  })
  it('deload cuts sets', () => {
    expect(b.build(slots(), new Set(EQUIPMENT), new Set(), 90, true).exercises.every((p) => p.workSets === 2)).toBe(true)
  })
  it('override wins', () => {
    expect(b.build(slots(), new Set(EQUIPMENT), new Set(), 90, false, { a: cat.exercise('db_bench')! }).exercises[0].exercise.id).toBe('db_bench')
  })
})

describe('Motivation', () => {
  const week = (weeksAgo: number, count: number, goal = 3): StreakEntry[] =>
    Array.from({ length: count }, (_, i) => ({ date: addDays(addWeeks(startOfWeek(new Date()), -weeksAgo), (i * 2) % 7), goal }))
  it('counts consecutive weeks', () => {
    const s = computeStreak([...week(3, 3), ...week(2, 3), ...week(1, 4)], 3)
    expect(s.current).toBe(3); expect(s.best).toBe(3)
  })
  it('a missed week breaks the streak without a shield', () => {
    expect(computeStreak([...week(3, 3), ...week(2, 1), ...week(1, 3)], 3).current).toBe(1)
  })
  it('a shield protects after four weeks', () => {
    const s = computeStreak([...week(5, 3), ...week(4, 3), ...week(3, 3), ...week(2, 3), ...week(1, 1)], 3)
    expect(s.current).toBe(4); expect(s.shields).toBe(0); expect(s.weeks.some((w) => w.status === 'shielded')).toBe(true)
  })
  it('the current week in progress does not break', () => {
    const s = computeStreak([...week(2, 3), ...week(1, 3)], 3)
    expect(s.current).toBe(2); expect(s.thisWeekCount).toBe(0)
  })
  it('levels progress and cap', () => {
    expect(levelInfo(0).level).toBe(1); expect(levelInfo(stepXP(1)).level).toBe(2); expect(levelInfo(1e7).level).toBe(30)
    expect(levelTitle(30)).toBe('APEX'); expect(levelTitle(1)).toBe('ניצוץ I'); expect(levelTitle(8)).toBe('ברזל II')
  })
  it('xp breakdown', () => {
    expect(sessionXP(18, 2, true, 4).reduce((a, x) => a + x.amount, 0)).toBe(480)
  })
  it('achievements unlock once', () => {
    const c = { ...emptyAchievementContext(), totalWorkouts: 10, bodyweight: 80, bestBench: 80 }
    const first = newlyUnlocked(c, new Set())
    expect(first.map((a) => a.id)).toEqual(expect.arrayContaining(['first_workout', 'workouts_10', 'bench_bw']))
    expect(newlyUnlocked(c, new Set(first.map((a) => a.id)))).toEqual([])
  })
})

describe('Catalog', () => {
  it('bundled catalog loads and covers every pattern', () => {
    const raw = JSON.parse(readFileSync(new URL('../../public/data/exercises_he.json', import.meta.url), 'utf8')) as Exercise[]
    expect(raw.length).toBeGreaterThan(150)
    for (const p of PATTERNS) expect(raw.some((e) => e.pattern === p)).toBe(true)
    expect(raw.every((e) => e.nameHe.length > 0)).toBe(true)
  })
})
