// מיקומים מוכנים: בחירה בלחיצה אחת, וכל אחד ניתן לעריכה אחר כך.
import type { Equipment, LocationLimits, LocationProfile } from './types'
import { EQUIPMENT, MULTI_TRAINER, uid } from './types'

export interface LocationPreset {
  key: string
  name: string
  subtitle: string
  icon: string
  equipment: Equipment[]
  limits?: LocationLimits
}

export const LOCATION_PRESETS: LocationPreset[] = [
  {
    key: 'buildingGym', name: 'חדר כושר בבניין', icon: 'dumbbell',
    subtitle: 'משקולות עד 24 ק״ג, מוט W, ספסלים מתכווננים, הליכון ומולטי טריינר (ערימה של 6 ק״ג, עד 76 ק״ג)',
    equipment: ['dumbbell', 'ezBar', 'barbell', 'bench', 'bands', ...MULTI_TRAINER, 'treadmill'],
    limits: { dumbbellMax: 24, stackStep: 6, stackMax: 76 },
  },
  { key: 'gym', name: 'חדר כושר', icon: 'gym', subtitle: 'חדר כושר מלא: מוטות, מכונות, כבלים', equipment: [...EQUIPMENT] },
  { key: 'home', name: 'בית', icon: 'home', subtitle: 'משקולות, ספסל וגומיות', equipment: ['dumbbell', 'bench', 'bands'] },
  { key: 'outside', name: 'בחוץ', icon: 'outside', subtitle: 'משקל גוף בלבד', equipment: [] },
]

export function locationFromPreset(p: LocationPreset, sortOrder: number): LocationProfile {
  return {
    id: uid(), name: p.name, icon: p.icon, equipment: [...p.equipment], sortOrder,
    ...(p.limits ? { limits: { ...p.limits } } : {}),
  }
}
