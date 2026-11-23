// עיצוב מספרים ותאריכים, ולוח שנה עם שבוע שמתחיל ביום ראשון.

export const LRI = '⁦'
export const PDI = '⁩'
/** בידוד שמאל־לימין, כדי ש-"3×8" לא יתהפך בתוך טקסט עברי */
export const ltr = (s: string) => `${LRI}${s}${PDI}`
/** "+105" בלי שיתהפך ל-"105+" */
export const plus = (n: number | string) => ltr(`+${n}`)

export function fmtWeight(w: number): string {
  if (Math.round(w) === w) return String(w)
  return w.toFixed(1)
}
export const fmtKg = (w: number) => `${fmtWeight(w)} ק״ג`

export function fmtGrouped(n: number): string {
  return Math.round(n).toLocaleString('he-IL')
}

export function fmtVolume(kg: number): string {
  if (kg >= 10_000) return `${(kg / 1000).toFixed(1)} טון`
  return `${fmtGrouped(kg)} ק״ג`
}

export function fmtDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (x: number) => String(x).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}

export const fmtMinutes = (seconds: number) => `${Math.round(seconds / 60)} דק׳`

const he = 'he-IL'
export const fmtDayMonth = (d: Date | string) =>
  new Date(d).toLocaleDateString(he, { day: 'numeric', month: 'short' })
export const fmtFullDate = (d: Date | string) =>
  new Date(d).toLocaleDateString(he, { weekday: 'long', day: 'numeric', month: 'long' })
export const fmtMonthYear = (d: Date | string) =>
  new Date(d).toLocaleDateString(he, { month: 'long', year: 'numeric' })
export const fmtTime = (d: Date | string) =>
  new Date(d).toLocaleTimeString(he, { hour: '2-digit', minute: '2-digit' })

// ---- לוח שנה ----

export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** תחילת השבוע (יום ראשון, 00:00) לפי שעון המכשיר */
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d)
  x.setDate(x.getDate() - x.getDay())
  return x
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export const addWeeks = (d: Date, n: number) => addDays(d, n * 7)

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function sameWeek(a: Date, b: Date): boolean {
  return startOfWeek(a).getTime() === startOfWeek(b).getTime()
}

export function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

export function weeksBetween(a: Date, b: Date): number {
  return Math.round((startOfWeek(b).getTime() - startOfWeek(a).getTime()) / (7 * 86_400_000))
}

export const WEEKDAY_LETTERS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']
