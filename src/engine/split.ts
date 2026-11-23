// בניית תוכנית לפי אזורי גוף: גוף מלא, A-B או A-B-C, עם מספר תרגילים לכל אזור.
import type { BodyPart, DayDesign, Goal, MovementPattern, SplitDesign, SplitKind } from './types'
import { partHe } from './types'
import type { ProgramBlueprint, ProgramInput, SlotBlueprint, TemplateBlueprint } from './program'
import { scheme } from './program'

export interface Focus {
  pattern: MovementPattern
  /** שם קצר לסוג התרגיל, למשל "לחיצת חזה בשיפוע" */
  label: string
  /** התרגילים המועדפים לסוג הזה, מהטוב ביותר. נבחר הראשון שזמין בציוד */
  prefer: string[]
}

export const FOCUS: Record<string, Focus> = {
  'chest.press': { pattern: 'horizontalPush', label: 'לחיצת חזה', prefer: ['Barbell_Bench_Press_-_Medium_Grip', 'Dumbbell_Bench_Press', 'Machine_Bench_Press', 'Smith_Machine_Bench_Press', 'Dumbbell_Floor_Press', 'Pushups'] },
  'chest.incline': { pattern: 'horizontalPush', label: 'לחיצת חזה בשיפוע', prefer: ['Incline_Dumbbell_Press', 'Barbell_Incline_Bench_Press_-_Medium_Grip', 'Leverage_Incline_Chest_Press', 'Push-Ups_With_Feet_Elevated'] },
  'chest.fly': { pattern: 'chestIsolation', label: 'פרפר', prefer: ['Butterfly', 'Cable_Crossover', 'Dumbbell_Flyes', 'Incline_Dumbbell_Flyes', 'Cross_Over_-_With_Bands'] },
  'chest.press2': { pattern: 'horizontalPush', label: 'לחיצת חזה נוספת', prefer: ['Machine_Bench_Press', 'Decline_Dumbbell_Bench_Press', 'Dips_-_Chest_Version', 'Dumbbell_Bench_Press_with_Neutral_Grip', 'Pushups'] },
  'chest.fly2': { pattern: 'chestIsolation', label: 'פרפר נוסף', prefer: ['Incline_Dumbbell_Flyes', 'Low_Cable_Crossover', 'Decline_Dumbbell_Flyes', 'Dumbbell_Flyes'] },

  'back.vertical': { pattern: 'verticalPull', label: 'פולי עליון / מתח', prefer: ['Pullups', 'Wide-Grip_Lat_Pulldown', 'Chin-Up', 'Band_Assisted_Pull-Up'] },
  'back.row': { pattern: 'horizontalPull', label: 'חתירה', prefer: ['Seated_Cable_Rows', 'Bent_Over_Barbell_Row', 'One-Arm_Dumbbell_Row', 'Inverted_Row'] },
  'back.vertical2': { pattern: 'verticalPull', label: 'פולי עליון צר', prefer: ['Close-Grip_Front_Lat_Pulldown', 'V-Bar_Pulldown', 'Chin-Up', 'Underhand_Cable_Pulldowns', 'Band_Assisted_Pull-Up'] },
  'back.row2': { pattern: 'horizontalPull', label: 'חתירה ביד אחת', prefer: ['One-Arm_Dumbbell_Row', 'Dumbbell_Incline_Row', 'Seated_One-arm_Cable_Pulley_Rows', 'Leverage_Iso_Row', 'Bent_Over_Two-Dumbbell_Row'] },
  'back.pullover': { pattern: 'verticalPull', label: 'פולאובר', prefer: ['Straight-Arm_Pulldown', 'Straight-Arm_Dumbbell_Pullover'] },

  'shoulders.press': { pattern: 'verticalPush', label: 'לחיצת כתפיים', prefer: ['Seated_Dumbbell_Press', 'Standing_Military_Press', 'Machine_Shoulder_Military_Press', 'Arnold_Dumbbell_Press', 'Standing_Dumbbell_Press'] },
  'shoulders.lateral': { pattern: 'lateralDelt', label: 'הרחקה לצדדים', prefer: ['Side_Lateral_Raise', 'Standing_Low-Pulley_Deltoid_Raise', 'Seated_Side_Lateral_Raise', 'Lateral_Raise_-_With_Bands'] },
  'shoulders.rear': { pattern: 'rearDelt', label: 'כתף אחורית', prefer: ['Reverse_Flyes', 'Face_Pull', 'Reverse_Machine_Flyes', 'Seated_Bent-Over_Rear_Delt_Raise', 'Cable_Rope_Rear-Delt_Rows', 'Band_Pull_Apart'] },
  'shoulders.front': { pattern: 'lateralDelt', label: 'הרמה קדמית', prefer: ['Front_Dumbbell_Raise', 'Standing_Dumbbell_Upright_Row', 'Upright_Barbell_Row'] },
  'shoulders.press2': { pattern: 'verticalPush', label: 'לחיצת כתפיים נוספת', prefer: ['Arnold_Dumbbell_Press', 'Machine_Shoulder_Military_Press', 'Standing_Dumbbell_Press'] },

  'triceps.pushdown': { pattern: 'triceps', label: 'פשיטה בפולי', prefer: ['Triceps_Pushdown_-_Rope_Attachment', 'Triceps_Pushdown', 'Dips_-_Triceps_Version', 'Bench_Dips', 'Push-Ups_-_Close_Triceps_Position'] },
  'triceps.overhead': { pattern: 'triceps', label: 'צרפתית / מעל הראש', prefer: ['EZ-Bar_Skullcrusher', 'Triceps_Overhead_Extension_with_Rope', 'Standing_Overhead_Barbell_Triceps_Extension', 'Standing_Dumbbell_Triceps_Extension', 'Lying_Dumbbell_Tricep_Extension'] },
  'triceps.press': { pattern: 'triceps', label: 'לחיצה צרה', prefer: ['Close-Grip_Barbell_Bench_Press', 'Close-Grip_EZ-Bar_Press', 'Dips_-_Triceps_Version', 'Reverse_Grip_Triceps_Pushdown', 'Tricep_Dumbbell_Kickback'] },

  'biceps.curl': { pattern: 'biceps', label: 'כפיפת מרפקים', prefer: ['EZ-Bar_Curl', 'Barbell_Curl', 'Dumbbell_Bicep_Curl'] },
  'biceps.hammer': { pattern: 'biceps', label: 'פטישים', prefer: ['Hammer_Curls', 'Cable_Hammer_Curls_-_Rope_Attachment', 'Dumbbell_Alternate_Bicep_Curl'] },
  'biceps.iso': { pattern: 'biceps', label: 'כפיפה בבידוד', prefer: ['Incline_Dumbbell_Curl', 'Preacher_Curl', 'Spider_Curl', 'One_Arm_Dumbbell_Preacher_Curl', 'Concentration_Curls', 'Standing_Biceps_Cable_Curl'] },

  'legs.squat': { pattern: 'squat', label: 'סקוואט', prefer: ['Barbell_Squat', 'Leg_Press', 'Goblet_Squat', 'Hack_Squat', 'Bodyweight_Squat'] },
  'legs.hinge': { pattern: 'hinge', label: 'דדליפט רומני', prefer: ['Romanian_Deadlift', 'Stiff-Legged_Dumbbell_Deadlift', 'Barbell_Hip_Thrust', 'Butt_Lift_Bridge'] },
  'legs.lunge': { pattern: 'lunge', label: 'חד־רגלי', prefer: ['Split_Squat_with_Dumbbells', 'Dumbbell_Lunges', 'Bodyweight_Walking_Lunge'] },
  'legs.quad': { pattern: 'quadIsolation', label: 'פשיטת ברכיים', prefer: ['Leg_Extensions', 'Single-Leg_Leg_Extension', 'Weighted_Sissy_Squat'] },
  'legs.ham': { pattern: 'hamstringIsolation', label: 'כפיפת ברכיים', prefer: ['Lying_Leg_Curls', 'Seated_Leg_Curl', 'Standing_Leg_Curl', 'Floor_Glute-Ham_Raise'] },
  'legs.calves': { pattern: 'calves', label: 'תאומים', prefer: ['Standing_Calf_Raises', 'Standing_Dumbbell_Calf_Raise'] },

  'abs.1': { pattern: 'core', label: 'בטן', prefer: ['Cable_Crunch', 'Hanging_Leg_Raise', 'Decline_Crunch', 'Crunches'] },
  'abs.2': { pattern: 'core', label: 'בטן תחתונה / יציבות', prefer: ['Decline_Reverse_Crunch', 'Plank', 'Reverse_Crunch', 'Flat_Bench_Lying_Leg_Raise'] },
  'abs.3': { pattern: 'core', label: 'אלכסוניים', prefer: ['Standing_Cable_Wood_Chop', 'Russian_Twist', 'Side_Bridge', 'Dumbbell_Side_Bend'] },

  'cardio.1': { pattern: 'conditioning', label: 'פינישר', prefer: ['Jogging_Treadmill', 'Rowing_Stationary', 'One-Arm_Kettlebell_Swings', 'Rope_Jumping', 'Mountain_Climbers'] },
}

/** סדר סוגי התרגילים לכל אזור: התרגיל הראשון באזור, השני וכו׳ */
export const PART_FOCI: Record<BodyPart, string[]> = {
  chest: ['chest.press', 'chest.incline', 'chest.fly', 'chest.press2', 'chest.fly2'],
  back: ['back.vertical', 'back.row', 'back.vertical2', 'back.row2', 'back.pullover'],
  shoulders: ['shoulders.press', 'shoulders.lateral', 'shoulders.rear', 'shoulders.front', 'shoulders.press2'],
  triceps: ['triceps.pushdown', 'triceps.overhead', 'triceps.press'],
  biceps: ['biceps.curl', 'biceps.hammer', 'biceps.iso'],
  legs: ['legs.squat', 'legs.hinge', 'legs.lunge', 'legs.quad', 'legs.ham', 'legs.calves'],
  abs: ['abs.1', 'abs.2', 'abs.3'],
  cardio: ['cardio.1'],
}

export const maxPerPart = (part: BodyPart) => PART_FOCI[part].length
export const focusPrefer = (focus?: string) => (focus ? FOCUS[focus]?.prefer ?? [] : [])
export const focusLabel = (focus?: string) => (focus ? FOCUS[focus]?.label : undefined)

export const kindHe: Record<SplitKind, string> = { fullBody: 'פול באדי', ab: 'A-B', abc: 'A-B-C' }
export const kindSub: Record<SplitKind, string> = {
  fullBody: 'כל הגוף בכל אימון. מתאים ל-2–3 אימונים בשבוע',
  ab: 'שני אימונים לסירוגין, כל אחד לאזורים אחרים',
  abc: 'שלושה אימונים בסבב, יותר תרגילים לכל אזור',
}
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

const day = (...parts: [BodyPart, number][]): DayDesign => ({ parts: parts.map(([part, count]) => ({ part, count })) })

/** ברירת מחדל לכל סוג תוכנית. אפשר לשנות הכול בבונה */
export function defaultDesign(kind: SplitKind, goals: Set<Goal> = new Set(['muscle'])): SplitDesign {
  const finisher = goals.has('fatLoss') || goals.has('fitness')
  const days: Record<SplitKind, DayDesign[]> = {
    fullBody: [day(['chest', 1], ['back', 1], ['legs', 1], ['shoulders', 1], ['biceps', 1], ['triceps', 1])],
    ab: [day(['chest', 4], ['shoulders', 2], ['triceps', 2]), day(['back', 4], ['biceps', 2], ['legs', 1])],
    abc: [day(['chest', 4], ['triceps', 2]), day(['back', 4], ['biceps', 2]), day(['shoulders', 3], ['legs', 1])],
  }
  return { kind, days: days[kind], absFlex: 1, finisher }
}

export function dayName(design: SplitDesign, d: DayDesign, index: number): string {
  const parts = d.parts.filter((p) => p.count > 0).map((p) => partHe[p.part]).join(', ')
  if (design.kind === 'fullBody') return design.days.length > 1 ? `גוף מלא ${LETTERS[index] ?? index + 1}` : 'גוף מלא'
  return `${LETTERS[index] ?? index + 1} · ${parts}`
}

const BIG: BodyPart[] = ['chest', 'back', 'shoulders', 'legs']
const ISOLATION: MovementPattern[] = ['chestIsolation', 'lateralDelt', 'rearDelt', 'quadIsolation', 'hamstringIsolation', 'calves']

function slotPriority(part: BodyPart, i: number): number {
  if (i === 0) return BIG.includes(part) ? 1 : 2
  return i === 1 ? 2 : 3
}

/** בונה את התבניות מהעיצוב: לכל אזור N תרגילים, וגיוון כשאותו אזור חוזר בכמה אימונים */
export function generateFromDesign(design: SplitDesign, input: ProgramInput): ProgramBlueprint {
  const seen: Partial<Record<BodyPart, number>> = {}
  const templates: TemplateBlueprint[] = design.days.map((d, di) => {
    const slots: SlotBlueprint[] = []
    for (const { part, count } of d.parts) {
      const foci = PART_FOCI[part]
      const offset = design.kind === 'fullBody' ? seen[part] ?? 0 : 0
      const partSlots: SlotBlueprint[] = []
      for (let i = 0; i < Math.min(count, foci.length); i++) {
        const focus = foci[(i + offset) % foci.length]
        const bp = scheme(FOCUS[focus].pattern, part === 'abs' || part === 'cardio' ? Math.max(2, slotPriority(part, i)) : slotPriority(part, i), 0, input)
        partSlots.push({ ...bp, part, focus })
      }
      // תרגילים מורכבים (לחיצות) לפני בידוד (פרפר), בתוך אותו אזור
      partSlots.sort((a, b) => Number(ISOLATION.includes(a.pattern)) - Number(ISOLATION.includes(b.pattern)))
      slots.push(...partSlots)
      seen[part] = (seen[part] ?? 0) + count
    }
    const already = new Set(d.parts.filter((p) => p.count > 0).map((p) => p.part))
    if (design.absFlex > 0 && !already.has('abs')) {
      for (let i = 0; i < Math.min(design.absFlex, PART_FOCI.abs.length); i++) {
        const focus = PART_FOCI.abs[(i + di) % PART_FOCI.abs.length]
        slots.push({ ...scheme('core', 3, 0, input), part: 'abs', focus, flex: true })
      }
    }
    if (design.finisher && !already.has('cardio')) {
      slots.push({ ...scheme('conditioning', 3, 0, input), part: 'cardio', focus: 'cardio.1', flex: true })
    }
    return { name: dayName(design, d, di), slots }
  })
  const name = design.kind === 'fullBody' ? 'APEX · פול באדי' : `APEX · ${kindHe[design.kind]}`
  return { name, split: design.kind, templates, design }
}
