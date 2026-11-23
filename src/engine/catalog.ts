import type { BodyArea, BodyPart, Equipment, LocationLimits, MovementPattern, Muscle } from './types'
import { isMainLift, partOfPattern } from './types'

export interface Exercise {
  id: string
  nameHe: string
  nameEn: string
  pattern: MovementPattern
  equipment: Equipment[]
  primaryMuscles: Muscle[]
  secondaryMuscles: Muscle[]
  mechanic: 'compound' | 'isolation'
  level: string
  instructionsHe: string[]
  images: string[]
  increment: number
  isBodyweight: boolean
  progressionChain: string | null
  progressionOrder: number | null
  loadsAreas: BodyArea[]
  priority: number
  defaultRestSeconds: number
}

/** תרגילים שנמדדים בשניות ולא בחזרות */
export const TIMED_IDS = new Set([
  'Plank', 'Side_Bridge', 'Rowing_Stationary', 'Farmers_Walk', 'Rope_Jumping', 'Bicycling_Stationary', 'Jogging_Treadmill',
])
export const isTimed = (e: Exercise) => TIMED_IDS.has(e.id)

/**
 * תרגילי כבל ומכונה שאפשר לעשות גם בתחנה של מולטי טריינר ביתי.
 * מיקום עם "כבלים" או "מכונות" (חדר כושר מלא) מקבל את כולם; מיקום עם תחנה מקבל רק את מה שמתאים לה.
 */
export const STATION_OF: Record<string, Equipment> = {
  // פולי עליון
  'Wide-Grip_Lat_Pulldown': 'highPulley', 'Close-Grip_Front_Lat_Pulldown': 'highPulley', 'Underhand_Cable_Pulldowns': 'highPulley',
  'V-Bar_Pulldown': 'highPulley', 'One_Arm_Lat_Pulldown': 'highPulley', 'Straight-Arm_Pulldown': 'highPulley',
  'Triceps_Pushdown': 'highPulley', 'Triceps_Pushdown_-_Rope_Attachment': 'highPulley', 'Reverse_Grip_Triceps_Pushdown': 'highPulley',
  'Cable_One_Arm_Tricep_Extension': 'highPulley', 'Triceps_Overhead_Extension_with_Rope': 'highPulley', 'Cable_Crunch': 'highPulley',
  'Face_Pull': 'highPulley', 'Standing_Cable_Wood_Chop': 'highPulley',
  // פולי תחתון
  'Seated_Cable_Rows': 'lowPulley', 'Seated_One-arm_Cable_Pulley_Rows': 'lowPulley', 'Standing_Biceps_Cable_Curl': 'lowPulley',
  'Cable_Hammer_Curls_-_Rope_Attachment': 'lowPulley', 'Standing_Low-Pulley_Deltoid_Raise': 'lowPulley', 'Pull_Through': 'lowPulley',
  'One-Legged_Cable_Kickback': 'lowPulley', 'Cable_Rope_Rear-Delt_Rows': 'lowPulley',
  // מכונות
  'Machine_Bench_Press': 'chestPress', 'Butterfly': 'pecDeck', 'Leg_Extensions': 'legExtension',
  'Single-Leg_Leg_Extension': 'legExtension', 'Standing_Leg_Curl': 'legCurl', 'Jogging_Treadmill': 'treadmill',
}

export const isAvailable = (e: Exercise, available: Set<Equipment>) =>
  e.equipment.every((q) => available.has(q) ||
    ((q === 'cable' || q === 'machine') && STATION_OF[e.id] !== undefined && available.has(STATION_OF[e.id])))
export const isSafe = (e: Exercise, limitations: Set<BodyArea>) => !e.loadsAreas.some((a) => limitations.has(a))
export const wantsWarmup = (e: Exercise) => !e.isBodyweight && e.mechanic === 'compound' && isMainLift(e.pattern)
export const baseWeight = (e: Exercise) =>
  e.equipment.includes('barbell') ? 20 : e.equipment.includes('ezBar') ? 10 : 0
/** משקל לא רלוונטי (משקל גוף, גומיות, מכונות קרדיו) */
export const hidesWeight = (e: Exercise | undefined) => (e ? e.increment === 0 : false)

export const partOf = (e: Exercise): BodyPart => partOfPattern(e.pattern)
export const usesStack = (e: Exercise) => e.equipment.includes('cable') || e.equipment.includes('machine')

/** צעד המשקל והמקסימום לתרגיל במיקום מסוים (משקולות עד 24, ערימה של 6 ק״ג וכו׳) */
export function loadRule(e: Exercise, limits?: LocationLimits): { step: number; max?: number } {
  if (e.increment <= 0) return { step: 0 }
  if (limits && usesStack(e) && limits.stackStep) return { step: limits.stackStep, max: limits.stackMax }
  if (limits && e.equipment.includes('dumbbell') && limits.dumbbellMax) return { step: e.increment, max: limits.dumbbellMax }
  return { step: e.increment }
}

export const imageURL = (name: string) => `${import.meta.env?.BASE_URL ?? '/'}ex/${name}`

export class ExerciseCatalog {
  readonly all: Exercise[]
  private byID = new Map<string, Exercise>()

  constructor(exercises: Exercise[]) {
    this.all = exercises
    for (const e of exercises) this.byID.set(e.id, e)
  }

  exercise(id: string): Exercise | undefined {
    return this.byID.get(id)
  }

  /** מועמדים לדפוס תנועה, לפי ציוד ומגבלות, מהמועדף ביותר */
  candidates(pattern: MovementPattern, equipment: Set<Equipment>, limitations: Set<BodyArea> = new Set()): Exercise[] {
    return this.all
      .filter((e) => e.pattern === pattern && isAvailable(e, equipment) && isSafe(e, limitations))
      .sort((a, b) => b.priority - a.priority || a.nameHe.localeCompare(b.nameHe, 'he'))
  }

  /** הווריאציה הבאה (הקשה יותר) בשרשרת התקדמות של משקל גוף */
  nextInChain(e: Exercise, equipment: Set<Equipment>): Exercise | undefined {
    if (!e.progressionChain || e.progressionOrder == null) return undefined
    const order = e.progressionOrder
    return this.all
      .filter((x) => x.progressionChain === e.progressionChain && (x.progressionOrder ?? 0) > order && isAvailable(x, equipment))
      .sort((a, b) => (a.progressionOrder ?? 0) - (b.progressionOrder ?? 0))[0]
  }

  search(query: string, equipment?: Set<Equipment>): Exercise[] {
    const q = query.trim().toLowerCase()
    return this.all
      .filter((e) => (!equipment || isAvailable(e, equipment)) &&
        (!q || e.nameHe.toLowerCase().includes(q) || e.nameEn.toLowerCase().includes(q)))
      .sort((a, b) => a.nameHe.localeCompare(b.nameHe, 'he'))
  }
}

let shared: ExerciseCatalog | null = null
export const catalog = () => shared ?? new ExerciseCatalog([])

export async function loadCatalog(): Promise<ExerciseCatalog> {
  if (shared) return shared
  const res = await fetch(`${import.meta.env.BASE_URL}data/exercises_he.json`)
  const raw = (await res.json()) as Exercise[]
  shared = new ExerciseCatalog(raw.filter((e) => e && e.id && e.pattern))
  return shared
}
