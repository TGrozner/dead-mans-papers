import './style.css'
import { createMirrorsGame } from './game/createMirrorsGame'
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
      <div class="case-stamp">Dossier ouvert</div>
    </header>

    <div class="play-area">
      <div class="stage-wrap">
        <div id="game-stage" aria-label="Les Miroirs, parking P2"></div>
        <button id="interaction-prompt" class="interaction-prompt" type="button" hidden>
          <span class="prompt-mark">!</span>
          <span id="interaction-label"></span>
        </button>
        <div id="passive-toast-root" class="passive-toast-root" aria-live="polite"></div>
      </div>

      <aside class="case-panel" aria-label="Dossier">
        <section>
          <p class="panel-label">Objectif</p>
          <p id="objective" class="objective">Comprendre pourquoi le mort porte tes papiers dans un utilitaire municipal.</p>
        </section>

        <section>
          <p class="panel-label">Indices</p>
          <ul id="clue-list" class="clue-list"></ul>
        </section>

        <section>
          <p class="panel-label">Voix internes</p>
          <div id="voice-list" class="voice-list"></div>
        </section>

        <button id="reset-save" class="reset-button" type="button">Recommencer</button>
      </aside>
    </div>

    <div id="dialogue-root" class="dialogue-root" hidden></div>

    <div id="tutorial-root" class="tutorial-root" role="dialog" aria-modal="true" aria-labelledby="tutorial-title" hidden>
      <article class="tutorial-panel">
        <p class="panel-label">Avant de reprendre</p>
        <h2 id="tutorial-title">Parking P2 se joue lentement</h2>
        <div class="tutorial-copy">
          <p>Touche la scène pour rapprocher Morad. Quand il est assez près, utilise le bouton <strong>!</strong> ou retouche la même cible pour parler, inspecter ou écouter.</p>
          <p>Sur mobile, rien ne s'ouvre juste parce que ton doigt passe au mauvais endroit. Les pensées importantes arrivent dans les scènes ou dans de courts signaux.</p>
          <p>Le dossier garde les indices et les voix internes. Les choix bizarres ou indignes sont souvent aussi utiles que les choix raisonnables.</p>
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

createMirrorsGame({
  parent: 'game-stage',
  startDialogue: ui.openDialogue,
  openOrb: ui.openOrb,
  setInteraction: ui.setInteraction,
  triggerProximityOrb: ui.triggerProximityOrb,
  triggerExplorationPassive: ui.triggerExplorationPassive,
  isDialogueOpen: ui.isDialogueOpen,
  getState: () => engine.state,
})

showTutorialIfNeeded()

document.querySelector<HTMLButtonElement>('#reset-save')!.addEventListener('click', () => {
  persistOnUnload = false
  resetGameState()
  setTutorialSeen(false)
  window.location.reload()
})

window.addEventListener('beforeunload', () => {
  if (persistOnUnload) {
    saveGameState(engine.state)
  }
})

function showTutorialIfNeeded(): void {
  const tutorialRoot = document.querySelector<HTMLDivElement>('#tutorial-root')
  const tutorialClose = document.querySelector<HTMLButtonElement>('#tutorial-close')
  const tutorialHide = document.querySelector<HTMLInputElement>('#tutorial-hide')

  if (!tutorialRoot || !tutorialClose || !tutorialHide || isTutorialHidden() || isTutorialSeen()) {
    return
  }

  tutorialRoot.hidden = false
  tutorialClose.focus()

  tutorialClose.addEventListener('click', () => {
    setTutorialHidden(tutorialHide.checked)
    setTutorialSeen(true)
    tutorialRoot.hidden = true
  })
}
