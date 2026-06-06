import Phaser from 'phaser'
import type { MirrorsGameBridge } from '../createMirrorsGame'
import { debugLog } from '../debug'
import {
  MIRRORS_HOTSPOTS,
  MIRRORS_ORB_SPOTS,
  MIRRORS_SCENE_HEIGHT,
  MIRRORS_SCENE_WIDTH,
  type MirrorsHotspotDefinition,
  type MirrorsOrbSpotDefinition,
} from './mirrorsSceneData'

declare const __STATIC_ASSET_VERSION__: string

const SCENE_WIDTH = MIRRORS_SCENE_WIDTH
const SCENE_HEIGHT = MIRRORS_SCENE_HEIGHT
const FALLBACK_LAYOUT_WIDTH = 960
const FALLBACK_LAYOUT_HEIGHT = 576
const FALLBACK_LAYOUT_SCALE = SCENE_HEIGHT / FALLBACK_LAYOUT_HEIGHT
const FALLBACK_LAYOUT_CONTENT_WIDTH = FALLBACK_LAYOUT_WIDTH * FALLBACK_LAYOUT_SCALE
const FALLBACK_LAYOUT_OFFSET_X = (SCENE_WIDTH - FALLBACK_LAYOUT_CONTENT_WIDTH) / 2
const SOFIANE_PALISADE_LAYOUT_X = 786
const SOFIANE_PALISADE_LAYOUT_Y = 468
const FOREGROUND_DEPTH = 4.9
const HD_SCENE_ASSET_SCALE = 4
const ACTOR_DISPLAY_MULTIPLIER = 1.65
const PROP_DISPLAY_MULTIPLIER = 1.55

interface Hotspot extends MirrorsHotspotDefinition {
  marker?: Phaser.GameObjects.Graphics
}

interface OrbSpot extends MirrorsOrbSpotDefinition {
  marker?: Phaser.GameObjects.Graphics
}

type PointerTarget =
  | {
      kind: 'orb'
      id: string
      label: string
      mode: 'visible' | 'proximity'
      x: number
      y: number
      radius: number
      tapRadius: number
      distance: number
    }
  | {
      kind: 'hotspot'
      id: string
      label: string
      scriptId: string
      x: number
      y: number
      radius: number
      tapRadius: number
      distance: number
    }

export class MirrorsScene extends Phaser.Scene {
  private bridge: MirrorsGameBridge
  private hotspots: Hotspot[] = []
  private orbSpots: OrbSpot[] = []
  private activePointerTarget?: PointerTarget
  private selectionHalo?: Phaser.GameObjects.Graphics
  private lastLoggedActiveTarget?: string
  private lastNotifiedInteractionTarget?: string
  private targetAvailabilityKey?: string
  private playerShadow?: Phaser.GameObjects.Graphics
  private idleActors: Phaser.GameObjects.Sprite[] = []

  constructor(bridge: MirrorsGameBridge) {
    super('miroirs')
    this.bridge = bridge
  }

  preload(): void {
    this.load.image('p2-background', this.assetUrl('p2-background.png'))
    this.load.image('p2-foreground', this.assetUrl('p2-foreground.png'))
    this.load.image('actor-zinedine', this.assetUrl('actor-zinedine.png'))
    this.load.image('actor-leduc', this.assetUrl('actor-leduc.png'))
    this.load.image('actor-amar', this.assetUrl('actor-amar.png'))
    this.load.image('actor-sofiane', this.assetUrl('actor-sofiane.png'))
    this.load.image('prop-cup', this.assetUrl('prop-cup.png'))
    this.load.image('prop-phone', this.assetUrl('prop-phone.png'))
  }

  create(): void {
    this.createTextures()
    this.drawMap()
    this.createAtmosphere()
    this.createActors()
    this.createForegroundOccluders()
    this.createHotspots()
    this.createOrbs()
    this.auditInteractionTargets()
    this.createInput()
    this.configureCamera()
    this.bindSceneLifecycle()
    this.markSceneReady(true)

    this.time.delayedCall(300, () => {
      if (!this.bridge.getState().flags.woke_up && !this.bridge.isDialogueOpen()) {
        this.bridge.startDialogue('wake_up')
      }
    })
  }

  update(): void {
    this.updateActorPresentation()
    this.syncInteractionTargetAvailability()
    this.updateInteractionTarget()
  }

  private createInput(): void {
    this.input.on('pointerdown', this.handlePointerDown, this)
    this.input.on('pointermove', this.handlePointerMove, this)
  }

  private bindSceneLifecycle(): void {
    this.scale.on('resize', this.configureCamera, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.configureCamera, this)
      this.input.off('pointerdown', this.handlePointerDown, this)
      this.input.off('pointermove', this.handlePointerMove, this)
      this.markSceneReady(false)
    })
  }

  private markSceneReady(ready: boolean): void {
    const stageElement = this.scale.canvas.parentElement

    if (ready) {
      stageElement?.setAttribute('data-scene-ready', 'true')
      return
    }

    stageElement?.removeAttribute('data-scene-ready')
  }

  private configureCamera(): void {
    const camera = this.cameras.main
    camera.setBounds(0, 0, SCENE_WIDTH, SCENE_HEIGHT)
    camera.stopFollow()
    camera.setZoom(1)
    camera.centerOn(SCENE_WIDTH / 2, SCENE_HEIGHT / 2)
    this.updateInteractionMarkerVisibility()
    debugLog('scene', 'camera-desktop', { zoom: 1 })
  }

  private assetUrl(file: string): string {
    return `${import.meta.env.BASE_URL}assets/miroirs/${file}?v=${encodeURIComponent(__STATIC_ASSET_VERSION__)}`
  }

  private sceneX(x: number): number {
    return FALLBACK_LAYOUT_OFFSET_X + x * FALLBACK_LAYOUT_SCALE
  }

  private sceneY(y: number): number {
    return y * FALLBACK_LAYOUT_SCALE
  }

  private sceneSize(value: number): number {
    return value * FALLBACK_LAYOUT_SCALE
  }

  private addFallbackLayoutGraphics(depth = 0): Phaser.GameObjects.Graphics {
    return this.add.graphics({ x: FALLBACK_LAYOUT_OFFSET_X, y: 0 }).setScale(FALLBACK_LAYOUT_SCALE).setDepth(depth)
  }

  private createTextures(): void {
    this.makePixelTexture('player', 24, 30, [
      ['#1f2026', 6, 0, 12, 4],
      ['#d7a06f', 7, 4, 10, 7],
      ['#263247', 5, 11, 14, 12],
      ['#d7a84b', 9, 13, 5, 3],
      ['#8f3f36', 3, 13, 4, 10],
      ['#8f3f36', 17, 13, 4, 10],
      ['#181d25', 6, 23, 5, 7],
      ['#181d25', 13, 23, 5, 7],
    ])

    this.makePixelTexture('leduc', 24, 30, [
      ['#44333f', 6, 0, 12, 5],
      ['#e0b783', 7, 5, 10, 6],
      ['#7f825f', 5, 11, 14, 12],
      ['#f4ecd8', 8, 13, 8, 3],
      ['#d7a84b', 3, 13, 4, 10],
      ['#d7a84b', 17, 13, 4, 10],
      ['#1d2430', 6, 23, 5, 7],
      ['#1d2430', 13, 23, 5, 7],
    ])

    this.makePixelTexture('amar', 24, 30, [
      ['#2a241f', 6, 0, 12, 4],
      ['#c28b63', 7, 4, 10, 7],
      ['#425342', 5, 11, 14, 12],
      ['#b75738', 4, 13, 3, 10],
      ['#b75738', 17, 13, 3, 10],
      ['#1d2430', 6, 23, 5, 7],
      ['#1d2430', 13, 23, 5, 7],
    ])

    this.makePixelTexture('sofiane', 24, 30, [
      ['#14181f', 5, 0, 14, 6],
      ['#8b684d', 7, 5, 10, 6],
      ['#222b31', 4, 11, 16, 13],
      ['#6e7a6d', 6, 14, 12, 4],
      ['#b7be75', 2, 13, 5, 10],
      ['#b7be75', 17, 13, 5, 10],
      ['#111820', 6, 23, 5, 7],
      ['#111820', 13, 23, 5, 7],
    ])
  }

  private makePixelTexture(
    key: string,
    width: number,
    height: number,
    rects: Array<[string, number, number, number, number]>,
  ): void {
    if (this.textures.exists(key)) {
      return
    }

    const canvas = this.textures.createCanvas(key, width, height)

    if (!canvas) {
      throw new Error(`Could not create texture: ${key}`)
    }

    const context = canvas.getContext()
    context.clearRect(0, 0, width, height)

    rects.forEach(([color, x, y, rectWidth, rectHeight]) => {
      context.fillStyle = color
      context.fillRect(x, y, rectWidth, rectHeight)
    })

    canvas.refresh()
  }

  private drawMap(): void {
    this.drawSceneBackdrop()

    if (this.textures.exists('p2-background')) {
      this.add
        .image(0, 0, 'p2-background')
        .setOrigin(0)
        .setDepth(0)
        .setDisplaySize(SCENE_WIDTH, SCENE_HEIGHT)

      if (this.textures.exists('prop-cup')) {
        this.add
          .image(this.sceneX(430), this.sceneY(342), 'prop-cup')
          .setDepth(3)
          .setScale(this.textureDisplayScale('prop-cup'))
      }

      if (this.textures.exists('prop-phone')) {
        this.add
          .image(this.sceneX(456), this.sceneY(350), 'prop-phone')
          .setDepth(3)
          .setRotation(-0.18)
          .setScale(this.textureDisplayScale('prop-phone'))
      }

      return
    }

    const tile = 32
    const graphics = this.addFallbackLayoutGraphics()

    for (let row = 0; row < 18; row += 1) {
      for (let col = 0; col < 30; col += 1) {
        const x = col * tile
        const y = row * tile
        const isRamp = row >= 14
        const color = isRamp ? 0x24282d : 0x3a3d42

        graphics.fillStyle(color)
        graphics.fillRect(x, y, tile, tile)
        graphics.fillStyle(0x171a1d, 0.3)
        graphics.fillRect(x + 2, y + 30, 24, 2)
      }
    }

    this.drawTowerBackdrop()
    this.drawParkingSurface(graphics)

    graphics.fillStyle(0x22262c)
    graphics.fillRect(0, 0, FALLBACK_LAYOUT_WIDTH, 42)
    graphics.fillStyle(0xcfd6d2)
    graphics.fillRect(0, 42, FALLBACK_LAYOUT_WIDTH, 2)
    this.drawUtilityVan(574, 154)
    this.drawParkedVehicles()
    this.drawPrefab(692, 70)
    this.drawPalisade(118, 88)
    this.drawTechnicalRoom()
    this.drawProps()
  }

  private drawSceneBackdrop(): void {
    const graphics = this.add.graphics().setDepth(-1)

    graphics.fillStyle(0x0b1015)
    graphics.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT)
    graphics.fillStyle(0x101920)
    graphics.fillRect(0, 0, FALLBACK_LAYOUT_OFFSET_X, SCENE_HEIGHT)
    graphics.fillRect(FALLBACK_LAYOUT_OFFSET_X + FALLBACK_LAYOUT_CONTENT_WIDTH, 0, FALLBACK_LAYOUT_OFFSET_X, SCENE_HEIGHT)
    graphics.lineStyle(2, 0x2a7281, 0.18)
    graphics.lineBetween(FALLBACK_LAYOUT_OFFSET_X - 1, 0, FALLBACK_LAYOUT_OFFSET_X - 1, SCENE_HEIGHT)
    graphics.lineBetween(
      FALLBACK_LAYOUT_OFFSET_X + FALLBACK_LAYOUT_CONTENT_WIDTH + 1,
      0,
      FALLBACK_LAYOUT_OFFSET_X + FALLBACK_LAYOUT_CONTENT_WIDTH + 1,
      SCENE_HEIGHT,
    )
  }

  private drawTowerBackdrop(): void {
    const graphics = this.addFallbackLayoutGraphics()
    this.drawCloudTower(graphics, 2, 48, 88, 414)
    this.drawCloudTower(graphics, 862, 42, 94, 430)
    this.drawCloudTower(graphics, 332, 36, 124, 140)
    this.drawCloudTower(graphics, 36, 390, 122, 120)

    graphics.fillStyle(0x111820, 0.82)
    graphics.fillRect(268, 128, 320, 26)
    graphics.fillStyle(0x334550)
    graphics.fillRect(268, 154, 320, 5)
    graphics.fillStyle(0x65b7c6, 0.45)
    graphics.fillRect(284, 137, 72, 4)
    graphics.fillRect(402, 137, 90, 4)
    graphics.fillStyle(0x0d1117, 0.52)
    graphics.fillRect(210, 158, 594, 18)
    graphics.fillStyle(0xcfd6d2, 0.2)
    graphics.fillRect(226, 164, 558, 4)
  }

  private drawCloudTower(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const centerX = x + width / 2
    const colors = [0x2d4751, 0x6e7a6d, 0xcfd6d2, 0x9aa66f, 0x5b7782]

    graphics.fillStyle(0x0d1117, 0.58)
    graphics.fillEllipse(centerX + 8, y + height / 2 + 9, width * 0.78, height + 8)
    graphics.fillStyle(0x20262c)
    graphics.fillEllipse(centerX, y + height / 2, width * 0.86, height)
    graphics.fillRect(x + width * 0.2, y + 10, width * 0.6, height - 20)
    graphics.lineStyle(2, 0x0d1117, 0.8)
    graphics.strokeEllipse(centerX, y + height / 2, width * 0.86, height)

    for (let patchY = y + 18; patchY < y + height - 16; patchY += 26) {
      const wave = Math.sin((patchY - y) / 22)

      for (let patchX = x + 12; patchX < x + width - 14; patchX += 18) {
        const index = Math.abs(Math.floor((patchX + patchY) / 18)) % colors.length
        const visible = Math.abs(patchX - centerX + wave * 11) < width * 0.34

        if (!visible) {
          continue
        }

        graphics.fillStyle(colors[index], 0.34)
        graphics.fillRect(patchX + wave * 4, patchY, 12, 9)
        graphics.fillStyle((patchX + patchY) % 4 === 0 ? 0xd7a84b : 0x111820, 0.62)
        graphics.fillRect(patchX + 3 + wave * 4, patchY + 2, 5, 4)
      }
    }

    graphics.fillStyle(0x0d1117, 0.36)
    graphics.fillRect(x + width * 0.25, y + height - 14, width * 0.5, 10)
  }

  private drawParkingSurface(graphics: Phaser.GameObjects.Graphics): void {
    graphics.fillStyle(0x1a2026, 0.72)
    graphics.fillRect(286, 190, 520, 236)
    graphics.lineStyle(3, 0x59615e, 0.9)
    graphics.strokeRect(286, 190, 520, 236)

    graphics.fillStyle(0xcfd6d2, 0.18)
    graphics.fillRect(300, 206, 492, 32)
    graphics.fillRect(300, 382, 492, 28)
    graphics.fillStyle(0x0d1117, 0.22)
    graphics.fillRect(304, 246, 488, 104)

    graphics.lineStyle(2, 0xf4ecd8, 0.62)
    for (let x = 322; x < 786; x += 76) {
      graphics.lineBetween(x, 238, x, 292)
      graphics.lineBetween(x, 350, x, 410)
    }

    for (let x = 342; x < 790; x += 86) {
      graphics.lineStyle(3, 0xd7a84b, 0.85)
      graphics.lineBetween(x, 332, x + 52, 332)
      graphics.lineBetween(x, 406, x + 52, 406)
    }

    graphics.lineStyle(3, 0xf4ecd8, 0.74)
    graphics.lineBetween(320, 312, 790, 312)
    graphics.lineStyle(3, 0xd7a84b, 0.88)
    graphics.lineBetween(318, 320, 785, 320)

    this.drawParkingArrow(graphics, 370, 314, 'right')
    this.drawParkingArrow(graphics, 746, 320, 'right')
    this.drawPillar(graphics, 306, 250)
    this.drawPillar(graphics, 790, 250)
    this.drawPillar(graphics, 306, 382)
    this.drawPillar(graphics, 790, 382)

    graphics.lineStyle(5, 0xcfd6d2, 0.24)
    graphics.lineBetween(340, 224, 392, 224)
    graphics.lineBetween(340, 224, 340, 300)
    graphics.lineBetween(340, 300, 390, 300)
    graphics.lineStyle(3, 0xcfd6d2, 0.18)
    graphics.lineBetween(352, 242, 380, 270)
    graphics.lineBetween(380, 242, 352, 270)
    graphics.lineStyle(3, 0x65b7c6, 0.28)
    graphics.strokeRect(334, 214, 72, 96)
    graphics.lineStyle(3, 0xd7a84b, 0.72)
    graphics.lineBetween(626, 398, 736, 398)
    graphics.fillTriangle(746, 398, 720, 384, 720, 412)
  }

  private drawParkingArrow(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    direction: 'left' | 'right',
  ): void {
    const sign = direction === 'right' ? 1 : -1
    graphics.fillStyle(0xf4ecd8, 0.72)
    graphics.fillRect(x - 24 * sign, y - 4, 38 * sign, 8)
    graphics.fillTriangle(x + 20 * sign, y - 14, x + 20 * sign, y + 14, x + 42 * sign, y)
  }

  private drawPillar(graphics: Phaser.GameObjects.Graphics, x: number, y: number): void {
    graphics.fillStyle(0x0d1117, 0.44)
    graphics.fillRect(x + 4, y + 5, 30, 46)
    graphics.fillStyle(0x9ea6a1)
    graphics.fillRect(x, y, 30, 46)
    graphics.lineStyle(2, 0x0d1117, 0.82)
    graphics.strokeRect(x, y, 30, 46)

    for (let stripeY = y + 4; stripeY < y + 42; stripeY += 12) {
      graphics.fillStyle(0xd7a84b)
      graphics.fillRect(x + 2, stripeY, 26, 5)
      graphics.fillStyle(0x171c24)
      graphics.fillRect(x + 2, stripeY + 5, 26, 4)
    }
  }

  private drawUtilityVan(x: number, y: number): void {
    const graphics = this.addFallbackLayoutGraphics()
    graphics.fillStyle(0x0d1117, 0.5)
    graphics.fillRect(x + 12, y + 24, 226, 116)

    graphics.fillStyle(0xe7e3d8)
    graphics.fillRect(x, y + 32, 206, 82)
    graphics.fillStyle(0xd5d0c3)
    graphics.fillRect(x + 140, y + 18, 66, 52)
    graphics.lineStyle(3, 0x0d1117, 0.96)
    graphics.strokeRect(x, y + 32, 206, 82)
    graphics.strokeRect(x + 140, y + 18, 66, 52)

    graphics.fillStyle(0x172229)
    graphics.fillRect(x + 148, y + 25, 46, 24)
    graphics.fillStyle(0x65b7c6, 0.62)
    graphics.fillRect(x + 153, y + 28, 36, 9)

    graphics.fillStyle(0x0d1117)
    graphics.fillRect(x + 20, y + 112, 30, 15)
    graphics.fillRect(x + 150, y + 112, 30, 15)
    graphics.fillStyle(0x24282d)
    graphics.fillRect(x + 25, y + 116, 20, 8)
    graphics.fillRect(x + 155, y + 116, 20, 8)

    graphics.fillStyle(0x3f8fa0, 0.92)
    graphics.fillRect(x + 18, y + 50, 114, 10)
    graphics.fillStyle(0xcfd6d2, 0.72)
    graphics.fillRect(x + 18, y + 66, 116, 7)
    graphics.fillStyle(0x3f8fa0, 0.5)
    graphics.fillRect(x + 34, y + 78, 24, 22)
    graphics.fillRect(x + 68, y + 78, 24, 22)
    graphics.fillRect(x + 102, y + 78, 24, 22)
    graphics.fillStyle(0xe7e3d8)
    graphics.fillRect(x + 40, y + 84, 12, 16)
    graphics.fillRect(x + 74, y + 84, 12, 16)
    graphics.fillRect(x + 108, y + 84, 12, 16)

    graphics.fillStyle(0x06080b)
    graphics.fillRect(x - 34, y + 54, 46, 68)
    graphics.fillStyle(0x111820)
    graphics.fillRect(x - 21, y + 64, 28, 43)
    graphics.lineStyle(3, 0x65b7c6, 0.78)
    graphics.lineBetween(x - 31, y + 56, x + 9, y + 77)
    graphics.lineBetween(x - 31, y + 120, x + 9, y + 98)
    graphics.lineStyle(2, 0xd45d59, 0.82)
    graphics.lineBetween(x - 27, y + 122, x + 206, y + 132)

    graphics.fillStyle(0x1a2026)
    graphics.fillRect(x - 13, y + 84, 32, 16)
    graphics.fillStyle(0xcfd6d2, 0.48)
    graphics.fillRect(x - 9, y + 87, 24, 4)
  }

  private drawParkedVehicles(): void {
    this.drawParkedCar(350, 372, 0x4c6570)
    this.drawParkedCar(820, 356, 0x2f3f4d)
  }

  private drawParkedCar(x: number, y: number, color: number): void {
    const graphics = this.addFallbackLayoutGraphics()
    graphics.fillStyle(0x0d1117, 0.4)
    graphics.fillRect(x + 5, y + 8, 48, 40)
    graphics.fillStyle(color)
    graphics.fillRect(x, y, 48, 38)
    graphics.fillStyle(0x1c252b)
    graphics.fillRect(x + 9, y + 6, 30, 10)
    graphics.fillRect(x + 9, y + 23, 30, 8)
    graphics.fillStyle(0xcfd6d2, 0.7)
    graphics.fillRect(x + 13, y + 8, 22, 4)
    graphics.fillStyle(0xf4ecd8)
    graphics.fillRect(x + 6, y + 34, 12, 3)
    graphics.fillRect(x + 30, y + 34, 12, 3)
    graphics.fillStyle(0x0d1117)
    graphics.fillRect(x - 4, y + 8, 5, 11)
    graphics.fillRect(x + 47, y + 8, 5, 11)
    graphics.fillRect(x - 4, y + 24, 5, 11)
    graphics.fillRect(x + 47, y + 24, 5, 11)
    graphics.lineStyle(2, 0x0d1117, 0.82)
    graphics.strokeRect(x, y, 48, 38)
  }

  private drawPrefab(x: number, y: number): void {
    const graphics = this.addFallbackLayoutGraphics()
    graphics.fillStyle(0xcfd6d2)
    graphics.fillRect(x, y, 176, 78)
    graphics.lineStyle(3, 0x0d1117)
    graphics.strokeRect(x, y, 176, 78)
    graphics.fillStyle(0xd7a84b)
    graphics.fillRect(x + 12, y + 12, 126, 10)
    graphics.fillStyle(0x22323a)
    graphics.fillRect(x + 134, y + 34, 38, 42)
    graphics.fillStyle(0xb75738)
    graphics.fillRect(x + 14, y + 40, 72, 9)
    graphics.fillStyle(0x8f3f36)
    graphics.fillRect(x + 14, y + 54, 96, 8)
  }

  private drawPalisade(x: number, y: number): void {
    const graphics = this.addFallbackLayoutGraphics()
    graphics.fillStyle(0x755337)
    graphics.fillRect(x, y, 214, 64)
    graphics.lineStyle(2, 0x0d1117, 0.35)

    for (let strip = x + 12; strip < x + 210; strip += 24) {
      graphics.lineBetween(strip, y + 2, strip, y + 62)
    }

    graphics.fillStyle(0xd7a84b)
    graphics.fillRect(x + 18, y + 22, 176, 6)
    graphics.fillStyle(0xb75738)
    graphics.fillRect(x + 18, y + 34, 176, 6)
  }

  private drawTechnicalRoom(): void {
    const graphics = this.addFallbackLayoutGraphics()
    graphics.fillStyle(0x253039)
    graphics.fillRect(54, 230, 230, 132)
    graphics.lineStyle(3, 0x0d1117)
    graphics.strokeRect(54, 230, 230, 132)
    graphics.fillStyle(0x111820)
    graphics.fillRect(182, 276, 46, 44)
    graphics.fillStyle(0xb75738)
    graphics.fillRect(76, 252, 62, 70)
    graphics.fillStyle(0xf4ecd8)
    graphics.fillRect(74, 236, 136, 12)
    graphics.fillStyle(0xd7a84b)
    graphics.fillRect(174, 252, 58, 18)
  }

  private drawProps(): void {
    const graphics = this.addFallbackLayoutGraphics()

    for (const [x, y] of [
      [540, 262],
      [558, 326],
      [786, 268],
      [784, 334],
    ]) {
      graphics.fillStyle(0xb75738)
      graphics.fillTriangle(x, y + 28, x + 10, y, x + 20, y + 28)
      graphics.fillStyle(0xf4ecd8, 0.82)
      graphics.fillRect(x + 3, y + 10, 14, 4)
    }

    graphics.lineStyle(2, 0xd45d59, 0.72)
    graphics.lineBetween(550, 278, 786, 268)
    graphics.lineBetween(558, 326, 784, 334)
    graphics.lineStyle(2, 0xf4ecd8, 0.62)
    graphics.lineBetween(550, 284, 786, 274)
    graphics.lineBetween(558, 332, 784, 340)

    graphics.fillStyle(0xcfd6d2)
    graphics.fillRect(506, 60, 12, 170)
    graphics.fillStyle(0x0d1117)
    graphics.fillRect(486, 70, 52, 12)
    graphics.fillStyle(0xd45d59)
    graphics.fillRect(494, 82, 36, 10)
    graphics.fillStyle(0xdcebd7, 0.85)
    graphics.fillRect(438, 454, 124, 8)
    graphics.fillStyle(0x65b7c6, 0.4)
    graphics.fillRect(446, 462, 108, 12)
    graphics.fillStyle(0xf4ecd8, 0.72)
    graphics.fillRect(712, 104, 128, 12)
    graphics.fillStyle(0x65b7c6, 0.28)
    graphics.fillRect(716, 108, 80, 3)

    graphics.fillStyle(0x65b7c6, 0.18)
    graphics.fillEllipse(640, 328, 142, 24)
    graphics.fillStyle(0xf4ecd8, 0.18)
    graphics.fillEllipse(664, 338, 96, 12)

    graphics.fillStyle(0xd7a84b)
    graphics.fillRect(430, 316, 16, 34)
    graphics.fillStyle(0x0d1117)
    graphics.fillRect(432, 320, 12, 8)
    graphics.fillStyle(0xf4ecd8)
    graphics.fillRect(452, 340, 8, 10)
    graphics.fillStyle(0x0d1117)
    graphics.fillRect(454, 346, 5, 2)
    graphics.fillStyle(0x22323a)
    graphics.fillRect(462, 338, 14, 9)
    graphics.fillStyle(0x65b7c6)
    graphics.fillRect(464, 340, 9, 5)

    graphics.fillStyle(0xdcebd7, 0.28)
    graphics.fillRect(246, 366, 7, 3)
    graphics.fillRect(252, 360, 5, 2)
    graphics.fillRect(258, 354, 4, 2)
    graphics.fillStyle(0xb7be75, 0.55)
    graphics.fillRect(238, 378, 18, 3)
  }

  private createAtmosphere(): void {
    this.createWetSurfaceReflections()
    this.createNeonLighting()
    this.createVignette()
  }

  private createWetSurfaceReflections(): void {
    const reflections = this.addFallbackLayoutGraphics(2).setAlpha(0.78)

    reflections.fillStyle(0x65d8e6, 0.08)
    reflections.fillEllipse(492, 326, 286, 42)
    reflections.fillEllipse(732, 348, 176, 28)
    reflections.fillEllipse(484, 468, 176, 26)
    reflections.fillStyle(0xf4ecd8, 0.1)
    reflections.fillEllipse(470, 336, 162, 14)
    reflections.fillEllipse(714, 356, 112, 10)
    reflections.fillEllipse(506, 474, 108, 8)

    const glints = [
      [386, 300, 22, 2],
      [432, 318, 14, 2],
      [474, 334, 34, 2],
      [532, 322, 18, 2],
      [584, 346, 12, 2],
      [668, 350, 24, 2],
      [734, 342, 28, 2],
      [770, 362, 14, 2],
      [430, 468, 32, 2],
      [492, 480, 42, 2],
      [548, 470, 18, 2],
    ] as Array<[number, number, number, number]>

    glints.forEach(([x, y, width, height], index) => {
      reflections.fillStyle(index % 2 === 0 ? 0xa8fbff : 0xf4ecd8, index % 2 === 0 ? 0.24 : 0.18)
      reflections.fillRect(x, y, width, height)
    })

    this.tweens.add({
      targets: reflections,
      alpha: 0.62,
      duration: 3100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    const droplets = this.addFallbackLayoutGraphics(4.35).setAlpha(0.34)
    const specks = [
      [352, 284],
      [372, 334],
      [416, 288],
      [446, 354],
      [476, 304],
      [504, 352],
      [548, 306],
      [566, 370],
      [612, 336],
      [684, 336],
      [726, 322],
      [752, 372],
      [790, 348],
      [416, 456],
      [464, 478],
      [522, 466],
      [558, 486],
    ] as Array<[number, number]>

    specks.forEach(([x, y], index) => {
      droplets.fillStyle(index % 3 === 0 ? 0xa8fbff : 0xf4ecd8, index % 3 === 0 ? 0.32 : 0.22)
      droplets.fillRect(x, y, index % 4 === 0 ? 2 : 1, 1)
    })

    this.tweens.add({
      targets: droplets,
      alpha: 0.18,
      duration: 1900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  private createNeonLighting(): void {
    const glow = this.addFallbackLayoutGraphics(4.25).setAlpha(0.76)

    this.drawNeonPool(glow, 482, 80, 168, 170, 0x65d8e6)
    this.drawNeonPool(glow, 792, 104, 156, 154, 0x65d8e6)
    this.drawNeonPool(glow, 662, 306, 132, 84, 0xd7a84b)

    this.tweens.add({
      targets: glow,
      alpha: 0.64,
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    const flicker = this.addFallbackLayoutGraphics(4.45).setAlpha(0)
    flicker.fillStyle(0xd7ffff, 0.34)
    flicker.fillRect(402, 78, 166, 3)
    flicker.fillRect(724, 102, 142, 3)
    flicker.fillStyle(0x65d8e6, 0.12)
    flicker.fillEllipse(482, 254, 226, 52)
    flicker.fillEllipse(792, 282, 202, 46)

    this.time.addEvent({
      delay: 3600,
      loop: true,
      callback: () => {
        flicker.setAlpha(0)
        this.tweens.add({
          targets: flicker,
          alpha: 0.28,
          duration: 46,
          yoyo: true,
          repeat: 2,
          ease: 'Linear',
        })
      },
    })
  }

  private drawNeonPool(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
  ): void {
    graphics.fillStyle(color, 0.16)
    graphics.fillRect(x - width / 2, y - 2, width, 4)
    graphics.fillStyle(color, 0.07)
    graphics.fillRect(x - width * 0.42, y + 6, width * 0.84, 16)
    graphics.fillEllipse(x, y + height * 0.72, width * 1.26, height * 0.34)
    graphics.fillStyle(0xf4ecd8, 0.08)
    graphics.fillEllipse(x + width * 0.08, y + height * 0.72, width * 0.58, height * 0.13)
  }

  private createVignette(): void {
    const vignette = this.add.graphics().setDepth(6.65)

    for (let inset = 0; inset < 88; inset += 11) {
      const alpha = 0.025 + inset * 0.0009
      vignette.lineStyle(11, 0x02060a, alpha)
      vignette.strokeRect(inset / 2, inset / 2, SCENE_WIDTH - inset, SCENE_HEIGHT - inset)
    }

    vignette.fillStyle(0x02060a, 0.2)
    vignette.fillRect(0, 0, SCENE_WIDTH, 30)
    vignette.fillStyle(0x02060a, 0.18)
    vignette.fillRect(0, SCENE_HEIGHT - 70, SCENE_WIDTH, 70)
    vignette.fillRect(0, 0, 28, SCENE_HEIGHT)
    vignette.fillRect(SCENE_WIDTH - 28, 0, 28, SCENE_HEIGHT)
  }

  private createActors(): void {
    const playerKey = this.textures.exists('actor-zinedine') ? 'actor-zinedine' : 'player'
    const leducKey = this.textures.exists('actor-leduc') ? 'actor-leduc' : 'leduc'
    const amarKey = this.textures.exists('actor-amar') ? 'actor-amar' : 'amar'
    const sofianeKey = this.textures.exists('actor-sofiane') ? 'actor-sofiane' : 'sofiane'

    this.idleActors = []
    this.playerShadow = this.createActorShadow(414, 370, 34, 9)
    const zinedine = this.add
      .sprite(this.sceneX(414), this.sceneY(352), playerKey)
      .setDepth(this.depthForY(this.sceneY(352)))
      .setScale(this.textureDisplayScale(playerKey))

    this.createActorShadow(242, 366, 32, 8)
    this.createActorShadow(668, 240, 32, 8)
    this.createActorShadow(SOFIANE_PALISADE_LAYOUT_X, SOFIANE_PALISADE_LAYOUT_Y + 18, 32, 8)

    const leduc = this.add
      .sprite(this.sceneX(242), this.sceneY(348), leducKey)
      .setDepth(this.depthForY(this.sceneY(348)))
      .setScale(this.textureDisplayScale(leducKey))
    const amar = this.add
      .sprite(this.sceneX(668), this.sceneY(222), amarKey)
      .setDepth(this.depthForY(this.sceneY(222)))
      .setScale(this.textureDisplayScale(amarKey))
    const sofiane = this.add
      .sprite(this.sceneX(SOFIANE_PALISADE_LAYOUT_X), this.sceneY(SOFIANE_PALISADE_LAYOUT_Y), sofianeKey)
      .setDepth(this.depthForY(this.sceneY(SOFIANE_PALISADE_LAYOUT_Y)))
      .setScale(this.textureDisplayScale(sofianeKey))

    this.idleActors.push(zinedine, leduc, amar, sofiane)
    this.updateActorPresentation()
  }

  private createActorShadow(x: number, y: number, width: number, height: number): Phaser.GameObjects.Graphics {
    const shadow = this.add.graphics({ x: this.sceneX(x), y: this.sceneY(y) }).setDepth(4.72)

    shadow.fillStyle(0x02060a, 0.36)
    shadow.fillEllipse(0, 0, this.sceneSize(width), this.sceneSize(height))
    shadow.fillStyle(0x02060a, 0.28)
    shadow.fillRect(-this.sceneSize(width) * 0.32, -1, this.sceneSize(width) * 0.64, 2)

    return shadow
  }

  private textureDisplayScale(key: string): number {
    if (key.startsWith('actor-')) {
      return (FALLBACK_LAYOUT_SCALE / HD_SCENE_ASSET_SCALE) * ACTOR_DISPLAY_MULTIPLIER
    }

    if (key.startsWith('prop-')) {
      return (FALLBACK_LAYOUT_SCALE / HD_SCENE_ASSET_SCALE) * PROP_DISPLAY_MULTIPLIER
    }

    return FALLBACK_LAYOUT_SCALE
  }

  private updateActorPresentation(): void {
    this.idleActors.forEach((actor) => {
      actor.setDepth(this.depthForY(actor.y))
    })

    const zinedine = this.idleActors[0]
    if (zinedine) {
      this.playerShadow?.setPosition(Math.round(zinedine.x), Math.round(zinedine.y + this.sceneSize(18)))
    }
  }

  private depthForY(y: number): number {
    return 5 + Phaser.Math.Clamp(y, 0, SCENE_HEIGHT - 20) / 1000
  }

  private createForegroundOccluders(): void {
    if (!this.textures.exists('p2-foreground')) {
      return
    }

    this.add
      .image(0, 0, 'p2-foreground')
      .setOrigin(0)
      .setDisplaySize(SCENE_WIDTH, SCENE_HEIGHT)
      .setDepth(FOREGROUND_DEPTH)
  }

  private createHotspots(): void {
    this.hotspots = MIRRORS_HOTSPOTS.map((hotspot) => this.scaleHotspot(hotspot))
    this.hotspots.forEach((hotspot) => {
      hotspot.marker = this.createInteractionHalo(hotspot.x, hotspot.y, hotspot.radius, 'primary')
      hotspot.marker.setVisible(this.isHotspotInteractable(hotspot))
    })
  }

  private createOrbs(): void {
    this.orbSpots = MIRRORS_ORB_SPOTS.map((orb) => this.scaleOrb(orb))
    this.orbSpots.forEach((orb) => {
      orb.marker = this.createInteractionHalo(orb.x, orb.y, orb.radius, 'secondary')
      orb.marker.setVisible(this.isOrbInteractable(orb))
    })
  }

  private scaleHotspot(hotspot: MirrorsHotspotDefinition): Hotspot {
    return {
      ...hotspot,
    }
  }

  private scaleOrb(orb: MirrorsOrbSpotDefinition): OrbSpot {
    return {
      ...orb,
    }
  }

  private createInteractionHalo(
    x: number,
    y: number,
    radius: number,
    tone: 'primary' | 'secondary',
  ): Phaser.GameObjects.Graphics {
    const marker = this.add.graphics({ x, y })
    const span = Phaser.Math.Clamp(
      radius * (tone === 'primary' ? 0.24 : 0.2),
      tone === 'primary' ? 16 : 13,
      tone === 'primary' ? 28 : 22,
    )
    const tick = tone === 'primary' ? 9 : 7
    const color = tone === 'primary' ? 0x65d8e6 : 0xd7a84b
    const alpha = tone === 'primary' ? 0.7 : 0.55

    marker.setDepth(tone === 'primary' ? 7.4 : 7.15)
    marker.fillStyle(0x02060a, tone === 'primary' ? 0.34 : 0.26)
    marker.fillEllipse(0, span * 0.34, span * 1.58, 9)
    marker.fillStyle(color, tone === 'primary' ? 0.14 : 0.1)
    marker.fillEllipse(0, span * 0.34, span * 1.28, 5)
    marker.lineStyle(1, color, alpha)
    marker.strokeEllipse(0, span * 0.05, span * 1.35, span * 0.72)
    this.drawMarkerTicks(marker, span, tick, color, alpha)
    this.drawMarkerDiamond(marker, tone === 'primary' ? 4 : 3, color, tone === 'primary' ? 0.85 : 0.7)
    this.drawMarkerDiamond(marker, 1.5, 0xe9fbff, tone === 'primary' ? 0.68 : 0.48)

    this.tweens.add({
      targets: marker,
      alpha: tone === 'primary' ? 0.56 : 0.44,
      duration: tone === 'primary' ? 1450 : 1750,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    marker.setVisible(true)
    return marker
  }

  private drawMarkerTicks(
    graphics: Phaser.GameObjects.Graphics,
    span: number,
    tick: number,
    color: number,
    alpha: number,
  ): void {
    graphics.lineStyle(2, 0x02060a, alpha * 0.55)
    graphics.lineBetween(-span, 0, -span + tick, 0)
    graphics.lineBetween(span - tick, 0, span, 0)
    graphics.lineBetween(0, -span * 0.48, 0, -span * 0.48 + tick * 0.65)
    graphics.lineBetween(0, span * 0.48 - tick * 0.65, 0, span * 0.48)
    graphics.lineStyle(1, color, alpha)
    graphics.lineBetween(-span, 0, -span + tick, 0)
    graphics.lineBetween(span - tick, 0, span, 0)
    graphics.lineBetween(0, -span * 0.48, 0, -span * 0.48 + tick * 0.65)
    graphics.lineBetween(0, span * 0.48 - tick * 0.65, 0, span * 0.48)
  }

  private drawMarkerDiamond(
    graphics: Phaser.GameObjects.Graphics,
    size: number,
    color: number,
    alpha: number,
  ): void {
    graphics.fillStyle(color, alpha)
    graphics.fillTriangle(0, -size, size, 0, 0, size)
    graphics.fillTriangle(0, -size, -size, 0, 0, size)
  }

  private auditInteractionTargets(): void {
    this.hotspots.forEach((hotspot) => {
      debugLog('access', 'hotspot', {
        id: hotspot.id,
        x: hotspot.x,
        y: hotspot.y,
        radius: hotspot.radius,
        tapRadius: hotspot.tapRadius ?? hotspot.radius,
      })
    })

    this.orbSpots.forEach((orb) => {
      debugLog('access', 'orb', {
        id: orb.id,
        mode: orb.mode,
        x: orb.x,
        y: orb.y,
        radius: orb.radius,
        tapRadius: orb.tapRadius ?? orb.radius,
      })
    })
  }

  private updateInteractionMarkerVisibility(state = this.bridge.getState()): void {
    this.hotspots.forEach((hotspot) => {
      hotspot.marker?.setVisible(this.isHotspotInteractable(hotspot, state))
    })

    this.orbSpots.forEach((orb) => {
      orb.marker?.setVisible(this.isOrbInteractable(orb, state))
    })
  }

  private syncInteractionTargetAvailability(): void {
    const state = this.bridge.getState()
    const nextAvailabilityKey = [
      ...this.hotspots.map((hotspot) => `hotspot:${hotspot.id}:${this.isHotspotInteractable(hotspot, state) ? '1' : '0'}`),
      ...this.orbSpots.map((orb) => `orb:${orb.id}:${this.isOrbInteractable(orb, state) ? '1' : '0'}`),
    ].join('|')

    if (nextAvailabilityKey === this.targetAvailabilityKey) {
      return
    }

    this.targetAvailabilityKey = nextAvailabilityKey
    this.updateInteractionMarkerVisibility(state)

    if (this.activePointerTarget && !this.isPointerTargetInteractable(this.activePointerTarget, state)) {
      this.setActivePointerTarget(undefined)
    }
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.bridge.isDialogueOpen()) {
      this.bridge.closeDialogueSurface()
      return
    }

    const { x, y } = this.getScenePointerPosition(pointer)
    const target = this.findPointerTarget(x, y)
    this.setActivePointerTarget(target)

    debugLog('input', 'pointer-down', {
      x: Math.round(x),
      y: Math.round(y),
      target: target ? `${target.kind}:${target.id}` : undefined,
    })

    if (target) {
      this.openPointerTarget(target)
      return
    }

    this.setActivePointerTarget(undefined)
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.bridge.isDialogueOpen()) {
      this.setActivePointerTarget(undefined)
      return
    }

    const { x, y } = this.getScenePointerPosition(pointer)
    this.setActivePointerTarget(this.findPointerTarget(x, y))
  }

  private getScenePointerPosition(pointer: Phaser.Input.Pointer): { x: number; y: number } {
    const clientPoint = this.getPointerClientPoint(pointer.event as Event | undefined)
    const bounds = this.game.canvas.getBoundingClientRect()

    if (clientPoint && bounds.width > 0 && bounds.height > 0) {
      return {
        x: Phaser.Math.Clamp(((clientPoint.x - bounds.left) / bounds.width) * SCENE_WIDTH, 0, SCENE_WIDTH),
        y: Phaser.Math.Clamp(((clientPoint.y - bounds.top) / bounds.height) * SCENE_HEIGHT, 0, SCENE_HEIGHT),
      }
    }

    return {
      x: Number.isFinite(pointer.worldX) ? pointer.worldX : pointer.x,
      y: Number.isFinite(pointer.worldY) ? pointer.worldY : pointer.y,
    }
  }

  private getPointerClientPoint(event: Event | undefined): { x: number; y: number } | undefined {
    if (!event) {
      return undefined
    }

    if (event instanceof MouseEvent || event instanceof PointerEvent) {
      return { x: event.clientX, y: event.clientY }
    }

    if (event instanceof TouchEvent) {
      const touch = event.changedTouches[0] ?? event.touches[0]

      if (touch) {
        return { x: touch.clientX, y: touch.clientY }
      }
    }

    return undefined
  }

  private setActivePointerTarget(target?: PointerTarget): void {
    const currentKey = this.activePointerTarget
      ? `${this.activePointerTarget.kind}:${this.activePointerTarget.id}`
      : undefined
    const nextKey = target ? `${target.kind}:${target.id}` : undefined

    if (currentKey === nextKey) {
      return
    }

    this.activePointerTarget = target
    this.updatePointerTargetMarkerScale()

    if (!target) {
      this.clearSelectionHalo()
      return
    }

    this.showSelectionHalo(target)
  }

  private updatePointerTargetMarkerScale(): void {
    const activeKey = this.activePointerTarget
      ? `${this.activePointerTarget.kind}:${this.activePointerTarget.id}`
      : undefined

    this.hotspots.forEach((hotspot) => {
      hotspot.marker?.setScale(activeKey === `hotspot:${hotspot.id}` ? 1.08 : 1)
    })

    this.orbSpots.forEach((orb) => {
      orb.marker?.setScale(activeKey === `orb:${orb.id}` ? 1.08 : 1)
    })
  }

  private openPointerTarget(target: PointerTarget): void {
    this.clearSelectionHalo()
    this.setActivePointerTarget(undefined)

    if (target.kind === 'orb') {
      debugLog('interaction', 'open-orb', { id: target.id })

      if (target.mode === 'proximity') {
        this.bridge.triggerProximityOrb(target.id)
        this.updateInteractionMarkerVisibility()
        return
      }

      this.bridge.openOrb(target.id)
      return
    }

    debugLog('interaction', 'open-dialogue', { id: target.id, scriptId: target.scriptId })
    this.bridge.triggerExplorationPassive(target.id)
    this.bridge.startDialogue(target.scriptId)
  }

  private showSelectionHalo(target: PointerTarget): void {
    if (this.selectionHalo) {
      this.tweens.killTweensOf(this.selectionHalo)
      this.selectionHalo.destroy()
    }

    this.selectionHalo = this.add.graphics({ x: target.x, y: target.y })
    const span = Phaser.Math.Clamp(target.radius * 0.28, 20, 38)
    const tick = 11
    this.selectionHalo.setDepth(8.2)
    this.selectionHalo.fillStyle(0x02060a, 0.42)
    this.selectionHalo.fillEllipse(0, span * 0.34, span * 1.68, 10)
    this.selectionHalo.fillStyle(0x65d8e6, 0.16)
    this.selectionHalo.fillEllipse(0, span * 0.34, span * 1.32, 6)
    this.selectionHalo.lineStyle(2, 0x02060a, 0.52)
    this.selectionHalo.strokeEllipse(0, 0, span * 1.55, span * 0.86)
    this.selectionHalo.lineStyle(1, 0x65d8e6, 0.9)
    this.selectionHalo.strokeEllipse(0, 0, span * 1.55, span * 0.86)
    this.drawMarkerTicks(this.selectionHalo, span, tick, 0x65d8e6, 0.95)
    this.drawMarkerDiamond(this.selectionHalo, 4.5, 0xe9fbff, 0.86)

    this.tweens.add({
      targets: this.selectionHalo,
      alpha: 0.62,
      scale: 1.04,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  private findPointerTarget(
    x: number,
    y: number,
  ): PointerTarget | undefined {
    const state = this.bridge.getState()
    const orbTargets = this.orbSpots
      .filter((orb) => this.isOrbInteractable(orb, state))
      .map((orb) => ({
        kind: 'orb' as const,
        id: orb.id,
        label: orb.label,
        mode: orb.mode,
        x: orb.x,
        y: orb.y,
        radius: orb.radius,
        tapRadius: orb.tapRadius ?? Math.max(orb.radius, 54),
        distance: Phaser.Math.Distance.Between(x, y, orb.x, orb.y),
      }))

    const hotspotTargets = this.hotspots
      .filter((hotspot) => this.isHotspotInteractable(hotspot, state))
      .map((hotspot) => ({
        kind: 'hotspot' as const,
        id: hotspot.id,
        label: hotspot.label,
        scriptId: hotspot.scriptId,
        x: hotspot.x,
        y: hotspot.y,
        radius: hotspot.radius,
        tapRadius: hotspot.tapRadius ?? Math.max(hotspot.radius, 58),
        distance: Phaser.Math.Distance.Between(x, y, hotspot.x, hotspot.y),
      }))

    return [...hotspotTargets, ...orbTargets]
      .filter((target) => target.distance <= target.tapRadius)
      .sort((left, right) => left.distance - right.distance)[0]
  }

  private isHotspotInteractable(hotspot: Hotspot, state = this.bridge.getState()): boolean {
    const { completedChecks, flags } = state
    const requiredFlags = hotspot.requiredFlags ?? []
    const requiredCompletedChecks = hotspot.requiredCompletedChecks ?? []

    return (
      requiredFlags.every((flag) => flags[flag]) &&
      requiredCompletedChecks.every((checkId) => Boolean(completedChecks[checkId]))
    )
  }

  private isOrbInteractable(orb: OrbSpot, state = this.bridge.getState()): boolean {
    if (orb.mode === 'visible') {
      return true
    }

    return !state.triggeredOrbs[orb.id]
  }

  private isPointerTargetInteractable(target: PointerTarget, state = this.bridge.getState()): boolean {
    if (target.kind === 'hotspot') {
      const hotspot = this.hotspots.find((candidate) => candidate.id === target.id)
      return hotspot ? this.isHotspotInteractable(hotspot, state) : false
    }

    const orb = this.orbSpots.find((candidate) => candidate.id === target.id)
    return orb ? this.isOrbInteractable(orb, state) : false
  }

  private clearSelectionHalo(): void {
    if (!this.selectionHalo) {
      return
    }

    this.tweens.killTweensOf(this.selectionHalo)
    this.selectionHalo.destroy()
    this.selectionHalo = undefined
  }

  private updateInteractionTarget(): void {
    if (this.bridge.isDialogueOpen()) {
      this.notifyInteractionTarget(undefined)
      this.setActivePointerTarget(undefined)
      return
    }

    if (!this.activePointerTarget) {
      this.notifyInteractionTarget(undefined)
      this.lastLoggedActiveTarget = undefined
      return
    }

    const target = this.activePointerTarget
    const activeTargetLogKey = `${target.kind}:${target.id}`
    if (activeTargetLogKey !== this.lastLoggedActiveTarget) {
      this.lastLoggedActiveTarget = activeTargetLogKey
      debugLog('interaction', 'active-target', {
        kind: target.kind,
        id: target.id,
        distance: Math.round(target.distance),
      })
    }

    this.notifyInteractionTarget(target)
  }

  private notifyInteractionTarget(target?: PointerTarget): void {
    const nextKey = target ? `${target.kind}:${target.id}` : undefined

    if (nextKey === this.lastNotifiedInteractionTarget) {
      return
    }

    this.lastNotifiedInteractionTarget = nextKey

    if (!target) {
      this.bridge.setInteraction(undefined)
      return
    }

    this.bridge.setInteraction({
      label: target.label,
      run: () => {
        this.openPointerTarget(target)
      },
    })
  }
}
