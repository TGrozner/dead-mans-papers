import { parasiteById, voiceById, voices } from './content'
import clueGroupsJson from './clue-groups.json'
import type {
  CheckResult,
  DialogueChoice,
  GameState,
  InteractionTarget,
  PassiveTrigger,
  RenderedOrb,
  RenderedDialogue,
} from './types'
import type { NarrativeEngine } from './narrative'

const MAX_DESKTOP_TOASTS = 5

interface ClueGroup {
  id: string
  label: string
  keywords: string[]
}

const CLUE_GROUPS = clueGroupsJson as ClueGroup[]

interface GameUiOptions {
  engine: NarrativeEngine
  root: HTMLDivElement
  prompt: HTMLButtonElement
  promptLabel: HTMLSpanElement
  toastRoot: HTMLDivElement
  objective: HTMLParagraphElement
  clueList: HTMLUListElement
  voiceList: HTMLDivElement
  onStateChanged: (state: GameState) => void
}

export function createGameUi(options: GameUiOptions) {
  let activeDialogue: RenderedDialogue | undefined
  let interactionTarget: InteractionTarget | undefined
  let restoreFocusTo: HTMLElement | undefined
  const uiDocument = options.root.ownerDocument

  function syncState(): void {
    renderObjective(options.engine.state, options.objective)
    renderClues(options.engine.state, options.clueList)
    renderVoices(options.engine.state, options.voiceList)
    options.onStateChanged(options.engine.state)
  }

  function openDialogue(scriptId: string): void {
    activeDialogue = options.engine.start(scriptId)
    renderDialogue()
    showPassiveToasts(
      activeDialogue.passives.filter((passive) => passive.display === 'toast'),
      options.toastRoot,
    )
    syncState()
  }

  function renderDialogue(): void {
    if (!activeDialogue) {
      hideDialogueSurface()
      return
    }

    showDialogueSurface()
    const node = activeDialogue.node
    const voice = node.voice ? voiceById[node.voice] : undefined
    const parasite = node.parasite ? parasiteById[node.parasite] : undefined
    const channelColor = voice?.color ?? parasite?.color
    const check = activeDialogue.checkResult
    const dialoguePassives = activeDialogue.passives.filter((passive) => passive.display === 'dialogue')
    const checkLabel = check ? formatDetailedCheckResult(check) : ''

    options.root.hidden = false
    options.root.innerHTML = `
      <article class="dialogue-panel">
        <div class="speaker-line">
          <span id="dialogue-title">${escapeHtml(node.speaker)}</span>
          <div class="speaker-actions">
            <span class="check-result">${escapeHtml(checkLabel)}</span>
            <button class="dialogue-close" type="button">Quitter</button>
          </div>
        </div>
        ${dialoguePassives.map(renderPassiveAside).join('')}
        <p class="dialogue-text ${channelColor ? 'voice-aside' : ''}" style="${channelColor ? `--voice-color: ${channelColor}` : ''}">
          ${escapeHtml(node.text)}
        </p>
        <div class="choice-list"></div>
      </article>
    `

    const choiceList = options.root.querySelector<HTMLDivElement>('.choice-list')
    const closeButton = options.root.querySelector<HTMLButtonElement>('.dialogue-close')

    if (!choiceList || !closeButton) {
      throw new Error('Dialogue choice list did not render')
    }

    closeButton.addEventListener('click', () => {
      closeActiveSurface()
    })
    closeButton.focus()

    activeDialogue.choices.forEach((renderedChoice) => {
      const choice = renderedChoice.choice
      const button = uiDocument.createElement('button')
      button.type = 'button'
      button.className = [
        'choice-button',
        renderedChoice.important ? 'choice-button--important' : '',
        renderedChoice.visited ? 'choice-button--visited' : '',
      ]
        .filter(Boolean)
        .join(' ')
      button.dataset.choiceKey = renderedChoice.key
      button.dataset.visited = String(renderedChoice.visited)
      button.dataset.important = String(renderedChoice.important)
      const label = uiDocument.createElement('span')
      label.className = 'choice-copy'
      label.textContent = getChoiceLabel(choice, options.engine)
      button.append(label)

      if (renderedChoice.important || renderedChoice.visited) {
        const meta = uiDocument.createElement('span')
        meta.className = 'choice-meta'
        meta.textContent = renderedChoice.visited ? 'déjà lu' : 'important'
        button.append(meta)
      }
      button.addEventListener('click', () => {
        activeDialogue = options.engine.choose(renderedChoice)
        renderDialogue()
        if (activeDialogue) {
          showPassiveToasts(
            activeDialogue.passives.filter((passive) => passive.display === 'toast'),
            options.toastRoot,
          )
        }
        syncState()
      })
      choiceList.append(button)
    })
  }

  function hideDialogueSurface(): void {
    setDialogueSurfaceOpen(options.root, false)
    options.root.hidden = true
    options.root.innerHTML = ''
  }

  function closeActiveSurface(): void {
    options.engine.close()
    activeDialogue = undefined
    hideDialogueSurface()
    syncState()
    restoreSurfaceFocus()
  }

  function restoreActiveSurface(): boolean {
    const surface = options.engine.state.activeSurface

    if (!surface) {
      return false
    }

    try {
      if (surface.type === 'dialogue') {
        activeDialogue = options.engine.restoreDialogue(surface.scriptId, surface.nodeId, surface.checkId)
        renderDialogue()
        syncState()
        return true
      }

      activeDialogue = undefined
      const orb = options.engine.inspectOrb(surface.orbId, { restore: true })
      showDialogueSurface()
      renderOrb(orb, options.root, closeActiveSurface)
      syncState()
      return true
    } catch {
      options.engine.close()
      activeDialogue = undefined
      hideDialogueSurface()
      syncState()
      return false
    }
  }

  function setInteraction(target?: InteractionTarget): void {
    interactionTarget = target
    options.prompt.hidden = !target
    options.promptLabel.textContent = target?.label ?? ''
  }

  function triggerExplorationPassive(contextId: string): void {
    const triggeredPassives = options.engine.triggerExploration(contextId)
    showPassiveToasts(
      triggeredPassives.filter((passive) => passive.display === 'toast'),
      options.toastRoot,
    )
    syncState()
  }

  function openOrb(orbId: string): void {
    const orb = options.engine.inspectOrb(orbId)
    showDialogueSurface()
    renderOrb(orb, options.root, closeActiveSurface)
    showPassiveToasts(
      orb.passives.filter((passive) => passive.display === 'toast'),
      options.toastRoot,
    )
    syncState()
  }

  function triggerProximityOrb(orbId: string): void {
    const orb = options.engine.triggerProximityOrb(orbId)

    if (!orb) {
      return
    }

    showOrbToast(orb, options.toastRoot)
    showPassiveToasts(
      orb.passives.filter((passive) => passive.display === 'toast'),
      options.toastRoot,
    )
    syncState()
  }

  options.prompt.addEventListener('click', () => interactionTarget?.run())
  uiDocument.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || options.root.hidden) {
      return
    }

    event.preventDefault()
    closeActiveSurface()
  })
  syncState()

  function showDialogueSurface(): void {
    if (options.root.hidden) {
      const activeElement = uiDocument.activeElement
      restoreFocusTo = activeElement instanceof HTMLElement && !options.root.contains(activeElement)
        ? activeElement
        : undefined
    }

    setDialogueSurfaceOpen(options.root, true)
  }

  function restoreSurfaceFocus(): void {
    if (restoreFocusTo?.isConnected) {
      restoreFocusTo.focus()
    }

    restoreFocusTo = undefined
  }

  return {
    openDialogue,
    openOrb,
    setInteraction,
    triggerProximityOrb,
    triggerExplorationPassive,
    closeSurface: closeActiveSurface,
    restoreActiveSurface,
    isDialogueOpen: () => Boolean(activeDialogue) || !options.root.hidden,
  }
}

function renderOrb(orb: RenderedOrb, root: HTMLDivElement, onClose: () => void): void {
  setDialogueSurfaceOpen(root, true)
  const voice = orb.voice ? voiceById[orb.voice] : undefined

  root.hidden = false
  root.innerHTML = `
    <article class="dialogue-panel orb-panel">
      <div class="speaker-line">
        <span id="dialogue-title">${escapeHtml(orb.title)}</span>
        <button class="orb-close" type="button">Fermer</button>
      </div>
      <p class="dialogue-text">${escapeHtml(orb.text)}</p>
      ${
        voice && orb.voiceText
          ? `
            <aside class="passive-aside" style="--voice-color: ${voice.color}">
              <div class="passive-speaker">${escapeHtml(voice.name)}</div>
              <p>${escapeHtml(orb.voiceText)}</p>
            </aside>
          `
          : ''
      }
    </article>
  `

  const closeButton = root.querySelector<HTMLButtonElement>('.orb-close')

  closeButton?.addEventListener('click', () => {
    onClose()
  })
  closeButton?.focus()
}

function setDialogueSurfaceOpen(root: HTMLElement, open: boolean): void {
  root.ownerDocument.body.classList.toggle('dialogue-open', open)
}

function renderPassiveAside(passive: PassiveTrigger): string {
  const channel = getPassiveChannel(passive)

  return `
    <aside class="passive-aside" style="--voice-color: ${channel.color}">
      <div class="passive-speaker">${escapeHtml(channel.name)}</div>
      <p>${escapeHtml(passive.text)}</p>
    </aside>
  `
}

function showPassiveToasts(passives: PassiveTrigger[], toastRoot: HTMLDivElement): void {
  const toastDocument = toastRoot.ownerDocument

  passives.forEach((passive) => {
    const channel = getPassiveChannel(passive)
    const toast = toastDocument.createElement('article')
    toast.className = 'passive-toast'
    toast.style.setProperty('--voice-color', channel.color)
    toast.innerHTML = `
      <div class="passive-toast-head">
        <span>${escapeHtml(channel.name)}</span>
        <button type="button" aria-label="Fermer la pensée">×</button>
      </div>
      <p>${escapeHtml(passive.text)}</p>
    `

    toast.querySelector('button')?.addEventListener('click', () => toast.remove())
    appendToast(toast, toastRoot)
  })
}

function showOrbToast(orb: RenderedOrb, toastRoot: HTMLDivElement): void {
  const toastDocument = toastRoot.ownerDocument
  const voice = orb.voice ? voiceById[orb.voice] : undefined
  const toast = toastDocument.createElement('article')
  toast.className = 'passive-toast orb-toast'
  toast.style.setProperty('--voice-color', voice?.color ?? '#d7a84b')
  toast.innerHTML = `
    <div class="passive-toast-head">
      <span>${escapeHtml(orb.title)}</span>
      <button type="button" aria-label="Fermer l'observation">×</button>
    </div>
    <p>${escapeHtml(orb.text)}</p>
    ${
      voice && orb.voiceText
        ? `
          <p class="orb-toast-voice">
            <strong>${escapeHtml(voice.name)}</strong>: ${escapeHtml(orb.voiceText)}
          </p>
        `
        : ''
    }
  `

  toast.querySelector('button')?.addEventListener('click', () => toast.remove())
  appendToast(toast, toastRoot)
}

function appendToast(toast: HTMLElement, toastRoot: HTMLDivElement): void {
  toastRoot.append(toast)
  pruneToastStack(toastRoot)
}

function pruneToastStack(toastRoot: HTMLDivElement): void {
  const toasts = Array.from(toastRoot.querySelectorAll<HTMLElement>('.passive-toast'))

  while (toasts.length > MAX_DESKTOP_TOASTS) {
    toasts.shift()?.remove()
  }
}

function getPassiveChannel(passive: PassiveTrigger): { name: string; color: string } {
  if (passive.voice) {
    return voiceById[passive.voice]
  }

  if (passive.parasite) {
    return parasiteById[passive.parasite]
  }

  return {
    name: 'Pensée',
    color: '#d7a84b',
  }
}

function renderObjective(state: GameState, objective: HTMLParagraphElement): void {
  objective.textContent = getObjective(state)
}

function getObjective(state: GameState): string {
  const flags = state.flags
  const completedChecks = state.completedChecks

  if (!flags.woke_up) {
    return 'Reprendre assez de corps pour comprendre pourquoi Karine appelle depuis le P2.'
  }

  if (!flags.trunk_opened) {
    return "Faire ouvrir l'utilitaire municipal sans laisser Karine écrire seule la version officielle."
  }

  if (!flags.papers_seen) {
    return "Regarder ce qui est posé sur le corps avant que quelqu'un transforme tes papiers en aveu."
  }

  if (!flags.page_found) {
    return "Fouiller le coffre et le corps d'Ahmed pour trouver ce que la mise en scène n'a pas prévu."
  }

  if (!flags.page_read) {
    return "Lire la page d'Ahmed: caméra morte, badge chantier, Hami, Amar, Sofiane."
  }

  if (!completedChecks.camera_dead_angle) {
    return "Traiter la piste caméra: comprendre pourquoi une caméra morte a encore un support retouché."
  }

  if (!completedChecks.badge_access_chain) {
    return "Traiter la piste badge: relier badge chantier, badge municipal et lecteur P2."
  }

  if (!completedChecks.hami_prescription_line) {
    return "Traiter la piste Hami: relire l'ordonnance malgré ce que La Dose protège."
  }

  if (!flags.sofiane_met || !flags.amar_met) {
    return "Confronter Amar et Sofiane avec caméra, badge et Hami avant que les pistes refroidissent."
  }

  return "Reconstruire qui a utilisé la ville, tes papiers et ton corps pour te déclarer mort à ta place."
}

function renderClues(state: GameState, clueList: HTMLUListElement): void {
  const clueDocument = clueList.ownerDocument
  clueList.innerHTML = ''

  if (state.clues.length === 0) {
    const empty = clueDocument.createElement('li')
    empty.className = 'empty-line'
    empty.textContent = 'Rien qui tienne debout.'
    clueList.append(empty)
    return
  }

  const groupedClues = groupClues(state.clues)

  CLUE_GROUPS.forEach((group) => {
    const clues = groupedClues.get(group.id)

    if (!clues?.length) {
      return
    }

    const groupItem = clueDocument.createElement('li')
    groupItem.className = 'clue-group'

    const heading = clueDocument.createElement('div')
    heading.className = 'clue-group-heading'
    heading.innerHTML = `
      <span>${escapeHtml(group.label)}</span>
      <span>${clues.length}</span>
    `
    groupItem.append(heading)

    const nestedList = clueDocument.createElement('ul')
    nestedList.className = 'clue-group-list'

    clues
      .slice()
      .reverse()
      .forEach((clue) => {
        const item = clueDocument.createElement('li')
        item.textContent = clue
        nestedList.append(item)
      })

    groupItem.append(nestedList)
    clueList.append(groupItem)
  })
}

function groupClues(clues: string[]): Map<string, string[]> {
  const groupedClues = new Map<string, string[]>(CLUE_GROUPS.map((group) => [group.id, []]))

  clues.forEach((clue) => {
    const normalizedClue = clue.toLocaleLowerCase('fr-FR')
    const group = CLUE_GROUPS.reduce<ClueGroup | undefined>((bestGroup, candidate) => {
      if (candidate.id === 'other') {
        return bestGroup
      }

      const candidateScore = getClueGroupScore(normalizedClue, candidate.keywords)
      const bestScore = bestGroup ? getClueGroupScore(normalizedClue, bestGroup.keywords) : 0

      return candidateScore > bestScore ? candidate : bestGroup
    }, undefined)

    groupedClues.get(group?.id ?? 'other')?.push(clue)
  })

  return groupedClues
}

function getClueGroupScore(clue: string, keywords: readonly string[]): number {
  return keywords.reduce((score, keyword) => {
    return clue.includes(keyword) ? score + 1 : score
  }, 0)
}

function renderVoices(state: GameState, voiceList: HTMLDivElement): void {
  const voiceDocument = voiceList.ownerDocument
  voiceList.innerHTML = ''

  voices.forEach((voice) => {
    const row = voiceDocument.createElement('div')
    row.className = 'voice-row'
    row.title = voice.tagline
    row.innerHTML = `
      <span class="voice-chip" style="background:${voice.color}"></span>
      <span class="voice-name">${escapeHtml(voice.name)}</span>
      <span class="voice-score">${state.voiceStats[voice.id]}</span>
    `
    voiceList.append(row)
  })

  if (state.flags.dose_heard) {
    const dose = parasiteById.dose
    const row = voiceDocument.createElement('div')
    row.className = 'voice-row voice-row--parasite'
    row.title = dose.tagline
    row.innerHTML = `
      <span class="voice-chip" style="background:${dose.color}"></span>
      <span class="voice-name">${escapeHtml(dose.name)}</span>
      <span class="voice-score">parasite</span>
    `
    voiceList.append(row)
  }
}

function getChoiceLabel(choice: DialogueChoice, engine: NarrativeEngine): string {
  if (!choice.check) {
    return choice.label
  }

  const existingResult = engine.getCheckResult(choice.check.id)

  if (existingResult) {
    return `${choice.label} [${formatStoredCheckResult(existingResult)}]`
  }

  const voice = voiceById[choice.check.voice]
  const supportVoice = choice.check.supportVoice ? voiceById[choice.check.supportVoice] : undefined
  const stat = engine.state.voiceStats[choice.check.voice]
  const supportStat = choice.check.supportVoice ? engine.state.voiceStats[choice.check.supportVoice] : undefined
  const statLabel = supportVoice && supportStat !== undefined
    ? `${voice.name} + ${supportVoice.name}: d6 + ${stat} + ${supportStat}`
    : `${voice.name}: d6 + ${stat}`

  return `${choice.label} [${statLabel} vs ${choice.check.difficulty}]`
}

function formatStoredCheckResult(result: CheckResult): string {
  const voice = voiceById[result.voice]
  const supportVoice = result.supportVoice ? voiceById[result.supportVoice] : undefined
  const voiceLabel = supportVoice ? `${voice.name} + ${supportVoice.name}` : voice.name
  const outcome = result.passed ? 'déjà réussi' : 'déjà raté'

  return `${voiceLabel}: ${outcome} ${result.total}/${result.difficulty}`
}

function formatDetailedCheckResult(result: CheckResult): string {
  const voice = voiceById[result.voice]
  const supportVoice = result.supportVoice ? voiceById[result.supportVoice] : undefined
  const supportPart = supportVoice && result.supportStat !== undefined
    ? ` + ${supportVoice.name} ${result.supportStat}`
    : ''
  const outcome = result.passed ? 'Réussi' : 'Raté'

  return `${outcome}: d6 ${result.roll} + ${voice.name} ${result.stat}${supportPart} = ${result.total} vs ${result.difficulty}`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
