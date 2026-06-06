import './style.css'
import {
  isTutorialHidden,
  isTutorialSeen,
  loadGameState,
  resetGameState,
  saveGameState,
  setTutorialHidden,
  setTutorialSeen,
} from './game/save'
import { NarrativeEngine } from './game/narrative'
import { createGameUi } from './game/ui'
import { type DebugEntry, isDebugEnabled, setDebugEnabled } from './game/debug'
import { trapFocus } from './game/focus'
import type { InteractionTarget } from './game/types'
import { AmbientAudioController } from './game/audio'

const appRoot = getAppRoot()
const INITIAL_MOBILE_SCENE_STOP = 0.5

appRoot.innerHTML = `
  <section class="game-shell" aria-label="Dead Man's Papers">
    <header class="topbar">
      <div class="topbar-title">
        <p class="kicker">Dead Man's Papers</p>
        <h1>Parking P2</h1>
      </div>
      <div class="topbar-actions">
        <button id="audio-toggle" class="case-stamp audio-toggle" type="button" aria-pressed="true">
          Son
        </button>
        <button id="case-toggle" class="case-stamp case-toggle" type="button" aria-controls="case-panel" aria-expanded="true">
          Dossier ouvert
        </button>
      </div>
    </header>

    <div class="play-area">
      <div id="stage-viewport" class="stage-viewport">
        <div class="stage-wrap">
          <div class="stage-frame">
            <div id="game-stage" aria-label="Les Miroirs, parking P2"></div>
            <button id="interaction-prompt" class="interaction-prompt" type="button" hidden>
              <span class="prompt-mark" aria-hidden="true">!</span>
              <span id="interaction-label"></span>
            </button>
            <div id="passive-toast-root" class="passive-toast-root" aria-live="polite"></div>
            <div id="debug-log" class="debug-log" aria-label="Debug log" hidden>
              <div class="debug-log-head">
                <span>debug</span>
                <button id="debug-log-disable" type="button">off</button>
              </div>
              <ol id="debug-log-list"></ol>
            </div>
          </div>
        </div>
      </div>

      <aside id="case-panel" class="case-panel case-panel--expanded" aria-label="Dossier">
        <section class="case-section case-section--objective">
          <p class="panel-label">Objectif</p>
          <p id="objective" class="objective">Rester debout assez longtemps pour comprendre ce que Karine cache dans l'utilitaire.</p>
        </section>

        <section class="case-section case-section--momentum">
          <p class="panel-label">Pression</p>
          <div id="case-momentum" class="case-momentum"></div>
        </section>

        <section class="case-section case-section--leads">
          <p class="panel-label">Pistes actives</p>
          <ol id="lead-list" class="lead-list"></ol>
        </section>

        <section class="case-section case-section--clues">
          <p class="panel-label">Indices</p>
          <ul id="clue-list" class="clue-list"></ul>
        </section>

        <section class="case-section case-section--voices">
          <p class="panel-label">Voix internes</p>
          <div id="voice-list" class="voice-list"></div>
        </section>

        <details class="case-danger-zone">
          <summary>Options</summary>
          <button
            id="reset-save"
            class="reset-button"
            type="button"
            data-default-label="Recommencer la partie"
            data-confirm-label="Confirmer recommencer"
          >
            Recommencer la partie
          </button>
        </details>
      </aside>

      <nav id="mobile-scene-nav" class="mobile-scene-nav" aria-label="Cadrage de la scène">
        <button class="scene-nav-button" type="button" data-scene-stop="0" aria-label="Cadrer le coffre">
          Coffre
        </button>
        <button class="scene-nav-button" type="button" data-scene-stop="0.5" aria-label="Cadrer Zinédine">
          Moi
        </button>
        <button class="scene-nav-button" type="button" data-scene-stop="1" aria-label="Cadrer le local technique">
          Local
        </button>
      </nav>
    </div>

    <div id="dialogue-root" class="dialogue-root" role="dialog" aria-modal="true" aria-labelledby="dialogue-title" hidden></div>

    <div id="tutorial-root" class="tutorial-root" role="dialog" aria-modal="true" aria-labelledby="tutorial-title" hidden>
      <article class="tutorial-panel">
        <p class="panel-label">Parking P2</p>
        <h2 id="tutorial-title">Avant d'ouvrir les yeux</h2>
        <div class="tutorial-copy">
          <p>Le béton colle à ta joue. Quelqu'un parle dans le noir de ta tête et personne n'est d'accord sur ton nom.</p>
          <p>Une voix veut dormir. Une autre veut classer les preuves. Une troisième a déjà senti le coffre.</p>
          <p>Quand tes yeux s'ouvrent, touche ce qui insiste. Le dossier gardera les traces que ton corps essaie de perdre.</p>
        </div>
        <label class="tutorial-check">
          <input id="tutorial-hide" type="checkbox" />
          <span>Ne plus me montrer</span>
        </label>
        <button id="tutorial-close" class="tutorial-close" type="button">Commencer</button>
      </article>
    </div>
  </section>
`

const engine = new NarrativeEngine(loadGameState())
const mobileSceneMedia = window.matchMedia('(max-width: 899px)')
let persistOnUnload = true
let tutorialOpen = false
let tutorialRestoreFocusTo: HTMLElement | undefined
const refs = {
  dialogueRoot: getRequiredElement<HTMLDivElement>('#dialogue-root'),
  topbarTitle: getRequiredElement<HTMLElement>('.topbar-title'),
  prompt: getRequiredElement<HTMLButtonElement>('#interaction-prompt'),
  promptLabel: getRequiredElement<HTMLSpanElement>('#interaction-label'),
  toastRoot: getRequiredElement<HTMLDivElement>('#passive-toast-root'),
  objective: getRequiredElement<HTMLParagraphElement>('#objective'),
  caseMomentum: getRequiredElement<HTMLDivElement>('#case-momentum'),
  leadList: getRequiredElement<HTMLOListElement>('#lead-list'),
  clueList: getRequiredElement<HTMLUListElement>('#clue-list'),
  voiceList: getRequiredElement<HTMLDivElement>('#voice-list'),
  playArea: getRequiredElement<HTMLElement>('.play-area'),
  stageViewport: getRequiredElement<HTMLDivElement>('#stage-viewport'),
  sceneNav: getRequiredElement<HTMLElement>('#mobile-scene-nav'),
  tutorialRoot: getRequiredElement<HTMLDivElement>('#tutorial-root'),
  tutorialClose: getRequiredElement<HTMLButtonElement>('#tutorial-close'),
  tutorialHide: getRequiredElement<HTMLInputElement>('#tutorial-hide'),
  resetButton: getRequiredElement<HTMLButtonElement>('#reset-save'),
  casePanel: getRequiredElement<HTMLElement>('#case-panel'),
  caseToggle: getRequiredElement<HTMLButtonElement>('#case-toggle'),
  audioToggle: getRequiredElement<HTMLButtonElement>('#audio-toggle'),
  debugRoot: getRequiredElement<HTMLDivElement>('#debug-log'),
  debugList: getRequiredElement<HTMLOListElement>('#debug-log-list'),
  debugDisable: getRequiredElement<HTMLButtonElement>('#debug-log-disable'),
}
new AmbientAudioController({
  button: refs.audioToggle,
  volume: 0.22,
})
const ui = createGameUi({
  engine,
  root: refs.dialogueRoot,
  prompt: refs.prompt,
  promptLabel: refs.promptLabel,
  toastRoot: refs.toastRoot,
  objective: refs.objective,
  caseMomentum: refs.caseMomentum,
  leadList: refs.leadList,
  clueList: refs.clueList,
  voiceList: refs.voiceList,
  onStateChanged: (state) => saveGameState(state),
})

setupDebugLog()
setupCasePanel()
setupMobileSceneNavigation()
setupModalLayer()
const restoredSurface = ui.restoreActiveSurface()

void loadGame()

if (!restoredSurface) {
  showTutorialIfNeeded()
}

setupResetButton()

window.addEventListener('beforeunload', () => {
  if (persistOnUnload) {
    saveGameState(engine.state)
  }
})

async function loadGame(): Promise<void> {
  const { createMirrorsGame } = await import('./game/createMirrorsGame')

  createMirrorsGame({
    parent: 'game-stage',
    startDialogue: ui.openDialogue,
    openOrb: ui.openOrb,
    setInteraction: setInteractionTarget,
    triggerProximityOrb: ui.triggerProximityOrb,
    triggerExplorationPassive: ui.triggerExplorationPassive,
    isDialogueOpen: () => tutorialOpen || ui.isDialogueOpen(),
    closeDialogueSurface: ui.closeSurface,
    getState: () => engine.state,
  })
}

function showTutorialIfNeeded(): void {
  if (isTutorialHidden() || isTutorialSeen()) {
    return
  }

  const activeElement = document.activeElement
  tutorialRestoreFocusTo = activeElement instanceof HTMLElement ? activeElement : undefined
  tutorialOpen = true
  refs.tutorialRoot.hidden = false
  syncModalState()
  refs.tutorialClose.focus()
  document.addEventListener('keydown', handleTutorialKeydown)

  refs.tutorialClose.addEventListener('click', closeTutorial, { once: true })
}

function closeTutorial(): void {
  setTutorialHidden(refs.tutorialHide.checked)
  setTutorialSeen(true)
  tutorialOpen = false
  refs.tutorialRoot.hidden = true
  syncModalState()
  document.removeEventListener('keydown', handleTutorialKeydown)

  if (!engine.state.flags.woke_up && !ui.isDialogueOpen()) {
    tutorialRestoreFocusTo?.focus()
    tutorialRestoreFocusTo = undefined
    ui.openDialogue('wake_up')
    return
  }

  tutorialRestoreFocusTo?.focus()
  tutorialRestoreFocusTo = undefined
}

function handleTutorialKeydown(event: KeyboardEvent): void {
  if (!tutorialOpen) {
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    closeTutorial()
    return
  }

  trapFocus(event, refs.tutorialRoot)
}

function setupResetButton(): void {
  const button = refs.resetButton
  let resetConfirmTimer: number | undefined

  function clearResetConfirmation(): void {
    window.clearTimeout(resetConfirmTimer)
    resetConfirmTimer = undefined
    button.dataset.confirming = 'false'
    button.classList.remove('reset-button--confirm')
    button.textContent = button.dataset.defaultLabel ?? 'Recommencer la partie'
  }

  button.addEventListener('click', () => {
    if (button.dataset.confirming === 'true') {
      persistOnUnload = false
      resetGameState()
      setTutorialHidden(false)
      setTutorialSeen(false)
      window.location.reload()
      return
    }

    button.dataset.confirming = 'true'
    button.classList.add('reset-button--confirm')
    button.textContent = button.dataset.confirmLabel ?? 'Confirmer recommencer'
    resetConfirmTimer = window.setTimeout(clearResetConfirmation, 3500)
  })
}

function setupCasePanel(): void {
  const panel = refs.casePanel
  const toggle = refs.caseToggle
  const playArea = panel.closest<HTMLElement>('.play-area')
  let userToggled = false

  function setExpanded(expanded: boolean): void {
    panel.hidden = !expanded
    panel.classList.toggle('case-panel--expanded', expanded)
    panel.classList.toggle('case-panel--collapsed', !expanded)
    playArea?.classList.toggle('play-area--case-collapsed', !expanded)
    syncCasePanelState(expanded)
    toggle.textContent = expanded ? 'Dossier ouvert' : 'Dossier fermé'
    toggle.setAttribute('aria-expanded', String(expanded))
  }

  setExpanded(!mobileSceneMedia.matches)
  mobileSceneMedia.addEventListener('change', (event) => {
    if (!userToggled) {
      setExpanded(!event.matches)
      return
    }

    syncCasePanelState(toggle.getAttribute('aria-expanded') === 'true')
  })

  toggle.addEventListener('click', () => {
    userToggled = true
    setExpanded(toggle.getAttribute('aria-expanded') !== 'true')
  })
}

function setInteractionTarget(target?: InteractionTarget): void {
  const visibleTarget = isMobileCasePanelOpen() ? undefined : target

  ui.setInteraction(visibleTarget)
  document.body.classList.toggle('interaction-prompt-active', Boolean(visibleTarget))
}

function clearInteractionPrompt(): void {
  setInteractionTarget(undefined)
}

function syncCasePanelState(expanded: boolean): void {
  const mobileCaseOpen = expanded && mobileSceneMedia.matches
  document.body.classList.toggle('case-panel-open', mobileCaseOpen)

  if (mobileCaseOpen) {
    clearInteractionPrompt()
  }
}

function isMobileCasePanelOpen(): boolean {
  return document.body.classList.contains('case-panel-open')
}

function setupModalLayer(): void {
  const observer = new MutationObserver(syncModalState)
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
  syncModalState()
}

function syncModalState(): void {
  const dialogueOpen = document.body.classList.contains('dialogue-open')
  const modalOpen = dialogueOpen || tutorialOpen

  document.body.classList.toggle('modal-open', modalOpen)
  document.body.classList.toggle('tutorial-open', tutorialOpen)
  setBackgroundInert(refs.topbarTitle, modalOpen)
  setBackgroundInert(refs.caseToggle, modalOpen)
  setBackgroundInert(refs.playArea, modalOpen)
  setBackgroundInert(refs.dialogueRoot, tutorialOpen)
}

function setBackgroundInert(element: HTMLElement, inert: boolean): void {
  element.inert = inert

  if (inert) {
    element.setAttribute('aria-hidden', 'true')
    return
  }

  element.removeAttribute('aria-hidden')
}

function setupMobileSceneNavigation(): void {
  const viewport = refs.stageViewport
  const nav = refs.sceneNav
  const buttons = Array.from(nav.querySelectorAll<HTMLButtonElement>('[data-scene-stop]'))

  function maxScroll(): number {
    return Math.max(0, viewport.scrollWidth - viewport.clientWidth)
  }

  function scrollToStop(stop: number, behavior: ScrollBehavior = 'smooth'): void {
    viewport.scrollTo({
      left: maxScroll() * stop,
      behavior,
    })
  }

  function syncActiveStop(): void {
    const max = maxScroll()
    const progress = max > 0 ? viewport.scrollLeft / max : 0
    let nearestButton = buttons[0]
    let nearestDistance = Number.POSITIVE_INFINITY

    buttons.forEach((button) => {
      const stop = Number.parseFloat(button.dataset.sceneStop ?? '0')
      const distance = Math.abs(stop - progress)
      const active = distance < nearestDistance

      if (active) {
        nearestButton = button
        nearestDistance = distance
      }

      button.setAttribute('aria-pressed', 'false')
    })

    nearestButton?.setAttribute('aria-pressed', 'true')
    nav.style.setProperty('--scene-pan-progress', `${Math.round(progress * 100)}%`)
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      scrollToStop(Number.parseFloat(button.dataset.sceneStop ?? '0'))
    })
  })

  viewport.addEventListener('scroll', syncActiveStop, { passive: true })
  window.addEventListener('resize', () => {
    syncActiveStop()
  })

  mobileSceneMedia.addEventListener('change', (event) => {
    if (event.matches) {
      requestAnimationFrame(() => scrollToStop(INITIAL_MOBILE_SCENE_STOP, 'auto'))
    }
  })

  requestAnimationFrame(() => {
    if (mobileSceneMedia.matches) {
      scrollToStop(INITIAL_MOBILE_SCENE_STOP, 'auto')
    }

    syncActiveStop()
  })
}

function setupDebugLog(): void {
  if (!isDebugEnabled()) {
    return
  }

  refs.debugRoot.hidden = false
  refs.debugDisable.addEventListener('click', () => {
    setDebugEnabled(false)
    const url = new URL(window.location.href)
    url.searchParams.delete('debug')
    window.history.replaceState({}, '', url)
    refs.debugRoot.hidden = true
  })

  window.addEventListener('dmp:debug', (event) => {
    const entry = (event as CustomEvent<DebugEntry>).detail
    const item = document.createElement('li')
    item.textContent = `${entry.scope}:${entry.event}${entry.data ? ` ${JSON.stringify(entry.data)}` : ''}`
    refs.debugList.prepend(item)

    while (refs.debugList.childElementCount > 18) {
      refs.debugList.lastElementChild?.remove()
    }
  })
}

function getRequiredElement<T extends HTMLElement>(selector: string): T {
  const element = appRoot.querySelector<T>(selector)

  if (!element) {
    throw new Error(`Missing required UI node: ${selector}`)
  }

  return element
}

function getAppRoot(): HTMLDivElement {
  const root = document.querySelector<HTMLDivElement>('#app')

  if (!root) {
    throw new Error('Missing #app mount node')
  }

  return root
}
