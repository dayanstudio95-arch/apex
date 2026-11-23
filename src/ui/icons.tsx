import type { LucideIcon } from 'lucide-react'
import {
  Activity, ArrowUpToLine, Award, Badge, Building, Calendar, CalendarCheck, CalendarRange, Camera, CircleArrowUp,
  CloudLightning, Cog, Crown, Dumbbell, Flag, Flame, FlameKindling, Globe, Heart, House, Images, Leaf, MapPin, Map,
  Medal, Moon, Mountain, MountainSnow, Package, Repeat, Ruler, Shield, ShieldCheck, SquareArrowUp, Sun, Sunrise,
  TreePine, Trophy, Weight, Zap,
} from 'lucide-react'
import type { Goal, ExperienceLevel } from '../engine/types'

/** אייקונים של הישגים */
export const achievementIcon: Record<string, LucideIcon> = {
  flag: Flag, ten: Badge, calendarCheck: CalendarCheck, calendarRange: CalendarRange, badge: Award, cog: Cog,
  flame: Flame, flameKindling: FlameKindling, shieldCheck: ShieldCheck, sun: Sun, crown: Crown, leaf: Leaf,
  dumbbell: Dumbbell, trophy: Trophy, mountain: Mountain, zap: Zap, arrowUpToLine: ArrowUpToLine,
  circleArrowUp: CircleArrowUp, squareArrowUp: SquareArrowUp, activity: Activity, repeat: Repeat, weight: Weight,
  package: Package, building: Building, globe: Globe, award: Award, medal: Medal, map: Map, sunrise: Sunrise,
  moon: Moon, ruler: Ruler, camera: Camera, images: Images, shield: Shield, cloudLightning: CloudLightning,
  mountainSnow: MountainSnow,
}

/** אייקונים של מיקומים */
export const locationIcon: Record<string, LucideIcon> = {
  gym: Building, home: House, outside: TreePine, pin: MapPin, dumbbell: Dumbbell,
}

export const goalIcon: Record<Goal, LucideIcon> = { muscle: Dumbbell, fatLoss: Flame, fitness: Heart, strength: Zap }
export const levelIcon: Record<ExperienceLevel, LucideIcon> = { beginner: Leaf, intermediate: Zap, advanced: Crown }

export { Calendar }
