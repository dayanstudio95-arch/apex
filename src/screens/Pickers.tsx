import { useMemo, useState } from 'react'
import { CircleCheck, Dumbbell, Info, Star, Timer, TriangleAlert } from 'lucide-react'
import type { BodyArea, BodyPart, Equipment, MovementPattern } from '../engine/types'
import { BODY_PARTS, PATTERNS, equipmentHe, muscleHe, partHe, partOfPattern } from '../engine/types'
import type { Exercise } from '../engine/catalog'
import { STATION_OF, catalog, isAvailable, isSafe, partOf } from '../engine/catalog'
import { isFavorite, toggleFavorite } from '../engine/prefs'
import { commit, getData, useData } from '../store'
import { Chip, ExerciseImage, ExerciseThumb, Sheet, SheetHeader, StatTile, Tag, Toggle } from '../ui/kit'

/** כותרות ידידותיות לקבוצות בתוך אזור */
export const groupHe: Record<MovementPattern, string> = {
  horizontalPush: 'לחיצות חזה', chestIsolation: 'פרפר ובידוד', verticalPush: 'לחיצות כתפיים', lateralDelt: 'הרחקות והרמות',
  rearDelt: 'כתף אחורית', horizontalPull: 'חתירות', verticalPull: 'פולי עליון, מתח ופולאובר', biceps: 'כפיפות מרפקים',
  triceps: 'פשיטות מרפקים', squat: 'סקוואט', hinge: 'דדליפט וישבן', lunge: 'חד־רגלי', quadIsolation: 'ירך קדמית',
  hamstringIsolation: 'ירך אחורית', calves: 'תאומים', core: 'בטן', conditioning: 'אירובי וכושר',
}

const SHORT: Partial<Record<Equipment, string>> = { cable: 'כבלים', machine: 'מכונה', bench: 'ספסל' }
/** ציוד בשפה פשוטה: "פולי עליון" במקום "כבלים" כשזה תרגיל של תחנה */
export function equipmentCaption(e: Exercise): string {
  if (!e.equipment.length) return 'משקל גוף'
  return e.equipment.map((q) => ((q === 'cable' || q === 'machine') && STATION_OF[e.id] ? equipmentHe[STATION_OF[e.id]] : SHORT[q] ?? equipmentHe[q])).join(' · ')
}

/** כוכב מועדפים */
export function FavStar({ id, size = 36 }: { id: string; size?: number }) {
  const data = useData()
  const on = isFavorite(data, id)
  return (
    <button className="icon-btn" style={{ width: size, height: size }} aria-label={on ? 'הסרה מהמועדפים' : 'הוספה למועדפים'}
            onClick={(ev) => { ev.stopPropagation(); toggleFavorite(getData(), id); commit() }}>
      <Star size={size * 0.46} color={on ? 'var(--lime)' : 'var(--text3)'} fill={on ? 'var(--lime)' : 'none'} />
    </button>
  )
}

interface Section { key: string; title: string; items: Exercise[] }

/** בחירת תרגיל, מסודר לפי אזורי גוף ובתוכם לפי סוג תנועה. מועדפים למעלה */
export function ExercisePicker({ title, pattern, part, equipment, limitations = new Set(), currentID, onPick, onClose }: {
  title: string; pattern?: MovementPattern; part?: BodyPart; equipment: Set<Equipment>; limitations?: Set<BodyArea>
  currentID?: string; onPick: (e: Exercise) => void; onClose: () => void
}) {
  const data = useData()
  const [query, setQuery] = useState('')
  const [area, setArea] = useState<BodyPart | 'all'>(part ?? (pattern ? partOfPattern(pattern) : 'all'))
  const [allEquipment, setAllEquipment] = useState(false)
  const [info, setInfo] = useState<Exercise | null>(null)
  const cat = catalog()
  const fav = new Set(data.favorites ?? [])

  const pool = useMemo(() => {
    const q = query.trim().toLowerCase()
    return cat.all.filter((e) => (allEquipment || isAvailable(e, equipment)) &&
      (!q || e.nameHe.toLowerCase().includes(q) || e.nameEn.toLowerCase().includes(q)))
  }, [cat, query, allEquipment, equipment])

  const counts = useMemo(() => {
    const c: Partial<Record<BodyPart, number>> = {}
    for (const e of pool) c[partOf(e)] = (c[partOf(e)] ?? 0) + 1
    return c
  }, [pool])

  const sort = (list: Exercise[]) => [...list].sort((a, b) =>
    Number(fav.has(b.id)) - Number(fav.has(a.id)) || Number(b.id === currentID) - Number(a.id === currentID) ||
    b.priority - a.priority || a.nameHe.localeCompare(b.nameHe, 'he'))

  const sections: Section[] = []
  if (area === 'all' || query.trim()) {
    for (const p of BODY_PARTS) {
      const items = pool.filter((e) => partOf(e) === p && (area === 'all' || p === area))
      if (items.length) sections.push({ key: p, title: partHe[p], items: sort(items) })
    }
    // בחיפוש מחוץ לאזור שנבחר, מציגים גם את שאר האזורים
    if (query.trim() && area !== 'all') {
      for (const p of BODY_PARTS) {
        if (p === area) continue
        const items = pool.filter((e) => partOf(e) === p)
        if (items.length) sections.push({ key: p, title: partHe[p], items: sort(items) })
      }
    }
  } else {
    const order = [...PATTERNS].sort((a, b) => Number(b === pattern) - Number(a === pattern))
    for (const pt of order) {
      if (partOfPattern(pt) !== area) continue
      const items = pool.filter((e) => e.pattern === pt)
      if (items.length) sections.push({ key: pt, title: pt === pattern ? `${groupHe[pt]} · אותה תנועה` : groupHe[pt], items: sort(items) })
    }
  }

  const row = (e: Exercise) => {
    const unsafe = !isSafe(e, limitations)
    const missing = !isAvailable(e, equipment)
    return (
      <div key={e.id} className="list-row">
        <button className="row grow" style={{ textAlign: 'start', gap: 12, minWidth: 0 }} onClick={() => { onPick(e); onClose() }}>
          <ExerciseThumb exercise={e} size={46} />
          <span className="grow col" style={{ gap: 3, minWidth: 0 }}>
            <b style={{ fontSize: 15 }}>{e.nameHe}</b>
            <span className="caption ellipsis">{equipmentCaption(e)}</span>
            {(unsafe || missing) && (
              <span className="row" style={{ gap: 4, fontSize: 11, fontWeight: 700, color: 'var(--warning)' }}>
                <TriangleAlert size={11} /> {unsafe ? 'מעמיס על אזור שסימנת כמגבלה' : 'אין את הציוד הזה במיקום'}
              </span>
            )}
          </span>
          {e.id === currentID && <CircleCheck size={20} color="var(--lime)" style={{ flex: 'none' }} />}
        </button>
        <FavStar id={e.id} />
        <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={() => setInfo(e)} aria-label="מידע"><Info size={16} color="var(--text2)" /></button>
      </div>
    )
  }

  return (
    <Sheet onClose={onClose} full>
      <SheetHeader title={title} onClose={onClose} />
      <input className="text-input" style={{ fontSize: 16, padding: 12 }} placeholder="חיפוש תרגיל" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="chips scroll">
        <Chip title="הכול" on={area === 'all'} onClick={() => setArea('all')} />
        {BODY_PARTS.filter((p) => counts[p]).map((p) => <Chip key={p} title={partHe[p]} on={area === p} onClick={() => setArea(p)} />)}
      </div>
      {fav.size === 0 && <span className="caption dim">טיפ: מסמנים <Star size={11} style={{ verticalAlign: -1 }} /> ליד תרגילים שאוהבים, והמאמן יבחר אותם קודם.</span>}
      {sections.map((s) => (
        <div key={s.key} className="col" style={{ gap: 6 }}>
          <b className="caption" style={{ fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>{s.title} <span className="dim num">{s.items.length}</span></b>
          {s.items.map(row)}
        </div>
      ))}
      {!sections.length && <span className="muted" style={{ textAlign: 'center', padding: 20 }}>לא נמצאו תרגילים. אפשר להציג גם תרגילים בלי הציוד הזה.</span>}
      <Toggle label="להציג גם תרגילים בלי הציוד הזה" on={allEquipment} onChange={setAllEquipment} />
      {info && <ExerciseInfo exercise={info} onClose={() => setInfo(null)} />}
    </Sheet>
  )
}

export function ExerciseInfo({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  return (
    <Sheet onClose={onClose} full>
      <SheetHeader title="" onClose={onClose} action={<FavStar id={exercise.id} size={40} />} />
      <ExerciseImage exercise={exercise} height={240} />
      <div className="col" style={{ gap: 4 }}>
        <h1 className="title">{exercise.nameHe}</h1>
        <span className="caption" dir="ltr" style={{ textAlign: 'end' }}>{exercise.nameEn}</span>
      </div>
      <div className="chips">
        <Tag text={partHe[partOf(exercise)]} filled />
        {exercise.primaryMuscles.filter((m) => muscleHe[m] !== partHe[partOf(exercise)]).map((m) => <Tag key={m} text={muscleHe[m]} filled />)}
        {exercise.secondaryMuscles.map((m) => <Tag key={m} text={muscleHe[m]} />)}
      </div>
      {exercise.instructionsHe.length > 0 && (
        <div className="card">
          <b className="headline">דגשים לטכניקה</b>
          {exercise.instructionsHe.map((line, i) => (
            <div key={i} className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
              <span className="num" style={{ width: 24, height: 24, borderRadius: 12, background: 'var(--lime)', color: '#000', display: 'grid', placeItems: 'center', fontSize: 13, flex: 'none' }}>{i + 1}</span>
              <span>{line}</span>
            </div>
          ))}
        </div>
      )}
      <div className="tiles two">
        <StatTile title="ציוד" value={<span style={{ fontSize: 15 }}>{equipmentCaption(exercise)}</span>} icon={Dumbbell} />
        <StatTile title="מנוחה מומלצת" value={exercise.defaultRestSeconds} unit="שנ׳" icon={Timer} />
      </div>
    </Sheet>
  )
}

/** עריכת מספר בהקלדה */
export function NumberPad({ title, initial, decimal, onDone, onClose }: {
  title: string; initial: number; decimal: boolean; onDone: (v: number) => void; onClose: () => void
}) {
  const [text, setText] = useState(String(initial))
  const save = () => {
    const v = Number(text.replace(',', '.'))
    if (!Number.isNaN(v)) onDone(decimal ? v : Math.round(v))
    onClose()
  }
  return (
    <Sheet onClose={onClose}>
      <b className="headline" style={{ textAlign: 'center' }}>{title}</b>
      <input autoFocus className="text-input num" inputMode={decimal ? 'decimal' : 'numeric'} value={text}
             onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()}
             style={{ fontSize: 44, textAlign: 'center' }} onFocus={(e) => e.target.select()} />
      <button className="btn primary" onClick={save}>שמירה</button>
    </Sheet>
  )
}
