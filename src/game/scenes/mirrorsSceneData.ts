import type { OrbMode } from '../types'

export const MIRRORS_SCENE_WIDTH = 1280
export const MIRRORS_SCENE_HEIGHT = 720

// Interaction targets are authored directly in the 1280x720 scene space.
// Do not pass these values through the old 960x576 layout conversion.
const WITNESS_REQUIRED_FLAGS = ['trunk_opened'] as const

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
    x: 185,
    y: 407.5,
    radius: 115,
    tapRadius: 90,
  },
  {
    id: 'leduc',
    label: 'Parler à Karine Leduc',
    scriptId: 'leduc',
    x: 342.5,
    y: 435,
    radius: 102.5,
    tapRadius: 72.5,
  },
  {
    id: 'amar',
    label: 'Parler à Amar Boudiaf',
    scriptId: 'amar',
    x: 875,
    y: 277.5,
    radius: 102.5,
    tapRadius: 72.5,
    requiredFlags: WITNESS_REQUIRED_FLAGS,
  },
  {
    id: 'sofiane',
    label: 'Parler à Sofiane',
    scriptId: 'sofiane',
    x: 1022.5,
    y: 585,
    radius: 107.5,
    tapRadius: 75,
    requiredFlags: WITNESS_REQUIRED_FLAGS,
  },
] satisfies readonly MirrorsHotspotDefinition[]

export const MIRRORS_ORB_SPOTS = [
  {
    id: 'miroirs_orb_phone',
    label: 'Regarder le téléphone',
    mode: 'visible',
    x: 610,
    y: 437.5,
    radius: 72.5,
    tapRadius: 55,
  },
  {
    id: 'miroirs_orb_van',
    label: "Observer l'utilitaire",
    mode: 'visible',
    x: 190,
    y: 375,
    radius: 92.5,
    tapRadius: 67.5,
  },
  {
    id: 'miroirs_orb_body',
    label: 'Regarder le coffre',
    mode: 'visible',
    x: 142.5,
    y: 417.5,
    radius: 90,
    tapRadius: 67.5,
  },
  {
    id: 'miroirs_orb_camera',
    label: 'Inspecter la caméra HS',
    mode: 'visible',
    x: 262.5,
    y: 112.5,
    radius: 85,
    tapRadius: 65,
  },
  {
    id: 'miroirs_orb_technical_room',
    label: 'Examiner le local technique',
    mode: 'visible',
    x: 1080,
    y: 197.5,
    radius: 107.5,
    tapRadius: 87.5,
  },
  {
    id: 'miroirs_orb_neon',
    label: 'Regarder la flaque',
    mode: 'proximity',
    x: 635,
    y: 340,
    radius: 120,
    tapRadius: 82.5,
  },
  {
    id: 'miroirs_orb_residents',
    label: 'Écouter la palissade',
    mode: 'proximity',
    x: 1042.5,
    y: 635,
    radius: 97.5,
    tapRadius: 72.5,
  },
] satisfies readonly MirrorsOrbSpotDefinition[]
