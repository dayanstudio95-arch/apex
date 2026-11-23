import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import type { Exercise } from './catalog'
import { ExerciseCatalog, isAvailable, loadRule, STATION_OF } from './catalog'
import { HistoryIndex } from './history'
import { recommend } from './progression'
import { SessionBuilder, slotInput, startSession } from './session'
import type { SlotInput } from './session'
import { defaultDesign, FOCUS, generateFromDesign } from './split'
import { materializeProgram } from './program'
import { LOCATION_PRESETS, locationFromPreset } from './locations'
import { restBetweenSets, saveSetRest } from './prefs'
import type { Profile, WorkoutTemplate } from './types'
import { EQUIPMENT } from './types'

const raw = JSON.parse(readFileSync(new URL('../../public/data/exercises_he.json', import.meta.url), 'utf8')) as Exercise[]
const cat = new ExerciseCatalog(raw)
const building = locationFromPreset(LOCATION_PRESETS[0], 0)
const buildingEq = new Set(building.equipment)
const input = { goals: new Set(['muscle'] as const), level: 'intermediate' as const, weeklyGoal: 3 }

const names = (t: WorkoutTemplate, favorites: string[] = [], minutes = 999) =>
  new SessionBuilder(cat, new HistoryIndex([]), { favorites: new Set(favorites), limits: building.limits })
    .build([...t.slots].sort((a, b) => a.order - b.order).map((s) => slotInput(s, building.id)), buildingEq, new Set(), minutes, false)
    .exercises.map((p) => p.exercise.id)

describe('Catalog data for split builder', () => {
  it('every preferred exercise and station mapping exists in the catalog', () => {
    for (const [key, f] of Object.entries(FOCUS)) {
      for (const id of f.prefer) {
        const e = cat.exercise(id)
        expect(e, `${key} → ${id}`).toBeDefined()
        expect(e!.pattern, `${key} → ${id}`).toBe(f.pattern)
      }
    }
    for (const id of Object.keys(STATION_OF)) expect(cat.exercise(id), id).toBeDefined()
  })
})

describe('Building gym (multi-trainer) equipment', () => {
  it('stations unlock only the matching cable and machine exercises', () => {
    const ok = (id: string) => isAvailable(cat.exercise(id)!, buildingEq)
    expect(ok('Wide-Grip_Lat_Pulldown')).toBe(true)
    expect(ok('Seated_Cable_Rows')).toBe(true)
    expect(ok('Butterfly')).toBe(true)
    expect(ok('Machine_Bench_Press')).toBe(true)
    expect(ok('Triceps_Pushdown_-_Rope_Attachment')).toBe(true)
    expect(ok('Jogging_Treadmill')).toBe(true)
    expect(ok('Cable_Crossover')).toBe(false)
    expect(ok('Leg_Press')).toBe(false)
    expect(ok('Barbell_Bench_Press_-_Medium_Grip')).toBe(false)
    expect(isAvailable(cat.exercise('Cable_Crossover')!, new Set(EQUIPMENT))).toBe(true)
  })
  it('machine stack moves in 6 kg plates up to 76, dumbbells cap at 24', () => {
    expect(loadRule(cat.exercise('Seated_Cable_Rows')!, building.limits)).toEqual({ step: 6, max: 76 })
    expect(loadRule(cat.exercise('Dumbbell_Bench_Press')!, building.limits)).toEqual({ step: 2, max: 24 })
    expect(loadRule(cat.exercise('Dumbbell_Bench_Press')!)).toEqual({ step: 2 })
    const top = (w: number) => ({ sessions: [{ date: '2026-11-20', sets: [{ weight: w, reps: 10, rir: 2 }, { weight: w, reps: 10, rir: 2 }] }] })
    const o = { repMin: 6, repMax: 10, targetRIR: 2, isBodyweight: false, hasNextVariation: false }
    expect(recommend(top(30), { ...o, increment: 6, max: 76 })).toMatchObject({ weight: 36, note: { kind: 'increase', amount: 6 } })
    expect(recommend(top(72), { ...o, increment: 6, max: 76 })).toMatchObject({ weight: 76, note: { kind: 'increase', amount: 4 } })
    expect(recommend(top(24), { ...o, increment: 2, max: 24 })).toMatchObject({ weight: 24, reps: 11, note: { kind: 'maxedOut' } })
  })
})

describe('Split builder', () => {
  it('A-B default matches chest/shoulders/triceps and back/biceps/one leg exercise', () => {
    const bp = generateFromDesign(defaultDesign('ab'), input)
    expect(bp.templates.map((t) => t.name)).toEqual(['A · חזה, כתפיים, יד אחורית', 'B · גב, יד קדמית, רגליים'])
    const parts = (i: number) => bp.templates[i].slots.map((s) => s.part)
    expect(parts(0)).toEqual(['chest', 'chest', 'chest', 'shoulders', 'shoulders', 'triceps', 'triceps', 'abs'])
    expect(parts(1)).toEqual(['back', 'back', 'back', 'biceps', 'biceps', 'legs', 'abs'])
    expect(bp.templates[0].slots.at(-1)).toMatchObject({ flex: true, priority: 3 })
  })
  it('picks sensible exercises for the building gym', () => {
    const p = materializeProgram(generateFromDesign(defaultDesign('ab'), input))
    expect(names(p.templates[0])).toEqual([
      'Dumbbell_Bench_Press', 'Incline_Dumbbell_Press', 'Butterfly', 'Seated_Dumbbell_Press', 'Side_Lateral_Raise',
      'Triceps_Pushdown_-_Rope_Attachment', 'EZ-Bar_Skullcrusher', 'Cable_Crunch',
    ])
    expect(names(p.templates[1])).toEqual([
      'Wide-Grip_Lat_Pulldown', 'Seated_Cable_Rows', 'Close-Grip_Front_Lat_Pulldown', 'EZ-Bar_Curl', 'Hammer_Curls', 'Goblet_Squat', 'Decline_Reverse_Crunch',
    ])
  })
  it('favorites are chosen first, in the slot that suits them', () => {
    const p = materializeProgram(generateFromDesign(defaultDesign('ab'), input))
    const a = names(p.templates[0], ['Machine_Bench_Press', 'Decline_Crunch'])
    expect(a.slice(0, 3)).toEqual(['Machine_Bench_Press', 'Incline_Dumbbell_Press', 'Butterfly'])
    expect(a.at(-1)).toBe('Decline_Crunch')
  })
  it('flexible abs are the first thing dropped when time is short', () => {
    const p = materializeProgram(generateFromDesign(defaultDesign('ab'), input))
    expect(names(p.templates[0], [], 999)).toContain('Cable_Crunch')
    const short = names(p.templates[0], [], 45)
    expect(short).not.toContain('Cable_Crunch')
    expect(short[0]).toBe('Dumbbell_Bench_Press')
  })
  it('full body variations rotate exercises for the same body part', () => {
    const d = defaultDesign('fullBody')
    d.days.push(structuredClone(d.days[0]))
    const bp = generateFromDesign(d, input)
    expect(bp.templates.map((t) => t.name)).toEqual(['גוף מלא A', 'גוף מלא B'])
    expect(bp.templates[0].slots[0].focus).toBe('chest.press')
    expect(bp.templates[1].slots[0].focus).toBe('chest.incline')
  })
  it('only manual swaps are saved to the template', () => {
    const p = materializeProgram(generateFromDesign(defaultDesign('ab'), input))
    const t = p.templates[0]
    const b = new SessionBuilder(cat, new HistoryIndex([]), { limits: building.limits })
    const slots: SlotInput[] = t.slots.map((s) => slotInput(s, building.id))
    const plan = b.build(slots, buildingEq, new Set(), 999, false, { [t.slots[2].id]: cat.exercise('Dumbbell_Flyes')! })
    startSession(plan, t, building, 60, 3)
    expect(t.slots[2].exerciseByLocation[building.id]).toBe('Dumbbell_Flyes')
    expect(t.slots[0].exerciseByLocation[building.id]).toBeUndefined()
  })
})

describe('Rest preferences', () => {
  it('coach, fixed and per-exercise rest', () => {
    const p = { restAutoStart: true } as Profile
    expect(restBetweenSets(p, 'x', 150)).toBe(150)
    saveSetRest(p, 90)
    expect(restBetweenSets(p, 'x', 150)).toBe(90)
    saveSetRest(p, 120, 'x')
    expect(restBetweenSets(p, 'x', 150)).toBe(120)
    expect(restBetweenSets(p, 'y', 150)).toBe(90)
  })
})
