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
  label: string
  next?: string
  close?: boolean
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
  voice: VoiceId
  minScore: number
  once?: boolean
  priority?: number
  display: PassiveDisplay
  trigger: PassiveTriggerDefinition
  text: string
  optionalEffects?: Effect[]
}

export interface PassiveTrigger {
  id: string
  voice: VoiceId
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

export interface GameState {
  flags: Record<string, boolean>
  clues: string[]
  completedChecks: Record<string, CheckResult>
  identityPosture?: IdentityPosture
  triggeredOrbs: Record<string, boolean>
  triggeredPassives: Record<string, boolean>
  voiceStats: Record<VoiceId, number>
}

export interface RenderedDialogue {
  script: DialogueScript
  node: DialogueNode
  choices: DialogueChoice[]
  passives: PassiveTrigger[]
  checkResult?: CheckResult
}

export interface InteractionTarget {
  label: string
  run: () => void
}
