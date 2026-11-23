import { useEffect, useState } from 'react'
import { ChartLine, Calendar, Flame, CircleUser } from 'lucide-react'
import { loadCatalog } from './engine/catalog'
import { activeProgram, refreshCycle } from './engine/finisher'
import { commit, getData, loadData, useData } from './store'
import { nav, useUI } from './uiState'
import type { Tab } from './uiState'
import { setTimerSound, unlockAudio } from './timer'
import { ApexLogo } from './ui/kit'
import Onboarding from './screens/Onboarding'
import Today from './screens/Today'
import PreWorkout from './screens/PreWorkout'
import ActiveWorkout from './screens/ActiveWorkout'
import { HistoryScreen, SessionDetail } from './screens/History'
import ProgressScreen from './screens/Progress'
import { ProfileScreen, AchievementsScreen, ProgramEditor, LocationsSettings, RemindersSettings, PersonalSettings, BackupScreen, RestSettingsScreen, FavoritesScreen } from './screens/Profile'

const TABS: [Tab, string, typeof Flame][] = [
  ['today', 'היום', Flame], ['history', 'היסטוריה', Calendar], ['progress', 'התקדמות', ChartLine], ['profile', 'פרופיל', CircleUser],
]

export default function App() {
  const [ready, setReady] = useState(false)
  const data = useData()
  const ui = useUI()

  useEffect(() => {
    void (async () => {
      await Promise.all([loadCatalog(), loadData()])
      const d = getData()
      const program = activeProgram(d)
      if (program) { refreshCycle(program); commit() }
      // חזרה לאימון שלא הסתיים
      const open = d.sessions.filter((s) => !s.isCompleted).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]
      if (open) nav.beginWorkout(open.id)
      setReady(true)
    })()
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  useEffect(() => { setTimerSound(data.profile?.soundsOn ?? true) }, [data.profile?.soundsOn])

  if (!ready) {
    return <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}><ApexLogo size={72} /></div>
  }

  if (!data.profile?.onboardingDone) return <Onboarding />

  const route = ui.stacks[ui.tab].at(-1)
  let page
  if (route) {
    const p = route.params ?? {}
    switch (route.name) {
      case 'session': page = <SessionDetail id={p.id} />; break
      case 'achievements': page = <AchievementsScreen />; break
      case 'program': page = <ProgramEditor openBuilder={p.build === '1'} />; break
      case 'rest': page = <RestSettingsScreen />; break
      case 'favorites': page = <FavoritesScreen />; break
      case 'locations': page = <LocationsSettings />; break
      case 'reminders': page = <RemindersSettings />; break
      case 'personal': page = <PersonalSettings />; break
      case 'backup': page = <BackupScreen />; break
    }
  }
  if (!page) {
    page = ui.tab === 'today' ? <Today /> : ui.tab === 'history' ? <HistoryScreen /> : ui.tab === 'progress' ? <ProgressScreen /> : <ProfileScreen />
  }

  const active = ui.activeSessionID ? data.sessions.find((s) => s.id === ui.activeSessionID) : undefined

  return (
    <>
      {page}
      <nav className="tabbar">
        {TABS.map(([t, label, Icon]) => (
          <button key={t} className={ui.tab === t ? 'on' : ''} onClick={() => nav.tab(t)}>
            <Icon size={22} strokeWidth={2.3} />
            {label}
          </button>
        ))}
      </nav>
      {ui.showPreWorkout && <PreWorkout />}
      {ui.showWorkout && active && <ActiveWorkout session={active} />}
    </>
  )
}
