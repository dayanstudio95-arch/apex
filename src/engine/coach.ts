// הקול של המאמן: מקצועי ותומך. ניסוחים ניטרליים מגדרית.
import type { ProgressionNote } from './progression'
import { fmtWeight } from './format'

export const daySeed = (d = new Date()) => Math.floor(d.getTime() / 86_400_000)
export const pick = (options: string[], seed: number) => options[Math.abs(seed) % options.length] ?? ''

export function greeting(d = new Date()): string {
  const h = d.getHours()
  if (h >= 5 && h < 12) return 'בוקר טוב'
  if (h >= 12 && h < 17) return 'צהריים טובים'
  if (h >= 17 && h < 22) return 'ערב טוב'
  return 'לילה טוב'
}

const GENERAL = [
  'עקביות מנצחת כישרון. עוד אימון אחד בכיוון הנכון.',
  'המטרה היום: סט אחד טוב יותר מהפעם הקודמת.',
  'התקדמות קטנה כל שבוע היא שינוי גדול בעוד חצי שנה.',
  'טכניקה קודם, משקל אחר כך. ככה מתקדמים לאורך זמן.',
  'הגוף זוכר כל חזרה. ממשיכים לבנות.',
  'לא צריך יום מושלם, צריך יום שמופיעים בו.',
  'כל ק״ג שעולה על המוט נבנה מאימונים כמו של היום.',
  'מנוחה טובה בין הסטים היא חלק מהעבודה, לא הפסקה ממנה.',
  'השיא הבא שלך כבר בדרך. הוא רק מחכה לאימון של היום.',
]

export interface TodayContext {
  totalWorkouts: number
  daysSinceLast?: number
  thisWeekCount: number
  weeklyGoal: number
  atRisk: boolean
  isDeload: boolean
}

export function todayLine(c: TodayContext, d = new Date()): string {
  if (c.isDeload) return 'שבוע דילואד: פחות נפח, יותר התאוששות. ככה הגוף בונה את הקפיצה הבאה.'
  if (c.totalWorkouts === 0) return 'האימון הראשון הוא הכי חשוב. מתחילים בקטן ובונים מכאן.'
  if (c.daysSinceLast != null && c.daysSinceLast >= 7) return 'חזרה אחרי הפסקה היא ניצחון בפני עצמו. היום בונים מחדש את הקצב.'
  if (c.thisWeekCount >= c.weeklyGoal) return 'היעד השבועי הושג. כל אימון נוסף השבוע הוא בונוס.'
  if (c.atRisk) {
    const left = c.weeklyGoal - c.thisWeekCount
    return left === 1
      ? 'נשאר אימון אחד ליעד השבועי. הרצף על הכף, וזה לגמרי אפשרי.'
      : `נשארו ${left} אימונים ליעד השבועי. הרצף על הכף, וזה לגמרי אפשרי.`
  }
  return pick(GENERAL, daySeed(d))
}

export function progressionLine(note: ProgressionNote, nextName: string): string {
  switch (note.kind) {
    case 'firstTime': return 'פעם ראשונה בתרגיל: בוחרים משקל שמשאיר בערך 2 חזרות במאגר. מכאן המאמן ממשיך.'
    case 'increase': return `עלייה של ${fmtWeight(note.amount)} ק״ג מהפעם הקודמת. זו בדיוק ההתקדמות שאנחנו מחפשים.`
    case 'addReps': return 'אותו משקל, והמטרה היא חזרה אחת יותר מהפעם הקודמת.'
    case 'hold': return 'בפעם הקודמת היה קשה. נשארים באותו משקל ומחזקים את הבסיס.'
    case 'decrease': return 'הורדנו מעט משקל כדי לבנות מחדש מומנטום. צעד אחד אחורה בשביל שניים קדימה.'
    case 'advanceVariation': return `הווריאציה הקודמת נכבשה. עוברים ל${nextName}.`
    case 'maxedOut': return `הגעת ל-${fmtWeight(note.max)} ק״ג, המשקל הכי כבד שיש כאן. מעכשיו מתקדמים בחזרות: עוד חזרה אחת כל פעם, ותנועה איטית ומבוקרת.`
  }
}

export function summaryLine(prCount: number, weeklyGoalHit: boolean, isDeload: boolean, seed: number): string {
  if (isDeload) return 'אימון דילואד הושלם. ההתאוששות היא חלק מהאימון.'
  if (weeklyGoalHit) return 'היעד השבועי הושג. הרצף ממשיך לבעור 🔥'
  if (prCount > 1) return `${prCount} שיאים חדשים היום. ככה נראית התקדמות.`
  if (prCount === 1) return 'שיא חדש היום. העבודה הקשה מתחילה להראות על המוט.'
  return pick([
    'עוד אימון נכנס לספרים. נתראה באימון הבא.',
    'סיימת אימון. כל אחד כזה מזיז את המחט.',
    'עבודה טובה. עכשיו מים, אוכל ושינה, והגוף יעשה את השאר.',
  ], seed)
}

export const levelUpLine = (level: number, title: string) => `עלית לרמה ${level}: ${title}. העקביות משתלמת.`
