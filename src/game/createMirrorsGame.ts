import Phaser from 'phaser'
import { MirrorsScene } from './scenes/MirrorsScene'
import type { GameState, InteractionTarget } from './types'

export interface MirrorsGameBridge {
  parent: string
  startDialogue: (scriptId: string) => void
  openOrb: (orbId: string) => void
  setInteraction: (target?: InteractionTarget) => void
  triggerProximityOrb: (orbId: string) => void
  triggerExplorationPassive: (contextId: string) => void
  isDialogueOpen: () => boolean
  getState: () => GameState
}

export function createMirrorsGame(bridge: MirrorsGameBridge): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: bridge.parent,
    width: 960,
    height: 576,
    backgroundColor: '#171a1d',
    pixelArt: true,
    roundPixels: true,
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [new MirrorsScene(bridge)],
  })
}
