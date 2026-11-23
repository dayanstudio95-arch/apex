import { Clock, List, Play, Quote, Share, ShieldCheck, Shield, SquarePlus, Trophy, TriangleAlert, BadgeCheck, Flame, Check, Sparkles, X } from 'lucide-react'
import { commit, useData } from '../store'
import { nav, useUI } from '../uiState'
import { activeProgram, isDeloadWeek, realPRs, streakEntries, totalXPOf } from '../engine/finisher'
import { sessionDuration, sessionVolume } from '../engine/history'
import { computeStreak, levelInfo, levelProgress, levelTitle, weekProgress } from '../engine/motivation'
import { nextTemplate } from '../engine/program'
import { makeBuilder, templateSlots } from '../planning'
import { fmtDayMonth, fmtFullDate, fmtGrouped, fmtKg, fmtMinutes, fmtVolume, fmtWeight, ltr, plus, startOfWeek, WEEKDAY_LETTERS } from '../engine/format'
import { greeting, todayLine } from '../engine/coach'
import { prKindHe } from '../engine/types'
import { ApexLogo, Bar, Card, ChevronForward, LevelBadge, Ring, Tag } from '../ui/kit'
import { locationIcon } from '../ui/icons'

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

export default function Today() {
  const data = useData()
  const ui = useUI()
  const profile = data.profile!
  const done = data.sessions.filter((s) => s.isCompleted).sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  const streak = computeStreak(streakEntries(done), profile.weeklyGoal)
  const level = levelInfo(totalXPOf(data))
  const program = activeProgram(data)
  const deload = isDeloadWeek(program)
  const daysSince = done[0] ? Math.floor((Date.now() - new Date(done[0].startedAt).getTime()) / 86_400_000) : undefined
  const line = todayLine({ totalWorkouts: done.length, daysSinceLast: daysSince, thisWeekCount: streak.thisWeekCount,
    weeklyGoal: streak.thisWeekGoal, atRisk: streak.atRisk, isDeload: deload })

  const weekStart = startOfWeek(new Date())
  const trainedDays = new Set(done.filter((s) => new Date(s.startedAt) >= weekStart).map((s) => new Date(s.startedAt).getDay() + 1))
  const today = new Date().getDay() + 1

  const template = program ? nextTemplate(program) : undefined
  const location = data.locations.find((l) => l.id === profile.lastLocationID) ?? data.locations[0]
  const preview = template
    ? makeBuilder(data, location).build(templateSlots(template, location?.id),
      new Set(location?.equipment ?? []), new Set(profile.limitations), profile.preferredMinutes, deload)
    : undefined
  const NEWS = 'split-builder-1'
  const showNews = !(profile.seenNews ?? []).includes(NEWS) && !program?.design
  const dismissNews = () => { profile.seenNews = [...(profile.seenNews ?? []), NEWS]; commit() }

  const prs = realPRs(data.records).slice(0, 3)
  const last = done[0]
  const LocIcon = location ? locationIcon[location.icon] ?? locationIcon.pin : undefined

  return (
    <div className="screen">
      <div className="col" style={{ gap: 10, paddingTop: 6 }}>
        <div className="row">
          <div className="grow col" style={{ gap: 2 }}>
            <span className="caption">{fmtFullDate(new Date())}</span>
            <h1 className="title ellipsis">{profile.name ? `${greeting()}, ${profile.name}` : greeting()}</h1>
          </div>
          <ApexLogo size={30} />
        </div>
        <div className="coach"><Quote size={16} color="var(--lime)" style={{ flex: 'none', marginTop: 2 }} /><span>{line}</span></div>
      </div>

      {!isStandalone() && (
        <div className="card install-hint">
          <b className="row"><SquarePlus size={18} color="var(--lime)" /> כדי שזה ירגיש כמו אפליקציה</b>
          <span className="muted" style={{ fontSize: 14 }}>
            ב-Safari לוחצים על <Share size={14} style={{ verticalAlign: -2 }} /> שיתוף, ואז על <b>הוספה למסך הבית</b>. מאז APEX נפתחת ממסך הבית, במסך מלא, וגם בלי אינטרנט.
          </span>
        </div>
      )}

      {showNews && (
        <div className="card hl" style={{ gap: 10 }}>
          <div className="row">
            <Sparkles size={18} color="var(--lime)" />
            <b className="grow">חדש: תוכנית לפי אזורי גוף</b>
            <button aria-label="סגירה" onClick={dismissNews}><X size={18} color="var(--text3)" /></button>
          </div>
          <span className="muted" style={{ fontSize: 14 }}>
            פול באדי, A-B או A-B-C, עם מספר תרגילים לכל אזור. אפשר גם לסמן ⭐ תרגילים מועדפים, לקבוע זמני מנוחה,
            ולהוסיף את חדר הכושר בבניין (משקולות עד 24 ק״ג ומולטי טריינר) ב״מיקומים וציוד״.
          </span>
          <button className="btn primary small" onClick={() => { dismissNews(); nav.tab('profile'); nav.push({ name: 'program', params: { build: '1' } }) }}>לבניית התוכנית</button>
        </div>
      )}

      {ui.activeSessionID && (
        <Card hl onClick={() => nav.showWorkout(true)}>
          <div className="row">
            <span style={{ width: 10, height: 10, borderRadius: 5, background: 'var(--lime)', boxShadow: '0 0 6px var(--lime)' }} />
            <b className="grow">אימון בתהליך</b>
            <b className="lime">חזרה לאימון</b>
            <ChevronForward size={18} color="var(--lime)" />
          </div>
        </Card>
      )}

      <div className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
        <Ring progress={weekProgress(streak)} size={96} stroke={11}>
          <div className="col" style={{ alignItems: 'center', gap: 0 }}>
            <span className="num" style={{ fontSize: 24 }}>{streak.thisWeekCount}/{streak.thisWeekGoal}</span>
            <span style={{ fontSize: 11, fontWeight: 600 }} className="muted">השבוע</span>
          </div>
        </Ring>
        <div className="grow col" style={{ gap: 10 }}>
          <div className="row" style={{ gap: 6 }}>
            <Flame size={20} color={streak.current > 0 ? 'var(--flame)' : 'var(--text3)'} fill={streak.current > 0 ? 'var(--flame)' : 'none'} />
            <span className="num" style={{ fontSize: 26 }}>{streak.current}</span>
            <span className="muted" style={{ fontSize: 14, fontWeight: 600 }}>{streak.current === 1 ? 'שבוע ברצף' : 'שבועות ברצף'}</span>
            <span className="spacer" />
            {Array.from({ length: streak.shields }, (_, i) => <Shield key={i} size={14} color="var(--lime)" fill="var(--lime)" />)}
          </div>
          <div className="row" style={{ gap: 4 }}>
            {WEEKDAY_LETTERS.map((l, i) => {
              const d = i + 1
              const on = trainedDays.has(d)
              return (
                <div key={l} className="col" style={{ alignItems: 'center', gap: 4, flex: 1 }}>
                  <span style={{ width: 22, height: 22, borderRadius: 11, display: 'grid', placeItems: 'center',
                    background: on ? 'var(--lime)' : 'var(--surface2)', outline: d === today ? '1.5px solid var(--lime)' : 'none' }}>
                    {on && <Check size={11} strokeWidth={4} color="#000" />}
                  </span>
                  <span className="muted" style={{ fontSize: 10, fontWeight: 600 }}>{l}</span>
                </div>
              )
            })}
          </div>
          {streak.atRisk && <span className="row" style={{ gap: 5, color: 'var(--warning)', fontSize: 12, fontWeight: 700 }}><TriangleAlert size={13} /> הרצף בסכנה השבוע</span>}
          {!streak.atRisk && streak.thisWeekCount >= streak.thisWeekGoal && <span className="row lime" style={{ gap: 5, fontSize: 12, fontWeight: 700 }}><BadgeCheck size={13} /> היעד השבועי הושג</span>}
        </div>
      </div>

      <Card tight onClick={() => { nav.tab('profile'); nav.push({ name: 'achievements' }) }}>
        <div className="row" style={{ gap: 14 }}>
          <LevelBadge level={level.level} size={52} />
          <div className="grow col" style={{ gap: 7 }}>
            <div className="row">
              <b className="grow" style={{ fontFamily: 'var(--round)', fontSize: 17, fontWeight: 900 }}>{levelTitle(level.level)}</b>
              <span className="num muted" style={{ fontSize: 12 }}>{level.xpForNext ? `${fmtGrouped(level.xpIntoLevel)} / ${fmtGrouped(level.xpForNext)} XP` : 'רמה מקסימלית'}</span>
            </div>
            <Bar progress={levelProgress(level)} height={9} />
          </div>
        </div>
      </Card>

      {program && template && (
        <div className="card hl">
          <div className="row">
            <Tag text="האימון הבא" filled />
            {deload && <Tag text="שבוע דילואד" warn />}
            <span className="spacer" />
            {location && LocIcon && <span className="row muted" style={{ gap: 5, fontSize: 13, fontWeight: 600 }}><LocIcon size={14} /> {location.name}</span>}
          </div>
          <div className="num" style={{ fontSize: 30, fontWeight: 900 }}>{template.name}</div>
          {preview && <>
            <div className="row muted" style={{ gap: 16, fontSize: 14, fontWeight: 600 }}>
              <span className="row" style={{ gap: 5 }}><List size={15} /> {preview.exercises.length} תרגילים</span>
              <span className="row" style={{ gap: 5 }}><Clock size={15} /> ~{Math.round(preview.estimatedSeconds / 60)} דק׳</span>
            </div>
            <div className="col" style={{ gap: 8 }}>
              {preview.exercises.slice(0, 4).map((p) => (
                <div key={p.key} className="row" style={{ gap: 10 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: p.slot.priority === 1 ? 'var(--lime)' : 'var(--text3)', flex: 'none' }} />
                  <span className="grow ellipsis" style={{ fontSize: 15, fontWeight: 500 }}>{p.exercise.nameHe}</span>
                  <span className="num muted" style={{ fontSize: 14 }}>
                    {ltr(`${p.workSets}×${p.reps}`)}{p.weight > 0 ? ` · ${fmtKg(p.weight)}` : ''}
                  </span>
                </div>
              ))}
              {preview.exercises.length > 4 && <span className="caption dim">ועוד {preview.exercises.length - 4}…</span>}
            </div>
          </>}
          <button className="btn primary" disabled={!!ui.activeSessionID} onClick={nav.openPreWorkout}>
            <Play size={18} fill="#000" /> התחלת אימון
          </button>
        </div>
      )}

      {last && (
        <Card onClick={() => { nav.tab('history'); nav.push({ name: 'session', params: { id: last.id } }) }}>
          <div className="row"><b className="headline grow">האימון האחרון</b><span className="caption">{fmtDayMonth(last.startedAt)}</span></div>
          <div className="row" style={{ alignItems: 'flex-start' }}>
            {[[last.templateName, 'אימון'], [fmtMinutes(sessionDuration(last)), 'משך'], [fmtVolume(sessionVolume(last)), 'נפח'], [plus(last.xpEarned), 'XP']].map(([v, l]) => (
              <div key={l} className="grow col" style={{ gap: 3 }}>
                <span className="num ellipsis" style={{ fontSize: 15 }}>{v}</span>
                <span className="muted" style={{ fontSize: 11, fontWeight: 600 }}>{l}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {prs.length > 0 && (
        <div className="card">
          <b className="headline">שיאים אחרונים</b>
          {prs.map((r) => (
            <div key={r.id} className="row" style={{ gap: 12 }}>
              <span style={{ width: 34, height: 34, borderRadius: 17, background: 'var(--lime-dim)', display: 'grid', placeItems: 'center', flex: 'none' }}><Trophy size={16} color="var(--lime)" /></span>
              <div className="grow col" style={{ gap: 2 }}>
                <b className="ellipsis" style={{ fontSize: 15 }}>{r.exerciseName}</b>
                <span className="caption">{prKindHe[r.kind]}</span>
              </div>
              <span className="num lime" style={{ fontSize: 16 }}>{r.kind === 'maxReps' ? `${r.reps} חזרות` : ltr(`${fmtWeight(r.weight)}×${r.reps}`)}</span>
            </div>
          ))}
        </div>
      )}
      {done.length === 0 && <span className="caption" style={{ textAlign: 'center' }}><ShieldCheck size={13} style={{ verticalAlign: -2 }} /> כל הנתונים נשמרים רק על המכשיר הזה</span>}
    </div>
  )
}
