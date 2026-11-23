import { addWeeks, startOfWeek } from './format'

// ---------- רמות ----------

export interface LevelInfo { level: number; xpIntoLevel: number; xpForNext: number; totalXP: number }
export const MAX_LEVEL = 30

/** הצעד מרמה n לרמה n+1 הוא round(150 × n^1.2) XP */
export const stepXP = (level: number) => Math.round(150 * Math.pow(level, 1.2))

export function levelInfo(totalXP: number): LevelInfo {
  let level = 1
  let remaining = Math.max(0, totalXP)
  while (level < MAX_LEVEL && remaining >= stepXP(level)) {
    remaining -= stepXP(level)
    level++
  }
  if (level >= MAX_LEVEL) return { level: MAX_LEVEL, xpIntoLevel: 0, xpForNext: 0, totalXP }
  return { level, xpIntoLevel: remaining, xpForNext: stepXP(level), totalXP }
}

export const levelProgress = (l: LevelInfo) => (l.xpForNext > 0 ? l.xpIntoLevel / l.xpForNext : 1)

/** דרגות ניטרליות מגדרית: חומרים ואיתני טבע, עם ספרה רומית בתוך כל דרגה */
export const TIERS: { from: number; to: number; name: string }[] = [
  { from: 1, to: 3, name: 'ניצוץ' }, { from: 4, to: 6, name: 'להבה' }, { from: 7, to: 9, name: 'ברזל' },
  { from: 10, to: 12, name: 'פלדה' }, { from: 13, to: 15, name: 'טיטניום' }, { from: 16, to: 18, name: 'יהלום' },
  { from: 19, to: 21, name: 'רעם' }, { from: 22, to: 24, name: 'סערה' }, { from: 25, to: 29, name: 'אגדה' },
  { from: 30, to: 30, name: 'APEX' },
]

export function levelTitle(level: number): string {
  const t = TIERS.find((x) => level >= x.from && level <= x.to)
  if (!t) return 'APEX'
  if (t.from === t.to) return t.name
  const roman = ['I', 'II', 'III', 'IV', 'V']
  return `${t.name} ${roman[Math.min(level - t.from, roman.length - 1)]}`
}

// ---------- רצף שבועי ----------

export type WeekStatus = 'success' | 'shielded' | 'missed' | 'inProgress'
export interface WeekResult { start: Date; count: number; goal: number; status: WeekStatus }
export interface StreakState {
  current: number
  best: number
  shields: number
  thisWeekCount: number
  thisWeekGoal: number
  weeks: WeekResult[]
  atRisk: boolean
  daysLeftInWeek: number
}
export interface StreakEntry { date: Date; goal: number }

export const SHIELD_EVERY = 4
export const MAX_SHIELDS = 2

/** שבוע מוצלח = לפחות N אימונים (ראשון עד שבת). כל 4 שבועות מוצלחים = מגן רצף (עד 2). */
export function computeStreak(entries: StreakEntry[], currentGoal: number, now = new Date()): StreakState {
  const currentWeek = startOfWeek(now)
  const daysLeftInWeek = 7 - now.getDay()
  const state: StreakState = {
    current: 0, best: 0, shields: 0, thisWeekCount: 0, thisWeekGoal: currentGoal, weeks: [], atRisk: false, daysLeftInWeek,
  }
  const byWeek = new Map<number, StreakEntry[]>()
  for (const e of entries) {
    const k = startOfWeek(e.date).getTime()
    byWeek.set(k, [...(byWeek.get(k) ?? []), e])
  }
  if (!byWeek.size) return state

  let streak = 0, best = 0, shields = 0, toward = 0
  let week = new Date(Math.min(...byWeek.keys()))
  const results: WeekResult[] = []
  while (week < currentWeek) {
    const items = byWeek.get(week.getTime()) ?? []
    const goal = items.length ? Math.max(...items.map((i) => i.goal)) : currentGoal
    if (items.length >= goal) {
      streak++
      toward++
      if (toward >= SHIELD_EVERY) { shields = Math.min(MAX_SHIELDS, shields + 1); toward = 0 }
      results.push({ start: week, count: items.length, goal, status: 'success' })
    } else if (shields > 0 && streak > 0) {
      shields--
      results.push({ start: week, count: items.length, goal, status: 'shielded' })
    } else {
      streak = 0
      toward = 0
      results.push({ start: week, count: items.length, goal, status: 'missed' })
    }
    best = Math.max(best, streak)
    week = startOfWeek(addWeeks(week, 1))
  }

  const thisWeek = byWeek.get(currentWeek.getTime()) ?? []
  state.thisWeekCount = thisWeek.length
  if (thisWeek.length >= currentGoal) {
    streak++
    results.push({ start: currentWeek, count: thisWeek.length, goal: currentGoal, status: 'success' })
  } else {
    results.push({ start: currentWeek, count: thisWeek.length, goal: currentGoal, status: 'inProgress' })
    state.atRisk = streak > 0 && currentGoal - thisWeek.length >= daysLeftInWeek
  }
  state.current = streak
  state.best = Math.max(best, streak)
  state.shields = shields
  state.weeks = results
  return state
}

export const weekProgress = (s: StreakState) => (s.thisWeekGoal > 0 ? Math.min(1, s.thisWeekCount / s.thisWeekGoal) : 0)

// ---------- XP ----------

export interface XPItem { reason: string; amount: number }

export function sessionXP(completedWorkSets: number, prCount: number, weeklyGoalHit: boolean, streakWeeks: number): XPItem[] {
  const items: XPItem[] = [{ reason: 'אימון הושלם', amount: 100 }]
  if (completedWorkSets > 0) items.push({ reason: completedWorkSets === 1 ? 'סט אחד' : `${completedWorkSets} סטים`, amount: completedWorkSets * 5 })
  if (prCount > 0) items.push({ reason: prCount === 1 ? 'שיא חדש' : `${prCount} שיאים חדשים`, amount: prCount * 50 })
  if (weeklyGoalHit) {
    items.push({ reason: 'יעד שבועי', amount: 150 })
    if (streakWeeks > 1) items.push({ reason: `בונוס רצף · ${streakWeeks} שבועות`, amount: streakWeeks * 10 })
  }
  return items
}

// ---------- הישגים ----------

export interface AchievementContext {
  totalWorkouts: number
  currentStreak: number
  bestStreak: number
  totalVolume: number
  maxSessionVolume: number
  totalPRs: number
  bodyweight: number
  bestBench: number
  bestSquat: number
  bestDeadlift: number
  bestOHP: number
  maxPullupReps: number
  maxPushupReps: number
  distinctLocations: number
  hadEarlyWorkout: boolean
  hadLateWorkout: boolean
  level: number
  bodyMetricsCount: number
  photosCount: number
  deloadsCompleted: number
}

export const emptyAchievementContext = (): AchievementContext => ({
  totalWorkouts: 0, currentStreak: 0, bestStreak: 0, totalVolume: 0, maxSessionVolume: 0, totalPRs: 0, bodyweight: 0,
  bestBench: 0, bestSquat: 0, bestDeadlift: 0, bestOHP: 0, maxPullupReps: 0, maxPushupReps: 0, distinctLocations: 0,
  hadEarlyWorkout: false, hadLateWorkout: false, level: 1, bodyMetricsCount: 0, photosCount: 0, deloadsCompleted: 0,
})

export type AchievementCategory = 'consistency' | 'strength' | 'volume' | 'variety'
export const categoryHe: Record<AchievementCategory, string> = {
  consistency: 'עקביות', strength: 'כוח', volume: 'נפח ושיאים', variety: 'גיוון ודרך',
}

export interface Achievement {
  id: string
  title: string
  detail: string
  icon: string
  category: AchievementCategory
  check: (c: AchievementContext) => boolean
}

const A = (id: string, title: string, detail: string, icon: string, category: AchievementCategory,
           check: (c: AchievementContext) => boolean): Achievement => ({ id, title, detail, icon, category, check })

export const ACHIEVEMENTS: Achievement[] = [
  A('first_workout', 'הצעד הראשון', 'סיום האימון הראשון', 'flag', 'consistency', (c) => c.totalWorkouts >= 1),
  A('workouts_10', 'מתחילים לזוז', '10 אימונים', 'ten', 'consistency', (c) => c.totalWorkouts >= 10),
  A('workouts_25', 'הרגל נבנה', '25 אימונים', 'calendarCheck', 'consistency', (c) => c.totalWorkouts >= 25),
  A('workouts_50', 'חצי מאה', '50 אימונים', 'calendarRange', 'consistency', (c) => c.totalWorkouts >= 50),
  A('workouts_100', 'מאה עגולה', '100 אימונים', 'badge', 'consistency', (c) => c.totalWorkouts >= 100),
  A('workouts_250', 'מכונה', '250 אימונים', 'cog', 'consistency', (c) => c.totalWorkouts >= 250),
  A('streak_4', 'חודש רצוף', 'רצף של 4 שבועות', 'flame', 'consistency', (c) => c.bestStreak >= 4),
  A('streak_8', 'חודשיים בוערים', 'רצף של 8 שבועות', 'flameKindling', 'consistency', (c) => c.bestStreak >= 8),
  A('streak_12', 'רבעון של ברזל', 'רצף של 12 שבועות', 'shieldCheck', 'consistency', (c) => c.bestStreak >= 12),
  A('streak_26', 'חצי שנה בלי לעצור', 'רצף של 26 שבועות', 'sun', 'consistency', (c) => c.bestStreak >= 26),
  A('streak_52', 'שנה שלמה', 'רצף של 52 שבועות', 'crown', 'consistency', (c) => c.bestStreak >= 52),
  A('deload_1', 'חכם על המוט', 'השלמת שבוע דילואד', 'leaf', 'consistency', (c) => c.deloadsCompleted >= 1),
  A('bench_bw', 'לוחץ את עצמי', 'לחיצת חזה במוט במשקל הגוף', 'dumbbell', 'strength', (c) => c.bodyweight > 0 && c.bestBench >= c.bodyweight),
  A('bench_100', 'מועדון ה־100', 'לחיצת חזה של 100 ק״ג', 'trophy', 'strength', (c) => c.bestBench >= 100),
  A('squat_100', 'סקוואט תלת־ספרתי', 'סקוואט במוט של 100 ק״ג', 'mountain', 'strength', (c) => c.bestSquat >= 100),
  A('squat_1_5bw', 'רגליים של פלדה', 'סקוואט של פי 1.5 ממשקל הגוף', 'zap', 'strength', (c) => c.bodyweight > 0 && c.bestSquat >= c.bodyweight * 1.5),
  A('deadlift_140', 'מרימים את הבית', 'דדליפט של 140 ק״ג', 'arrowUpToLine', 'strength', (c) => c.bestDeadlift >= 140),
  A('deadlift_2bw', 'כפול ממני', 'דדליפט של פי 2 ממשקל הגוף', 'circleArrowUp', 'strength', (c) => c.bodyweight > 0 && c.bestDeadlift >= c.bodyweight * 2),
  A('ohp_60', 'מעל הראש', 'לחיצת כתפיים במוט של 60 ק״ג', 'squareArrowUp', 'strength', (c) => c.bestOHP >= 60),
  A('pullups_10', 'עשר על המתח', '10 מתחים בסט אחד', 'activity', 'strength', (c) => c.maxPullupReps >= 10),
  A('pushups_30', 'שלושים ברצף', '30 שכיבות סמיכה בסט אחד', 'repeat', 'strength', (c) => c.maxPushupReps >= 30),
  A('session_10t', 'עשרה טון', '10,000 ק״ג באימון אחד', 'weight', 'volume', (c) => c.maxSessionVolume >= 10_000),
  A('total_100t', '100 טון', 'נפח מצטבר של 100 טון', 'package', 'volume', (c) => c.totalVolume >= 100_000),
  A('total_500t', 'חצי מיליון', 'נפח מצטבר של 500 טון', 'building', 'volume', (c) => c.totalVolume >= 500_000),
  A('total_1m', 'מיליון ק״ג', 'נפח מצטבר של מיליון ק״ג', 'globe', 'volume', (c) => c.totalVolume >= 1_000_000),
  A('pr_1', 'שיא ראשון', 'השיא האישי הראשון', 'award', 'volume', (c) => c.totalPRs >= 1),
  A('pr_10', 'צייד שיאים', '10 שיאים אישיים', 'trophy', 'volume', (c) => c.totalPRs >= 10),
  A('pr_50', 'שובר שיאים', '50 שיאים אישיים', 'medal', 'volume', (c) => c.totalPRs >= 50),
  A('all_locations', 'בכל מקום', 'אימונים ב־3 מיקומים שונים', 'map', 'variety', (c) => c.distinctLocations >= 3),
  A('early_bird', 'ציפור מוקדמת', 'אימון שהתחיל לפני 7:00', 'sunrise', 'variety', (c) => c.hadEarlyWorkout),
  A('night_owl', 'ינשוף לילה', 'אימון שהתחיל אחרי 21:30', 'moon', 'variety', (c) => c.hadLateWorkout),
  A('first_measure', 'יודעים איפה עומדים', 'מדידת גוף ראשונה', 'ruler', 'variety', (c) => c.bodyMetricsCount >= 1),
  A('first_photo', 'לפני', 'תמונת התקדמות ראשונה', 'camera', 'variety', (c) => c.photosCount >= 1),
  A('photos_10', 'מתעדים את הדרך', '10 תמונות התקדמות', 'images', 'variety', (c) => c.photosCount >= 10),
  A('level_10', 'פלדה', 'הגעה לרמה 10', 'shield', 'variety', (c) => c.level >= 10),
  A('level_20', 'רעם', 'הגעה לרמה 20', 'cloudLightning', 'variety', (c) => c.level >= 20),
  A('level_30', 'APEX', 'הגעה לרמה 30, הפסגה', 'mountainSnow', 'variety', (c) => c.level >= 30),
]

export const newlyUnlocked = (c: AchievementContext, already: Set<string>) =>
  ACHIEVEMENTS.filter((a) => !already.has(a.id) && a.check(c))
