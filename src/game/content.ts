import dialoguesJson from '../content/dialogues.json'
import dialogueOverridesJson from '../content/dialogue-overrides.json'
import mirrorsOrbsJson from '../content/locations/miroirs/orbs.json'
import parasitesJson from '../content/parasites.json'
import voicesJson from '../content/voices.json'
import type {
  DialogueChoice,
  DialogueNode,
  DialogueScript,
  OrbDefinition,
  OrbVariant,
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

const voiceDisplayAliases: Record<string, string> = {
  'Le Sel': 'Mémoire',
  'Le Dossier': 'Procédure',
  'Le Nerf': 'Danger',
  'Le Regard': 'Honte',
  'Les Bouches': 'Rumeur',
  'Le Ventre': 'Corps',
  'Le Présage': 'Signes',
  'La Main Basse': 'Débrouille',
}

export const voices = voicesJson as VoiceDefinition[]
export const parasites = parasitesJson as ParasiteDefinition[]
export const dialogues = normalizeDialogueDisplayNames(
  mergeDialogueOverrides(
    dialoguesJson as Record<string, DialogueScript>,
    dialogueOverridesJson as Record<string, DialogueScriptOverride>,
  ),
)
export const orbs = normalizeOrbDisplayNames(mirrorsOrbsJson as OrbDefinition[])
const passiveModules = import.meta.glob<PassiveDefinition[]>(
  '../content/locations/miroirs/*.passives.json',
  { eager: true, import: 'default' },
)
const contextualPassives = Object.entries(passiveModules)
  .sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
  .flatMap(([, modulePassives]) => modulePassives)

export const passives = normalizePassiveDisplayNames([...contextualPassives]).sort(
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

function normalizeDialogueDisplayNames(dialogues: Record<string, DialogueScript>): Record<string, DialogueScript> {
  return Object.fromEntries(
    Object.entries(dialogues).map(([scriptId, script]) => {
      return [
        scriptId,
        {
          ...script,
          nodes: Object.fromEntries(
            Object.entries(script.nodes).map(([nodeId, node]) => [nodeId, normalizeDialogueNode(node)]),
          ),
        },
      ]
    }),
  )
}

function normalizeDialogueNode(node: DialogueNode): DialogueNode {
  return {
    ...node,
    speaker: normalizeVoiceDisplayText(node.speaker),
    text: normalizeVoiceDisplayText(node.text),
    choices: node.choices.map(normalizeDialogueChoice),
  }
}

function normalizeDialogueChoice(choice: DialogueChoice): DialogueChoice {
  return {
    ...choice,
    label: normalizeVoiceDisplayText(choice.label),
  }
}

function normalizeOrbDisplayNames(orbs: OrbDefinition[]): OrbDefinition[] {
  return orbs.map((orb) => ({
    ...orb,
    label: normalizeVoiceDisplayText(orb.label),
    title: normalizeVoiceDisplayText(orb.title),
    text: normalizeVoiceDisplayText(orb.text),
    voiceText: orb.voiceText ? normalizeVoiceDisplayText(orb.voiceText) : undefined,
    variants: orb.variants?.map(normalizeOrbVariantDisplayNames),
  }))
}

function normalizeOrbVariantDisplayNames(variant: OrbVariant): OrbVariant {
  return {
    ...variant,
    title: variant.title ? normalizeVoiceDisplayText(variant.title) : undefined,
    text: normalizeVoiceDisplayText(variant.text),
    voiceText: variant.voiceText ? normalizeVoiceDisplayText(variant.voiceText) : undefined,
  }
}

function normalizePassiveDisplayNames(passives: PassiveDefinition[]): PassiveDefinition[] {
  return passives.map((passive) => ({
    ...passive,
    text: normalizeVoiceDisplayText(passive.text),
  }))
}

function normalizeVoiceDisplayText(text: string): string {
  return Object.entries(voiceDisplayAliases).reduce((result, [previousName, nextName]) => {
    return result.replaceAll(previousName, nextName)
  }, text)
}
