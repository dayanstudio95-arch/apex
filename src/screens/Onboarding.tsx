import { useEffect, useState } from 'react'
import { Building, CalendarPlus, Check, CircleDashed, House, TreePine } from 'lucide-react'
import type { BodyArea, Equipment, ExperienceLevel, Goal, Program, Sex } from '../engine/types'
import { BODY_AREAS, EQUIPMENT, GOALS, LEVELS, bodyAreaHe, emptyData, equipmentHe, goalHe, goalSub, levelHe, levelSub, patternHe, recommendedSplit, splitHe, uid } from '../engine/types'
import { generateProgram, materializeProgram } from '../engine/program'
import { ltr } from '../engine/format'
import { getData, replaceData, commit } from '../store'
import { downloadBlob, remindersICS } from '../backup'
import { ApexLogo, Bar, BigStepper, ChevronBack, Chip, NumberField, SelectCard, Tag, WeekdayPicker } from '../ui/kit'
import { goalIcon, levelIcon } from '../ui/icons'

interface Draft {
  name: string
  goals: Goal[]
  level: ExperienceLevel
  weeklyGoal: number
  minutes: number
  gym: boolean
  home: boolean
  outside: boolean
  homeEquipment: Equipment[]
  limitations: BodyArea[]
  weight: number
  height: number
  birthYear: number
  sex: Sex
  reminderDays: number[]
  reminderTime: string
}

const TOTAL = 8

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [d, setD] = useState<Draft>({
    name: '', goals: ['muscle'], level: 'intermediate', weeklyGoal: 3, minutes: 60, gym: true, home: false, outside: false,
    homeEquipment: ['dumbbell', 'bench'], limitations: [], weight: 80, height: 175, birthYear: 1995, sex: 'male',
    reminderDays: [], reminderTime: '18:00',
  })
  const [built, setBuilt] = useState<Program | null>(null)
  const up = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }))
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  const canContinue = step === 1 ? d.goals.length > 0 : step === 4 ? d.gym || d.home || d.outside : true

  const next = () => {
    if (step < TOTAL - 1) { setStep(step + 1); window.scrollTo(0, 0); return }
    setBuilt(createEverything(d))
  }

  if (built) return <Building_ program={built} draft={d} />

  return (
    <div className="screen no-tabs" style={{ paddingBottom: 'calc(var(--safe-bottom) + 100px)' }}>
      {step > 0 && (
        <div className="row">
          <button className="icon-btn" onClick={() => setStep(step - 1)} aria-label="חזרה"><ChevronBack size={20} /></button>
          <div className="grow"><Bar progress={step / (TOTAL - 1)} height={6} /></div>
        </div>
      )}

      {step === 0 && (
        <div className="col" style={{ alignItems: 'center', textAlign: 'center', gap: 18, paddingTop: 50 }}>
          <ApexLogo size={92} />
          <div className="num lime" style={{ fontSize: 52, fontWeight: 900, textShadow: '0 0 20px rgba(198,255,61,.5)' }}>APEX</div>
          <b className="headline">הגרסה הכי חזקה שלך מתחילה כאן.</b>
          <span className="muted">תוכנית שמתאימה את עצמה, מעקב חכם ומאמן שלא מוותר.</span>
          <div className="col" style={{ width: '100%', textAlign: 'start', gap: 8, marginTop: 24 }}>
            <span className="caption">איך לקרוא לך?</span>
            <input className="text-input" placeholder="השם שלך" value={d.name} onChange={(e) => up({ name: e.target.value })} />
          </div>
        </div>
      )}

      {step === 1 && <>
        <Title t="מה המטרות שלך?" s="אפשר לבחור כמה. המאמן יאזן ביניהן בתוכנית." />
        {GOALS.map((g) => <SelectCard key={g} title={goalHe[g]} subtitle={goalSub[g]} icon={goalIcon[g]} on={d.goals.includes(g)} onClick={() => up({ goals: toggle(d.goals, g) })} />)}
      </>}

      {step === 2 && <>
        <Title t="מה רמת הניסיון?" s="קובע את נפח האימונים ואת קצב ההתקדמות." />
        {LEVELS.map((l) => <SelectCard key={l} title={levelHe[l]} subtitle={levelSub[l]} icon={levelIcon[l]} on={d.level === l} onClick={() => up({ level: l })} />)}
      </>}

      {step === 3 && <>
        <Title t="כמה אימונים בשבוע?" s="זה היעד המינימלי לרצף השבועי. לא צריך ימים קבועים, האימון הבא תמיד מחכה בתור." />
        <div className="card" style={{ alignItems: 'center' }}>
          <BigStepper value={d.weeklyGoal} onChange={(v) => up({ weeklyGoal: v })} min={2} max={6} unit="אימונים בשבוע" />
          <b className="lime" style={{ fontSize: 15 }}>תוכנית מומלצת: {splitHe[recommendedSplit(d.weeklyGoal)]}</b>
        </div>
        <b className="headline">אורך אימון רגיל</b>
        <div className="chips">{[30, 45, 60, 75].map((m) => <Chip key={m} title={`${m} דק׳`} on={d.minutes === m} onClick={() => up({ minutes: m })} />)}</div>
        <span className="caption">אפשר לשנות לפני כל אימון.</span>
      </>}

      {step === 4 && <>
        <Title t="איפה מתאמנים?" s="לפני כל אימון בוחרים מיקום, והתרגילים מותאמים לציוד שיש שם." />
        <SelectCard title="חדר כושר" subtitle="מוטות, מכונות, כבלים, כל הציוד" icon={Building} on={d.gym} onClick={() => up({ gym: !d.gym })} />
        <SelectCard title="בבית" subtitle="משקולות, גומיות, מתח או מה שיש" icon={House} on={d.home} onClick={() => up({ home: !d.home })} />
        {d.home && (
          <div className="card tight">
            <span className="caption">מה יש בבית?</span>
            <div className="chips">
              {(['dumbbell', 'bench', 'bands', 'pullupBar', 'kettlebell', 'barbell', 'rack'] as Equipment[]).map((e) =>
                <Chip key={e} title={equipmentHe[e]} on={d.homeEquipment.includes(e)} onClick={() => up({ homeEquipment: toggle(d.homeEquipment, e) })} />)}
            </div>
          </div>
        )}
        <SelectCard title="בחוץ / בלי ציוד" subtitle="משקל גוף בלבד, בכל מקום" icon={TreePine} on={d.outside} onClick={() => up({ outside: !d.outside })} />
      </>}

      {step === 5 && <>
        <Title t="יש פציעות או מגבלות?" s="תרגילים שמעמיסים על האזורים האלה לא ייבחרו. אפשר לשנות בהמשך." />
        <div className="chips">{BODY_AREAS.map((a) => <Chip key={a} title={bodyAreaHe[a]} on={d.limitations.includes(a)} onClick={() => up({ limitations: toggle(d.limitations, a) })} />)}</div>
        <div><Chip title="אין מגבלות" icon={Check} on={d.limitations.length === 0} onClick={() => up({ limitations: [] })} /></div>
      </>}

      {step === 6 && <>
        <Title t="קצת עליך" s="לגרפים, להישגים יחסיים למשקל הגוף ולהערכות." />
        <NumberField title="משקל" value={d.weight} onChange={(v) => up({ weight: v })} unit="ק״ג" step={0.5} min={35} max={250} />
        <NumberField title="גובה" value={d.height} onChange={(v) => up({ height: v })} unit="ס״מ" step={1} min={120} max={230} />
        <NumberField title="שנת לידה" value={d.birthYear} onChange={(v) => up({ birthYear: v })} unit="" step={1} min={1940} max={2015} />
        <div className="chips">{(['male', 'female'] as Sex[]).map((s) => <Chip key={s} title={s === 'male' ? 'זכר' : 'נקבה'} on={d.sex === s} onClick={() => up({ sex: s })} />)}</div>
      </>}

      {step === 7 && <>
        <Title t="תזכורות" s="באילו ימים ובאיזו שעה להזכיר? בסוף נוסיף את זה ליומן של האייפון, והוא יזכיר לבד." />
        <WeekdayPicker value={d.reminderDays} onChange={(v) => up({ reminderDays: v })} />
        <input type="time" className="text-input num" style={{ textAlign: 'center', fontSize: 28, opacity: d.reminderDays.length ? 1 : 0.4 }}
               value={d.reminderTime} disabled={!d.reminderDays.length} onChange={(e) => up({ reminderTime: e.target.value })} />
        <span className="caption">אפשר לדלג ולהגדיר אחר כך בפרופיל.</span>
      </>}

      <div style={{ position: 'fixed', insetInline: 16, bottom: 'calc(var(--safe-bottom) + 12px)' }}>
        <button className="btn primary" disabled={!canContinue} onClick={next}>
          {step === 0 ? 'בואו נתחיל' : step === TOTAL - 1 ? 'בניית התוכנית' : 'המשך'}
        </button>
      </div>
    </div>
  )
}

function Title({ t, s }: { t: string; s: string }) {
  return <div className="col" style={{ gap: 8 }}><h1 className="title">{t}</h1><span className="muted">{s}</span></div>
}

function createEverything(d: Draft): Program {
  const data = getData().profile ? emptyData() : getData()
  const now = new Date()
  const locations = []
  if (d.gym) locations.push({ id: uid(), name: 'חדר כושר', icon: 'gym', equipment: [...EQUIPMENT], sortOrder: locations.length })
  if (d.home) locations.push({ id: uid(), name: 'בית', icon: 'home', equipment: EQUIPMENT.filter((e) => d.homeEquipment.includes(e)), sortOrder: locations.length })
  if (d.outside) locations.push({ id: uid(), name: 'בחוץ', icon: 'outside', equipment: [] as Equipment[], sortOrder: locations.length })
  data.locations = locations
  data.profile = {
    name: d.name.trim(), birthYear: d.birthYear, heightCm: d.height, sex: d.sex, goals: GOALS.filter((g) => d.goals.includes(g)),
    level: d.level, weeklyGoal: d.weeklyGoal, preferredMinutes: d.minutes, limitations: d.limitations, soundsOn: true,
    restAutoStart: true, onboardingDone: false, lastLocationID: locations[0]?.id, createdAt: now.toISOString(),
  }
  data.metrics.push({ id: uid(), date: now.toISOString(), weight: d.weight })
  if (d.reminderDays.length) {
    const [h, m] = d.reminderTime.split(':').map(Number)
    data.reminders = [{ weekdays: d.reminderDays, hour: h, minute: m }]
  }
  const program = materializeProgram(generateProgram({ goals: new Set(d.goals), level: d.level, weeklyGoal: d.weeklyGoal }), now)
  data.programs = [program]
  replaceData(data)
  return program
}

/** מסך "המאמן בונה לך תוכנית" ותצוגה של התוכנית */
function Building_({ program, draft }: { program: Program; draft: Draft }) {
  const lines = ['מנתח מטרות ורמה', 'בוחר פיצול שבועי', 'מתאים דפוסי תנועה לציוד', 'מכייל טווחי חזרות ומנוחה']
  const [phase, setPhase] = useState(0)
  useEffect(() => {
    if (phase >= lines.length) return
    const t = setTimeout(() => setPhase((p) => p + 1), 650)
    return () => clearTimeout(t)
  }, [phase, lines.length])

  const finish = () => {
    const data = getData()
    if (data.profile) data.profile.onboardingDone = true
    commit(true)
  }

  const addToCalendar = () => {
    const [h, m] = draft.reminderTime.split(':').map(Number)
    downloadBlob(new Blob([remindersICS(draft.reminderDays, h, m)], { type: 'text/calendar' }), 'APEX-reminders.ics')
  }

  if (phase < lines.length) {
    return (
      <div className="screen no-tabs" style={{ justifyContent: 'center', alignItems: 'center', gap: 24 }}>
        <div style={{ position: 'relative', width: 120, height: 120, display: 'grid', placeItems: 'center' }}>
          <svg width="120" height="120" style={{ position: 'absolute', animation: 'spin 1s linear infinite' }}>
            <circle cx="60" cy="60" r="54" stroke="var(--surface2)" strokeWidth="8" fill="none" />
            <circle cx="60" cy="60" r="54" stroke="var(--lime)" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray="100 400" />
          </svg>
          <ApexLogo size={48} />
        </div>
        <h1 className="title">המאמן בונה לך תוכנית</h1>
        <div className="col" style={{ gap: 12 }}>
          {lines.map((l, i) => (
            <div key={l} className="row" style={{ color: i < phase ? 'var(--text)' : 'var(--text3)', fontWeight: 500 }}>
              {i < phase ? <Check size={18} color="var(--lime)" strokeWidth={3} /> : <CircleDashed size={18} />} {l}
            </div>
          ))}
        </div>
        <style>{'@keyframes spin { to { transform: rotate(360deg) } }'}</style>
      </div>
    )
  }

  return (
    <div className="screen no-tabs" style={{ paddingBottom: 'calc(var(--safe-bottom) + 100px)' }}>
      <div className="col" style={{ gap: 6 }}>
        <div><Tag text="התוכנית מוכנה" filled /></div>
        <h1 className="title">{program.name}</h1>
        <span className="muted">{program.templates.length} אימונים בסבב. האימון הבא תמיד מחכה בתור, בלי ימים קבועים.</span>
      </div>
      {program.templates.map((t) => (
        <div key={t.id} className="card">
          <b className="headline lime">{t.name}</b>
          {t.slots.map((s) => (
            <div key={s.id} className="row" style={{ fontSize: 15 }}>
              <span className="grow">{patternHe[s.pattern]}</span>
              <span className="num muted" style={{ fontSize: 15 }}>{ltr(`${s.sets}×${s.repMin}–${s.repMax}`)}</span>
            </div>
          ))}
        </div>
      ))}
      {draft.reminderDays.length > 0 && (
        <button className="btn secondary" onClick={addToCalendar}><CalendarPlus size={20} /> הוספת התזכורות ליומן</button>
      )}
      <span className="caption">התרגילים עצמם נבחרים לפי המיקום והציוד בכל אימון.</span>
      <div style={{ position: 'fixed', insetInline: 16, bottom: 'calc(var(--safe-bottom) + 12px)' }}>
        <button className="btn primary" onClick={finish}>יאללה, מתחילים</button>
      </div>
    </div>
  )
}
