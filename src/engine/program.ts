import type { ExperienceLevel, Goal, MovementPattern, Program, SplitType } from './types'
import { isMainLift, recommendedSplit, splitHe, uid } from './types'

export interface SlotBlueprint {
  pattern: MovementPattern
  priority: number
  variant: number
  sets: number
  repMin: number
  repMax: number
  rir: number
  rest: number
}
export interface TemplateBlueprint { name: string; slots: SlotBlueprint[] }
export interface ProgramBlueprint { name: string; split: SplitType; templates: TemplateBlueprint[] }
export interface ProgramInput { goals: Set<Goal>; level: ExperienceLevel; weeklyGoal: number; split?: SplitType }

type Raw = [MovementPattern, number, number] // דפוס, עדיפות, וריאנט

const TEMPLATES: Record<SplitType, [string, Raw[]][]> = {
  fullBody: [
    ['גוף מלא A', [['squat', 1, 0], ['horizontalPush', 1, 0], ['verticalPull', 1, 0], ['lunge', 2, 0], ['lateralDelt', 2, 0], ['biceps', 3, 0], ['core', 3, 0]]],
    ['גוף מלא B', [['hinge', 1, 0], ['verticalPush', 1, 0], ['horizontalPull', 1, 0], ['quadIsolation', 2, 0], ['chestIsolation', 3, 0], ['triceps', 3, 0], ['calves', 3, 0]]],
    ['גוף מלא C', [['squat', 1, 1], ['horizontalPush', 1, 1], ['horizontalPull', 1, 1], ['hamstringIsolation', 2, 0], ['rearDelt', 2, 0], ['biceps', 3, 1], ['core', 3, 1]]],
  ],
  upperLower: [
    ['עליון A', [['horizontalPush', 1, 0], ['horizontalPull', 1, 0], ['verticalPush', 2, 0], ['verticalPull', 2, 0], ['lateralDelt', 3, 0], ['biceps', 3, 0], ['triceps', 3, 0]]],
    ['תחתון A', [['squat', 1, 0], ['hinge', 2, 1], ['lunge', 2, 0], ['hamstringIsolation', 3, 0], ['calves', 3, 0], ['core', 3, 0]]],
    ['עליון B', [['verticalPull', 1, 1], ['verticalPush', 1, 1], ['horizontalPush', 2, 1], ['horizontalPull', 2, 1], ['chestIsolation', 3, 0], ['rearDelt', 3, 0], ['biceps', 3, 1]]],
    ['תחתון B', [['hinge', 1, 0], ['squat', 2, 1], ['quadIsolation', 2, 0], ['lunge', 3, 1], ['calves', 3, 0], ['core', 3, 1]]],
  ],
  pushPullLegs: [
    ['דחיקה', [['horizontalPush', 1, 0], ['verticalPush', 1, 0], ['horizontalPush', 2, 1], ['lateralDelt', 2, 0], ['triceps', 2, 0], ['chestIsolation', 3, 0]]],
    ['משיכה', [['verticalPull', 1, 0], ['horizontalPull', 1, 0], ['horizontalPull', 2, 1], ['rearDelt', 2, 0], ['biceps', 2, 0], ['biceps', 3, 1]]],
    ['רגליים', [['squat', 1, 0], ['hinge', 1, 1], ['lunge', 2, 0], ['quadIsolation', 2, 0], ['hamstringIsolation', 3, 0], ['calves', 3, 0], ['core', 3, 0]]],
  ],
}

const COMPOUNDS: MovementPattern[] = ['horizontalPush', 'verticalPush', 'horizontalPull', 'verticalPull', 'squat', 'hinge', 'lunge']

/** "המאמן": בונה תוכנית מדפוסי תנועה לפי מטרות, רמה ויעד שבועי. בלי AI, רק כללים מקצועיים. */
export function generateProgram(input: ProgramInput): ProgramBlueprint {
  const split = input.split ?? recommendedSplit(input.weeklyGoal)
  const finisher = input.goals.has('fatLoss') || input.goals.has('fitness')
  const templates = TEMPLATES[split].map(([name, raw]) => {
    const all: Raw[] = finisher ? [...raw, ['conditioning', 3, 0]] : raw
    return { name, slots: all.map(([p, pr, v]) => scheme(p, pr, v, input)) }
  })
  return { name: `APEX · ${splitHe[split]}`, split, templates }
}

export function scheme(pattern: MovementPattern, priority: number, variant: number, input: ProgramInput): SlotBlueprint {
  const bp: SlotBlueprint = { pattern, priority, variant, sets: 3, repMin: 10, repMax: 15, rir: 1, rest: 75 }
  if (isMainLift(pattern) && priority === 1) {
    bp.sets = input.level === 'advanced' ? 4 : 3
    if (input.goals.has('strength')) { bp.repMin = 4; bp.repMax = 6; bp.rest = 180 } else { bp.repMin = 6; bp.repMax = 10; bp.rest = 150 }
    bp.rir = 2
  } else if (COMPOUNDS.includes(pattern)) {
    Object.assign(bp, { sets: 3, repMin: 8, repMax: 12, rir: 2, rest: 120 })
  } else if (pattern === 'core') {
    Object.assign(bp, { sets: 3, repMin: 10, repMax: 20, rir: 2, rest: 45 })
  } else if (pattern === 'conditioning') {
    Object.assign(bp, { sets: 3, repMin: 12, repMax: 20, rir: 2, rest: 30 })
  } else {
    bp.sets = input.level === 'beginner' ? 2 : 3
    Object.assign(bp, { repMin: 10, repMax: 15, rir: 1, rest: 75 })
    if (input.goals.has('muscle') && input.level === 'advanced') bp.sets += 1
  }
  return bp
}

export function materializeProgram(bp: ProgramBlueprint, now = new Date()): Program {
  return {
    id: uid(),
    name: bp.name,
    split: bp.split,
    nextIndex: 0,
    cycleStart: now.toISOString(),
    isActive: true,
    createdAt: now.toISOString(),
    templates: bp.templates.map((t, ti) => ({
      id: uid(),
      name: t.name,
      order: ti,
      slots: t.slots.map((s, si) => ({
        id: uid(), order: si, pattern: s.pattern, priority: s.priority, variant: s.variant, sets: s.sets,
        repMin: s.repMin, repMax: s.repMax, targetRIR: s.rir, restSeconds: s.rest, exerciseByLocation: {},
      })),
    })),
  }
}

export const nextTemplate = (p: Program) => {
  const list = [...p.templates].sort((a, b) => a.order - b.order)
  if (!list.length) return undefined
  return list[((p.nextIndex % list.length) + list.length) % list.length]
}
