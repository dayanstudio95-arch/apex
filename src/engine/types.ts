// טיפוסים ותוויות בעברית. מקבילים ל-Enums.swift בגרסה הנייטיבית, כדי שגיבוי מהאפליקציה הנייטיבית ייובא כמו שהוא.

export type Goal = 'muscle' | 'fatLoss' | 'fitness' | 'strength'
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'
export type Equipment =
  | 'barbell' | 'dumbbell' | 'kettlebell' | 'cable' | 'machine'
  | 'bench' | 'pullupBar' | 'bands' | 'ezBar' | 'rack'
  // תחנות של מולטי טריינר ביתי (במקום "כבלים" ו"מכונות" של חדר כושר מלא)
  | 'highPulley' | 'lowPulley' | 'chestPress' | 'pecDeck' | 'legExtension' | 'legCurl' | 'preacherPad' | 'treadmill'
export type MovementPattern =
  | 'horizontalPush' | 'verticalPush' | 'horizontalPull' | 'verticalPull'
  | 'squat' | 'hinge' | 'lunge'
  | 'quadIsolation' | 'hamstringIsolation' | 'chestIsolation'
  | 'lateralDelt' | 'rearDelt' | 'biceps' | 'triceps' | 'calves' | 'core' | 'conditioning'
export type Muscle =
  | 'abs' | 'abductors' | 'adductors' | 'biceps' | 'calves' | 'chest' | 'forearms' | 'glutes'
  | 'hamstrings' | 'lats' | 'lowerBack' | 'midBack' | 'neck' | 'quads' | 'shoulders' | 'traps' | 'triceps'
export type BodyArea = 'shoulder' | 'elbow' | 'wrist' | 'lowerBack' | 'knee' | 'hip'
export type SplitType = 'fullBody' | 'upperLower' | 'pushPullLegs' | 'ab' | 'abc'
/** אזורי גוף, לבניית תוכנית ולסידור התרגילים */
export type BodyPart = 'chest' | 'back' | 'shoulders' | 'triceps' | 'biceps' | 'legs' | 'abs' | 'cardio'
export type SetKind = 'warmup' | 'work'
export type PRKind = 'maxWeight' | 'e1rm' | 'maxReps' | 'sessionVolume'
export type PhotoAngle = 'front' | 'side' | 'back'
export type Sex = 'male' | 'female'

export const GOALS: Goal[] = ['muscle', 'fatLoss', 'fitness', 'strength']
export const LEVELS: ExperienceLevel[] = ['beginner', 'intermediate', 'advanced']
export const EQUIPMENT: Equipment[] = ['barbell', 'dumbbell', 'kettlebell', 'cable', 'machine', 'bench', 'pullupBar', 'bands', 'ezBar', 'rack']
/** ציוד חופשי ומכונות של חדר כושר מלא */
export const BASIC_EQUIPMENT: Equipment[] = ['dumbbell', 'ezBar', 'barbell', 'bench', 'bands', 'pullupBar', 'kettlebell', 'rack', 'cable', 'machine']
/** התחנות של מולטי טריינר ביתי */
export const STATIONS: Equipment[] = ['highPulley', 'lowPulley', 'chestPress', 'pecDeck', 'legExtension', 'legCurl', 'preacherPad', 'treadmill']
export const MULTI_TRAINER: Equipment[] = ['highPulley', 'lowPulley', 'chestPress', 'pecDeck', 'legExtension', 'legCurl', 'preacherPad']
export const PATTERNS: MovementPattern[] = [
  'horizontalPush', 'verticalPush', 'horizontalPull', 'verticalPull', 'squat', 'hinge', 'lunge',
  'quadIsolation', 'hamstringIsolation', 'chestIsolation', 'lateralDelt', 'rearDelt', 'biceps',
  'triceps', 'calves', 'core', 'conditioning',
]
export const BODY_AREAS: BodyArea[] = ['shoulder', 'elbow', 'wrist', 'lowerBack', 'knee', 'hip']
export const SPLITS: SplitType[] = ['fullBody', 'upperLower', 'pushPullLegs']
export const BODY_PARTS: BodyPart[] = ['chest', 'back', 'shoulders', 'triceps', 'biceps', 'legs', 'abs', 'cardio']

export const goalHe: Record<Goal, string> = {
  muscle: 'בניית מסת שריר', fatLoss: 'ירידה באחוזי שומן', fitness: 'כושר כללי וסיבולת', strength: 'כוח',
}
export const goalSub: Record<Goal, string> = {
  muscle: 'נפח אימונים, עומס מתקדם ועבודה לפי שרירים',
  fatLoss: 'שמירה על השריר + פינישרים מטבוליים',
  fitness: 'להרגיש טוב, לשפר ריצה ואירובי',
  strength: 'שיפור המספרים בתרגילים המרכזיים',
}
export const levelHe: Record<ExperienceLevel, string> = {
  beginner: 'מתחיל/ה', intermediate: 'בינוני/ת', advanced: 'מתקדם/ת',
}
export const levelSub: Record<ExperienceLevel, string> = {
  beginner: 'פחות מחצי שנה של אימונים קבועים',
  intermediate: 'חצי שנה עד שנתיים, מכיר/ה את התרגילים הבסיסיים',
  advanced: 'שנתיים ומעלה עם תוכניות מסודרות',
}
export const equipmentHe: Record<Equipment, string> = {
  barbell: 'מוט ישר', dumbbell: 'משקולות יד', kettlebell: 'קטלבל', cable: 'מכונת כבלים מלאה', machine: 'מכונות של חדר כושר',
  bench: 'ספסל מתכוונן', pullupBar: 'מתקן מתח', bands: 'גומיות', ezBar: 'מוט W', rack: 'מתקן סקוואט / מקבילים',
  highPulley: 'פולי עליון', lowPulley: 'פולי תחתון (חתירה)', chestPress: 'לחיצת חזה במכונה', pecDeck: 'פרפר במכונה',
  legExtension: 'פשיטת ברכיים', legCurl: 'כפיפת ברכיים', preacherPad: 'כיסא כומר', treadmill: 'הליכון',
}
export const patternHe: Record<MovementPattern, string> = {
  horizontalPush: 'דחיקה אופקית', verticalPush: 'דחיקה אנכית', horizontalPull: 'משיכה אופקית',
  verticalPull: 'משיכה אנכית', squat: 'סקוואט', hinge: 'הינג׳', lunge: 'חד־רגלי',
  quadIsolation: 'ארבע־ראשי', hamstringIsolation: 'ירך אחורית', chestIsolation: 'חזה (בידוד)',
  lateralDelt: 'כתף צד', rearDelt: 'כתף אחורית', biceps: 'יד קדמית', triceps: 'יד אחורית',
  calves: 'תאומים', core: 'בטן וליבה', conditioning: 'פינישר',
}
export const muscleHe: Record<Muscle, string> = {
  abs: 'בטן', abductors: 'מרחיקים', adductors: 'מקרבים', biceps: 'יד קדמית', calves: 'תאומים',
  chest: 'חזה', forearms: 'אמות', glutes: 'ישבן', hamstrings: 'ירך אחורית', lats: 'גב רחב',
  lowerBack: 'גב תחתון', midBack: 'גב אמצעי', neck: 'צוואר', quads: 'ירך קדמית', shoulders: 'כתפיים',
  traps: 'טרפזים', triceps: 'יד אחורית',
}
export const bodyAreaHe: Record<BodyArea, string> = {
  shoulder: 'כתף', elbow: 'מרפק', wrist: 'שורש כף יד', lowerBack: 'גב תחתון', knee: 'ברך', hip: 'ירך / אגן',
}
export const splitHe: Record<SplitType, string> = {
  fullBody: 'גוף מלא', upperLower: 'עליון / תחתון', pushPullLegs: 'דחיקה / משיכה / רגליים', ab: 'A-B', abc: 'A-B-C',
}
export const partHe: Record<BodyPart, string> = {
  chest: 'חזה', back: 'גב', shoulders: 'כתפיים', triceps: 'יד אחורית', biceps: 'יד קדמית', legs: 'רגליים', abs: 'בטן', cardio: 'אירובי',
}
const PATTERN_PART: Record<MovementPattern, BodyPart> = {
  horizontalPush: 'chest', chestIsolation: 'chest', verticalPush: 'shoulders', lateralDelt: 'shoulders', rearDelt: 'shoulders',
  horizontalPull: 'back', verticalPull: 'back', biceps: 'biceps', triceps: 'triceps', squat: 'legs', hinge: 'legs', lunge: 'legs',
  quadIsolation: 'legs', hamstringIsolation: 'legs', calves: 'legs', core: 'abs', conditioning: 'cardio',
}
export const partOfPattern = (p: MovementPattern): BodyPart => PATTERN_PART[p] ?? 'cardio'
export const prKindHe: Record<PRKind, string> = {
  maxWeight: 'משקל שיא', e1rm: '1RM משוער', maxReps: 'שיא חזרות', sessionVolume: 'נפח שיא',
}
export const angleHe: Record<PhotoAngle, string> = { front: 'חזית', side: 'צד', back: 'גב' }

const MAIN_LIFTS: MovementPattern[] = ['horizontalPush', 'verticalPush', 'horizontalPull', 'verticalPull', 'squat', 'hinge']
const LOWER: MovementPattern[] = ['squat', 'hinge', 'lunge', 'quadIsolation', 'hamstringIsolation', 'calves']
export const isMainLift = (p: MovementPattern) => MAIN_LIFTS.includes(p)
export const isLowerBody = (p: MovementPattern) => LOWER.includes(p)

export function recommendedSplit(weeklyGoal: number): SplitType {
  if (weeklyGoal <= 3) return 'fullBody'
  if (weeklyGoal === 4) return 'upperLower'
  return 'pushPullLegs'
}

// ---- מודל הנתונים (נשמר ב-IndexedDB) ----

export interface Profile {
  name: string
  birthYear: number
  heightCm: number
  sex: Sex
  goals: Goal[]
  level: ExperienceLevel
  weeklyGoal: number
  preferredMinutes: number
  limitations: BodyArea[]
  soundsOn: boolean
  restAutoStart: boolean
  onboardingDone: boolean
  lastLocationID?: string
  createdAt: string
  /** זמני מנוחה. בלי ערך: המאמן קובע לפי סוג התרגיל */
  rest?: RestSettings
  /** הודעות "מה חדש" שכבר נסגרו */
  seenNews?: string[]
}

export interface RestSettings {
  /** auto: לפי סוג התרגיל · fixed: הזמן שהוגדר בין סטים */
  mode: 'auto' | 'fixed'
  sets: number
  exercises: number
  /** exerciseID -> שניות בין סטים, לתרגיל מסוים */
  byExercise: Record<string, number>
}

/** מגבלות ציוד במיקום: משקולות עד X, ערימת משקולות בצעדים של Y */
export interface LocationLimits {
  dumbbellMax?: number
  stackStep?: number
  stackMax?: number
}

export interface LocationProfile {
  id: string
  name: string
  icon: string
  equipment: Equipment[]
  sortOrder: number
  limits?: LocationLimits
}

export interface TemplateSlot {
  id: string
  order: number
  pattern: MovementPattern
  priority: number
  variant: number
  sets: number
  repMin: number
  repMax: number
  targetRIR: number
  restSeconds: number
  /** locationID -> exerciseID */
  exerciseByLocation: Record<string, string>
  /** אזור הגוף (בתוכניות לפי אזורים) */
  part?: BodyPart
  /** מפתח ב-FOCUS: איזו וריאציה מועדפת (למשל לחיצה בשיפוע) */
  focus?: string
  /** תוספת גמישה (בטן / פינישר): נכנסת כשיש זמן, ואפשר לוותר עליה לפני האימון */
  flex?: boolean
}

export interface WorkoutTemplate {
  id: string
  name: string
  order: number
  slots: TemplateSlot[]
}

export interface Program {
  id: string
  name: string
  split: SplitType
  nextIndex: number
  cycleStart: string
  deloadWeekStart?: string
  isActive: boolean
  createdAt: string
  templates: WorkoutTemplate[]
  /** איך נבנתה התוכנית (בתוכניות לפי אזורי גוף), כדי לפתוח שוב את הבונה */
  design?: SplitDesign
}

export type SplitKind = 'fullBody' | 'ab' | 'abc'
export interface PartPlan { part: BodyPart; count: number }
export interface DayDesign { parts: PartPlan[] }
export interface SplitDesign {
  kind: SplitKind
  days: DayDesign[]
  /** כמה תרגילי בטן להוסיף בסוף כל אימון כשיש זמן (0 = בלי) */
  absFlex: number
  /** פינישר אירובי בסוף כל אימון כשיש זמן */
  finisher: boolean
}

export interface SetLog {
  id: string
  order: number
  kind: SetKind
  weight: number
  reps: number
  rir?: number | null
  targetWeight: number
  targetReps: number
  isCompleted: boolean
  completedAt?: string
}

export interface ExerciseLog {
  id: string
  order: number
  exerciseID: string
  exerciseName: string
  slotID?: string
  pattern: MovementPattern
  priority: number
  repMin: number
  repMax: number
  targetRIR: number
  restSeconds: number
  coachNote: string
  note: string
  sets: SetLog[]
}

export interface WorkoutSession {
  id: string
  startedAt: string
  endedAt?: string
  kind: 'strength' | 'run' | 'free'
  templateName: string
  templateID?: string
  locationID?: string
  locationName: string
  plannedMinutes: number
  note: string
  xpEarned: number
  isDeload: boolean
  isCompleted: boolean
  weeklyGoalSnapshot: number
  currentExerciseIndex: number
  exercises: ExerciseLog[]
}

export interface PersonalRecord {
  id: string
  exerciseID: string
  exerciseName: string
  kind: PRKind
  value: number
  weight: number
  reps: number
  date: string
  sessionID?: string
}

export interface BodyMetric {
  id: string
  date: string
  weight?: number
  bodyFat?: number
  waist?: number
  chest?: number
  arm?: number
  thigh?: number
}

export interface ProgressPhoto {
  id: string
  date: string
  angle: PhotoAngle
  /** מפתח ב-IndexedDB לתמונה עצמה */
  blobKey: string
}

export interface UnlockedAchievement {
  id: string
  date: string
}

export interface XPEvent {
  id: string
  amount: number
  reason: string
  date: string
  sessionID?: string
}

export interface ReminderRule {
  weekdays: number[]
  hour: number
  minute: number
}

export interface AppData {
  version: 1
  profile?: Profile
  locations: LocationProfile[]
  programs: Program[]
  sessions: WorkoutSession[]
  records: PersonalRecord[]
  metrics: BodyMetric[]
  photos: ProgressPhoto[]
  achievements: UnlockedAchievement[]
  xpEvents: XPEvent[]
  reminders: ReminderRule[]
  /** תרגילים מועדפים: המאמן בוחר אותם קודם */
  favorites?: string[]
}

export const emptyData = (): AppData => ({
  version: 1, locations: [], programs: [], sessions: [], records: [], metrics: [], photos: [],
  achievements: [], xpEvents: [], reminders: [],
})

export const uid = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`)
