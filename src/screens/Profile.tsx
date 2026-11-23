import { useMemo, useRef, useState } from 'react'
import { ArrowLeftRight, ArrowUp, Bell, CalendarPlus, Columns2, Columns3, Download, Dumbbell, Flame, HardDrive, Info, ListChecks, MapPin, Plus, Settings2, Sparkles, Star, Timer, Trash, Upload, User, Zap } from 'lucide-react'
import type { BodyArea, BodyPart, Equipment, ExperienceLevel, Goal, Program, SplitDesign, SplitKind, TemplateSlot, WorkoutTemplate } from '../engine/types'
import { BASIC_EQUIPMENT, BODY_AREAS, BODY_PARTS, GOALS, LEVELS, MULTI_TRAINER, STATIONS, bodyAreaHe, equipmentHe, goalHe, levelHe, partHe, partOfPattern, patternHe, uid } from '../engine/types'
import type { Exercise } from '../engine/catalog'
import { catalog, isTimed, partOf } from '../engine/catalog'
import { activeProgram, streakEntries, totalXPOf } from '../engine/finisher'
import { generateProgram, materializeProgram, nextTemplate, scheme } from '../engine/program'
import { dayName, defaultDesign, focusLabel, generateFromDesign, kindHe, kindSub, maxPerPart } from '../engine/split'
import { favoritesOf, restSettings, toggleFavorite, updateRest } from '../engine/prefs'
import { LOCATION_PRESETS, applyPreset, locationFromPreset } from '../engine/locations'
import { makeBuilder, templateSlots } from '../planning'
import { ACHIEVEMENTS, categoryHe, computeStreak, levelInfo, levelProgress, levelTitle, TIERS } from '../engine/motivation'
import type { AchievementCategory } from '../engine/motivation'
import { fmtDayMonth, fmtDuration, fmtGrouped, ltr } from '../engine/format'
import { commit, getData, replaceData, useData } from '../store'
import { nav } from '../uiState'
import { backupFileName, downloadBlob, exportBackup, importBackup, remindersICS, shareOrDownload } from '../backup'
import { Chip, ChevronBack, ChevronForward, Confirm, Empty, ExerciseThumb, LevelBadge, NumberField, Ring, SecondsStepper, Seg, SelectCard, Sheet, SheetHeader, StatTile, Tag, Toggle, WeekdayPicker } from '../ui/kit'
import { achievementIcon, locationIcon } from '../ui/icons'
import { equipmentCaption, ExercisePicker, FavStar, NoEquipmentHint } from './Pickers'

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
    ['program', ListChecks, 'התוכנית שלי'], ['favorites', Star, 'תרגילים מועדפים'], ['rest', Timer, 'זמני מנוחה'],
    ['locations', MapPin, 'מיקומים וציוד'], ['reminders', Bell, 'תזכורות'], ['personal', User, 'פרטים ומטרות'],
    ['backup', HardDrive, 'גיבוי ושחזור'],
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

export function ProgramEditor({ openBuilder }: { openBuilder?: boolean }) {
  const data = useData()
  const program = activeProgram(data)
  const profile = data.profile!
  const [locID, setLocID] = useState(profile.lastLocationID ?? data.locations[0]?.id)
  const location = data.locations.find((l) => l.id === locID) ?? data.locations[0]
  const [edit, setEdit] = useState<{ slot: TemplateSlot; template: WorkoutTemplate } | null>(null)
  const [swap, setSwap] = useState<{ slot: TemplateSlot; current?: Exercise } | null>(null)
  const [addTo, setAddTo] = useState<WorkoutTemplate | null>(null)
  const [build, setBuild] = useState(!!openBuilder || !program)
  const equipment = useMemo(() => new Set(location?.equipment ?? []), [location?.equipment]) // eslint-disable-line react-hooks/exhaustive-deps
  const limitations = new Set(profile.limitations)

  const addSlot = (t: WorkoutTemplate, e: Exercise) => {
    const part = partOf(e)
    const sorted = [...t.slots].sort((a, b) => a.order - b.order)
    let at = -1
    sorted.forEach((s, i) => { if ((s.part ?? partOfPattern(s.pattern)) === part && !s.flex) at = i })
    if (at < 0) at = sorted.findIndex((s) => s.flex) - 1
    if (at < -1) at = sorted.length - 1
    const bp = scheme(e.pattern, 2, 0, { goals: new Set(profile.goals), level: profile.level, weeklyGoal: profile.weeklyGoal })
    const slot: TemplateSlot = {
      id: uid(), order: 0, pattern: e.pattern, priority: bp.priority, variant: 0, sets: bp.sets, repMin: bp.repMin, repMax: bp.repMax,
      targetRIR: bp.rir, restSeconds: bp.rest, exerciseByLocation: location ? { [location.id]: e.id } : {}, part,
    }
    sorted.splice(at + 1, 0, slot)
    sorted.forEach((s, i) => { s.order = i })
    t.slots = sorted
    commit()
  }

  return (
    <div className="screen">
      <Header title="התוכנית שלי" />
      {program ? <>
        <div className="col" style={{ gap: 4 }}>
          <b className="headline">{program.name}</b>
          <span className="lime caption">האימון הבא בתור: {nextTemplate(program)?.name}</span>
          {program.deloadWeekStart && <span className="caption" style={{ color: 'var(--warning)' }}>דילואד מתוכנן לשבוע של {fmtDayMonth(program.deloadWeekStart)}</span>}
        </div>
        <button className="btn secondary" onClick={() => setBuild(true)}><Sparkles size={18} /> בניית תוכנית לפי אזורי גוף</button>
        <NoEquipmentHint location={location} onSettings={() => nav.push({ name: 'locations' })} />
        {data.locations.length > 1 && (
          <div className="col" style={{ gap: 8 }}>
            <span className="caption">התרגילים במיקום:</span>
            <div className="chips scroll">
              {data.locations.map((l) => <Chip key={l.id} title={l.name} icon={locationIcon[l.icon] ?? MapPin} on={l.id === location?.id} onClick={() => setLocID(l.id)} />)}
            </div>
          </div>
        )}
        {[...program.templates].sort((a, b) => a.order - b.order).map((t, ti) => (
          <TemplateCard key={t.id} program={program} template={t} index={ti} locationID={location?.id}
                        onEdit={(slot) => setEdit({ slot, template: t })} onSwap={(slot, current) => setSwap({ slot, current })}
                        onAdd={() => setAddTo(t)} />
        ))}
        <span className="caption">⭐ = מועדף. המאמן בוחר מועדפים קודם. ההחלפות נשמרות לכל מיקום בנפרד.</span>
      </> : <>
        <Empty icon={ListChecks} title="אין תוכנית פעילה" message="אפשר לבנות תוכנית חדשה לפי אזורי גוף." />
        <button className="btn primary" onClick={() => setBuild(true)}>בניית תוכנית</button>
      </>}
      {edit && <SlotEditor slot={edit.slot} onClose={() => setEdit(null)}
                           onRemove={() => { edit.template.slots = edit.template.slots.filter((s) => s.id !== edit.slot.id); commit(); setEdit(null) }} />}
      {swap && location && (
        <ExercisePicker title={`החלפה · ${location.name}`} pattern={swap.current?.pattern ?? swap.slot.pattern}
                        part={swap.slot.part ?? partOfPattern(swap.slot.pattern)} equipment={equipment} limitations={limitations}
                        currentID={swap.current?.id} onClose={() => setSwap(null)}
                        onPick={(e) => { swap.slot.exerciseByLocation[location.id] = e.id; commit() }} />
      )}
      {addTo && (
        <ExercisePicker title={`הוספה ל${addTo.name.split(' · ')[0]}`} equipment={equipment} limitations={limitations}
                        onClose={() => setAddTo(null)} onPick={(e) => addSlot(addTo, e)} />
      )}
      {build && <ProgramBuilder onClose={() => setBuild(false)} />}
    </div>
  )
}

function TemplateCard({ program, template: t, index, locationID, onEdit, onSwap, onAdd }: {
  program: Program; template: WorkoutTemplate; index: number; locationID?: string
  onEdit: (s: TemplateSlot) => void; onSwap: (s: TemplateSlot, current?: Exercise) => void; onAdd: () => void
}) {
  const data = useData()
  const location = data.locations.find((l) => l.id === locationID)
  const plan = makeBuilder(data, location).build(templateSlots(t, locationID), new Set(location?.equipment ?? []),
    new Set(data.profile?.limitations ?? []), 999, false)
  const bySlot = new Map(plan.exercises.map((p) => [p.slot.slotID, p]))
  const slots = [...t.slots].sort((a, b) => a.order - b.order)
  const partOfSlot = (s: TemplateSlot): BodyPart => s.part ?? partOfPattern(s.pattern)
  return (
    <div className="card">
      <div className="row">
        <b className="headline lime grow">{t.name}</b>
        {t.id !== nextTemplate(program)?.id
          ? <button className="link-btn" style={{ color: 'var(--text2)', fontSize: 13 }} onClick={() => { program.nextIndex = index; commit() }}>הבא בתור</button>
          : <Tag text="הבא בתור" filled />}
      </div>
      {slots.map((s, i) => {
        const p = bySlot.get(s.id)
        const showHeader = i === 0 || partOfSlot(slots[i - 1]) !== partOfSlot(s)
        return (
          <div key={s.id} className="col" style={{ gap: 6 }}>
            {showHeader && <b className="caption" style={{ fontWeight: 800, marginTop: i ? 6 : 0 }}>{partHe[partOfSlot(s)]}</b>}
            <div className="row" style={{ gap: 10 }}>
              <ExerciseThumb exercise={p?.exercise} size={42} />
              <button className="grow col" style={{ gap: 2, textAlign: 'start', minWidth: 0 }} onClick={() => onSwap(s, p?.exercise)}>
                <b style={{ fontSize: 15 }}>{p?.exercise.nameHe ?? 'אין תרגיל מתאים לציוד כאן'}</b>
                <span className="muted ellipsis" style={{ fontSize: 12 }}>
                  {ltr(`${s.sets}×${p?.slot.repMin ?? s.repMin}–${p?.slot.repMax ?? s.repMax}`)}{p && isTimed(p.exercise) ? ' שנ׳' : ''} · {focusLabel(s.focus) ?? patternHe[s.pattern]}{s.flex ? ' · אם יש זמן' : ''}
                </span>
              </button>
              {p && <FavStar id={p.exercise.id} size={34} />}
              <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => onSwap(s, p?.exercise)} aria-label="החלפה"><ArrowLeftRight size={15} color="var(--lime)" /></button>
              <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => onEdit(s)} aria-label="הגדרות"><Settings2 size={15} color="var(--text3)" /></button>
            </div>
          </div>
        )
      })}
      <button className="link-btn row" style={{ gap: 6, fontSize: 14 }} onClick={onAdd}><Plus size={16} /> הוספת תרגיל</button>
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

function SlotEditor({ slot, onClose, onRemove }: { slot: TemplateSlot; onClose: () => void; onRemove: () => void }) {
  const data = useData()
  const [pickFor, setPickFor] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const up = (patch: Partial<TemplateSlot>) => { Object.assign(slot, patch); commit() }
  const loc = data.locations.find((l) => l.id === pickFor)
  return (
    <Sheet onClose={onClose} full>
      <SheetHeader title={focusLabel(slot.focus) ?? patternHe[slot.pattern]} onClose={onClose} closeLabel="סיום" />
      <div className="card">
        <b className="caption">סטים וחזרות</b>
        <Stepper label="סטים" value={slot.sets} set={(v) => up({ sets: v })} min={1} max={8} />
        <Stepper label="מינימום חזרות" value={slot.repMin} set={(v) => up({ repMin: Math.min(v, slot.repMax) })} min={1} max={50} />
        <Stepper label="מקסימום חזרות" value={slot.repMax} set={(v) => up({ repMax: Math.max(v, slot.repMin) })} min={1} max={50} />
        <Stepper label="RIR יעד" value={slot.targetRIR} set={(v) => up({ targetRIR: v })} min={0} max={4} />
        <span className="caption">זמני המנוחה נקבעים בפרופיל, ב״זמני מנוחה״.</span>
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
      <button className="btn danger" onClick={() => setConfirmRemove(true)}><Trash size={18} /> הסרה מהתוכנית</button>
      {loc && (
        <ExercisePicker title={loc.name} pattern={slot.pattern} part={slot.part ?? partOfPattern(slot.pattern)} equipment={new Set(loc.equipment)}
                        limitations={new Set(data.profile?.limitations ?? [])}
                        currentID={slot.exerciseByLocation[loc.id]} onClose={() => setPickFor(null)}
                        onPick={(e) => { slot.exerciseByLocation[loc.id] = e.id; commit() }} />
      )}
      {confirmRemove && <Confirm title="להסיר את התרגיל מהתוכנית?" confirm="הסרה" danger onCancel={() => setConfirmRemove(false)} onConfirm={onRemove} />}
    </Sheet>
  )
}

/** בונה התוכנית: פול באדי / A-B / A-B-C, ואזורי גוף עם מספר תרגילים לכל אימון */
function ProgramBuilder({ onClose }: { onClose: () => void }) {
  const data = getData()
  const p = data.profile!
  const current = activeProgram(data)
  const [goals, setGoals] = useState<Goal[]>(p.goals)
  const [mode, setMode] = useState<SplitKind | 'coach'>(current?.design?.kind ?? 'ab')
  const [design, setDesign] = useState<SplitDesign>(current?.design ? structuredClone(current.design) : defaultDesign('ab', new Set(p.goals)))
  const upd = (f: (d: SplitDesign) => void) => setDesign((d) => { const n = structuredClone(d); f(n); return n })

  const choose = (k: SplitKind | 'coach') => {
    setMode(k)
    if (k !== 'coach') setDesign(current?.design?.kind === k ? structuredClone(current.design) : defaultDesign(k, new Set(goals)))
  }

  const go = () => {
    p.goals = GOALS.filter((g) => goals.includes(g))
    const input = { goals: new Set(goals), level: p.level, weeklyGoal: p.weeklyGoal }
    const program = materializeProgram(mode === 'coach' ? generateProgram(input) : generateFromDesign(design, input))
    // שומרים החלפות שנעשו בתוכנית הקודמת, כשאותו סוג תרגיל נשאר באותו אימון
    if (current) {
      program.templates.forEach((t, ti) => {
        const old = [...current.templates].sort((a, b) => a.order - b.order)[ti]
        if (!old) return
        for (const s of t.slots) {
          const match = old.slots.find((o) => o.focus && o.focus === s.focus)
          if (match) s.exerciseByLocation = { ...match.exerciseByLocation }
        }
      })
      if (current.templates.length === program.templates.length) program.nextIndex = current.nextIndex
    }
    for (const pr of data.programs) pr.isActive = false
    data.programs.push(program)
    commit(true)
    onClose()
  }

  const icons = { fullBody: Dumbbell, ab: Columns2, abc: Columns3, coach: Sparkles }
  const total = (i: number) => design.days[i].parts.reduce((a, x) => a + x.count, 0)

  return (
    <Sheet onClose={onClose} full>
      <SheetHeader title="בניית תוכנית" onClose={onClose} closeLabel="ביטול" />
      <span className="muted">בוחרים סוג תוכנית ואזורי גוף לכל אימון. המאמן בוחר תרגילים לפי הציוד והמועדפים, ואפשר להחליף כל תרגיל. ההיסטוריה, השיאים וה־XP נשמרים.</span>
      {(['fullBody', 'ab', 'abc'] as SplitKind[]).map((k) => (
        <SelectCard key={k} title={kindHe[k]} subtitle={kindSub[k]} icon={icons[k]} on={mode === k} onClick={() => choose(k)} />
      ))}
      <SelectCard title="המאמן יחליט" subtitle="פיצול לפי מספר האימונים בשבוע (גוף מלא, עליון/תחתון או דחיקה/משיכה/רגליים)" icon={icons.coach} on={mode === 'coach'} onClick={() => choose('coach')} />

      {mode !== 'coach' && <>
        <button className="link-btn" style={{ alignSelf: 'flex-start', fontSize: 14 }}
                onClick={() => setDesign(defaultDesign(mode, new Set(goals)))}>איפוס לתוכנית המומלצת של {kindHe[mode]}</button>
        {design.days.map((d, di) => (
          <div key={di} className="card">
            <div className="row">
              <b className="headline lime grow">{dayName(design, d, di)}</b>
              <span className="caption num">{total(di)} תרגילים</span>
              {design.kind === 'fullBody' && design.days.length > 1 && (
                <button aria-label="מחיקת אימון" onClick={() => upd((n) => { n.days.splice(di, 1) })}><Trash size={16} color="var(--danger)" /></button>
              )}
            </div>
            {d.parts.map((pp, pi) => (
              <div key={pp.part} className="row" style={{ gap: 8 }}>
                <button className="icon-btn" style={{ width: 30, height: 30, opacity: pi ? 1 : 0.3 }} disabled={!pi} aria-label="למעלה"
                        onClick={() => upd((n) => { const ps = n.days[di].parts; [ps[pi - 1], ps[pi]] = [ps[pi], ps[pi - 1]] })}>
                  <ArrowUp size={14} />
                </button>
                <b className="grow">{partHe[pp.part]}</b>
                <button className="icon-btn" style={{ width: 36, height: 36 }} aria-label="פחות"
                        onClick={() => upd((n) => { const x = n.days[di].parts[pi]; x.count--; if (x.count <= 0) n.days[di].parts.splice(pi, 1) })}>−</button>
                <span className="num" style={{ width: 70, textAlign: 'center', fontSize: 14 }}>{pp.count === 1 ? 'תרגיל 1' : `${pp.count} תרגילים`}</span>
                <button className="icon-btn" style={{ width: 36, height: 36 }} aria-label="יותר" disabled={pp.count >= maxPerPart(pp.part)}
                        onClick={() => upd((n) => { n.days[di].parts[pi].count++ })}>+</button>
              </div>
            ))}
            <div className="chips">
              {BODY_PARTS.filter((bp) => !d.parts.some((x) => x.part === bp)).map((bp) => (
                <Chip key={bp} title={`+ ${partHe[bp]}`} on={false} onClick={() => upd((n) => { n.days[di].parts.push({ part: bp, count: 1 }) })} />
              ))}
            </div>
          </div>
        ))}
        {design.kind === 'fullBody' && design.days.length < 3 && (
          <button className="btn secondary small" onClick={() => upd((n) => { n.days.push(structuredClone(n.days[n.days.length - 1])) })}>
            <Plus size={16} /> וריאציה נוספת (גוף מלא {design.days.length === 1 ? 'B' : 'C'})
          </button>
        )}
        <div className="card">
          <b className="headline">בטן</b>
          <span className="caption">נכנסת בסוף כל אימון כשיש זמן, ואפשר לוותר עליה לפני האימון.</span>
          <Seg value={String(design.absFlex)} options={[['0', 'בלי'], ['1', 'תרגיל 1'], ['2', '2 תרגילים'], ['3', '3 תרגילים']]}
               onChange={(v) => upd((n) => { n.absFlex = Number(v) })} />
          <Toggle label="פינישר אירובי בסוף (הליכון / כושר), אם יש זמן" on={design.finisher} onChange={(v) => upd((n) => { n.finisher = v })} />
        </div>
      </>}

      <b className="headline">מטרות</b>
      <div className="chips">{GOALS.map((g) => <Chip key={g} title={goalHe[g]} on={goals.includes(g)} onClick={() => setGoals(goals.includes(g) ? goals.filter((x) => x !== g) : [...goals, g])} />)}</div>
      <button className="btn primary" disabled={!goals.length || (mode !== 'coach' && design.days.some((_, i) => total(i) === 0))} onClick={go}>בניית התוכנית</button>
    </Sheet>
  )
}

export function LocationsSettings() {
  const data = useData()
  const [name, setName] = useState('')
  const [del, setDel] = useState<string | null>(null)
  const tog = (arr: Equipment[], e: Equipment) => (arr.includes(e) ? arr.filter((x) => x !== e) : [...arr, e])
  const hasPresetName = (n: string) => data.locations.some((l) => l.name === n)
  return (
    <div className="screen">
      <Header title="מיקומים וציוד" />
      {[...data.locations].sort((a, b) => a.sortOrder - b.sortOrder).map((l) => {
        const Icon = locationIcon[l.icon] ?? MapPin
        const stack = l.equipment.some((e) => STATIONS.includes(e) && e !== 'treadmill') || l.equipment.includes('cable') || l.equipment.includes('machine')
        const allMulti = MULTI_TRAINER.every((e) => l.equipment.includes(e))
        const lim = (patch: Partial<NonNullable<typeof l.limits>>) => { l.limits = { ...(l.limits ?? {}), ...patch }; commit() }
        return (
          <div key={l.id} className="card">
            <div className="row">
              <Icon size={18} style={{ flex: 'none' }} />
              <input className="text-input grow" style={{ fontSize: 17, fontWeight: 700, padding: '8px 10px' }} value={l.name} aria-label="שם המיקום"
                     onChange={(e) => { l.name = e.target.value; commit() }} />
              <button onClick={() => setDel(l.id)} aria-label="מחיקה"><Trash size={18} color="var(--danger)" /></button>
            </div>
            <span className="caption">מילוי מהיר</span>
            <div className="chips scroll">
              {LOCATION_PRESETS.map((pr) => (
                <Chip key={pr.key} title={pr.name} icon={locationIcon[pr.icon] ?? MapPin} on={false} onClick={() => { applyPreset(l, pr); commit() }} />
              ))}
            </div>
            <span className="caption">ציוד חופשי וחדר כושר מלא</span>
            <div className="chips">
              {BASIC_EQUIPMENT.map((e) => <Chip key={e} title={equipmentHe[e]} on={l.equipment.includes(e)} onClick={() => { l.equipment = tog(l.equipment, e); commit() }} />)}
            </div>
            <span className="caption">מולטי טריינר / מכונות ביתיות</span>
            <div className="chips">
              <Chip title="מולטי טריינר (הכול)" icon={Dumbbell} on={allMulti}
                    onClick={() => { l.equipment = allMulti ? l.equipment.filter((e) => !MULTI_TRAINER.includes(e)) : [...new Set([...l.equipment, ...MULTI_TRAINER])]; commit() }} />
              {STATIONS.map((e) => <Chip key={e} title={equipmentHe[e]} on={l.equipment.includes(e)} onClick={() => { l.equipment = tog(l.equipment, e); commit() }} />)}
            </div>
            {l.equipment.includes('dumbbell') && (
              <NumberField title="משקולות עד" value={l.limits?.dumbbellMax ?? 0} unit={l.limits?.dumbbellMax ? 'ק״ג' : 'בלי הגבלה'} step={1} min={0} max={80}
                           onChange={(v) => lim({ dumbbellMax: v || undefined })} />
            )}
            {stack && <>
              <NumberField title="פלטה במכונה" value={l.limits?.stackStep ?? 0} unit={l.limits?.stackStep ? 'ק״ג' : 'רגיל'} step={0.5} min={0} max={20}
                           onChange={(v) => lim({ stackStep: v || undefined })} />
              <NumberField title="מכונה עד" value={l.limits?.stackMax ?? 0} unit={l.limits?.stackMax ? 'ק״ג' : 'בלי הגבלה'} step={1} min={0} max={300}
                           onChange={(v) => lim({ stackMax: v || undefined })} />
            </>}
            {!l.equipment.length && <span className="caption">בלי ציוד: רק תרגילי משקל גוף.</span>}
          </div>
        )
      })}
      <b className="headline">הוספת מיקום</b>
      {LOCATION_PRESETS.filter((pr) => !hasPresetName(pr.name)).map((pr) => (
        <SelectCard key={pr.key} title={pr.name} subtitle={pr.subtitle} icon={locationIcon[pr.icon] ?? MapPin} on={false}
                    onClick={() => { data.locations.push(locationFromPreset(pr, data.locations.length)); commit() }} />
      ))}
      <div className="row">
        <input className="text-input" placeholder="מיקום אחר (למשל: מלון)" value={name} onChange={(e) => setName(e.target.value)} />
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

export function RestSettingsScreen() {
  const data = useData()
  const p = data.profile!
  const r = restSettings(p)
  const overrides = Object.entries(r.byExercise)
  return (
    <div className="screen">
      <Header title="זמני מנוחה" />
      <div className="card">
        <b className="headline">בין סט לסט</b>
        <Seg value={r.mode} options={[['auto', 'לפי המאמן'], ['fixed', 'זמן קבוע שלי']]} onChange={(v) => { updateRest(p, { mode: v }); commit() }} />
        {r.mode === 'auto'
          ? <span className="caption">תרגילים מרכזיים כבדים מקבלים יותר מנוחה (עד 2:30), תרגילי בידוד ובטן פחות (0:45–1:15).</span>
          : <SecondsStepper label="זמן" value={r.sets} onChange={(v) => { updateRest(p, { sets: v }); commit() }} />}
      </div>
      <div className="card">
        <b className="headline">בין תרגיל לתרגיל</b>
        <SecondsStepper label="זמן" value={r.exercises} onChange={(v) => { updateRest(p, { exercises: v }); commit() }} />
        <span className="caption">מתחילה אוטומטית אחרי הסט האחרון של כל תרגיל.</span>
      </div>
      {overrides.length > 0 && (
        <div className="card">
          <b className="headline">זמן מיוחד לתרגילים</b>
          {overrides.map(([id, sec]) => (
            <div key={id} className="row">
              <span className="grow ellipsis">{catalog().exercise(id)?.nameHe ?? id}</span>
              <span className="num" dir="ltr">{fmtDuration(sec)}</span>
              <button aria-label="מחיקה" onClick={() => { const n = restSettings(p); delete n.byExercise[id]; p.rest = n; commit() }}><Trash size={16} color="var(--danger)" /></button>
            </div>
          ))}
        </div>
      )}
      <div className="card">
        <Toggle label="טיימר מנוחה אוטומטי" on={p.restAutoStart} onChange={(v) => { p.restAutoStart = v; commit() }} />
        <Toggle label="צליל בסוף המנוחה" on={p.soundsOn} onChange={(v) => { p.soundsOn = v; commit() }} />
      </div>
      <span className="caption">אפשר לשנות גם באמצע אימון: לוחצים על "מנוחה" ליד התרגיל, ושם אפשר גם לקבוע זמן רק לתרגיל אחד.</span>
    </div>
  )
}

export function FavoritesScreen() {
  const data = useData()
  const [add, setAdd] = useState(false)
  const favs = favoritesOf(data)
  const list = [...favs].map((id) => catalog().exercise(id)).filter((e): e is Exercise => !!e)
  const allEquipment = new Set<Equipment>(data.locations.flatMap((l) => l.equipment))
  return (
    <div className="screen">
      <Header title="תרגילים מועדפים" />
      <div className="card" style={{ flexDirection: 'row', gap: 10 }}>
        <Star size={18} color="var(--lime)" fill="var(--lime)" style={{ flex: 'none', marginTop: 2 }} />
        <span className="muted" style={{ fontSize: 14 }}>
          המאמן בוחר מועדפים קודם, בכל פעם שהם מתאימים לסוג התרגיל ולציוד במיקום. מסמנים ⭐ בכל מקום: ברשימת התרגילים, באימון ובתוכנית.
        </span>
      </div>
      {!list.length && <Empty icon={Star} title="עוד אין מועדפים" message="מוסיפים תרגילים שאוהבים, והם יופיעו יותר באימונים." />}
      {BODY_PARTS.map((bp) => {
        const items = list.filter((e) => partOf(e) === bp)
        if (!items.length) return null
        return (
          <div key={bp} className="col" style={{ gap: 6 }}>
            <b className="caption lime" style={{ fontWeight: 800 }}>{partHe[bp]}</b>
            {items.map((e) => (
              <div key={e.id} className="list-row">
                <ExerciseThumb exercise={e} size={44} />
                <div className="grow col" style={{ gap: 2, minWidth: 0 }}>
                  <b style={{ fontSize: 15 }}>{e.nameHe}</b>
                  <span className="caption ellipsis">{equipmentCaption(e)}</span>
                </div>
                <FavStar id={e.id} />
              </div>
            ))}
          </div>
        )
      })}
      <button className="btn secondary" onClick={() => setAdd(true)}><Plus size={18} /> הוספת מועדפים</button>
      {add && <ExercisePicker title="הוספה למועדפים" equipment={allEquipment} onClose={() => setAdd(false)}
                              onPick={(e) => { if (!favs.has(e.id)) { toggleFavorite(getData(), e.id); commit() } }} />}
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
