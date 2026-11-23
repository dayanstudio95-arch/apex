import { useMemo, useState } from 'react'
import { CircleCheck, Info, Timer, Dumbbell } from 'lucide-react'
import type { BodyArea, Equipment, MovementPattern } from '../engine/types'
import { equipmentHe, muscleHe, patternHe } from '../engine/types'
import type { Exercise } from '../engine/catalog'
import { catalog } from '../engine/catalog'
import { ExerciseImage, ExerciseThumb, Sheet, SheetHeader, StatTile, Tag, Toggle } from '../ui/kit'

/** בחירת תרגיל: חלופות לאותה תנועה, וחיפוש בכל המאגר לפי הציוד הזמין */
export function ExercisePicker({ title, pattern, equipment, limitations = new Set(), currentID, onPick, onClose }: {
  title: string; pattern?: MovementPattern; equipment: Set<Equipment>; limitations?: Set<BodyArea>
  currentID?: string; onPick: (e: Exercise) => void; onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [allEquipment, setAllEquipment] = useState(false)
  const [info, setInfo] = useState<Exercise | null>(null)
  const cat = catalog()
  const alternatives = useMemo(() => (pattern ? cat.candidates(pattern, equipment, limitations) : []), [cat, pattern, equipment, limitations])
  const pool = useMemo(() => cat.search(query, allEquipment ? undefined : equipment)
    .filter((e) => !pattern || query !== '' || e.pattern !== pattern).slice(0, query ? 200 : 80), [cat, query, allEquipment, equipment, pattern])

  const row = (e: Exercise) => (
    <div key={e.id} className="list-row">
      <button className="row grow" style={{ textAlign: 'start', gap: 12 }} onClick={() => { onPick(e); onClose() }}>
        <ExerciseThumb exercise={e} size={46} />
        <span className="grow col" style={{ gap: 3, minWidth: 0 }}>
          <b style={{ fontSize: 15 }}>{e.nameHe}</b>
          <span className="caption ellipsis">{e.equipment.length ? e.equipment.map((q) => equipmentHe[q]).join(' · ') : 'משקל גוף'}</span>
        </span>
        {e.id === currentID && <CircleCheck size={20} color="var(--lime)" />}
      </button>
      <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={() => setInfo(e)} aria-label="מידע"><Info size={16} color="var(--text2)" /></button>
    </div>
  )

  return (
    <Sheet onClose={onClose} full>
      <SheetHeader title={title} onClose={onClose} />
      <input className="text-input" style={{ fontSize: 16, padding: 12 }} placeholder="חיפוש תרגיל" value={query} onChange={(e) => setQuery(e.target.value)} />
      {pattern && !query && <>
        <b className="caption">חלופות ל{patternHe[pattern]}</b>
        {alternatives.length ? alternatives.map(row) : <span className="caption dim">אין חלופות עם הציוד הזה.</span>}
      </>}
      <b className="caption">{query ? 'תוצאות חיפוש' : 'כל התרגילים'}</b>
      <Toggle label="להציג גם תרגילים בלי הציוד הזה" on={allEquipment} onChange={setAllEquipment} />
      {pool.map(row)}
      {info && <ExerciseInfo exercise={info} onClose={() => setInfo(null)} />}
    </Sheet>
  )
}

export function ExerciseInfo({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  return (
    <Sheet onClose={onClose} full>
      <SheetHeader title="" onClose={onClose} />
      <ExerciseImage exercise={exercise} height={240} />
      <div className="col" style={{ gap: 4 }}>
        <h1 className="title">{exercise.nameHe}</h1>
        <span className="caption" dir="ltr" style={{ textAlign: 'end' }}>{exercise.nameEn}</span>
      </div>
      <div className="chips">
        {exercise.primaryMuscles.map((m) => <Tag key={m} text={muscleHe[m]} filled />)}
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
        <StatTile title="ציוד" value={exercise.equipment.length ? exercise.equipment.length : 'גוף'} icon={Dumbbell} />
        <StatTile title="מנוחה מומלצת" value={exercise.defaultRestSeconds} unit="שנ׳" icon={Timer} />
      </div>
      {exercise.equipment.length > 0 && <span className="caption">{exercise.equipment.map((q) => equipmentHe[q]).join(' · ')}</span>}
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
