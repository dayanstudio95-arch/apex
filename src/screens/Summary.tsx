import { useEffect, useState } from 'react'
import { ArrowUpRight, Check, Clock, Flame, Layers, Quote, Share2, Trophy, Weight, Zap } from 'lucide-react'
import type { FinishResult } from '../engine/finisher'
import { prDelta, prLabel, totalXP } from '../engine/finisher'
import { levelProgress, levelTitle } from '../engine/motivation'
import { levelUpLine } from '../engine/coach'
import { sessionDuration, sessionVolume, sessionWorkSets } from '../engine/history'
import { fmtDayMonth, fmtDuration, fmtFullDate, fmtMinutes, fmtVolume, plus } from '../engine/format'
import { shareOrDownload } from '../backup'
import { Bar, LevelBadge, Ring, StatTile } from '../ui/kit'
import { achievementIcon } from '../ui/icons'
import { Confetti } from '../ui/Confetti'

export default function Summary({ result, onDone }: { result: FinishResult; onDone: () => void }) {
  const s = result.session
  const [confetti, setConfetti] = useState(0)
  const [xp, setXp] = useState(0)
  const [bar, setBar] = useState(levelProgress(result.levelBefore))
  const [lvl, setLvl] = useState(result.levelBefore.level)
  const [levelUp, setLevelUp] = useState(false)
  const [heroIn, setHeroIn] = useState(false)
  const total = totalXP(result)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    const at = (ms: number, f: () => void) => timers.push(setTimeout(f, ms))
    at(150, () => setHeroIn(true))
    at(600, () => { if (result.prs.length || result.weeklyGoalHit || result.levelAfter.level > result.levelBefore.level) setConfetti((c) => c + 1) })
    for (let i = 1; i <= 24; i++) at(600 + i * 35, () => setXp(Math.round((total * i) / 24)))
    if (result.levelAfter.level > result.levelBefore.level) {
      at(1500, () => setBar(1))
      at(2300, () => { setLvl(result.levelAfter.level); setBar(0); setLevelUp(true); setConfetti((c) => c + 1) })
      at(2500, () => setBar(levelProgress(result.levelAfter)))
    } else at(1500, () => setBar(levelProgress(result.levelAfter)))
    return () => timers.forEach(clearTimeout)
  }, [result, total])

  return (
    <div className="screen no-tabs">
      <div className="col" style={{ alignItems: 'center', textAlign: 'center', gap: 12, paddingTop: 20 }}>
        <div style={{ width: 120, height: 120, borderRadius: 60, background: 'var(--lime-dim)', display: 'grid', placeItems: 'center',
          transform: heroIn ? 'scale(1)' : 'scale(0.4)', transition: 'transform .5s cubic-bezier(.3,1.6,.5,1)' }}>
          <div style={{ width: 84, height: 84, borderRadius: 42, background: 'var(--lime-grad)', display: 'grid', placeItems: 'center', boxShadow: '0 0 20px rgba(198,255,61,.6)' }}>
            <Check size={40} color="#000" strokeWidth={4} />
          </div>
        </div>
        <h1 className="num" style={{ fontSize: 32, fontWeight: 900, margin: 0 }}>{s.isDeload ? 'אימון דילואד הושלם' : 'אימון הושלם'}</h1>
        <span className="caption">{s.templateName} · {fmtFullDate(s.startedAt)}</span>
        {result.weeklyGoalHit && (
          <span className="row" style={{ gap: 6, color: 'var(--flame)', background: 'rgba(255,138,31,.15)', padding: '6px 12px', borderRadius: 999, fontSize: 14, fontWeight: 700 }}>
            <Flame size={15} fill="var(--flame)" /> היעד השבועי הושג · {result.streak.current} שבועות ברצף
          </span>
        )}
      </div>

      <div className="tiles two">
        <StatTile title="משך" value={fmtDuration(sessionDuration(s))} icon={Clock} />
        <StatTile title="נפח" value={fmtVolume(sessionVolume(s))} icon={Weight} />
        <StatTile title="סטים" value={sessionWorkSets(s).length} icon={Layers} />
        <StatTile title="XP" value={plus(xp)} icon={Zap} />
      </div>

      {result.prs.length > 0 && (
        <div className="card hl">
          <div className="row"><b className="headline">שיאים חדשים</b><Trophy size={18} color="var(--lime)" /></div>
          {result.prs.map((p, i) => (
            <div key={i} className="row" style={{ gap: 12 }}>
              <span style={{ width: 34, height: 34, borderRadius: 17, background: 'var(--lime)', display: 'grid', placeItems: 'center', flex: 'none' }}><ArrowUpRight size={16} color="#000" strokeWidth={3} /></span>
              <div className="grow col" style={{ gap: 2 }}><b>{p.exerciseName}</b><span className="num muted" style={{ fontSize: 13 }}>{prLabel(p)}</span></div>
              <span className="num lime" style={{ fontSize: 16 }}>{prDelta(p)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        {result.xpItems.map((it) => (
          <div key={it.reason} className="row"><span className="grow">{it.reason}</span><span className="num lime">{plus(it.amount)}</span></div>
        ))}
        <div style={{ height: 1, background: 'var(--line)' }} />
        <div className="row" style={{ gap: 12 }}>
          <LevelBadge level={lvl} size={44} />
          <div className="grow col" style={{ gap: 6 }}>
            <div className="row"><b className="grow">{levelTitle(lvl)}</b><span className="num lime" style={{ fontSize: 15 }}>{plus(xp)} XP</span></div>
            <Bar progress={bar} />
          </div>
        </div>
      </div>

      {result.achievements.length > 0 && (
        <div className="card">
          <b className="headline">הישגים חדשים</b>
          {result.achievements.map((a) => {
            const Icon = achievementIcon[a.icon] ?? Trophy
            return (
              <div key={a.id} className="row" style={{ gap: 12 }}>
                <span style={{ width: 46, height: 46, borderRadius: 14, background: 'var(--lime-grad)', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon size={20} color="#000" strokeWidth={2.5} /></span>
                <div className="col" style={{ gap: 2 }}><b>{a.title}</b><span className="caption">{a.detail}</span></div>
              </div>
            )
          })}
        </div>
      )}

      <div className="coach" style={{ fontSize: 16, fontWeight: 600 }}><Quote size={16} color="var(--lime)" style={{ flex: 'none', marginTop: 3 }} /><span>{result.coachLine}</span></div>

      <button className="btn secondary" onClick={() => void shareCard(result)}><Share2 size={18} /> שיתוף כרטיס אימון</button>
      <button className="btn primary" onClick={onDone}>סיום</button>

      <Confetti trigger={confetti} />
      {levelUp && (
        <div onClick={() => setLevelUp(false)} style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,.86)', display: 'grid', placeItems: 'center', animation: 'fade .3s' }}>
          <div className="col" style={{ alignItems: 'center', textAlign: 'center', gap: 18, padding: 30 }}>
            <b className="muted" style={{ fontSize: 20 }}>עלית רמה!</b>
            <div style={{ animation: 'pulse 1.8s ease-in-out infinite' }}>
              <Ring progress={1} size={170} stroke={10}><LevelBadge level={result.levelAfter.level} size={120} /></Ring>
            </div>
            <span className="num lime" style={{ fontSize: 34, fontWeight: 900 }}>{levelTitle(result.levelAfter.level)}</span>
            <span>{levelUpLine(result.levelAfter.level, levelTitle(result.levelAfter.level))}</span>
            <button className="btn primary" style={{ width: 200 }}>מעולה</button>
          </div>
        </div>
      )}
    </div>
  )
}

/** כרטיס אימון לשיתוף (תמונה), מצויר על canvas */
async function shareCard(r: FinishResult) {
  const s = r.session
  const W = 1080, H = 1350
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  canvas.setAttribute('dir', 'rtl')
  canvas.style.display = 'none'
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)
  const g = ctx.createRadialGradient(W - 100, 100, 20, W - 100, 100, 900)
  g.addColorStop(0, 'rgba(198,255,61,0.30)'); g.addColorStop(1, 'rgba(198,255,61,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  const font = (w: number, size: number) => `${w} ${size}px ui-rounded, "SF Pro Rounded", -apple-system, sans-serif`
  const R = W - 80
  ctx.textAlign = 'right'
  ctx.direction = 'rtl'
  ctx.fillStyle = '#c6ff3d'; ctx.font = font(900, 84); ctx.fillText('APEX', R, 160)
  ctx.textAlign = 'left'; ctx.fillStyle = '#9aa190'; ctx.font = font(600, 40); ctx.fillText(fmtDayMonth(s.startedAt), 80, 150)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#9aa190'; ctx.font = font(600, 44); ctx.fillText('אימון הושלם', R, 320)
  ctx.fillStyle = '#f4f7ee'; ctx.font = font(900, 110); ctx.fillText(s.templateName, R, 450)
  const stats: [string, string][] = [[fmtMinutes(sessionDuration(s)), 'משך'], [fmtVolume(sessionVolume(s)), 'נפח'], [String(sessionWorkSets(s).length), 'סטים']]
  stats.forEach(([v, l], i) => {
    const x = R - i * 320
    ctx.fillStyle = '#f4f7ee'; ctx.font = font(800, 64); ctx.fillText(v, x, 620)
    ctx.fillStyle = '#9aa190'; ctx.font = font(600, 36); ctx.fillText(l, x, 670)
  })
  r.prs.slice(0, 3).forEach((p, i) => {
    const y = 820 + i * 90
    ctx.fillStyle = '#f4f7ee'; ctx.font = font(700, 44); ctx.fillText(`🏆 ${p.exerciseName}`, R, y)
    ctx.textAlign = 'left'; ctx.fillStyle = '#c6ff3d'; ctx.fillText(prLabel(p), 80, y); ctx.textAlign = 'right'
  })
  ctx.fillStyle = '#ff8a1f'; ctx.font = font(800, 40); ctx.fillText(`🔥 ${r.streak.current} שבועות ברצף`, R, H - 90)
  ctx.textAlign = 'left'; ctx.fillStyle = '#9aa190'; ctx.fillText(`רמה ${r.levelAfter.level} · ${levelTitle(r.levelAfter.level)}`, 80, H - 90)
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'))
  canvas.remove()
  if (blob) await shareOrDownload(blob, 'APEX-workout.png')
}
