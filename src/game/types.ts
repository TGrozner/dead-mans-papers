export type VoiceId =
  | 'memoire_saline'
  | 'procedure'
  | 'nerfs'
  | 'honte_publique'
  | 'bouches'
  | 'faim'
  | 'symbole'
  | 'main_gauche'

export type ParasiteId = 'dose'

export type IdentityPosture = 'accept' | 'refuse' | 'perform' | 'defile'

export interface VoiceDefinition {
  id: VoiceId
  name: string
  tagline: string
  color: string
  startingValue: number
}

export interface ParasiteDefinition {
  id: ParasiteId
  name: string
  tagline: string
  color: string
}

export interface CheckDefinition {
  id: string
  voice: VoiceId
  supportVoice?: VoiceId
  difficulty: number
  successNode: string
  failureNode: string
}

export interface Effect {
  type: 'flag' | 'clue' | 'voice_bump' | 'identity_posture'
  flag?: string
  clue?: string
  voice?: VoiceId
  amount?: number
  posture?: IdentityPosture
}

export interface DialogueChoice {
  id?: string
  label: string
  next?: string
  close?: boolean
  important?: boolean
  requiresFlag?: string
  hiddenWhenFlag?: string
  check?: CheckDefinition
  effects?: Effect[]
}

export interface DialogueNode {
  id: string
  speaker: string
  text: string
  voice?: VoiceId
  parasite?: ParasiteId
  effects?: Effect[]
  choices: DialogueChoice[]
}

export interface DialogueScript {
  id: string
  title: string
  start: string
  nodes: Record<string, DialogueNode>
}

export type PassiveDisplay = 'dialogue' | 'toast'

export type PassiveTriggerDefinition =
  | {
      type: 'dialogue'
      scriptId: string
      nodeId: string
    }
  | {
      type: 'exploration'
      contextId: string
    }
  | {
      type: 'clue'
      clue: string
    }

export interface PassiveDefinition {
  id: string
  contextId: string
  location: string
  subject: string
  channel: PassiveTriggerDefinition['type']
  voice?: VoiceId
  parasite?: ParasiteId
  minScore?: number
  maxScore?: number
  requiresFlag?: string
  hiddenWhenFlag?: string
  once?: boolean
  priority?: number
  display: PassiveDisplay
  trigger: PassiveTriggerDefinition
  text: string
  optionalEffects?: Effect[]
}

export interface PassiveTrigger {
  id: string
  voice?: VoiceId
  parasite?: ParasiteId
  display: PassiveDisplay
  text: string
}

export type OrbMode = 'visible' | 'proximity'

export interface OrbVariant {
  requiresFlag?: string
  hiddenWhenFlag?: string
  title?: string
  text: string
  voice?: VoiceId
  minScore?: number
  voiceText?: string
  effects?: Effect[]
}

export interface OrbDefinition {
  id: string
  contextId: string
  location: string
  subject: string
  mode: OrbMode
  label: string
  title: string
  x: number
  y: number
  radius: number
  once?: boolean
  priority?: number
  text: string
  voice?: VoiceId
  minScore?: number
  voiceText?: string
  effects?: Effect[]
  variants?: OrbVariant[]
}

export interface RenderedOrb {
  id: string
  mode: OrbMode
  title: string
  text: string
  voice?: VoiceId
  voiceText?: string
  passives: PassiveTrigger[]
}

export interface CheckResult {
  checkId: string
  voice: VoiceId
  supportVoice?: VoiceId
  roll: number
  stat: number
  supportStat?: number
  total: number
  difficulty: number
  passed: boolean
}

export type ActiveSurface =
  | {
      type: 'dialogue'
      scriptId: string
      nodeId: string
      checkId?: string
    }
  | {
      type: 'orb'
      orbId: string
    }

export interface GameState {
  activeSurface?: ActiveSurface
  flags: Record<string, boolean>
  clues: string[]
  completedChecks: Record<string, CheckResult>
  identityPosture?: IdentityPosture
  triggeredOrbs: Record<string, boolean>
  triggeredPassives: Record<string, boolean>
  visitedChoices: Record<string, boolean>
  voiceStats: Record<VoiceId, number>
}

export interface RenderedDialogueChoice {
  choice: DialogueChoice
  key: string
  visited: boolean
  important: boolean
}

export interface RenderedDialogue {
  script: DialogueScript
  node: DialogueNode
  choices: RenderedDialogueChoice[]
  passives: PassiveTrigger[]
  checkResult?: CheckResult
}

export interface InteractionTarget {
  label: string
  run: () => void
}
