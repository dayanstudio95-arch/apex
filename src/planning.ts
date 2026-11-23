// חיבור בין המנוע לנתונים של המשתמש: מועדפים, מגבלות ציוד במיקום וזמני מנוחה.
import type { AppData, BodyPart, LocationProfile, WorkoutSession, WorkoutTemplate } from './engine/types'
import { catalog } from './engine/catalog'
import { HistoryIndex } from './engine/history'
import { SessionBuilder, slotInput } from './engine/session'
import type { SlotInput } from './engine/session'
import { favoritesOf, restBetweenSets } from './engine/prefs'

export function makeBuilder(data: AppData, location?: LocationProfile, sessions: WorkoutSession[] = data.sessions) {
  return new SessionBuilder(catalog(), new HistoryIndex(sessions), {
    favorites: favoritesOf(data),
    limits: location?.limits,
    restFor: (id, coach) => restBetweenSets(data.profile, id, coach),
  })
}

/** תוספות גמישות שאפשר לוותר עליהן לפני האימון */
export interface Extras { abs: boolean; finisher: boolean }
export const ALL_EXTRAS: Extras = { abs: true, finisher: true }

export function templateSlots(t: WorkoutTemplate, locationID?: string, extras: Extras = ALL_EXTRAS): SlotInput[] {
  return [...t.slots].sort((a, b) => a.order - b.order)
    .filter((s) => !s.flex || (s.part === 'cardio' ? extras.finisher : extras.abs))
    .map((s) => slotInput(s, locationID))
}

export const hasFlex = (t: WorkoutTemplate | undefined, part: BodyPart) => !!t?.slots.some((s) => s.flex && s.part === part)
