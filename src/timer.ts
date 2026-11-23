// טיימר מנוחה מבוסס זמן סיום, כך שהוא מדויק גם אחרי שהאפליקציה הייתה ברקע.
import { useSyncExternalStore } from 'react'

interface TimerState { endAt: number | null; duration: number; finishedTick: number; label: string }

let state: TimerState = { endAt: null, duration: 0, finishedTick: 0, label: '' }
let timeout: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()
const emit = () => { state = { ...state }; listeners.forEach((l) => l()) }

let audio: AudioContext | null = null
/** ב-iOS צריך "לפתוח" את הסאונד בלחיצה של המשתמש */
export function unlockAudio() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    audio ??= new Ctx()
    if (audio.state === 'suspended') void audio.resume()
  } catch { /* אין סאונד */ }
}

export function beep(times = 3) {
  if (!audio) return
  const t0 = audio.currentTime
  for (let i = 0; i < times; i++) {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = 'sine'
    osc.frequency.value = i === times - 1 ? 1320 : 880
    gain.gain.setValueAtTime(0.0001, t0 + i * 0.22)
    gain.gain.exponentialRampToValueAtTime(0.35, t0 + i * 0.22 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.22 + 0.18)
    osc.connect(gain).connect(audio.destination)
    osc.start(t0 + i * 0.22)
    osc.stop(t0 + i * 0.22 + 0.2)
  }
}

let soundOn = true
export const setTimerSound = (on: boolean) => { soundOn = on }

function schedule() {
  clearTimeout(timeout)
  if (state.endAt == null) return
  const wait = state.endAt - Date.now()
  timeout = setTimeout(complete, Math.max(0, wait))
}

function complete() {
  if (state.endAt == null) return
  state.endAt = null
  state.finishedTick++
  if (soundOn) beep()
  try { navigator.vibrate?.([200, 100, 200]) } catch { /* לא נתמך באייפון */ }
  emit()
}

export const restTimer = {
  start(seconds: number, label = '') {
    unlockAudio()
    state.duration = seconds
    state.endAt = Date.now() + seconds * 1000
    state.label = label
    schedule()
    emit()
  },
  add(seconds: number) {
    if (state.endAt == null) return
    state.endAt = Math.max(Date.now() + 5000, state.endAt + seconds * 1000)
    state.duration = Math.max(5, state.duration + seconds)
    schedule()
    emit()
  },
  stop() {
    clearTimeout(timeout)
    state.endAt = null
    emit()
  },
}

export const remaining = (s: TimerState, now = Date.now()) => (s.endAt == null ? 0 : Math.max(0, (s.endAt - now) / 1000))

// כשחוזרים לאפליקציה מהרקע, בודקים אם הטיימר הסתיים בינתיים
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.endAt != null && Date.now() >= state.endAt) complete()
  })
}

export function useRestTimer(): TimerState {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, () => state)
}
