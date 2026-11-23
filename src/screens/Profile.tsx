import { useRef, useState } from 'react'
import { ArrowDownUp, Bell, CalendarPlus, Columns3, Download, Dumbbell, Flame, HardDrive, Info, ListChecks, MapPin, Plus, Settings2, Trash, Upload, User, Zap } from 'lucide-react'
import type { BodyArea, Equipment, ExperienceLevel, Goal, SplitType, TemplateSlot } from '../engine/types'
import { BODY_AREAS, EQUIPMENT, GOALS, LEVELS, SPLITS, bodyAreaHe, equipmentHe, goalHe, levelHe, patternHe, recommendedSplit, splitHe, uid } from '../engine/types'
import { catalog } from '../engine/catalog'
import { activeProgram, streakEntries, totalXPOf } from '../engine/finisher'
import { generateProgram, materializeProgram, nextTemplate } from '../engine/program'
import { ACHIEVEMENTS, categoryHe, computeStreak, levelInfo, levelProgress, levelTitle, TIERS } from '../engine/motivation'
import type { AchievementCategory } from '../engine/motivation'
import { fmtDayMonth, fmtGrouped, ltr } from '../engine/format'
import { commit, getData, replaceData, useData } from '../store'
import { nav } from '../uiState'
import { backupFileName, downloadBlob, exportBackup, importBackup, remindersICS, shareOrDownload } from '../backup'
import { Chip, ChevronBack, ChevronForward, Confirm, Empty, LevelBadge, NumberField, Ring, SelectCard, Sheet, SheetHeader, StatTile, Toggle, WeekdayPicker } from '../ui/kit'
import { achievementIcon, locationIcon } from '../ui/icons'
import { ExercisePicker } from './Pickers'

function Header({ title }: { title: string }) {
  return (
    <>
      <div className="navbar"><button className="icon-btn" onClick={nav.pop} aria-label="חזרה"><ChevronBack size={20} /></button></div>
      <h1 className="screen-title" style={{ marginTop: 0 }}>{title}</h1>
    </>
  )
}

export function ProfileScreen() {
  const data = useData()
  const p = data.profile!
  const level = levelInfo(totalXPOf(data))
  const streak = computeStreak(streakEntries(data.sessions), p.weeklyGoal)
  const unlocked = new Set(data.achievements.map((a) => a.id))
  const items: [string, typeof User, string][] = [
    ['program', ListChecks, 'התוכנית שלי'], ['locations', MapPin, 'מיקומים וציוד'], ['reminders', Bell, 'תזכורות'],
    ['personal', User, 'פרטים ומטרות'], ['backup', HardDrive, 'גיבוי ושחזור'],
  ]
  return (
    <div className="screen">
      <h1 className="screen-title">פרופיל</h1>
      <div className="card" style={{ alignItems: 'center', textAlign: 'center' }}>
        <Ring progress={levelProgress(level)} size={118} stroke={8}><LevelBadge level={level.level} size={86} /></Ring>
        <h2 className="title">{p.name || 'המתאמן/ת שלי'}</h2>
        <b className="lime num" style={{ fontSize: 17 }}>{levelTitle(level.level)}</b>
        <span className="caption">{level.xpForNext ? `עוד ${fmtGrouped(level.xpForNext - level.xpIntoLevel)} XP לרמה ${level.level + 1}` : 'הגעת לפסגה'}</span>
      </div>
      <div className="tiles">
        <StatTile title="אימונים" value={data.sessions.filter((s) => s.isCompleted).length} icon={Dumbbell} />
        <StatTile title="רצף שיא" value={streak.best} unit="שב׳" icon={Flame} accent="var(--flame)" />
        <StatTile title="XP" value={fmtGrouped(level.totalXP)} icon={Zap} />
      </div>
      <button className="card" style={{ textAlign: 'start' }} onClick={() => nav.push({ name: 'achievements' })}>
        <div className="row"><b className="headline grow">הישגים</b><span className="num lime" style={{ fontSize: 14 }}>{unlocked.size}/{ACHIEVEMENTS.length}</span><ChevronForward size={16} color="var(--text3)" /></div>
        <div className="row" style={{ gap: 8 }}>
          {ACHIEVEMENTS.filter((a) => unlocked.has(a.id)).slice(-6).map((a) => <AchIcon key={a.id} icon={a.icon} on size={44} />)}
          {!unlocked.size && <span className="caption">ההישג הראשון מחכה באימון הראשון.</span>}
        </div>
      </button>
      <div className="menu-list">
        {items.map(([route, Icon, title]) => (
          <button key={route} onClick={() => nav.push({ name: route })}>
            <span className="mi"><Icon size={16} strokeWidth={2.5} /></span>
            <b className="grow">{title}</b>
            <ChevronForward size={16} color="var(--text3)" />
          </button>
        ))}
      </div>
      <div className="card">
        <div className="row">
          <b className="grow">יעד שבועי</b>
          <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={() => { p.weeklyGoal = Math.max(2, p.weeklyGoal - 1); commit() }}>−</button>
          <span className="num" style={{ width: 90, textAlign: 'center' }}>{p.weeklyGoal} אימונים</span>
          <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={() => { p.weeklyGoal = Math.min(6, p.weeklyGoal + 1); commit() }}>+</button>
        </div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <b className="grow">אורך אימון רגיל</b>
          <div className="chips">{[30, 45, 60, 75].map((m) => <Chip key={m} title={`${m}`} on={p.preferredMinutes === m} onClick={() => { p.preferredMinutes = m; commit() }} />)}</div>
        </div>
        <Toggle label="טיימר מנוחה אוטומטי" on={p.restAutoStart} onChange={(v) => { p.restAutoStart = v; commit() }} />
        <Toggle label="צליל בסוף המנוחה" on={p.soundsOn} onChange={(v) => { p.soundsOn = v; commit() }} />
      </div>
      <span className="caption dim" style={{ textAlign: 'center' }}>APEX · כל הנתונים נשמרים רק על המכשיר הזה</span>
    </div>
  )
}

function AchIcon({ icon, on, size = 46 }: { icon: string; on: boolean; size?: number }) {
  const Icon = achievementIcon[icon] ?? Dumbbell
  return (
    <span style={{ width: size, height: size, borderRadius: size * 0.3, display: 'grid', placeItems: 'center', flex: 'none',
      background: on ? 'var(--lime-grad)' : 'var(--surface2)', boxShadow: on ? '0 0 8px rgba(198,255,61,.35)' : 'none' }}>
      <Icon size={size * 0.42} color={on ? '#000' : 'var(--text3)'} strokeWidth={2.4} />
    </span>
  )
}

export function AchievementsScreen() {
  const data = useData()
  const map = new Map(data.achievements.map((a) => [a.id, a.date]))
  const level = levelInfo(totalXPOf(data)).level
  return (
    <div className="screen">
      <Header title="הישגים" />
      <div className="card">
        <b className="headline">הדרגות</b>
        <div className="chips scroll">
          {TIERS.map((t) => {
            const reached = level >= t.from
            const cur = level >= t.from && level <= t.to
            return (
              <div key={t.name} className="col" style={{ gap: 4, alignItems: 'center', padding: '10px 14px', borderRadius: 14, flex: 'none',
                background: reached ? 'var(--lime)' : 'var(--surface2)', color: reached ? '#000' : 'var(--text2)', outline: cur ? '2px solid #fff' : 'none' }}>
                <b className="num" style={{ fontSize: 14 }}>{t.name}</b>
                <span className="num" style={{ fontSize: 11, opacity: 0.7 }}>{t.from === t.to ? t.from : ltr(`${t.from}–${t.to}`)}</span>
              </div>
            )
          })}
        </div>
      </div>
      {(Object.keys(categoryHe) as AchievementCategory[]).map((cat) => (
        <div key={cat} className="col">
          <b className="headline">{categoryHe[cat]}</b>
          <div className="tiles two">
            {ACHIEVEMENTS.filter((a) => a.category === cat).map((a) => {
              const date = map.get(a.id)
              return (
                <div key={a.id} className="tile" style={{ minHeight: 150, opacity: date ? 1 : 0.7, borderColor: date ? 'rgba(198,255,61,.4)' : undefined, gap: 8 }}>
                  <AchIcon icon={a.icon} on={!!date} />
                  <b style={{ fontSize: 15, color: date ? 'var(--text)' : 'var(--text2)' }}>{a.title}</b>
                  <span className="muted" style={{ fontSize: 12 }}>{a.detail}</span>
                  {date && <span className="lime" style={{ fontSize: 11, fontWeight: 700 }}>{fmtDayMonth(date)}</span>}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export function ProgramEditor() {
  const data = useData()
  const program = activeProgram(data)
  const [edit, setEdit] = useState<TemplateSlot | null>(null)
  const [rebuild, setRebuild] = useState(false)
  const loc = data.locations[0]
  return (
    <div className="screen">
      <Header title="התוכנית שלי" />
      {program ? <>
        <div className="col" style={{ gap: 4 }}>
          <b className="headline">{program.name}</b>
          <span className="lime caption">האימון הבא בתור: {nextTemplate(program)?.name}</span>
          {program.deloadWeekStart && <span className="caption" style={{ color: 'var(--warning)' }}>דילואד מתוכנן לשבוע של {fmtDayMonth(program.deloadWeekStart)}</span>}
        </div>
        {[...program.templates].sort((a, b) => a.order - b.order).map((t, ti) => (
          <div key={t.id} className="card">
            <div className="row">
              <b className="headline lime grow">{t.name}</b>
              {t.id !== nextTemplate(program)?.id && <button className="link-btn" style={{ color: 'var(--text2)', fontSize: 13 }} onClick={() => { program.nextIndex = ti; commit() }}>הבא בתור</button>}
            </div>
            {[...t.slots].sort((a, b) => a.order - b.order).map((s) => {
              const exName = loc && s.exerciseByLocation[loc.id] ? catalog().exercise(s.exerciseByLocation[loc.id])?.nameHe : undefined
              return (
                <button key={s.id} className="row" style={{ textAlign: 'start', padding: '4px 0' }} onClick={() => setEdit(s)}>
                  <div className="grow col" style={{ gap: 2 }}>
                    <b style={{ fontSize: 15 }}>{exName ?? patternHe[s.pattern]}</b>
                    <span className="muted" style={{ fontSize: 12 }}>{patternHe[s.pattern]}{s.priority === 1 ? ' · מרכזי' : ''}</span>
                  </div>
                  <span className="num muted" style={{ fontSize: 14 }}>{ltr(`${s.sets}×${s.repMin}–${s.repMax}`)}</span>
                  <Settings2 size={16} color="var(--text3)" />
                </button>
              )
            })}
          </div>
        ))}
        <button className="btn secondary" onClick={() => setRebuild(true)}><ArrowDownUp size={18} /> בנייה מחדש של התוכנית</button>
      </> : <>
        <Empty icon={ListChecks} title="אין תוכנית פעילה" message="אפשר לבנות תוכנית חדשה." />
        <button className="btn primary" onClick={() => setRebuild(true)}>בניית תוכנית</button>
      </>}
      {edit && <SlotEditor slot={edit} onClose={() => setEdit(null)} />}
      {rebuild && <Rebuild onClose={() => setRebuild(false)} />}
    </div>
  )
}

function Stepper({ label, value, set, min, max, step = 1 }: { label: string; value: number; set: (v: number) => void; min: number; max: number; step?: number }) {
  return (
    <div className="row">
      <span className="grow">{label}</span>
      <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={() => set(Math.max(min, value - step))}>−</button>
      <span className="num" style={{ width: 44, textAlign: 'center' }}>{value}</span>
      <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={() => set(Math.min(max, value + step))}>+</button>
    </div>
  )
}

function SlotEditor({ slot, onClose }: { slot: TemplateSlot; onClose: () => void }) {
  const data = useData()
  const [pickFor, setPickFor] = useState<string | null>(null)
  const up = (patch: Partial<TemplateSlot>) => { Object.assign(slot, patch); commit() }
  const loc = data.locations.find((l) => l.id === pickFor)
  return (
    <Sheet onClose={onClose} full>
      <SheetHeader title={patternHe[slot.pattern]} onClose={onClose} closeLabel="סיום" />
      <div className="card">
        <b className="caption">סטים וחזרות</b>
        <Stepper label="סטים" value={slot.sets} set={(v) => up({ sets: v })} min={1} max={8} />
        <Stepper label="מינימום חזרות" value={slot.repMin} set={(v) => up({ repMin: Math.min(v, slot.repMax) })} min={1} max={50} />
        <Stepper label="מקסימום חזרות" value={slot.repMax} set={(v) => up({ repMax: Math.max(v, slot.repMin) })} min={1} max={50} />
        <Stepper label="RIR יעד" value={slot.targetRIR} set={(v) => up({ targetRIR: v })} min={0} max={4} />
        <Stepper label="מנוחה (שנ׳)" value={slot.restSeconds} set={(v) => up({ restSeconds: v })} min={15} max={300} step={15} />
      </div>
      <div className="card">
        <b className="caption">תרגיל לכל מיקום</b>
        {data.locations.map((l) => {
          const Icon = locationIcon[l.icon] ?? MapPin
          return (
            <button key={l.id} className="row" style={{ textAlign: 'start' }} onClick={() => setPickFor(l.id)}>
              <Icon size={16} /> <b className="grow">{l.name}</b>
              <span className="muted ellipsis" style={{ maxWidth: '55%' }}>{slot.exerciseByLocation[l.id] ? catalog().exercise(slot.exerciseByLocation[l.id])?.nameHe : 'אוטומטי'}</span>
            </button>
          )
        })}
      </div>
      {loc && (
        <ExercisePicker title={loc.name} pattern={slot.pattern} equipment={new Set(loc.equipment)} limitations={new Set(data.profile?.limitations ?? [])}
                        currentID={slot.exerciseByLocation[loc.id]} onClose={() => setPickFor(null)}
                        onPick={(e) => { slot.exerciseByLocation[loc.id] = e.id; commit() }} />
      )}
    </Sheet>
  )
}

function Rebuild({ onClose }: { onClose: () => void }) {
  const data = getData()
  const p = data.profile!
  const [split, setSplit] = useState<SplitType>(recommendedSplit(p.weeklyGoal))
  const [goals, setGoals] = useState<Goal[]>(p.goals)
  const sub: Record<SplitType, string> = {
    fullBody: '2–3 אימונים בשבוע, כל הגוף בכל אימון', upperLower: '4 אימונים בשבוע, עליון ותחתון לסירוגין', pushPullLegs: '5–6 אימונים בשבוע, פיצול לפי תנועות',
  }
  const icons = { fullBody: Dumbbell, upperLower: ArrowDownUp, pushPullLegs: Columns3 }
  const go = () => {
    p.goals = GOALS.filter((g) => goals.includes(g))
    for (const pr of data.programs) pr.isActive = false
    data.programs.push(materializeProgram(generateProgram({ goals: new Set(goals), level: p.level, weeklyGoal: p.weeklyGoal, split })))
    commit(true)
    onClose()
  }
  return (
    <Sheet onClose={onClose} full>
      <SheetHeader title="תוכנית חדשה" onClose={onClose} closeLabel="ביטול" />
      <span className="muted">המאמן יבנה תוכנית חדשה. ההיסטוריה, השיאים וה־XP נשמרים.</span>
      <b className="headline">פיצול</b>
      {SPLITS.map((s) => <SelectCard key={s} title={splitHe[s]} subtitle={sub[s]} icon={icons[s]} on={split === s} onClick={() => setSplit(s)} />)}
      <b className="headline">מטרות</b>
      <div className="chips">{GOALS.map((g) => <Chip key={g} title={goalHe[g]} on={goals.includes(g)} onClick={() => setGoals(goals.includes(g) ? goals.filter((x) => x !== g) : [...goals, g])} />)}</div>
      <button className="btn primary" disabled={!goals.length} onClick={go}>בניית תוכנית חדשה</button>
    </Sheet>
  )
}

export function LocationsSettings() {
  const data = useData()
  const [name, setName] = useState('')
  const [del, setDel] = useState<string | null>(null)
  return (
    <div className="screen">
      <Header title="מיקומים וציוד" />
      {data.locations.sort((a, b) => a.sortOrder - b.sortOrder).map((l) => {
        const Icon = locationIcon[l.icon] ?? MapPin
        return (
          <div key={l.id} className="card">
            <div className="row"><Icon size={18} /><b className="headline grow">{l.name}</b><button onClick={() => setDel(l.id)} aria-label="מחיקה"><Trash size={18} color="var(--danger)" /></button></div>
            <div className="chips">
              {EQUIPMENT.map((e: Equipment) => (
                <Chip key={e} title={equipmentHe[e]} on={l.equipment.includes(e)}
                      onClick={() => { l.equipment = l.equipment.includes(e) ? l.equipment.filter((x) => x !== e) : [...l.equipment, e]; commit() }} />
              ))}
            </div>
            {!l.equipment.length && <span className="caption">בלי ציוד: רק תרגילי משקל גוף.</span>}
          </div>
        )
      })}
      <div className="row">
        <input className="text-input" placeholder="מיקום חדש (למשל: מלון)" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="icon-btn" style={{ width: 54, height: 54, borderRadius: 14, background: 'var(--lime)' }} disabled={!name.trim()}
                onClick={() => { data.locations.push({ id: uid(), name: name.trim(), icon: 'pin', equipment: [], sortOrder: data.locations.length }); setName(''); commit() }}>
          <Plus size={20} color="#000" strokeWidth={3} />
        </button>
      </div>
      {del && <Confirm title="למחוק את המיקום?" confirm="מחיקה" danger onCancel={() => setDel(null)}
                       onConfirm={() => { const d = getData(); d.locations = d.locations.filter((x) => x.id !== del); commit(); setDel(null) }} />}
    </div>
  )
}

export function RemindersSettings() {
  const data = useData()
  const r = data.reminders[0]
  const [days, setDays] = useState<number[]>(r?.weekdays ?? [])
  const [time, setTime] = useState(r ? `${String(r.hour).padStart(2, '0')}:${String(r.minute).padStart(2, '0')}` : '18:00')
  const save = () => {
    const [h, m] = time.split(':').map(Number)
    data.reminders = days.length ? [{ weekdays: days, hour: h, minute: m }] : []
    commit()
    if (days.length) downloadBlob(new Blob([remindersICS(days, h, m)], { type: 'text/calendar' }), 'APEX-reminders.ics')
  }
  return (
    <div className="screen">
      <Header title="תזכורות" />
      <div className="card" style={{ flexDirection: 'row', gap: 10 }}>
        <Info size={18} color="var(--lime)" style={{ flex: 'none', marginTop: 2 }} />
        <span className="muted" style={{ fontSize: 14 }}>
          אפליקציית ווב לא יכולה לשלוח תזכורות בשעה קבועה, ולכן התזכורות נוספות ליומן של האייפון כאירוע שבועי חוזר עם התראה.
          אחרי השמירה נפתח קובץ יומן, ובו לוחצים <b>הוספת הכול</b>.
        </span>
      </div>
      <b className="headline">ימים</b>
      <WeekdayPicker value={days} onChange={setDays} />
      <b className="headline">שעה</b>
      <input type="time" className="text-input num" style={{ textAlign: 'center', fontSize: 28 }} value={time} onChange={(e) => setTime(e.target.value)} />
      <button className="btn primary" disabled={!days.length} onClick={save}><CalendarPlus size={18} /> הוספה ליומן</button>
      <span className="caption">כדי לשנות או לבטל, עורכים את האירוע "אימון APEX" באפליקציית היומן.</span>
    </div>
  )
}

export function PersonalSettings() {
  const data = useData()
  const p = data.profile!
  const tog = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  return (
    <div className="screen">
      <Header title="פרטים ומטרות" />
      <input className="text-input" placeholder="שם" value={p.name} onChange={(e) => { p.name = e.target.value; commit() }} />
      <b className="headline">רמה</b>
      <div className="chips">{LEVELS.map((l: ExperienceLevel) => <Chip key={l} title={levelHe[l]} on={p.level === l} onClick={() => { p.level = l; commit() }} />)}</div>
      <b className="headline">מגבלות</b>
      <div className="chips">{BODY_AREAS.map((a: BodyArea) => <Chip key={a} title={bodyAreaHe[a]} on={p.limitations.includes(a)} onClick={() => { p.limitations = tog(p.limitations, a); commit() }} />)}</div>
      <NumberField title="גובה" value={p.heightCm} onChange={(v) => { p.heightCm = v; commit() }} unit="ס״מ" min={120} max={230} />
      <span className="caption">שינוי מטרות או פיצול נעשה ב״התוכנית שלי״, בכפתור ״בנייה מחדש״.</span>
    </div>
  )
}

export function BackupScreen() {
  const data = useData()
  const file = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string>()
  const [pending, setPending] = useState<string | null>(null)
  const doExport = async () => {
    try { await shareOrDownload(await exportBackup(data), backupFileName()); setMsg('הגיבוי מוכן.') } catch { setMsg('הייצוא נכשל.') }
  }
  const doImport = async () => {
    if (!pending) return
    try {
      const next = await importBackup(pending)
      if (next.profile) next.profile.onboardingDone = true
      replaceData(next)
      setMsg('השחזור הושלם.')
    } catch { setMsg('הקובץ לא נקרא כגיבוי תקין של APEX.') }
    setPending(null)
  }
  return (
    <div className="screen">
      <Header title="גיבוי ושחזור" />
      <div className="card">
        <b className="headline row"><Info size={18} color="var(--lime)" /> איפה הנתונים שלי?</b>
        <span className="muted" style={{ fontSize: 14 }}>
          כל הנתונים נשמרים רק במכשיר הזה, בתוך האפליקציה. אם מוחקים את האפליקציה ממסך הבית הם נמחקים איתה.
          לכן כדאי לייצא גיבוי מדי פעם ל-Files או ל-iCloud Drive. אפשר גם לשחזר גיבוי שיוצא מהאפליקציה הנייטיבית הקודמת.
        </span>
      </div>
      <button className="btn primary" onClick={() => void doExport()}><Upload size={18} /> ייצוא גיבוי</button>
      <button className="btn secondary" onClick={() => file.current?.click()}><Download size={18} /> שחזור מגיבוי</button>
      <input ref={file} type="file" accept="application/json,.json" hidden
             onChange={async (e) => { const f = e.target.files?.[0]; if (f) setPending(await f.text()); e.target.value = '' }} />
      {msg && <span className="lime" style={{ fontWeight: 600 }}>{msg}</span>}
      {pending && <Confirm title="לשחזר מהגיבוי?" message="כל הנתונים הנוכחיים באפליקציה יוחלפו בנתונים מהקובץ." confirm="שחזור ודריסת הנתונים" danger
                           onConfirm={() => void doImport()} onCancel={() => setPending(null)} />}
    </div>
  )
}
