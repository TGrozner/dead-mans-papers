import type { OrbMode } from '../types'

export const SOFIANE_PALISADE_X = 786
export const SOFIANE_PALISADE_Y = 468

const WITNESS_REQUIRED_FLAGS = ['page_read'] as const
const WITNESS_REQUIRED_CHECKS = ['camera_dead_angle', 'badge_access_chain', 'hami_prescription_line'] as const

export interface MirrorsHotspotDefinition {
  id: string
  label: string
  scriptId: string
  x: number
  y: number
  radius: number
  tapRadius?: number
  requiredFlags?: readonly string[]
  requiredCompletedChecks?: readonly string[]
}

export interface MirrorsOrbSpotDefinition {
  id: string
  label: string
  mode: OrbMode
  x: number
  y: number
  radius: number
  tapRadius?: number
}

export const MIRRORS_HOTSPOTS = [
  {
    id: 'utility_van',
    label: "Examiner l'utilitaire municipal",
    scriptId: 'utility_van',
    x: 116,
    y: 326,
    radius: 92,
    tapRadius: 72,
  },
  {
    id: 'leduc',
    label: 'Parler à Karine Leduc',
    scriptId: 'leduc',
    x: 242,
    y: 348,
    radius: 82,
    tapRadius: 58,
  },
  {
    id: 'amar',
    label: 'Parler à Amar Boudiaf',
    scriptId: 'amar',
    x: 668,
    y: 222,
    radius: 82,
    tapRadius: 58,
    requiredFlags: WITNESS_REQUIRED_FLAGS,
    requiredCompletedChecks: WITNESS_REQUIRED_CHECKS,
  },
  {
    id: 'sofiane',
    label: 'Parler à Sofiane',
    scriptId: 'sofiane',
    x: SOFIANE_PALISADE_X,
    y: SOFIANE_PALISADE_Y,
    radius: 86,
    tapRadius: 60,
    requiredFlags: WITNESS_REQUIRED_FLAGS,
    requiredCompletedChecks: WITNESS_REQUIRED_CHECKS,
  },
] satisfies readonly MirrorsHotspotDefinition[]

export const MIRRORS_ORB_SPOTS = [
  {
    id: 'miroirs_orb_phone',
    label: 'Regarder le téléphone',
    mode: 'visible',
    x: 456,
    y: 350,
    radius: 58,
    tapRadius: 44,
  },
  {
    id: 'miroirs_orb_van',
    label: "Observer l'utilitaire",
    mode: 'visible',
    x: 120,
    y: 300,
    radius: 74,
    tapRadius: 54,
  },
  {
    id: 'miroirs_orb_body',
    label: 'Regarder le coffre',
    mode: 'visible',
    x: 82,
    y: 334,
    radius: 72,
    tapRadius: 54,
  },
  {
    id: 'miroirs_orb_camera',
    label: 'Inspecter la caméra HS',
    mode: 'visible',
    x: 178,
    y: 90,
    radius: 68,
    tapRadius: 52,
  },
  {
    id: 'miroirs_orb_technical_room',
    label: 'Examiner le local technique',
    mode: 'visible',
    x: 888,
    y: 158,
    radius: 86,
    tapRadius: 70,
  },
  {
    id: 'miroirs_orb_neon',
    label: 'Regarder la flaque',
    mode: 'proximity',
    x: 476,
    y: 272,
    radius: 96,
    tapRadius: 66,
  },
  {
    id: 'miroirs_orb_residents',
    label: 'Écouter la palissade',
    mode: 'proximity',
    x: SOFIANE_PALISADE_X + 16,
    y: SOFIANE_PALISADE_Y + 40,
    radius: 78,
    tapRadius: 58,
  },
] satisfies readonly MirrorsOrbSpotDefinition[]
