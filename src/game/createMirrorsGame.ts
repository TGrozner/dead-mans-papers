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
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: bridge.parent,
    width: sceneWidth,
    height: sceneHeight,
    backgroundColor: '#171a1d',
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [new MirrorsScene(bridge)],
  })
}
