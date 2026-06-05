import dialoguesJson from '../content/dialogues.json'
import mirrorsOrbsJson from '../content/locations/miroirs/orbs.json'
import mirrorsBodyPassivesJson from '../content/locations/miroirs/body.passives.json'
import mirrorsLeducPassivesJson from '../content/locations/miroirs/leduc.passives.json'
import mirrorsResidentsPassivesJson from '../content/locations/miroirs/residents.passives.json'
import mirrorsVanPassivesJson from '../content/locations/miroirs/utility-van.passives.json'
import parasitesJson from '../content/parasites.json'
import voicesJson from '../content/voices.json'
import type {
  DialogueScript,
  OrbDefinition,
  ParasiteDefinition,
  ParasiteId,
  PassiveDefinition,
  VoiceDefinition,
  VoiceId,
} from './types'

export const voices = voicesJson as VoiceDefinition[]
export const parasites = parasitesJson as ParasiteDefinition[]
export const dialogues = dialoguesJson as Record<string, DialogueScript>
export const orbs = mirrorsOrbsJson as OrbDefinition[]
const contextualPassives = [
  ...(mirrorsVanPassivesJson as PassiveDefinition[]),
  ...(mirrorsBodyPassivesJson as PassiveDefinition[]),
  ...(mirrorsLeducPassivesJson as PassiveDefinition[]),
  ...(mirrorsResidentsPassivesJson as PassiveDefinition[]),
]

export const passives = [...contextualPassives].sort(
  (left, right) => (right.priority ?? 0) - (left.priority ?? 0),
)

export const voiceById = voices.reduce(
  (accumulator, voice) => {
    accumulator[voice.id] = voice
    return accumulator
  },
  {} as Record<VoiceId, VoiceDefinition>,
)

export const parasiteById = parasites.reduce(
  (accumulator, parasite) => {
    accumulator[parasite.id] = parasite
    return accumulator
  },
  {} as Record<ParasiteId, ParasiteDefinition>,
)
