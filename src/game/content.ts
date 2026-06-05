import dialoguesJson from '../content/dialogues.json'
import harborOrbsJson from '../content/locations/harbor/orbs.json'
import harborBodyPassivesJson from '../content/locations/harbor/body.passives.json'
import harborContainerPassivesJson from '../content/locations/harbor/container.passives.json'
import harborDockersPassivesJson from '../content/locations/harbor/dockers.passives.json'
import harborVargaPassivesJson from '../content/locations/harbor/varga.passives.json'
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
export const orbs = harborOrbsJson as OrbDefinition[]
const contextualPassives = [
  ...(harborContainerPassivesJson as PassiveDefinition[]),
  ...(harborBodyPassivesJson as PassiveDefinition[]),
  ...(harborVargaPassivesJson as PassiveDefinition[]),
  ...(harborDockersPassivesJson as PassiveDefinition[]),
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
