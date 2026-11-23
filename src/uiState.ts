// מצב גלובלי של האפליקציה (לא נשמר): טאב, אימון פעיל, ניווט.
import { useSyncExternalStore } from 'react'

export type Tab = 'today' | 'history' | 'progress' | 'profile'

export interface Route { name: string; params?: Record<string, string> }

interface UIState {
  tab: Tab
  stacks: Record<Tab, Route[]>
  showWorkout: boolean
  activeSessionID?: string
  showPreWorkout: boolean
}

let ui: UIState = {
  tab: 'today',
  stacks: { today: [], history: [], progress: [], profile: [] },
  showWorkout: false,
  showPreWorkout: false,
}
const listeners = new Set<() => void>()
const set = (patch: Partial<UIState>) => { ui = { ...ui, ...patch }; listeners.forEach((l) => l()) }

export function useUI(): UIState {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, () => ui)
}

export const nav = {
  tab(t: Tab) {
    // לחיצה על הטאב הפעיל מחזירה לראש המחסנית
    if (ui.tab === t) set({ stacks: { ...ui.stacks, [t]: [] } })
    else set({ tab: t })
    window.scrollTo(0, 0)
  },
  push(r: Route) {
    set({ stacks: { ...ui.stacks, [ui.tab]: [...ui.stacks[ui.tab], r] } })
    window.scrollTo(0, 0)
  },
  pop() {
    set({ stacks: { ...ui.stacks, [ui.tab]: ui.stacks[ui.tab].slice(0, -1) } })
  },
  openPreWorkout: () => set({ showPreWorkout: true }),
  closePreWorkout: () => set({ showPreWorkout: false }),
  beginWorkout: (id: string) => set({ activeSessionID: id, showWorkout: true, showPreWorkout: false }),
  showWorkout: (v: boolean) => set({ showWorkout: v }),
  endWorkout: () => set({ activeSessionID: undefined, showWorkout: false }),
}
