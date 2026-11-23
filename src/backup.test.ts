import { describe, expect, it } from 'vitest'
import { importBackup } from './backup'

// מבנה קובץ הגיבוי של האפליקציה הנייטיבית (Swift, JSONEncoder עם תאריכי ISO8601 ו-UUID באותיות גדולות)
const native = {
  version: 1, createdAt: '2026-11-15T10:00:00Z',
  profile: { name: 'דניאל', birthYear: 1995, heightCm: 178, sex: 'male', goals: ['muscle', 'fatLoss'], level: 'intermediate',
    weeklyGoal: 3, preferredMinutes: 60, limitations: [], soundsOn: true, hapticsOn: true, photoLock: false, restAutoStart: true,
    onboardingDone: true, lastLocationID: 'AAAA-1111', createdAt: '2026-11-11T00:00:00Z' },
  locations: [{ id: 'AAAA-1111', name: 'חדר כושר', icon: 'building.2.fill', equipment: ['barbell', 'bench', 'rack'], sortOrder: 0 }],
  programs: [{ id: 'PPPP', name: 'APEX · גוף מלא', split: 'fullBody', nextIndex: 1, cycleStart: '2026-11-09T00:00:00Z', isActive: true,
    createdAt: '2026-11-11T00:00:00Z', templates: [{ id: 'TTTT', name: 'גוף מלא A', order: 0, slots: [{ id: 'SSSS', order: 0,
      pattern: 'squat', priority: 1, variant: 0, sets: 3, repMin: 6, repMax: 10, targetRIR: 2, restSeconds: 150,
      exerciseMapJSON: '{"AAAA-1111":"Barbell_Squat"}' }] }] }],
  sessions: [{ id: 'SESS', startedAt: '2026-11-12T18:00:00Z', endedAt: '2026-11-12T19:00:00Z', kind: 'strength', templateName: 'גוף מלא A',
    templateID: 'TTTT', locationID: 'AAAA-1111', locationName: 'חדר כושר', plannedMinutes: 60, note: '', xpEarned: 130, isDeload: false,
    isCompleted: true, weeklyGoalSnapshot: 3, exercises: [{ order: 0, exerciseID: 'Barbell_Squat', exerciseName: 'סקוואט', slotID: 'SSSS',
      pattern: 'squat', priority: 1, repMin: 6, repMax: 10, targetRIR: 2, restSeconds: 150, coachNote: '', note: '',
      sets: [{ order: 0, kind: 'work', weight: 80, reps: 8, rir: 2, targetWeight: 80, targetReps: 8, isCompleted: true, completedAt: '2026-11-12T18:10:00Z' }] }] }],
  records: [{ exerciseID: 'Barbell_Squat', exerciseName: 'סקוואט', kind: 'maxWeight', value: 80, weight: 80, reps: 8, date: '2026-11-12T19:00:00Z', sessionID: 'SESS' }],
  metrics: [{ date: '2026-11-11T00:00:00Z', weight: 84 }],
  photos: [], achievements: [{ id: 'first_workout', date: '2026-11-12T19:00:00Z' }],
  xpEvents: [{ amount: 130, reason: 'אימון הושלם', date: '2026-11-12T19:00:00Z', sessionID: 'SESS' }],
  reminders: [{ weekdays: [1, 3], hour: 18, minute: 0, isOn: true }], customExercises: [],
}

describe('import native backup', () => {
  it('maps every section and keeps ids consistent', async () => {
    const d = await importBackup(JSON.stringify(native))
    expect(d.profile?.name).toBe('דניאל')
    expect(d.profile?.lastLocationID).toBe('aaaa-1111')
    expect(d.locations[0]).toMatchObject({ id: 'aaaa-1111', icon: 'gym' })
    expect(d.programs[0].templates[0].slots[0].exerciseByLocation).toEqual({ 'aaaa-1111': 'Barbell_Squat' })
    expect(d.sessions[0]).toMatchObject({ id: 'sess', templateID: 'tttt', locationID: 'aaaa-1111', isCompleted: true })
    expect(d.sessions[0].exercises[0].sets[0]).toMatchObject({ weight: 80, reps: 8, rir: 2, isCompleted: true })
    expect(d.records).toHaveLength(1)
    expect(d.xpEvents[0].amount).toBe(130)
    expect(d.reminders).toEqual([{ weekdays: [1, 3], hour: 18, minute: 0 }])
  })
  it('rejects files that are not APEX backups', async () => {
    await expect(importBackup('{"hello":1}')).rejects.toThrow()
  })
})
