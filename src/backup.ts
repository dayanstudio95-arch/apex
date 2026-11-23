// גיבוי ושחזור. תומך גם בקובץ גיבוי מהאפליקציה הנייטיבית (APEX-backup-*.json),
// כדי שאפשר יהיה להעביר את ההיסטוריה מהאייפון הישן.
import type { AppData, Equipment, ExerciseLog, PhotoAngle, Program, WorkoutSession } from './engine/types'
import { emptyData, uid } from './engine/types'
import { loadPhoto, photoKey, savePhoto } from './store'

interface WebBackup {
  app: 'apex-web'
  version: 1
  createdAt: string
  data: AppData
  photos: Record<string, string> // blobKey -> data URL
}

const blobToDataURL = (b: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader()
  r.onload = () => res(String(r.result))
  r.onerror = () => rej(r.error)
  r.readAsDataURL(b)
})

const dataURLToBlob = async (url: string) => (await fetch(url)).blob()

export async function exportBackup(data: AppData): Promise<Blob> {
  const photos: Record<string, string> = {}
  for (const p of data.photos) {
    const blob = await loadPhoto(p.blobKey)
    if (blob) photos[p.blobKey] = await blobToDataURL(blob)
  }
  const file: WebBackup = { app: 'apex-web', version: 1, createdAt: new Date().toISOString(), data, photos }
  return new Blob([JSON.stringify(file)], { type: 'application/json' })
}

export const backupFileName = () => `APEX-backup-${new Date().toISOString().slice(0, 10)}.json`

/** קורא קובץ גיבוי (ווב או נייטיבי), שומר את התמונות ומחזיר את הנתונים החדשים */
export async function importBackup(text: string): Promise<AppData> {
  const raw = JSON.parse(text) as Record<string, unknown>
  if (raw.app === 'apex-web') {
    const b = raw as unknown as WebBackup
    for (const [key, url] of Object.entries(b.photos ?? {})) await savePhoto(key, await dataURLToBlob(url))
    return { ...emptyData(), ...b.data }
  }
  if ('sessions' in raw && 'programs' in raw) return importNative(raw)
  throw new Error('not an APEX backup')
}

// ---- המרה מפורמט הגיבוי של האפליקציה הנייטיבית (Swift) ----

/* eslint-disable @typescript-eslint/no-explicit-any */
const lower = (id: unknown) => (typeof id === 'string' ? id.toLowerCase() : undefined)

const NATIVE_ICON: Record<string, string> = {
  'building.2.fill': 'gym', 'house.fill': 'home', 'tree.fill': 'outside', 'mappin.circle.fill': 'pin',
}

async function importNative(n: any): Promise<AppData> {
  const d = emptyData()
  if (n.profile) {
    const p = n.profile
    d.profile = {
      name: p.name ?? '', birthYear: p.birthYear ?? 1995, heightCm: p.heightCm ?? 175, sex: p.sex ?? 'male',
      goals: p.goals ?? ['muscle'], level: p.level ?? 'intermediate', weeklyGoal: p.weeklyGoal ?? 3,
      preferredMinutes: p.preferredMinutes ?? 60, limitations: p.limitations ?? [], soundsOn: p.soundsOn ?? true,
      restAutoStart: p.restAutoStart ?? true, onboardingDone: true, lastLocationID: lower(p.lastLocationID),
      createdAt: p.createdAt ?? new Date().toISOString(),
    }
  }
  d.locations = (n.locations ?? []).map((l: any) => ({
    id: lower(l.id)!, name: l.name, icon: NATIVE_ICON[l.icon] ?? 'pin', equipment: l.equipment as Equipment[], sortOrder: l.sortOrder ?? 0,
  }))
  d.programs = (n.programs ?? []).map((p: any): Program => ({
    id: lower(p.id)!, name: p.name, split: p.split, nextIndex: p.nextIndex ?? 0, cycleStart: p.cycleStart,
    deloadWeekStart: p.deloadWeekStart ?? undefined, isActive: !!p.isActive, createdAt: p.createdAt,
    templates: (p.templates ?? []).map((t: any) => ({
      id: lower(t.id)!, name: t.name, order: t.order,
      slots: (t.slots ?? []).map((s: any) => {
        let map: Record<string, string> = {}
        try { map = JSON.parse(s.exerciseMapJSON ?? '{}') } catch { /* ריק */ }
        return {
          id: lower(s.id)!, order: s.order, pattern: s.pattern, priority: s.priority, variant: s.variant ?? 0,
          sets: s.sets, repMin: s.repMin, repMax: s.repMax, targetRIR: s.targetRIR, restSeconds: s.restSeconds,
          exerciseByLocation: Object.fromEntries(Object.entries(map).map(([k, v]) => [k.toLowerCase(), v])),
        }
      }),
    })),
  }))
  d.sessions = (n.sessions ?? []).map((s: any): WorkoutSession => ({
    id: lower(s.id)!, startedAt: s.startedAt, endedAt: s.endedAt ?? undefined, kind: s.kind ?? 'strength',
    templateName: s.templateName ?? '', templateID: lower(s.templateID), locationID: lower(s.locationID),
    locationName: s.locationName ?? '', plannedMinutes: s.plannedMinutes ?? 60, note: s.note ?? '', xpEarned: s.xpEarned ?? 0,
    isDeload: !!s.isDeload, isCompleted: !!s.isCompleted, weeklyGoalSnapshot: s.weeklyGoalSnapshot ?? 3, currentExerciseIndex: 0,
    exercises: (s.exercises ?? []).map((e: any): ExerciseLog => ({
      id: uid(), order: e.order, exerciseID: e.exerciseID, exerciseName: e.exerciseName, slotID: lower(e.slotID),
      pattern: e.pattern, priority: e.priority ?? 1, repMin: e.repMin, repMax: e.repMax, targetRIR: e.targetRIR,
      restSeconds: e.restSeconds, coachNote: e.coachNote ?? '', note: e.note ?? '',
      sets: (e.sets ?? []).map((x: any) => ({
        id: uid(), order: x.order, kind: x.kind, weight: x.weight, reps: x.reps, rir: x.rir ?? null,
        targetWeight: x.targetWeight ?? x.weight, targetReps: x.targetReps ?? x.reps, isCompleted: !!x.isCompleted,
        completedAt: x.completedAt ?? undefined,
      })),
    })),
  })).filter((s: WorkoutSession) => s.isCompleted)
  d.records = (n.records ?? []).map((r: any) => ({ id: uid(), ...r, sessionID: lower(r.sessionID) }))
  d.metrics = (n.metrics ?? []).map((m: any) => ({ id: uid(), ...m }))
  d.achievements = (n.achievements ?? []).map((a: any) => ({ id: a.id, date: a.date }))
  d.xpEvents = (n.xpEvents ?? []).map((x: any) => ({ id: uid(), amount: x.amount, reason: x.reason, date: x.date, sessionID: lower(x.sessionID) }))
  d.reminders = (n.reminders ?? []).filter((r: any) => r.isOn).map((r: any) => ({ weekdays: r.weekdays, hour: r.hour, minute: r.minute }))
  for (const ph of n.photos ?? []) {
    if (!ph.data) continue
    const id = uid()
    const blob = await dataURLToBlob(`data:image/jpeg;base64,${ph.data}`)
    await savePhoto(photoKey(id), blob)
    d.photos.push({ id, date: ph.date, angle: ph.angle as PhotoAngle, blobKey: photoKey(id) })
  }
  return d
}

// ---- תזכורות: קובץ יומן (.ics) עם אירוע שבועי חוזר והתראה ----

const ICS_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

export function remindersICS(weekdays: number[], hour: number, minute: number, title = 'אימון APEX 💪'): string {
  const now = new Date()
  const first = new Date(now)
  first.setHours(hour, minute, 0, 0)
  const pad = (x: number) => String(x).padStart(2, '0')
  const local = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
  const end = new Date(first.getTime() + 60 * 60 * 1000)
  const days = weekdays.map((w) => ICS_DAYS[w - 1]).join(',')
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//APEX//Workout//HE', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:apex-${stamp}@apex`, `DTSTAMP:${stamp}`,
    `DTSTART:${local(first)}`, `DTEND:${local(end)}`, `RRULE:FREQ=WEEKLY;BYDAY=${days}`,
    `SUMMARY:${title}`, 'DESCRIPTION:האימון הבא מחכה ב-APEX.',
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:הגיע הזמן להתאמן', 'TRIGGER:-PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

/** שיתוף קובץ דרך גיליון השיתוף של iOS (שמירה ל-Files / iCloud Drive / AirDrop), ואם אין, הורדה */
export async function shareOrDownload(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: blob.type })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file] }); return } catch { /* בוטל */ }
  }
  downloadBlob(blob, filename)
}
