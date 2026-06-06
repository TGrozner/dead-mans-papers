import dialoguesJson from '../content/dialogues.json'
import dialogueOverridesJson from '../content/dialogue-overrides.json'
import mirrorsOrbsJson from '../content/locations/miroirs/orbs.json'
import parasitesJson from '../content/parasites.json'
import voicesJson from '../content/voices.json'
import type {
  DialogueNode,
  DialogueScript,
  OrbDefinition,
  ParasiteDefinition,
  ParasiteId,
  PassiveDefinition,
  VoiceDefinition,
  VoiceId,
} from './types'

type DialogueNodeOverride = Partial<DialogueNode> & { id: string }
type DialogueScriptOverride = Partial<Omit<DialogueScript, 'nodes'>> & {
  nodes?: Record<string, DialogueNodeOverride>
}

export const voices = voicesJson as VoiceDefinition[]
export const parasites = parasitesJson as ParasiteDefinition[]
export const dialogues = mergeDialogueOverrides(
  dialoguesJson as Record<string, DialogueScript>,
  dialogueOverridesJson as Record<string, DialogueScriptOverride>,
)
export const orbs = mirrorsOrbsJson as OrbDefinition[]
const passiveModules = import.meta.glob<PassiveDefinition[]>(
  '../content/locations/miroirs/*.passives.json',
  { eager: true, import: 'default' },
)
const contextualPassives = Object.entries(passiveModules)
  .sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
  .flatMap(([, modulePassives]) => modulePassives)

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

function mergeDialogueOverrides(
  baseDialogues: Record<string, DialogueScript>,
  overrides: Record<string, DialogueScriptOverride>,
): Record<string, DialogueScript> {
  const mergedDialogues = { ...baseDialogues }

  Object.entries(overrides).forEach(([scriptId, scriptOverride]) => {
    const baseScript = mergedDialogues[scriptId]

    if (!baseScript) {
      return
    }

    mergedDialogues[scriptId] = {
      ...baseScript,
      ...scriptOverride,
      nodes: mergeDialogueNodes(baseScript.nodes, scriptOverride.nodes ?? {}),
    }
  })

  return mergedDialogues
}

function mergeDialogueNodes(
  baseNodes: Record<string, DialogueNode>,
  nodeOverrides: Record<string, DialogueNodeOverride>,
): Record<string, DialogueNode> {
  const mergedNodes = { ...baseNodes }

  Object.entries(nodeOverrides).forEach(([nodeId, nodeOverride]) => {
    const baseNode = baseNodes[nodeId]

    if (!baseNode) {
      return
    }

    mergedNodes[nodeId] = {
      ...baseNode,
      ...nodeOverride,
    }
  })

  return mergedNodes
}
