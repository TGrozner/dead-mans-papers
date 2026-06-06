import Phaser from 'phaser'
import { MirrorsScene } from './scenes/MirrorsScene'
import type { GameState, InteractionTarget } from './types'

const sceneWidth = 1280
const sceneHeight = 720

export interface MirrorsGameBridge {
  parent: string
  startDialogue: (scriptId: string) => void
  openOrb: (orbId: string) => void
  setInteraction: (target?: InteractionTarget) => void
  triggerProximityOrb: (orbId: string) => void
  triggerExplorationPassive: (contextId: string) => void
  isDialogueOpen: () => boolean
  closeDialogueSurface: () => void
  getState: () => GameState
}

export function createMirrorsGame(bridge: MirrorsGameBridge): Phaser.Game {
  const preserveDrawingBuffer = shouldPreserveDrawingBuffer()

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: bridge.parent,
    width: sceneWidth,
    height: sceneHeight,
    backgroundColor: '#171a1d',
    pixelArt: false,
    roundPixels: true,
    render: {
      preserveDrawingBuffer,
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [new MirrorsScene(bridge)],
  })
}

function shouldPreserveDrawingBuffer(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false
  }

  try {
    const parameters = new URLSearchParams(window.location.search)
    const explicitReadback = parameters.get('renderReadback') ?? parameters.get('preserveDrawingBuffer')

    if (explicitReadback) {
      return ['1', 'true', 'yes'].includes(explicitReadback.toLowerCase())
    }

    if (window.localStorage.getItem('dead-mans-papers:render-readback') === 'true') {
      return true
    }
  } catch {
    return navigator.webdriver === true
  }

  return navigator.webdriver === true
}
