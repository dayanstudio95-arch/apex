// העדפות אישיות: זמני מנוחה ותרגילים מועדפים.
import type { AppData, Profile, RestSettings } from './types'

export const DEFAULT_REST: RestSettings = { mode: 'auto', sets: 90, exercises: 120, byExercise: {} }

export function restSettings(p?: Profile): RestSettings {
  const r = p?.rest
  return { ...DEFAULT_REST, ...(r ?? {}), byExercise: { ...(r?.byExercise ?? {}) } }
}

/** מנוחה בין סטים: קודם הגדרה לתרגיל, אחר כך הזמן הקבוע, ואם אין, ההמלצה של המאמן לתרגיל */
export function restBetweenSets(p: Profile | undefined, exerciseID: string, coachSeconds: number): number {
  const r = restSettings(p)
  return r.byExercise[exerciseID] ?? (r.mode === 'fixed' ? r.sets : coachSeconds)
}

export const restBetweenExercises = (p?: Profile) => restSettings(p).exercises

export function updateRest(p: Profile, patch: Partial<RestSettings>) {
  p.rest = { ...restSettings(p), ...patch }
}

/** שומר מנוחה בין סטים: לתרגיל אחד, או לכל התרגילים (ואז עוברים לזמן קבוע) */
export function saveSetRest(p: Profile, seconds: number, exerciseID?: string) {
  const r = restSettings(p)
  if (exerciseID) r.byExercise[exerciseID] = seconds
  else { r.mode = 'fixed'; r.sets = seconds }
  p.rest = r
}

export const favoritesOf = (d: AppData) => new Set(d.favorites ?? [])
export const isFavorite = (d: AppData, id: string) => (d.favorites ?? []).includes(id)

/** מחזיר true אם התרגיל נוסף למועדפים */
export function toggleFavorite(d: AppData, id: string): boolean {
  const list = d.favorites ?? []
  const on = !list.includes(id)
  d.favorites = on ? [...list, id] : list.filter((x) => x !== id)
  return on
}
