import { useEffect, useMemo, useState } from 'react'
import type { PointerEvent as RPointerEvent } from 'react'
import { ArrowDownRight, ArrowUpRight, Camera, ChartLine, ChevronsUpDown, Images, Plus, Ruler, Trophy, Weight, Trash } from 'lucide-react'
import type { Muscle, PhotoAngle, ProgressPhoto } from '../engine/types'
import { angleHe, muscleHe, prKindHe, uid } from '../engine/types'
import { catalog } from '../engine/catalog'
import { completedWorkSets, orderedExercises, sessionVolume } from '../engine/history'
import { best1RM } from '../engine/progression'
import { realPRs, refreshAchievements } from '../engine/finisher'
import { addWeeks, fmtDayMonth, fmtWeight, ltr, sameWeek, startOfWeek } from '../engine/format'
import { commit, deletePhoto, getData, loadPhoto, photoKey, savePhoto, useData } from '../store'
import { Chip, Confirm, Empty, NumberField, Seg, Sheet, SheetHeader, StatTile, Toggle } from '../ui/kit'
import { BarChart, HBars, LineChart } from '../ui/Charts'
import type { Pt } from '../ui/Charts'

type Section = 'strength' | 'volume' | 'body' | 'photos'

export default function ProgressScreen() {
  const [section, setSection] = useState<Section>('strength')
  return (
    <div className="screen">
      <h1 className="screen-title">התקדמות</h1>
      <Seg value={section} onChange={setSection} options={[['strength', 'כוח'], ['volume', 'נפח'], ['body', 'גוף'], ['photos', 'תמונות']]} />
      {section === 'strength' && <Strength />}
      {section === 'volume' && <Volume />}
      {section === 'body' && <Body />}
      {section === 'photos' && <Photos />}
    </div>
  )
}

function Strength() {
  const data = useData()
  const cat = catalog()
  const done = data.sessions.filter((s) => s.isCompleted).sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  const list = useMemo(() => {
    const counts = new Map<string, { name: string; n: number }>()
    for (const s of done) for (const l of orderedExercises(s)) {
      if (!completedWorkSets(l).length || l.pattern === 'conditioning') continue
      const c = counts.get(l.exerciseID) ?? { name: l.exerciseName, n: 0 }
      c.n++
      counts.set(l.exerciseID, c)
    }
    return [...counts.entries()].sort((a, b) => b[1].n - a[1].n).map(([id, v]) => ({ id, name: v.name }))
  }, [done])
  const [sel, setSel] = useState<string | undefined>()
  const id = sel ?? list[0]?.id
  const ex = id ? cat.exercise(id) : undefined
  const bw = ex ? ex.increment === 0 : false
  const points: (Pt & { top: number })[] = []
  for (const s of done) {
    const log = s.exercises.find((l) => l.exerciseID === id)
    if (!log) continue
    const sets = completedWorkSets(log)
    if (!sets.length) continue
    const top = Math.max(...sets.map((x) => x.weight))
    const v = bw ? Math.max(...sets.map((x) => x.reps)) : best1RM(sets)
    if (v > 0) points.push({ x: new Date(s.startedAt), y: Math.round(v * 10) / 10, top })
  }
  const prs = realPRs(data.records)

  return (
    <>
      {!list.length ? <Empty icon={ChartLine} title="עוד אין נתונים" message="אחרי כמה אימונים יופיעו כאן גרפי כוח לכל תרגיל." /> : <>
        <label className="card tight" style={{ flexDirection: 'row', alignItems: 'center', position: 'relative' }}>
          <b className="headline grow">{list.find((x) => x.id === id)?.name}</b>
          <ChevronsUpDown size={18} color="var(--lime)" />
          <select value={id} onChange={(e) => setSel(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0 }}>
            {list.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
        <div className="card">
          <span className="caption">{bw ? 'חזרות מרביות בסט' : '1RM משוער (ק״ג)'}</span>
          <LineChart points={points} />
        </div>
        {points.length > 0 && (() => {
          const best = Math.max(...points.map((p) => p.y))
          const delta = points[0].y > 0 ? ((points.at(-1)!.y - points[0].y) / points[0].y) * 100 : 0
          return (
            <div className="tiles">
              <StatTile title={bw ? 'שיא חזרות' : '1RM שיא'} value={fmtWeight(best)} icon={Trophy} />
              <StatTile title="משקל" value={bw ? '—' : fmtWeight(points.at(-1)!.top)} unit={bw ? undefined : 'ק״ג'} icon={Weight} />
              <StatTile title="שינוי" value={ltr(`${delta >= 0 ? '+' : ''}${Math.round(delta)}%`)} icon={delta >= 0 ? ArrowUpRight : ArrowDownRight}
                        accent={delta >= 0 ? 'var(--lime)' : 'var(--danger)'} />
            </div>
          )
        })()}
      </>}
      {prs.length > 0 && (
        <div className="card">
          <b className="headline">שיאים אישיים</b>
          {prs.slice(0, 12).map((r) => (
            <div key={r.id} className="row">
              <div className="grow col" style={{ gap: 2 }}>
                <b style={{ fontSize: 15 }}>{r.exerciseName}</b>
                <span className="caption">{prKindHe[r.kind]} · {fmtDayMonth(r.date)}</span>
              </div>
              <span className="num lime" style={{ fontSize: 16 }}>{r.kind === 'maxReps' ? `${r.reps} חזרות` : ltr(`${fmtWeight(r.weight)}×${r.reps}`)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function Volume() {
  const data = useData()
  const cat = catalog()
  const done = data.sessions.filter((s) => s.isCompleted)
  const now = new Date()
  const counts = new Map<Muscle, number>()
  for (const s of done.filter((x) => sameWeek(new Date(x.startedAt), now))) {
    for (const l of s.exercises) {
      const n = completedWorkSets(l).length
      const ex = cat.exercise(l.exerciseID)
      if (!n || !ex) continue
      for (const m of ex.primaryMuscles) counts.set(m, (counts.get(m) ?? 0) + n)
    }
  }
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([m, v]) => ({ name: muscleHe[m], value: v }))
  const cur = startOfWeek(now)
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const start = addWeeks(cur, i - 11)
    const end = addWeeks(start, 1)
    const v = done.filter((s) => { const d = new Date(s.startedAt); return d >= start && d < end }).reduce((a, s) => a + sessionVolume(s), 0)
    return { label: fmtDayMonth(start), value: Math.round(v) }
  })
  return (
    <>
      <div className="card">
        <b className="headline">סטים השבוע לפי שריר</b>
        <span className="caption">טווח מומלץ לבניית שריר: 10–20 סטים בשבוע</span>
        {rows.length ? <HBars rows={rows} /> : <span className="dim" style={{ padding: '20px 0' }}>עוד אין אימונים השבוע.</span>}
      </div>
      <div className="card">
        <b className="headline">נפח שבועי (ק״ג)</b>
        <BarChart bars={weeks} />
      </div>
    </>
  )
}

function Body() {
  const data = useData()
  const [add, setAdd] = useState(false)
  const [del, setDel] = useState<string | null>(null)
  const metrics = [...data.metrics].sort((a, b) => a.date.localeCompare(b.date))
  const withW = metrics.filter((m) => m.weight != null)
  const pts: Pt[] = withW.map((m) => ({ x: new Date(m.date), y: m.weight! }))
  const avg: Pt[] = withW.map((m) => {
    const t = new Date(m.date).getTime()
    const win = withW.filter((x) => { const tx = new Date(x.date).getTime(); return tx > t - 7 * 86_400_000 && tx <= t }).map((x) => x.weight!)
    return { x: new Date(m.date), y: Math.round((win.reduce((a, b) => a + b, 0) / win.length) * 10) / 10 }
  })
  const latest = [...metrics].reverse().find((m) => m.waist ?? m.chest ?? m.arm ?? m.thigh ?? m.bodyFat)
  return (
    <>
      <button className="btn primary" onClick={() => setAdd(true)}><Plus size={18} /> מדידה חדשה</button>
      {pts.length > 0 && <>
        <div className="tiles">
          <StatTile title="משקל נוכחי" value={fmtWeight(pts.at(-1)!.y)} unit="ק״ג" icon={Weight} />
          {(() => { const d = Math.round((pts.at(-1)!.y - pts[0].y) * 10) / 10
            return <StatTile title="שינוי מההתחלה" value={ltr(`${d > 0 ? '+' : ''}${fmtWeight(d)}`)} unit="ק״ג" icon={d <= 0 ? ArrowDownRight : ArrowUpRight} /> })()}
        </div>
        <div className="card">
          <div className="row"><b className="headline grow">משקל גוף</b><span className="lime caption">— ממוצע 7 ימים</span></div>
          <LineChart points={pts} line2={avg} area={false} />
        </div>
      </>}
      {latest && (
        <div className="card">
          <b className="headline">היקפים אחרונים · {fmtDayMonth(latest.date)}</b>
          <div className="tiles two">
            {latest.waist != null && <StatTile title="מותניים" value={fmtWeight(latest.waist)} unit="ס״מ" />}
            {latest.chest != null && <StatTile title="חזה" value={fmtWeight(latest.chest)} unit="ס״מ" />}
            {latest.arm != null && <StatTile title="זרוע" value={fmtWeight(latest.arm)} unit="ס״מ" />}
            {latest.thigh != null && <StatTile title="ירך" value={fmtWeight(latest.thigh)} unit="ס״מ" />}
            {latest.bodyFat != null && <StatTile title="אחוז שומן" value={fmtWeight(latest.bodyFat)} unit="%" />}
          </div>
        </div>
      )}
      {metrics.length ? (
        <div className="card">
          <b className="headline">כל המדידות</b>
          {[...metrics].reverse().slice(0, 20).map((m) => (
            <div key={m.id} className="row">
              <span className="muted" style={{ fontSize: 14, fontWeight: 600 }}>{fmtDayMonth(m.date)}</span>
              <span className="spacer" />
              {m.weight != null && <span className="num">{fmtWeight(m.weight)} ק״ג</span>}
              {m.waist != null && <span className="caption">· מותניים {fmtWeight(m.waist)}</span>}
              <button onClick={() => setDel(m.id)} aria-label="מחיקה"><Trash size={15} color="var(--text3)" /></button>
            </div>
          ))}
        </div>
      ) : <Empty icon={Ruler} title="עוד אין מדידות" message="מדידה פעם בשבוע, באותה שעה, נותנת את התמונה הכי מדויקת." />}
      {add && <AddMetric onClose={() => setAdd(false)} />}
      {del && <Confirm title="למחוק את המדידה?" confirm="מחיקה" danger onCancel={() => setDel(null)}
                       onConfirm={() => { const d = getData(); d.metrics = d.metrics.filter((x) => x.id !== del); commit(); setDel(null) }} />}
    </>
  )
}

function AddMetric({ onClose }: { onClose: () => void }) {
  const data = getData()
  const last = [...data.metrics].sort((a, b) => b.date.localeCompare(a.date))[0]
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [weight, setWeight] = useState(last?.weight ?? 80)
  const [circ, setCirc] = useState(false)
  const [waist, setWaist] = useState(last?.waist ?? 85)
  const [chest, setChest] = useState(last?.chest ?? 100)
  const [arm, setArm] = useState(last?.arm ?? 35)
  const [thigh, setThigh] = useState(last?.thigh ?? 58)
  const [fat, setFat] = useState(false)
  const [bodyFat, setBodyFat] = useState(last?.bodyFat ?? 18)
  const save = () => {
    const d = new Date(date)
    d.setHours(new Date().getHours(), new Date().getMinutes())
    data.metrics.push({ id: uid(), date: d.toISOString(), weight, ...(circ ? { waist, chest, arm, thigh } : {}), ...(fat ? { bodyFat } : {}) })
    refreshAchievements(data, catalog())
    commit()
    onClose()
  }
  return (
    <Sheet onClose={onClose} full>
      <SheetHeader title="מדידה חדשה" onClose={onClose} closeLabel="ביטול" action={<button className="link-btn" style={{ fontWeight: 800 }} onClick={save}>שמירה</button>} />
      <input type="date" className="text-input" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} />
      <NumberField title="משקל" value={weight} onChange={setWeight} unit="ק״ג" step={0.1} min={35} max={250} />
      <div className="card tight"><Toggle label="הוספת היקפים" on={circ} onChange={setCirc} /></div>
      {circ && <>
        <NumberField title="מותניים" value={waist} onChange={setWaist} unit="ס״מ" step={0.5} min={40} max={200} />
        <NumberField title="חזה" value={chest} onChange={setChest} unit="ס״מ" step={0.5} min={50} max={200} />
        <NumberField title="זרוע" value={arm} onChange={setArm} unit="ס״מ" step={0.5} min={15} max={70} />
        <NumberField title="ירך" value={thigh} onChange={setThigh} unit="ס״מ" step={0.5} min={30} max={100} />
      </>}
      <div className="card tight"><Toggle label="הוספת אחוז שומן" on={fat} onChange={setFat} /></div>
      {fat && <NumberField title="אחוז שומן" value={bodyFat} onChange={setBodyFat} unit="%" step={0.5} min={3} max={60} />}
    </Sheet>
  )
}

// ---- תמונות התקדמות ----

function usePhotoURL(p?: ProgressPhoto) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    let u: string | undefined
    if (p) void loadPhoto(p.blobKey).then((b) => { if (b) { u = URL.createObjectURL(b); setUrl(u) } })
    return () => { if (u) URL.revokeObjectURL(u) }
  }, [p])
  return url
}

function Thumb({ p, selected, onClick }: { p: ProgressPhoto; selected: boolean; onClick: () => void }) {
  const url = usePhotoURL(p)
  return (
    <button onClick={onClick} style={{ position: 'relative', height: 150, borderRadius: 14, overflow: 'hidden', background: 'var(--surface2)', outline: selected ? '3px solid var(--lime)' : 'none' }}>
      {url && <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      <span style={{ position: 'absolute', bottom: 5, insetInlineEnd: 5, background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 6px', borderRadius: 99 }}>{fmtDayMonth(p.date)}</span>
    </button>
  )
}

async function resize(file: File, maxSide = 1600): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  return new Promise((res) => c.toBlob((b) => res(b ?? file), 'image/jpeg', 0.82))
}

function Photos() {
  const data = useData()
  const [angle, setAngle] = useState<PhotoAngle>('front')
  const [compare, setCompare] = useState(false)
  const [sel, setSel] = useState<ProgressPhoto[]>([])
  const [view, setView] = useState<ProgressPhoto | null>(null)
  const photos = [...data.photos].sort((a, b) => b.date.localeCompare(a.date))

  const add = async (files: FileList | null) => {
    if (!files?.length) return
    const id = uid()
    await savePhoto(photoKey(id), await resize(files[0]))
    const d = getData()
    d.photos.push({ id, date: new Date().toISOString(), angle, blobKey: photoKey(id) })
    refreshAchievements(d, catalog())
    commit()
  }
  const tap = (p: ProgressPhoto) => {
    if (!compare) { setView(p); return }
    const next = sel.some((x) => x.id === p.id) ? sel.filter((x) => x.id !== p.id) : sel.length < 2 ? [...sel, p] : sel
    setSel(next)
  }

  return (
    <>
      <div className="chips">{(['front', 'side', 'back'] as PhotoAngle[]).map((a) => <Chip key={a} title={angleHe[a]} on={angle === a} onClick={() => setAngle(a)} />)}</div>
      <label className="btn primary" style={{ cursor: 'pointer' }}>
        <Camera size={18} /> צילום או בחירה מהגלריה
        <input type="file" accept="image/*" hidden onChange={(e) => { void add(e.target.files); e.target.value = '' }} />
      </label>
      {!photos.length ? (
        <Empty icon={Images} title="עוד אין תמונות" message="תמונה פעם בשבועיים, באותה תאורה ובאותה זווית, היא הדרך הכי טובה לראות שינוי. התמונות נשמרות רק במכשיר." />
      ) : <>
        <div className="row">
          <span className="caption grow">{photos.length} תמונות</span>
          <button className="link-btn" onClick={() => { setCompare(!compare); setSel([]) }}>{compare ? 'ביטול השוואה' : 'השוואת לפני ואחרי'}</button>
        </div>
        {compare && <span className="caption">בחירת שתי תמונות להשוואה ({sel.length}/2)</span>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {photos.map((p) => <Thumb key={p.id} p={p} selected={sel.some((x) => x.id === p.id)} onClick={() => tap(p)} />)}
        </div>
      </>}
      {view && <PhotoView p={view} onClose={() => setView(null)} />}
      {compare && sel.length === 2 && <CompareView photos={[...sel].sort((a, b) => a.date.localeCompare(b.date))} onClose={() => setSel([])} />}
    </>
  )
}

function PhotoView({ p, onClose }: { p: ProgressPhoto; onClose: () => void }) {
  const url = usePhotoURL(p)
  const [confirm, setConfirm] = useState(false)
  const remove = async () => {
    await deletePhoto(p.blobKey)
    const d = getData()
    d.photos = d.photos.filter((x) => x.id !== p.id)
    commit()
    onClose()
  }
  return (
    <Sheet onClose={onClose} full>
      <SheetHeader title={`${angleHe[p.angle]} · ${fmtDayMonth(p.date)}`} onClose={onClose}
                   action={<button onClick={() => setConfirm(true)} aria-label="מחיקה"><Trash size={18} color="var(--danger)" /></button>} />
      {url && <img src={url} alt="" style={{ width: '100%', borderRadius: 18 }} />}
      {confirm && <Confirm title="למחוק את התמונה?" confirm="מחיקה" danger onConfirm={() => void remove()} onCancel={() => setConfirm(false)} />}
    </Sheet>
  )
}

function CompareView({ photos, onClose }: { photos: ProgressPhoto[]; onClose: () => void }) {
  const before = usePhotoURL(photos[0])
  const after = usePhotoURL(photos[1])
  const [split, setSplit] = useState(0.5)
  const move = (e: RPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setSplit(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)))
  }
  return (
    <Sheet onClose={onClose} full>
      <SheetHeader title="לפני ואחרי" onClose={onClose} />
      <div dir="ltr" onPointerDown={move} onPointerMove={(e) => e.buttons && move(e)}
           style={{ position: 'relative', height: '62dvh', borderRadius: 20, overflow: 'hidden', touchAction: 'none', background: 'var(--surface2)' }}>
        {after && <img src={after} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
        {before && <img src={before} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', clipPath: `inset(0 ${(1 - split) * 100}% 0 0)` }} />}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${split * 100}%`, width: 3, background: 'var(--lime)', boxShadow: '0 0 6px var(--lime)' }} />
      </div>
      <div className="row" dir="ltr" style={{ fontSize: 14, fontWeight: 700 }}>
        <span className="muted">לפני · {fmtDayMonth(photos[0].date)}</span><span className="spacer" /><span className="muted">אחרי · {fmtDayMonth(photos[1].date)}</span>
      </div>
    </Sheet>
  )
}

