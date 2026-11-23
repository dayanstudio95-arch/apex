// מאגר הנתונים: אובייקט אחד בזיכרון, נשמר ב-IndexedDB אחרי כל שינוי.
// השינויים נעשים במקום (כמו SwiftData), ואחריהם קוראים ל-commit().
import { useSyncExternalStore } from 'react'
import { del, get, set } from 'idb-keyval'
import type { AppData } from './engine/types'
import { emptyData } from './engine/types'

const KEY = 'apex-data-v1'
let data: AppData = emptyData()
let version = 0
let saveTimer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()

export async function loadData(): Promise<AppData> {
  try {
    const stored = await get<AppData>(KEY)
    if (stored && stored.version === 1) data = { ...emptyData(), ...stored }
  } catch {
    // אם הקריאה נכשלה מתחילים נקי, בלי לדרוס את מה שאולי שמור.
  }
  // מבקשים מהדפדפן לא למחוק את הנתונים כשחסר מקום.
  try { await navigator.storage?.persist?.() } catch { /* לא נתמך */ }
  version++
  return data
}

export const getData = () => data

/** אחרי כל שינוי בנתונים: מרענן את המסכים ושומר */
export function commit(immediate = false) {
  version++
  listeners.forEach((l) => l())
  clearTimeout(saveTimer)
  const save = () => set(KEY, data).catch(() => undefined)
  if (immediate) void save()
  else saveTimer = setTimeout(save, 300)
}

export function replaceData(next: AppData) {
  data = next
  commit(true)
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** מחזיר את הנתונים ומרנדר מחדש בכל commit */
export function useData(): AppData {
  useSyncExternalStore(subscribe, () => version)
  return data
}

// שמירה אחרונה לפני שהדף נסגר או עובר לרקע
if (typeof window !== 'undefined') {
  const flush = () => { clearTimeout(saveTimer); void set(KEY, data).catch(() => undefined) }
  window.addEventListener('pagehide', flush)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush() })
}

// ---- תמונות התקדמות (נשמרות בנפרד, כקבצים) ----

export const photoKey = (id: string) => `photo:${id}`
export const savePhoto = (key: string, blob: Blob) => set(key, blob)
export const loadPhoto = (key: string) => get<Blob>(key)
export const deletePhoto = (key: string) => del(key)
