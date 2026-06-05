import Phaser from 'phaser'
import type { MirrorsGameBridge } from '../createMirrorsGame'

const MOBILE_VIEWPORT_QUERY = '(max-width: 560px)'
const MOBILE_CAMERA_ZOOM = 1.38

interface Hotspot {
  id: string
  label: string
  scriptId: string
  x: number
  y: number
  radius: number
  marker?: Phaser.GameObjects.Graphics
}

interface OrbSpot {
  id: string
  label: string
  mode: 'visible' | 'proximity'
  x: number
  y: number
  radius: number
  marker?: Phaser.GameObjects.Graphics
}

type PointerTarget =
  | { kind: 'orb'; id: string; label: string; x: number; y: number; radius: number; distance: number }
  | {
      kind: 'hotspot'
      id: string
      label: string
      scriptId: string
      x: number
      y: number
      radius: number
      distance: number
    }

export class MirrorsScene extends Phaser.Scene {
  private bridge: MirrorsGameBridge
  private player?: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys
  private keys?: Record<string, Phaser.Input.Keyboard.Key>
  private hotspots: Hotspot[] = []
  private orbSpots: OrbSpot[] = []
  private obstacles: Phaser.GameObjects.Rectangle[] = []
  private activeHotspotId?: string
  private activeOrbId?: string
  private tapDestination?: Phaser.Math.Vector2
  private tapMarker?: Phaser.GameObjects.Graphics
  private selectedPointerTarget?: Pick<PointerTarget, 'kind' | 'id' | 'x' | 'y' | 'radius'>
  private selectionHalo?: Phaser.GameObjects.Graphics

  constructor(bridge: MirrorsGameBridge) {
    super('miroirs')
    this.bridge = bridge
  }

  create(): void {
    this.createTextures()
    this.drawMap()
    this.createActors()
    this.createHotspots()
    this.createOrbs()
    this.createInput()
    this.configureCamera()
    this.bindSceneLifecycle()

    this.time.delayedCall(300, () => {
      if (!this.bridge.getState().flags.woke_up) {
        this.bridge.startDialogue('wake_up')
      }
    })
  }

  update(): void {
    this.updatePlayerMovement()
    this.updateInteractionTarget()
  }

  private createInput(): void {
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys()
      this.keys = this.input.keyboard.addKeys('W,A,S,D,Z,Q,E,SPACE,ENTER') as Record<
        string,
        Phaser.Input.Keyboard.Key
      >
    }

    this.input.on('pointerdown', this.handlePointerDown, this)
  }

  private bindSceneLifecycle(): void {
    this.scale.on('resize', this.configureCamera, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.configureCamera, this)
      this.input.off('pointerdown', this.handlePointerDown, this)
    })
  }

  private configureCamera(): void {
    const camera = this.cameras.main
    camera.setBounds(0, 0, 960, 576)

    if (!this.player) {
      return
    }

    if (this.isMobileViewport()) {
      camera.setZoom(MOBILE_CAMERA_ZOOM)
      camera.startFollow(this.player, true, 0.14, 0.14)
      this.updateInteractionMarkerVisibility()
      return
    }

    camera.stopFollow()
    camera.setZoom(1)
    camera.centerOn(480, 288)
    this.updateInteractionMarkerVisibility()
  }

  private isMobileViewport(): boolean {
    return window.matchMedia(MOBILE_VIEWPORT_QUERY).matches
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
  }

  private makePixelTexture(
    key: string,
    width: number,
    height: number,
    rects: Array<[string, number, number, number, number]>,
  ): void {
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
    const tile = 32
    const graphics = this.add.graphics()

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
    graphics.fillRect(0, 0, 960, 42)
    graphics.fillStyle(0xcfd6d2)
    graphics.fillRect(0, 42, 960, 2)
    this.drawUtilityVan(574, 154)
    this.drawParkedVehicles()
    this.drawPrefab(692, 70)
    this.drawPalisade(118, 88)
    this.drawTechnicalRoom()
    this.drawProps()
    this.createColliders()
  }

  private drawTowerBackdrop(): void {
    const graphics = this.add.graphics()
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
    const graphics = this.add.graphics()
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
    const graphics = this.add.graphics()
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
    const graphics = this.add.graphics()
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
    const graphics = this.add.graphics()
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
    const graphics = this.add.graphics()
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
    const graphics = this.add.graphics()

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
  }

  private createColliders(): void {
    const obstacles = [
      [54, 230, 230, 132],
      [542, 154, 246, 126],
      [692, 70, 176, 78],
      [118, 88, 214, 64],
      [0, 0, 960, 45],
      [0, 520, 960, 76],
    ] as Array<[number, number, number, number]>

    obstacles.forEach(([x, y, width, height]) => {
      const body = this.add.rectangle(x + width / 2, y + height / 2, width, height)
      body.setVisible(false)
      this.physics.add.existing(body, true)
      this.obstacles.push(body)
    })
  }

  private createActors(): void {
    this.player = this.physics.add.sprite(462, 318, 'player')
    this.player.setCollideWorldBounds(true)
    this.player.body.setSize(16, 18)
    this.player.body.setOffset(4, 12)
    this.obstacles.forEach((obstacle) => {
      if (this.player) {
        this.physics.add.collider(this.player, obstacle)
      }
    })

    this.add.sprite(548, 292, 'leduc').setDepth(4)
    this.add.sprite(326, 330, 'amar').setDepth(2)
  }

  private createHotspots(): void {
    this.hotspots = [
      {
        id: 'utility_van',
        label: "Examiner l'utilitaire municipal",
        scriptId: 'utility_van',
        x: 604,
        y: 292,
        radius: 96,
      },
      {
        id: 'leduc',
        label: 'Parler à Karine Leduc',
        scriptId: 'leduc',
        x: 548,
        y: 292,
        radius: 62,
      },
      {
        id: 'amar',
        label: 'Parler à Amar Boudiaf',
        scriptId: 'amar',
        x: 326,
        y: 330,
        radius: 58,
      },
    ]

    this.hotspots.forEach((hotspot) => {
      hotspot.marker = this.createInteractionHalo(hotspot.x, hotspot.y, hotspot.radius, 'primary')
    })
  }

  private createOrbs(): void {
    this.orbSpots = [
      {
        id: 'miroirs_orb_phone',
        label: 'Regarder le téléphone',
        mode: 'visible',
        x: 444,
        y: 336,
        radius: 44,
      },
      {
        id: 'miroirs_orb_van',
        label: "Observer l'utilitaire",
        mode: 'visible',
        x: 680,
        y: 252,
        radius: 58,
      },
      {
        id: 'miroirs_orb_body',
        label: 'Regarder le corps',
        mode: 'visible',
        x: 564,
        y: 286,
        radius: 52,
      },
      {
        id: 'miroirs_orb_camera',
        label: 'Inspecter la caméra HS',
        mode: 'visible',
        x: 510,
        y: 174,
        radius: 66,
      },
      {
        id: 'miroirs_orb_technical_room',
        label: 'Lire le local technique',
        mode: 'visible',
        x: 178,
        y: 282,
        radius: 78,
      },
      {
        id: 'miroirs_orb_neon',
        label: 'Écouter le néon',
        mode: 'proximity',
        x: 470,
        y: 464,
        radius: 96,
      },
      {
        id: 'miroirs_orb_residents',
        label: 'Écouter derrière la palissade',
        mode: 'proximity',
        x: 314,
        y: 388,
        radius: 84,
      },
    ]

    this.orbSpots
      .filter((orb) => orb.mode === 'visible')
      .forEach((orb) => {
        orb.marker = this.createInteractionHalo(orb.x, orb.y, orb.radius, 'secondary')
      })
  }

  private createInteractionHalo(
    x: number,
    y: number,
    radius: number,
    tone: 'primary' | 'secondary',
  ): Phaser.GameObjects.Graphics {
    const marker = this.add.graphics({ x, y })
    const ringRadius = Phaser.Math.Clamp(radius * (tone === 'primary' ? 0.52 : 0.42), 20, 48)
    const alpha = tone === 'primary' ? 0.58 : 0.34

    marker.setDepth(tone === 'primary' ? 5 : 4)
    marker.lineStyle(tone === 'primary' ? 2 : 1, 0x65d8e6, alpha)
    marker.strokeCircle(0, 0, ringRadius)
    marker.lineStyle(2, 0xe9fbff, alpha * 0.45)
    marker.lineBetween(-ringRadius - 7, -ringRadius, -ringRadius + 6, -ringRadius)
    marker.lineBetween(-ringRadius, -ringRadius - 7, -ringRadius, -ringRadius + 6)
    marker.lineBetween(ringRadius - 6, -ringRadius, ringRadius + 7, -ringRadius)
    marker.lineBetween(ringRadius, -ringRadius - 7, ringRadius, -ringRadius + 6)
    marker.lineBetween(-ringRadius - 7, ringRadius, -ringRadius + 6, ringRadius)
    marker.lineBetween(-ringRadius, ringRadius - 6, -ringRadius, ringRadius + 7)
    marker.lineBetween(ringRadius - 6, ringRadius, ringRadius + 7, ringRadius)
    marker.lineBetween(ringRadius, ringRadius - 6, ringRadius, ringRadius + 7)
    marker.setAlpha(tone === 'primary' ? 0.72 : 0.48)

    this.tweens.add({
      targets: marker,
      alpha: tone === 'primary' ? 0.38 : 0.24,
      duration: tone === 'primary' ? 1450 : 1750,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    marker.setVisible(this.isMobileViewport())
    return marker
  }

  private updateInteractionMarkerVisibility(): void {
    const showMarkers = this.isMobileViewport()

    this.hotspots.forEach((hotspot) => {
      hotspot.marker?.setVisible(showMarkers)
    })

    this.orbSpots.forEach((orb) => {
      orb.marker?.setVisible(showMarkers && orb.mode === 'visible')
    })
  }

  private updatePlayerMovement(): void {
    if (!this.player) {
      return
    }

    if (this.bridge.isDialogueOpen()) {
      this.player.setVelocity(0, 0)
      this.clearTapDestination()
      this.clearSelectedPointerTarget()
      return
    }

    const speed = 132
    const velocity = this.getKeyboardVelocity()

    if (velocity.length() > 0) {
      this.clearTapDestination()
      velocity.normalize().scale(speed)
      this.player.setVelocity(velocity.x, velocity.y)
      this.tryKeyboardInteraction()
      return
    }

    if (this.tapDestination) {
      const tapVelocity = new Phaser.Math.Vector2(
        this.tapDestination.x - this.player.x,
        this.tapDestination.y - this.player.y,
      )

      if (tapVelocity.length() <= 7) {
        this.player.setVelocity(0, 0)
        this.clearTapDestination()
      } else {
        tapVelocity.normalize().scale(speed)
        this.player.setVelocity(tapVelocity.x, tapVelocity.y)
      }

      this.tryKeyboardInteraction()
      return
    }

    this.player.setVelocity(0, 0)
    this.tryKeyboardInteraction()
  }

  private getKeyboardVelocity(): Phaser.Math.Vector2 {
    if (!this.cursors || !this.keys) {
      return new Phaser.Math.Vector2(0, 0)
    }

    const left = this.cursors.left.isDown || this.keys.A.isDown || this.keys.Q.isDown
    const right = this.cursors.right.isDown || this.keys.D.isDown
    const up = this.cursors.up.isDown || this.keys.W.isDown || this.keys.Z.isDown
    const down = this.cursors.down.isDown || this.keys.S.isDown

    return new Phaser.Math.Vector2(Number(right) - Number(left), Number(down) - Number(up))
  }

  private tryKeyboardInteraction(): void {
    if (
      !this.keys ||
      (!this.activeHotspotId && !this.activeOrbId) ||
      (!this.keys.E.isDown && !this.keys.SPACE.isDown && !this.keys.ENTER.isDown)
    ) {
      return
    }

    this.clearTapDestination()
    this.clearSelectedPointerTarget()

    if (this.activeOrbId) {
      this.bridge.openOrb(this.activeOrbId)
      return
    }

    const hotspot = this.hotspots.find((target) => target.id === this.activeHotspotId)
    hotspot && this.bridge.startDialogue(hotspot.scriptId)
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.player || this.bridge.isDialogueOpen()) {
      return
    }

    const x = Number.isFinite(pointer.worldX) ? pointer.worldX : pointer.x
    const y = Number.isFinite(pointer.worldY) ? pointer.worldY : pointer.y
    const target = this.findPointerTarget(x, y)

    if (target && this.isMobileViewport()) {
      if (this.isSelectedPointerTarget(target) && this.isPlayerNearTarget(target)) {
        this.openPointerTarget(target)
        return
      }

      this.selectPointerTarget(target)
      this.setTapDestinationNear(target.x, target.y)
      return
    }

    if (target?.kind === 'orb') {
      this.clearTapDestination()
      this.player.setVelocity(0, 0)
      this.openPointerTarget(target)
      return
    }

    if (target?.kind === 'hotspot') {
      this.clearTapDestination()
      this.player.setVelocity(0, 0)
      this.openPointerTarget(target)
      return
    }

    if (this.isPointBlocked(x, y)) {
      this.clearTapDestination()
      this.clearSelectedPointerTarget()
      this.player.setVelocity(0, 0)
      return
    }

    this.clearSelectedPointerTarget()
    this.setTapDestination(x, y)
  }

  private openPointerTarget(target: PointerTarget): void {
    this.clearTapDestination()
    this.clearSelectedPointerTarget()
    this.player?.setVelocity(0, 0)

    if (target.kind === 'orb') {
      this.bridge.openOrb(target.id)
      return
    }

    this.bridge.triggerExplorationPassive(target.id)
    this.bridge.startDialogue(target.scriptId)
  }

  private isSelectedPointerTarget(target: PointerTarget): boolean {
    return this.selectedPointerTarget?.kind === target.kind && this.selectedPointerTarget.id === target.id
  }

  private isPlayerNearTarget(target: PointerTarget): boolean {
    return Boolean(
      this.player && Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y) <= target.radius,
    )
  }

  private selectPointerTarget(target: PointerTarget): void {
    this.selectedPointerTarget = {
      kind: target.kind,
      id: target.id,
      x: target.x,
      y: target.y,
      radius: target.radius,
    }

    if (this.selectionHalo) {
      this.tweens.killTweensOf(this.selectionHalo)
      this.selectionHalo.destroy()
    }

    this.selectionHalo = this.add.graphics({ x: target.x, y: target.y })
    const ringRadius = Phaser.Math.Clamp(target.radius * 0.62, 30, 60)
    this.selectionHalo.setDepth(8)
    this.selectionHalo.lineStyle(3, 0x65d8e6, 0.95)
    this.selectionHalo.strokeCircle(0, 0, ringRadius)
    this.selectionHalo.lineStyle(1, 0xe9fbff, 0.82)
    this.selectionHalo.strokeCircle(0, 0, ringRadius + 7)

    this.tweens.add({
      targets: this.selectionHalo,
      alpha: 0.42,
      scale: 1.08,
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
    const orbTargets = this.orbSpots
      .filter((orb) => orb.mode === 'visible' || this.isMobileViewport())
      .map((orb) => ({
        kind: 'orb' as const,
        id: orb.id,
        label: orb.label,
        x: orb.x,
        y: orb.y,
        radius: orb.radius,
        distance: Phaser.Math.Distance.Between(x, y, orb.x, orb.y),
        tapRadius: Math.max(orb.radius, this.isMobileViewport() ? 42 : 54),
      }))

    const hotspotTargets = this.hotspots.map((hotspot) => ({
      kind: 'hotspot' as const,
      id: hotspot.id,
      label: hotspot.label,
      scriptId: hotspot.scriptId,
      x: hotspot.x,
      y: hotspot.y,
      radius: hotspot.radius,
      distance: Phaser.Math.Distance.Between(x, y, hotspot.x, hotspot.y),
      tapRadius: Math.max(hotspot.radius, this.isMobileViewport() ? 46 : 58),
    }))

    return [...orbTargets, ...hotspotTargets]
      .filter((target) => target.distance <= target.tapRadius)
      .sort((left, right) => left.distance - right.distance)[0]
  }

  private isPointBlocked(x: number, y: number): boolean {
    return this.obstacles.some((obstacle) => obstacle.getBounds().contains(x, y))
  }

  private setTapDestination(x: number, y: number): void {
    this.tapDestination = new Phaser.Math.Vector2(
      Phaser.Math.Clamp(x, 18, 942),
      Phaser.Math.Clamp(y, 50, 510),
    )
    this.showTapMarker(this.tapDestination.x, this.tapDestination.y)
  }

  private setTapDestinationNear(x: number, y: number): void {
    const destination = this.findNearestOpenPoint(x, y)
    this.setTapDestination(destination.x, destination.y)
  }

  private findNearestOpenPoint(x: number, y: number): Phaser.Math.Vector2 {
    if (!this.isPointBlocked(x, y)) {
      return new Phaser.Math.Vector2(x, y)
    }

    const candidates: Phaser.Math.Vector2[] = []

    for (const radius of [34, 52, 70, 88]) {
      for (let angle = 0; angle < 360; angle += 30) {
        const radians = Phaser.Math.DegToRad(angle)
        const candidate = new Phaser.Math.Vector2(
          Phaser.Math.Clamp(x + Math.cos(radians) * radius, 18, 942),
          Phaser.Math.Clamp(y + Math.sin(radians) * radius, 50, 510),
        )

        if (!this.isPointBlocked(candidate.x, candidate.y)) {
          candidates.push(candidate)
        }
      }
    }

    if (!candidates.length || !this.player) {
      return new Phaser.Math.Vector2(Phaser.Math.Clamp(x, 18, 942), Phaser.Math.Clamp(y, 50, 510))
    }

    return candidates.sort((left, right) => {
      const leftDistance = Phaser.Math.Distance.Between(this.player!.x, this.player!.y, left.x, left.y)
      const rightDistance = Phaser.Math.Distance.Between(this.player!.x, this.player!.y, right.x, right.y)
      return leftDistance - rightDistance
    })[0]
  }

  private clearTapDestination(): void {
    this.tapDestination = undefined
    this.tapMarker?.destroy()
    this.tapMarker = undefined
  }

  private clearSelectedPointerTarget(): void {
    this.selectedPointerTarget = undefined

    if (!this.selectionHalo) {
      return
    }

    this.tweens.killTweensOf(this.selectionHalo)
    this.selectionHalo.destroy()
    this.selectionHalo = undefined
  }

  private showTapMarker(x: number, y: number): void {
    if (!this.tapMarker) {
      this.tapMarker = this.add.graphics().setDepth(6)
    }

    this.tapMarker.clear()
    this.tapMarker.lineStyle(2, 0xf4ecd8, 0.9)
    this.tapMarker.strokeCircle(x, y, 8)
    this.tapMarker.lineStyle(2, 0xd7a84b, 0.9)
    this.tapMarker.lineBetween(x - 12, y, x - 4, y)
    this.tapMarker.lineBetween(x + 4, y, x + 12, y)
    this.tapMarker.lineBetween(x, y - 12, x, y - 4)
    this.tapMarker.lineBetween(x, y + 4, x, y + 12)
  }

  private updateInteractionTarget(): void {
    if (!this.player || this.bridge.isDialogueOpen()) {
      this.bridge.setInteraction(undefined)
      this.activeHotspotId = undefined
      this.activeOrbId = undefined
      return
    }

    if (!this.isMobileViewport()) {
      this.orbSpots
        .filter((orb) => orb.mode === 'proximity')
        .forEach((orb) => {
          const distance = Phaser.Math.Distance.Between(this.player!.x, this.player!.y, orb.x, orb.y)

          if (distance <= orb.radius) {
            this.bridge.triggerProximityOrb(orb.id)
          }
        })
    }

    const orbTargets = this.orbSpots
      .filter((orb) => orb.mode === 'visible' || this.isMobileViewport())
      .map((orb) => ({
        kind: 'orb' as const,
        id: orb.id,
        label: orb.label,
        distance: Phaser.Math.Distance.Between(this.player!.x, this.player!.y, orb.x, orb.y),
      }))
      .filter((target) => {
        const orb = this.orbSpots.find((candidate) => candidate.id === target.id)
        return Boolean(orb && target.distance <= orb.radius)
      })

    const hotspotTargets = this.hotspots
      .map((hotspot) => ({
        kind: 'hotspot' as const,
        id: hotspot.id,
        label: hotspot.label,
        scriptId: hotspot.scriptId,
        distance: Phaser.Math.Distance.Between(this.player!.x, this.player!.y, hotspot.x, hotspot.y),
      }))
      .filter((target) => {
        const hotspot = this.hotspots.find((candidate) => candidate.id === target.id)
        return Boolean(hotspot && target.distance <= hotspot.radius)
      })

    const availableTargets = [...orbTargets, ...hotspotTargets]
    const selectedTarget = this.selectedPointerTarget
      ? availableTargets.find(
          (target) =>
            target.kind === this.selectedPointerTarget?.kind && target.id === this.selectedPointerTarget.id,
        )
      : undefined
    const nearestTarget =
      selectedTarget ?? availableTargets.sort((left, right) => left.distance - right.distance)[0]

    if (!nearestTarget) {
      this.bridge.setInteraction(undefined)
      this.activeHotspotId = undefined
      this.activeOrbId = undefined
      return
    }

    if (nearestTarget.kind === 'orb') {
      if (nearestTarget.id !== this.activeOrbId) {
        this.activeHotspotId = undefined
        this.activeOrbId = nearestTarget.id
        this.bridge.setInteraction({
          label: nearestTarget.label,
          run: () => {
            this.clearSelectedPointerTarget()
            this.bridge.openOrb(nearestTarget.id)
          },
        })
      }
      return
    }

    if (nearestTarget.id !== this.activeHotspotId) {
      this.activeHotspotId = nearestTarget.id
      this.activeOrbId = undefined
      if (!this.isMobileViewport()) {
        this.bridge.triggerExplorationPassive(nearestTarget.id)
      }
      this.bridge.setInteraction({
        label: nearestTarget.label,
        run: () => {
          this.clearSelectedPointerTarget()
          if (this.isMobileViewport()) {
            this.bridge.triggerExplorationPassive(nearestTarget.id)
          }
          this.bridge.startDialogue(nearestTarget.scriptId)
        },
      })
    }
  }
}
