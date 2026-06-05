import './style.css'
import { createHarborGame } from './game/createHarborGame'
import { loadGameState, resetGameState, saveGameState } from './game/save'
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
        <h1>Container 17</h1>
      </div>
      <div class="case-stamp">Dossier ouvert</div>
    </header>

    <div class="play-area">
      <div class="stage-wrap">
        <div id="game-stage" aria-label="Quartier portuaire"></div>
        <button id="interaction-prompt" class="interaction-prompt" type="button" hidden>
          <span class="prompt-mark">!</span>
          <span id="interaction-label"></span>
        </button>
        <div id="passive-toast-root" class="passive-toast-root" aria-live="polite"></div>
      </div>

      <aside class="case-panel" aria-label="Dossier">
        <section>
          <p class="panel-label">Objectif</p>
          <p id="objective" class="objective">Comprendre pourquoi le mort porte tes papiers.</p>
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

createHarborGame({
  parent: 'game-stage',
  startDialogue: ui.openDialogue,
  openOrb: ui.openOrb,
  setInteraction: ui.setInteraction,
  triggerProximityOrb: ui.triggerProximityOrb,
  triggerExplorationPassive: ui.triggerExplorationPassive,
  isDialogueOpen: ui.isDialogueOpen,
  getState: () => engine.state,
})

document.querySelector<HTMLButtonElement>('#reset-save')!.addEventListener('click', () => {
  persistOnUnload = false
  resetGameState()
  window.location.reload()
})

window.addEventListener('beforeunload', () => {
  if (persistOnUnload) {
    saveGameState(engine.state)
  }
})
