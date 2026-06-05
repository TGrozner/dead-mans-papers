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

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Missing #app mount node')
}

app.innerHTML = `
  <section class="game-shell" aria-label="Dead Man's Papers">
    <header class="topbar">
      <div>
        <p class="kicker">Dead Man's Papers</p>
        <h1>Parking P2</h1>
      </div>
      <button id="case-toggle" class="case-stamp case-toggle" type="button" aria-controls="case-panel" aria-expanded="true">
        Dossier ouvert
      </button>
    </header>

    <div class="play-area">
      <div class="stage-wrap">
        <div id="game-stage" aria-label="Les Miroirs, parking P2"></div>
        <button id="interaction-prompt" class="interaction-prompt" type="button" hidden>
          <span class="prompt-mark">!</span>
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

      <aside id="case-panel" class="case-panel case-panel--expanded" aria-label="Dossier">
        <section class="case-section case-section--objective">
          <p class="panel-label">Objectif</p>
          <p id="objective" class="objective">Rester debout assez longtemps pour comprendre ce que Karine cache dans l'utilitaire.</p>
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
    </div>

    <div id="dialogue-root" class="dialogue-root" hidden></div>

    <div id="tutorial-root" class="tutorial-root" role="dialog" aria-modal="true" aria-labelledby="tutorial-title" hidden>
      <article class="tutorial-panel">
        <p class="panel-label">Avant de reprendre</p>
        <h2 id="tutorial-title">Avance, observe, choisis</h2>
        <div class="tutorial-copy">
          <p>Touche ou clique la scène pour te déplacer. Approche une cible, puis utilise le bouton <strong>!</strong> ou retouche-la pour inspecter, parler ou écouter.</p>
          <p>Rien ne s'ouvre par accident: prends une seconde, choisis ton angle, puis assume la scène que tu déclenches.</p>
          <p>Le dossier garde les indices. Les voix internes ne sont pas des conseils sages: elles peuvent aider, mentir, paniquer ou pousser trop loin.</p>
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
let persistOnUnload = true
let tutorialOpen = false
const ui = createGameUi({
  engine,
  root: document.querySelector<HTMLDivElement>('#dialogue-root')!,
  prompt: document.querySelector<HTMLButtonElement>('#interaction-prompt')!,
  promptLabel: document.querySelector<HTMLSpanElement>('#interaction-label')!,
  toastRoot: document.querySelector<HTMLDivElement>('#passive-toast-root')!,
  clueList: document.querySelector<HTMLUListElement>('#clue-list')!,
  voiceList: document.querySelector<HTMLDivElement>('#voice-list')!,
  onStateChanged: (state) => saveGameState(state),
})

setupDebugLog()
setupCasePanel()
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
    setInteraction: ui.setInteraction,
    triggerProximityOrb: ui.triggerProximityOrb,
    triggerExplorationPassive: ui.triggerExplorationPassive,
    isDialogueOpen: () => tutorialOpen || ui.isDialogueOpen(),
    closeDialogueSurface: ui.closeSurface,
    getState: () => engine.state,
  })
}

function showTutorialIfNeeded(): void {
  const tutorialRoot = document.querySelector<HTMLDivElement>('#tutorial-root')
  const tutorialClose = document.querySelector<HTMLButtonElement>('#tutorial-close')
  const tutorialHide = document.querySelector<HTMLInputElement>('#tutorial-hide')

  if (!tutorialRoot || !tutorialClose || !tutorialHide || isTutorialHidden() || isTutorialSeen()) {
    return
  }

  tutorialOpen = true
  tutorialRoot.hidden = false
  tutorialClose.focus()

  tutorialClose.addEventListener('click', () => {
    setTutorialHidden(tutorialHide.checked)
    setTutorialSeen(true)
    tutorialOpen = false
    tutorialRoot.hidden = true

    if (!engine.state.flags.woke_up && !ui.isDialogueOpen()) {
      ui.openDialogue('wake_up')
    }
  })
}

function setupResetButton(): void {
  const resetButton = document.querySelector<HTMLButtonElement>('#reset-save')

  if (!resetButton) {
    return
  }

  const button = resetButton
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
  const casePanel = document.querySelector<HTMLElement>('#case-panel')
  const caseToggle = document.querySelector<HTMLButtonElement>('#case-toggle')

  if (!casePanel || !caseToggle) {
    return
  }

  const panel = casePanel
  const toggle = caseToggle
  const mobileQuery = window.matchMedia('(max-width: 560px)')
  let mobileExpanded = false

  function applyCaseState(): void {
    const expanded = mobileQuery.matches ? mobileExpanded : true
    panel.classList.toggle('case-panel--expanded', expanded)
    toggle.textContent = expanded ? 'Dossier ouvert' : 'Dossier'
    toggle.setAttribute('aria-expanded', String(expanded))
    toggle.disabled = !mobileQuery.matches
  }

  toggle.addEventListener('click', () => {
    if (!mobileQuery.matches) {
      return
    }

    mobileExpanded = !mobileExpanded
    applyCaseState()
  })

  mobileQuery.addEventListener('change', () => {
    mobileExpanded = !mobileQuery.matches
    applyCaseState()
  })

  applyCaseState()
}

function setupDebugLog(): void {
  const debugRoot = document.querySelector<HTMLDivElement>('#debug-log')
  const debugList = document.querySelector<HTMLOListElement>('#debug-log-list')
  const debugDisable = document.querySelector<HTMLButtonElement>('#debug-log-disable')

  if (!debugRoot || !debugList || !debugDisable || !isDebugEnabled()) {
    return
  }

  debugRoot.hidden = false
  debugDisable.addEventListener('click', () => {
    setDebugEnabled(false)
    const url = new URL(window.location.href)
    url.searchParams.delete('debug')
    window.history.replaceState({}, '', url)
    debugRoot.hidden = true
  })

  window.addEventListener('dmp:debug', (event) => {
    const entry = (event as CustomEvent<DebugEntry>).detail
    const item = document.createElement('li')
    item.textContent = `${entry.scope}:${entry.event}${entry.data ? ` ${JSON.stringify(entry.data)}` : ''}`
    debugList.prepend(item)

    while (debugList.childElementCount > 18) {
      debugList.lastElementChild?.remove()
    }
  })
}
