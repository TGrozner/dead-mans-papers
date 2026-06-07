import { parasiteById, voiceById, voices } from './content'
import clueGroupsJson from './clue-groups.json'
import { trapFocus } from './focus'
import type {
  CheckResult,
  ChoicePersonalityTag,
  DialogueChoice,
  GameState,
  IdentityPosture,
  InteractionTarget,
  ParasiteId,
  PassiveTrigger,
  RenderedOrb,
  RenderedDialogue,
  VoiceId,
} from './types'
import type { NarrativeEngine } from './narrative'

const MAX_DESKTOP_TOASTS = 5
const MAX_COMPACT_TOASTS = 2
const COMPACT_TOAST_MEDIA = '(max-width: 899px), (pointer: coarse)'
const COMPACT_TOAST_TTL_MS = 6400
const TOAST_LEAVE_MS = 190

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
  caseMomentum: HTMLDivElement
  leadList: HTMLOListElement
  clueList: HTMLUListElement
  voiceList: HTMLDivElement
  onStateChanged: (state: GameState) => void
}

interface CaseStep {
  id: string
  label: string
  isDone: (state: GameState) => boolean
}

interface ActiveLead {
  label: string
  detail: string
  hot?: boolean
}

interface ChoicePersonalityBadge {
  key: ChoicePersonalityTag
  label: string
  title: string
  color: string
}

const POSTURE_PERSONALITY_DETAILS: Record<
  `posture:${IdentityPosture}`,
  { label: string; title: string; color: string }
> = {
  'posture:accept': {
    label: 'Nom',
    title: 'Assumer le nom et reprendre la version officielle avant les autres.',
    color: '#d7a84b',
  },
  'posture:refuse': {
    label: 'Refus',
    title: "Refuser le rôle qu'on colle à Zinédine.",
    color: '#8ea0ff',
  },
  'posture:perform': {
    label: 'Masque',
    title: 'Jouer le personnage que les autres croient déjà connaître.',
    color: '#7bcf8e',
  },
  'posture:defile': {
    label: 'Honte',
    title: 'Utiliser la honte au lieu de la cacher.',
    color: '#c77bb8',
  },
}

const CASE_STEPS: CaseStep[] = [
  {
    id: 'wake',
    label: 'Reprendre corps',
    isDone: (state) => Boolean(state.flags.woke_up),
  },
  {
    id: 'trunk',
    label: 'Forcer le coffre',
    isDone: (state) => Boolean(state.flags.trunk_opened),
  },
  {
    id: 'name',
    label: 'Nom sur Ahmed',
    isDone: (state) => Boolean(state.flags.papers_seen || state.flags.identity_chosen),
  },
  {
    id: 'page',
    label: "Page d'Ahmed",
    isDone: (state) => Boolean(state.flags.page_read),
  },
  {
    id: 'camera',
    label: 'Caméra P2',
    isDone: (state) => Boolean(state.completedChecks.camera_dead_angle),
  },
  {
    id: 'badge',
    label: 'Badge / accès',
    isDone: (state) => Boolean(state.completedChecks.badge_access_chain),
  },
  {
    id: 'hami',
    label: 'Hami / ordonnance',
    isDone: (state) => Boolean(state.completedChecks.hami_prescription_line),
  },
  {
    id: 'witnesses',
    label: 'Amar + Sofiane',
    isDone: (state) => hasAmarConfrontation(state.flags) && hasSofianeConfrontation(state.flags),
  },
]

const PRESSURE_FLAGS = [
  'karine_call_ignored',
  'leduc_knows_addiction',
  'leduc_saw_hand',
  'leduc_can_use_addiction',
  'leduc_saw_withdrawal',
  'wake_body_exposed',
  'cup_craving_exposed',
  'leduc_can_frame_agitation',
] as const

export function createGameUi(options: GameUiOptions) {
  let activeDialogue: RenderedDialogue | undefined
  let interactionTarget: InteractionTarget | undefined
  let restoreFocusTo: HTMLElement | undefined
  const uiDocument = options.root.ownerDocument

  function syncState(): void {
    renderObjective(options.engine.state, options.objective)
    renderCaseMomentum(options.engine.state, options.caseMomentum)
    renderActiveLeads(options.engine.state, options.leadList)
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
    const channelColor = getSafeColor(voice?.color ?? parasite?.color)
    const check = activeDialogue.checkResult
    const dialoguePassives = activeDialogue.passives.filter((passive) => passive.display === 'dialogue')
    const checkLabel = check ? formatDetailedCheckResult(check) : ''
    const canCloseDialogue = canCloseActiveDialogue(activeDialogue, options.engine.state)

    options.root.hidden = false
    options.root.innerHTML = `
      <article class="dialogue-panel">
        <div class="speaker-line">
          <span id="dialogue-title">${escapeHtml(node.speaker)}</span>
          <div class="speaker-actions">
            <span class="check-result">${escapeHtml(checkLabel)}</span>
            ${canCloseDialogue ? '<button class="dialogue-close" type="button">Quitter</button>' : ''}
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

    if (!choiceList) {
      throw new Error('Dialogue choice list did not render')
    }

    closeButton?.addEventListener('click', () => {
      closeActiveSurface()
    })

    let firstChoiceButton: HTMLButtonElement | undefined
    activeDialogue.choices.forEach((renderedChoice) => {
      const choice = renderedChoice.choice
      const personalityBadges = getChoicePersonalityBadges(choice)
      const button = uiDocument.createElement('button')
      button.type = 'button'
      firstChoiceButton ??= button
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
      if (personalityBadges.length > 0) {
        button.dataset.choicePersonality = personalityBadges.map((badge) => badge.key).join(' ')
        button.dataset.choicePersonalityPrimary = personalityBadges[0].key
        button.style.setProperty('--choice-personality-color', personalityBadges[0].color)
        button.title = `Type d'option: ${personalityBadges.map((badge) => badge.label).join(' + ')}`
      }
      const label = uiDocument.createElement('span')
      label.className = 'choice-copy'
      label.textContent = getChoiceLabel(choice, options.engine)
      button.append(label)

      const asides = renderChoiceAsides(uiDocument, renderedChoice, personalityBadges)
      if (asides) {
        button.append(asides)
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

    const initialFocus = closeButton ?? firstChoiceButton
    initialFocus?.focus({ preventScroll: true })
  }

  function hideDialogueSurface(): void {
    setDialogueSurfaceOpen(options.root, false)
    options.root.hidden = true
    options.root.innerHTML = ''
  }

  function closeActiveSurface(): void {
    if (!canCloseActiveDialogue(activeDialogue, options.engine.state)) {
      return
    }

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
    if (options.root.hidden) {
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      closeActiveSurface()
      return
    }

    trapFocus(event, options.root)
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
  const voiceColor = getSafeColor(voice?.color)

  root.hidden = false
  root.innerHTML = `
    <article class="dialogue-panel orb-panel">
      <div class="speaker-line">
        <span id="dialogue-title">${escapeHtml(orb.title)}</span>
        <button class="orb-close" type="button">Fermer</button>
      </div>
      <p class="dialogue-text">${escapeHtml(orb.text)}</p>
      ${
        voice && orb.voiceText && voiceColor
          ? `
            <aside class="passive-aside" style="--voice-color: ${voiceColor}">
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

function canCloseActiveDialogue(dialogue: RenderedDialogue | undefined, state: GameState): boolean {
  return !dialogue || dialogue.script.id !== 'wake_up' || Boolean(state.flags.woke_up)
}

function setDialogueSurfaceOpen(root: HTMLElement, open: boolean): void {
  root.ownerDocument.body.classList.toggle('dialogue-open', open)
}

function renderPassiveAside(passive: PassiveTrigger): string {
  const channel = getPassiveChannel(passive)
  const channelColor = getSafeColor(channel.color) ?? '#d7a84b'

  return `
    <aside class="passive-aside" style="--voice-color: ${channelColor}">
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
    toast.style.setProperty('--voice-color', getSafeColor(channel.color) ?? '#d7a84b')
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
  const voiceColor = getSafeColor(voice?.color)
  const toast = toastDocument.createElement('article')
  toast.className = 'passive-toast orb-toast'
  toast.style.setProperty('--voice-color', voiceColor ?? '#d7a84b')
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

  if (usesCompactToasts(toastRoot)) {
    scheduleToastRemoval(toast)
  }
}

function pruneToastStack(toastRoot: HTMLDivElement): void {
  const toasts = Array.from(toastRoot.querySelectorAll<HTMLElement>('.passive-toast'))
  const maxToasts = usesCompactToasts(toastRoot) ? MAX_COMPACT_TOASTS : MAX_DESKTOP_TOASTS

  while (toasts.length > maxToasts) {
    toasts.shift()?.remove()
  }
}

function scheduleToastRemoval(toast: HTMLElement): void {
  const toastWindow = toast.ownerDocument.defaultView

  if (!toastWindow) {
    return
  }

  toastWindow.setTimeout(() => {
    if (!toast.isConnected) {
      return
    }

    toast.classList.add('passive-toast--leaving')
    toastWindow.setTimeout(() => toast.remove(), TOAST_LEAVE_MS)
  }, COMPACT_TOAST_TTL_MS)
}

function usesCompactToasts(toastRoot: HTMLElement): boolean {
  return Boolean(toastRoot.ownerDocument.defaultView?.matchMedia(COMPACT_TOAST_MEDIA).matches)
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

function renderCaseMomentum(state: GameState, caseMomentum: HTMLDivElement): void {
  const completedSteps = CASE_STEPS.filter((step) => step.isDone(state)).length
  const evidenceProgress = Math.round((completedSteps / CASE_STEPS.length) * 100)
  const pressureCount = PRESSURE_FLAGS.filter((flag) => state.flags[flag]).length
  const pressureProgress = Math.round((Math.min(pressureCount, 6) / 6) * 100)

  caseMomentum.dataset.evidenceCount = String(completedSteps)
  caseMomentum.dataset.pressureCount = String(pressureCount)
  caseMomentum.style.setProperty('--case-evidence-progress', `${evidenceProgress}%`)
  caseMomentum.style.setProperty('--case-pressure-progress', `${pressureProgress}%`)
  caseMomentum.innerHTML = `
    <div class="case-gauge-grid">
      <div class="case-meter case-meter--evidence">
        <span>Appuis</span>
        <strong>${completedSteps}/${CASE_STEPS.length}</strong>
        <i aria-hidden="true"></i>
      </div>
      <div class="case-meter case-meter--pressure">
        <span>Angles contre toi</span>
        <strong>${pressureCount}</strong>
        <i aria-hidden="true"></i>
      </div>
    </div>
    <ol class="case-step-list">
      ${CASE_STEPS.map((step, index) => {
        const done = step.isDone(state)
        const current = !done && CASE_STEPS.slice(0, index).every((previousStep) => previousStep.isDone(state))

        return `
          <li class="case-step ${done ? 'case-step--done' : ''} ${current ? 'case-step--current' : ''}">
            <span>${escapeHtml(step.label)}</span>
          </li>
        `
      }).join('')}
    </ol>
    <p class="case-heatline">${escapeHtml(getCaseHeatline(completedSteps, pressureCount, state))}</p>
  `
}

function getCaseHeatline(completedSteps: number, pressureCount: number, state: GameState): string {
  if (!state.flags.woke_up) {
    return "Karine a déjà appelé. Ton premier geste décide l'état dans lequel elle va te raconter."
  }

  if (pressureCount > completedSteps) {
    return 'Karine a plus de matière contre toi que toi contre la scène.'
  }

  if (!state.flags.page_read && state.flags.trunk_opened) {
    return "Le coffre est ouvert, mais la vraie prise est encore dans la doublure."
  }

  if (completedSteps >= 7 && (!hasAmarConfrontation(state.flags) || !hasSofianeConfrontation(state.flags))) {
    return 'Les preuves sont assez chaudes pour ouvrir les témoins.'
  }

  if (completedSteps === CASE_STEPS.length) {
    return 'La version officielle n’est plus seule dans le parking.'
  }

  return 'Chaque appui réduit la place où Karine peut ranger ton trou noir.'
}

function renderActiveLeads(state: GameState, leadList: HTMLOListElement): void {
  const leads = getActiveLeads(state).slice(0, 3)
  const leadDocument = leadList.ownerDocument
  leadList.innerHTML = ''

  leads.forEach((lead) => {
    const item = leadDocument.createElement('li')
    item.className = lead.hot ? 'lead-item lead-item--hot' : 'lead-item'
    item.innerHTML = `
      <span>${escapeHtml(lead.label)}</span>
      <small>${escapeHtml(lead.detail)}</small>
    `
    leadList.append(item)
  })
}

function getActiveLeads(state: GameState): ActiveLead[] {
  const { completedChecks, flags } = state

  if (!flags.woke_up) {
    return [
      {
        label: 'Téléphone fissuré',
        detail: 'Karine a laissé 12 appels avant même que tu tiennes debout.',
        hot: true,
      },
      {
        label: 'Gobelet',
        detail: 'Le plastique peut devenir honte, preuve ou dette chimique.',
      },
      {
        label: 'Corps debout',
        detail: 'Le premier check donne à Karine plus ou moins de prise.',
      },
    ]
  }

  if (!flags.trunk_opened) {
    return [
      {
        label: 'Utilitaire municipal',
        detail: "Forcer Karine à ouvrir avant qu'elle fixe le mot incident.",
        hot: true,
      },
      {
        label: 'Karine Leduc',
        detail: "Ses appels et ses mots propres peuvent devenir des contradictions.",
      },
    ]
  }

  if (!flags.papers_seen) {
    return [
      {
        label: 'Nom sur le mort',
        detail: 'Regarder ce que la scène a planté sur Ahmed.',
        hot: true,
      },
      {
        label: 'Corps sans carnet',
        detail: "L'absence d'objets parle autant que le coffre.",
      },
    ]
  }

  if (!flags.identity_chosen) {
    return [
      {
        label: 'Posture',
        detail: 'Choisir comment porter Zinédine Saïdi quand le papier parle plus propre que toi.',
        hot: true,
      },
    ]
  }

  if (!flags.page_found) {
    return [
      {
        label: 'Fouille du coffre',
        detail: 'La page sort même si le corps te trahit, mais Karine peut le voir.',
        hot: true,
      },
      {
        label: 'Papiers',
        detail: 'Badge, ordonnance, photo: trois façons de te rendre administrativement utile.',
      },
      {
        label: 'Carnet absent',
        detail: "Ahmed notait trop de choses pour disparaître sans manque.",
      },
    ]
  }

  if (!flags.page_read) {
    return [
      {
        label: "Page d'Ahmed",
        detail: 'Caméra morte, badge chantier, Hami, Amar, Sofiane: lis la prise.',
        hot: true,
      },
    ]
  }

  const evidenceLeads: ActiveLead[] = []

  if (!completedChecks.camera_dead_angle) {
    evidenceLeads.push({
      label: 'Caméra P2',
      detail: "Comprendre pourquoi l'angle mort a été choisi.",
      hot: true,
    })
  }

  if (!completedChecks.badge_access_chain) {
    evidenceLeads.push({
      label: 'Badge / accès',
      detail: 'Relier badge chantier, badge municipal et lecteur P2.',
      hot: true,
    })
  }

  if (!completedChecks.hami_prescription_line) {
    evidenceLeads.push({
      label: 'Hami / ordonnance',
      detail: 'Lire ce que La Dose protège trop vite.',
      hot: true,
    })
  }

  if (evidenceLeads.length > 0) {
    return evidenceLeads
  }

  const witnessLeads: ActiveLead[] = []

  if (!hasAmarConfrontation(flags)) {
    witnessLeads.push({
      label: 'Amar',
      detail: "L'ancien gardien peut relier Ahmed, badges et dates.",
      hot: true,
    })
  }

  if (!hasSofianeConfrontation(flags)) {
    witnessLeads.push({
      label: 'Sofiane',
      detail: "La palissade a vu l'utilitaire avant le matin.",
      hot: true,
    })
  }

  if (witnessLeads.length > 0) {
    return witnessLeads
  }

  return [
    {
      label: 'Version concurrente',
      detail: 'Tu as assez de prises pour contredire le dossier propre de Karine.',
      hot: true,
    },
  ]
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

  if (!hasAmarConfrontation(flags) || !hasSofianeConfrontation(flags)) {
    return "Confronter Amar et Sofiane avec caméra, badge et Hami avant que les pistes refroidissent."
  }

  return "Reconstruire qui a utilisé la ville, tes papiers et ton corps pour te déclarer mort à ta place."
}

function hasAmarConfrontation(flags: GameState['flags']): boolean {
  return Boolean(flags.amar_confronted || flags.amar_vendor_checked || flags.amar_last_warning_checked)
}

function hasSofianeConfrontation(flags: GameState['flags']): boolean {
  return Boolean(
    flags.sofiane_confronted ||
      flags.sofiane_saw_van ||
      flags.sofiane_saw_returning_worker ||
      flags.sofiane_trusts_wreck ||
      (flags.sofiane_fled && flags.page_read && (flags.hami_line_checked || flags.badge_chain_checked)),
  )
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
    const score = state.voiceStats[voice.id]
    const row = voiceDocument.createElement('div')
    row.className = 'voice-row'
    row.title = voice.tagline
    row.style.setProperty('--voice-color', getSafeColor(voice.color) ?? '#d7a84b')
    row.style.setProperty('--voice-fill', `${Math.max(0, Math.min(score, 4)) * 25}%`)
    row.innerHTML = `
      <span class="voice-chip"></span>
      <span class="voice-name">${escapeHtml(voice.name)}</span>
      <span class="voice-score">${score}</span>
    `
    voiceList.append(row)
  })

  if (state.flags.dose_heard) {
    const dose = parasiteById.dose
    const row = voiceDocument.createElement('div')
    row.className = 'voice-row voice-row--parasite'
    row.title = dose.tagline
    row.style.setProperty('--voice-color', getSafeColor(dose.color) ?? '#d7a84b')
    row.style.setProperty('--voice-fill', '100%')
    row.innerHTML = `
      <span class="voice-chip"></span>
      <span class="voice-name">${escapeHtml(dose.name)}</span>
      <span class="voice-score">parasite</span>
    `
    voiceList.append(row)
  }
}

function renderChoiceAsides(
  choiceDocument: Document,
  renderedChoice: RenderedDialogue['choices'][number],
  personalityBadges: ChoicePersonalityBadge[],
): HTMLSpanElement | undefined {
  if (personalityBadges.length === 0 && !renderedChoice.important && !renderedChoice.visited) {
    return undefined
  }

  const asides = choiceDocument.createElement('span')
  asides.className = 'choice-asides'

  personalityBadges.forEach((badge) => {
    const tag = choiceDocument.createElement('span')
    tag.className = 'choice-personality'
    tag.dataset.choicePersonality = badge.key
    tag.title = badge.title
    tag.setAttribute('aria-hidden', 'true')
    tag.style.setProperty('--choice-personality-color', badge.color)

    const chip = choiceDocument.createElement('span')
    chip.className = 'choice-personality-chip'

    const label = choiceDocument.createElement('span')
    label.textContent = badge.label

    tag.append(chip, label)
    asides.append(tag)
  })

  if (renderedChoice.important || renderedChoice.visited) {
    const meta = choiceDocument.createElement('span')
    meta.className = 'choice-meta'
    meta.textContent = renderedChoice.visited ? 'déjà lu' : 'important'
    asides.append(meta)
  }

  return asides
}

function getChoicePersonalityBadges(choice: DialogueChoice): ChoicePersonalityBadge[] {
  const tags: ChoicePersonalityTag[] = []

  for (const tag of getExplicitChoicePersonalityTags(choice)) {
    addChoicePersonalityTag(tags, tag)
  }

  if (choice.check) {
    addChoicePersonalityTag(tags, choice.check.voice)
    if (choice.check.supportVoice) {
      addChoicePersonalityTag(tags, choice.check.supportVoice)
    }
  }

  for (const effect of choice.effects ?? []) {
    if (effect.type === 'identity_posture' && effect.posture) {
      addChoicePersonalityTag(tags, `posture:${effect.posture}`)
    }

    if (effect.type === 'voice_bump' && effect.voice) {
      addChoicePersonalityTag(tags, effect.voice)
    }

    if (effect.type === 'flag' && effect.flag && isDoseFlag(effect.flag)) {
      addChoicePersonalityTag(tags, 'dose')
    }
  }

  if (choice.next?.startsWith('dose_') || choice.next === 'dose_first' || choice.label.includes('La Dose')) {
    addChoicePersonalityTag(tags, 'dose')
  }

  return tags.flatMap((tag) => {
    const badge = getChoicePersonalityBadge(tag)
    return badge ? [badge] : []
  })
}

function getExplicitChoicePersonalityTags(choice: DialogueChoice): ChoicePersonalityTag[] {
  if (!choice.personality) {
    return []
  }

  return Array.isArray(choice.personality) ? choice.personality : [choice.personality]
}

function addChoicePersonalityTag(tags: ChoicePersonalityTag[], tag: ChoicePersonalityTag): void {
  if (!tags.includes(tag)) {
    tags.push(tag)
  }
}

function getChoicePersonalityBadge(tag: ChoicePersonalityTag): ChoicePersonalityBadge | undefined {
  if (isVoiceId(tag)) {
    const voice = voiceById[tag]
    return {
      key: tag,
      label: voice.name,
      title: voice.tagline,
      color: getSafeColor(voice.color) ?? '#d7a84b',
    }
  }

  if (isParasiteId(tag)) {
    const parasite = parasiteById[tag]
    return {
      key: tag,
      label: parasite.name,
      title: parasite.tagline,
      color: getSafeColor(parasite.color) ?? '#9a6a3f',
    }
  }

  if (isPosturePersonalityTag(tag)) {
    const posture = POSTURE_PERSONALITY_DETAILS[tag]
    return {
      key: tag,
      label: posture.label,
      title: posture.title,
      color: getSafeColor(posture.color) ?? '#c77bb8',
    }
  }

  return undefined
}

function isVoiceId(value: string): value is VoiceId {
  return Object.hasOwn(voiceById, value)
}

function isParasiteId(value: string): value is ParasiteId {
  return Object.hasOwn(parasiteById, value)
}

function isPosturePersonalityTag(value: string): value is `posture:${IdentityPosture}` {
  return Object.hasOwn(POSTURE_PERSONALITY_DETAILS, value)
}

function isDoseFlag(flag: string): boolean {
  return flag === 'dose_heard' || flag === 'dose_bargained' || flag === 'dose_refused_at_wake'
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

function getSafeColor(color: string | undefined): string | undefined {
  return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : undefined
}
