import { dialogues, orbs, passives } from './content'
import type {
  CheckDefinition,
  CheckResult,
  DialogueChoice,
  DialogueScript,
  Effect,
  GameState,
  OrbDefinition,
  OrbVariant,
  PassiveDefinition,
  PassiveTrigger,
  RenderedOrb,
  RenderedDialogue,
  RenderedDialogueChoice,
} from './types'

export class NarrativeEngine {
  state: GameState

  private activeScript?: DialogueScript
  private lastCheckResult?: CheckResult
  private pendingPassives: PassiveTrigger[] = []

  constructor(state: GameState) {
    this.state = state
  }

  start(scriptId: string): RenderedDialogue {
    const script = dialogues[scriptId]

    if (!script) {
      throw new Error(`Unknown dialogue script: ${scriptId}`)
    }

    this.activeScript = script
    this.lastCheckResult = undefined
    this.pendingPassives = []
    return this.moveToNode(script.start)
  }

  choose(renderedChoice: RenderedDialogueChoice): RenderedDialogue | undefined {
    if (!this.activeScript) {
      throw new Error('No active dialogue script')
    }

    const choice = renderedChoice.choice
    this.state.visitedChoices[renderedChoice.key] = true
    this.pendingPassives.push(...this.applyEffects(choice.effects))

    if (choice.check) {
      const result = this.resolveCheck(choice.check)
      this.lastCheckResult = result
      return this.moveToNode(result.passed ? choice.check.successNode : choice.check.failureNode)
    }

    if (choice.close) {
      this.activeScript = undefined
      this.lastCheckResult = undefined
      this.pendingPassives = []
      return undefined
    }

    if (!choice.next) {
      throw new Error(`Choice "${choice.label}" has no next node or close action`)
    }

    this.lastCheckResult = undefined
    return this.moveToNode(choice.next)
  }

  triggerExploration(contextId: string): PassiveTrigger[] {
    return this.resolvePassives((passive) => {
      return passive.trigger.type === 'exploration' && passive.trigger.contextId === contextId
    })
  }

  getCheckResult(checkId: string): CheckResult | undefined {
    return this.state.completedChecks[checkId]
  }

  getVisibleOrbs(): OrbDefinition[] {
    return orbs.filter((orb) => orb.mode === 'visible')
  }

  getProximityOrbs(): OrbDefinition[] {
    return orbs.filter((orb) => orb.mode === 'proximity')
  }

  inspectOrb(orbId: string): RenderedOrb {
    const orb = this.getOrb(orbId)
    return this.renderOrb(orb)
  }

  triggerProximityOrb(orbId: string): RenderedOrb | undefined {
    const orb = this.getOrb(orbId)

    if (orb.mode !== 'proximity') {
      return undefined
    }

    if (this.state.triggeredOrbs[orb.id]) {
      return undefined
    }

    this.state.triggeredOrbs[orb.id] = true
    return this.renderOrb(orb)
  }

  private moveToNode(nodeId: string): RenderedDialogue {
    if (!this.activeScript) {
      throw new Error('No active dialogue script')
    }

    const node = this.activeScript.nodes[nodeId]

    if (!node) {
      throw new Error(`Unknown dialogue node: ${this.activeScript.id}.${nodeId}`)
    }

    const triggeredPassives = [
      ...this.pendingPassives,
      ...this.applyEffects(node.effects),
      ...this.resolvePassives((passive) => {
        return (
          passive.trigger.type === 'dialogue' &&
          passive.trigger.scriptId === this.activeScript?.id &&
          passive.trigger.nodeId === nodeId
        )
      }),
    ]
    this.pendingPassives = []
    const choices = node.choices
      .map((choice, index) => ({ choice, index }))
      .filter(({ choice }) => this.isChoiceVisible(choice))
      .map(({ choice, index }) => {
        const key = this.getChoiceKey(this.activeScript?.id ?? '', nodeId, choice, index)

        return {
          choice,
          key,
          visited: Boolean(this.state.visitedChoices[key]),
          important: this.isChoiceImportant(choice),
        }
      })

    return {
      script: this.activeScript,
      node,
      choices,
      passives: triggeredPassives,
      checkResult: this.lastCheckResult,
    }
  }

  private getChoiceKey(scriptId: string, nodeId: string, choice: DialogueChoice, index: number): string {
    return `${scriptId}.${nodeId}.${choice.id ?? index}`
  }

  private isChoiceImportant(choice: DialogueChoice): boolean {
    return Boolean(
      choice.important ||
        choice.check ||
        choice.effects?.some((effect) => effect.type === 'identity_posture'),
    )
  }

  private isChoiceVisible(choice: DialogueChoice): boolean {
    if (choice.requiresFlag && !this.state.flags[choice.requiresFlag]) {
      return false
    }

    if (choice.hiddenWhenFlag && this.state.flags[choice.hiddenWhenFlag]) {
      return false
    }

    return true
  }

  private getOrb(orbId: string): OrbDefinition {
    const orb = orbs.find((candidate) => candidate.id === orbId)

    if (!orb) {
      throw new Error(`Unknown orb: ${orbId}`)
    }

    return orb
  }

  private renderOrb(orb: OrbDefinition): RenderedOrb {
    const variant = this.selectOrbVariant(orb)
    const voice = variant?.voice ?? orb.voice
    const minScore = variant?.minScore ?? orb.minScore ?? 0
    const effects = variant?.effects ?? orb.effects
    const passives = this.applyEffects(effects)
    const shouldShowVoice = voice ? this.state.voiceStats[voice] >= minScore : false

    return {
      id: orb.id,
      mode: orb.mode,
      title: variant?.title ?? orb.title,
      text: variant?.text ?? orb.text,
      voice: shouldShowVoice ? voice : undefined,
      voiceText: shouldShowVoice ? (variant?.voiceText ?? orb.voiceText) : undefined,
      passives,
    }
  }

  private selectOrbVariant(orb: OrbDefinition): OrbVariant | undefined {
    return orb.variants?.find((variant) => {
      if (variant.requiresFlag && !this.state.flags[variant.requiresFlag]) {
        return false
      }

      if (variant.hiddenWhenFlag && this.state.flags[variant.hiddenWhenFlag]) {
        return false
      }

      return true
    })
  }

  private applyEffects(effects: Effect[] | undefined): PassiveTrigger[] {
    const triggeredPassives: PassiveTrigger[] = []

    if (!effects) {
      return triggeredPassives
    }

    for (const effect of effects) {
      if (effect.type === 'flag' && effect.flag) {
        this.state.flags[effect.flag] = true
      }

      if (effect.type === 'clue' && effect.clue && !this.state.clues.includes(effect.clue)) {
        this.state.clues.push(effect.clue)
        triggeredPassives.push(
          ...this.resolvePassives((passive) => {
            return passive.trigger.type === 'clue' && passive.trigger.clue === effect.clue
          }),
        )
      }

      if (effect.type === 'voice_bump' && effect.voice) {
        this.state.voiceStats[effect.voice] += effect.amount ?? 1
      }

      if (effect.type === 'identity_posture' && effect.posture) {
        this.state.identityPosture = effect.posture
      }
    }

    return triggeredPassives
  }

  private resolvePassives(match: (passive: PassiveDefinition) => boolean): PassiveTrigger[] {
    return passives.flatMap((passive) => {
      const triggeredPassive = this.triggerPassive(passive, match)
      return triggeredPassive ? [triggeredPassive] : []
    })
  }

  private triggerPassive(
    passive: PassiveDefinition,
    match: (passive: PassiveDefinition) => boolean,
  ): PassiveTrigger | undefined {
    if (!match(passive)) {
      return undefined
    }

    const isOneShot = passive.once !== false

    if (isOneShot && this.state.triggeredPassives[passive.id]) {
      return undefined
    }

    if (passive.requiresFlag && !this.state.flags[passive.requiresFlag]) {
      return undefined
    }

    if (passive.hiddenWhenFlag && this.state.flags[passive.hiddenWhenFlag]) {
      return undefined
    }

    if (passive.voice) {
      const score = this.state.voiceStats[passive.voice]

      if (score < (passive.minScore ?? 0)) {
        return undefined
      }

      if (passive.maxScore !== undefined && score > passive.maxScore) {
        return undefined
      }
    }

    if (isOneShot) {
      this.state.triggeredPassives[passive.id] = true
    }

    this.applyEffects(passive.optionalEffects)

    return {
      id: passive.id,
      voice: passive.voice,
      parasite: passive.parasite,
      display: passive.display,
      text: passive.text,
    }
  }

  private resolveCheck(check: CheckDefinition): CheckResult {
    const existingResult = this.state.completedChecks[check.id]

    if (existingResult) {
      return existingResult
    }

    const stat = this.state.voiceStats[check.voice]
    const supportStat = check.supportVoice ? this.state.voiceStats[check.supportVoice] : undefined
    const roll = Math.floor(Math.random() * 6) + 1
    const total = roll + stat + (supportStat ?? 0)
    const result: CheckResult = {
      checkId: check.id,
      voice: check.voice,
      supportVoice: check.supportVoice,
      roll,
      stat,
      supportStat,
      total,
      difficulty: check.difficulty,
      passed: total >= check.difficulty,
    }

    this.state.completedChecks[check.id] = result
    return result
  }
}
