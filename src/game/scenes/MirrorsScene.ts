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
  marker?: Phaser.GameObjects.Text
}

interface OrbSpot {
  id: string
  label: string
  mode: 'visible' | 'proximity'
  x: number
  y: number
  radius: number
  marker?: Phaser.GameObjects.Text
}

type PointerTarget =
  | { kind: 'orb'; id: string; label: string; x: number; y: number; distance: number }
  | {
      kind: 'hotspot'
      id: string
      label: string
      scriptId: string
      x: number
      y: number
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
      return
    }

    camera.stopFollow()
    camera.setZoom(1)
    camera.centerOn(480, 288)
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
    this.drawUtilityVan(590, 166)
    this.drawParkedVehicles()
    this.drawPrefab(692, 70)
    this.drawPalisade(118, 88)
    this.drawTechnicalRoom()
    this.drawProps()
    this.createColliders()
  }

  private drawTowerBackdrop(): void {
    const graphics = this.add.graphics()
    this.drawCloudTower(graphics, 2, 48, 88, 414, 'Tour C')
    this.drawCloudTower(graphics, 862, 42, 94, 430, 'Tour D')
    this.drawCloudTower(graphics, 334, 46, 116, 126, 'Bât. C')
    this.drawCloudTower(graphics, 36, 390, 122, 120, 'Dalle haute')

    graphics.fillStyle(0x111820, 0.82)
    graphics.fillRect(268, 128, 320, 26)
    graphics.fillStyle(0x334550)
    graphics.fillRect(268, 154, 320, 5)
    graphics.fillStyle(0xd7a84b, 0.8)
    graphics.fillRect(284, 137, 72, 4)
    graphics.fillRect(402, 137, 90, 4)

    this.add.text(424, 50, 'Parking P2', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#171c24',
      backgroundColor: '#f4ecd8',
      padding: { x: 5, y: 2 },
    }).setDepth(2)
  }

  private drawCloudTower(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
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

    this.add.text(x + 7, y + 7, label, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#f4ecd8',
      backgroundColor: '#171c24',
      padding: { x: 3, y: 1 },
    }).setDepth(1)
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

    this.add.text(338, 220, 'P2', {
      fontFamily: 'monospace',
      fontSize: '34px',
      color: '#f4ecd8',
      backgroundColor: 'rgba(13,17,23,0.45)',
      padding: { x: 5, y: 1 },
    }).setDepth(1)

    this.add.text(630, 392, 'SORTIE', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#171c24',
      backgroundColor: '#d7a84b',
      padding: { x: 5, y: 2 },
    }).setDepth(1)

    this.add.text(288, 176, 'PARKING P2 - SOUS DALLE', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#f4ecd8',
      backgroundColor: '#171c24',
      padding: { x: 5, y: 2 },
    }).setDepth(2)
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
    graphics.fillStyle(0x0d1117, 0.48)
    graphics.fillRect(x + 10, y + 18, 182, 98)
    graphics.fillStyle(0xe8e2d2)
    graphics.fillRect(x, y + 22, 178, 76)
    graphics.fillStyle(0xd2cabb)
    graphics.fillRect(x + 118, y + 12, 60, 46)
    graphics.lineStyle(3, 0x0d1117)
    graphics.strokeRect(x, y + 22, 178, 76)
    graphics.strokeRect(x + 118, y + 12, 60, 46)

    graphics.fillStyle(0x1c252b)
    graphics.fillRect(x + 126, y + 18, 42, 20)
    graphics.fillStyle(0x65b7c6, 0.65)
    graphics.fillRect(x + 130, y + 21, 34, 8)
    graphics.fillStyle(0x0d1117)
    graphics.fillRect(x + 18, y + 96, 26, 12)
    graphics.fillRect(x + 132, y + 96, 26, 12)
    graphics.fillRect(x + 18, y + 14, 26, 9)
    graphics.fillRect(x + 132, y + 14, 26, 9)

    graphics.fillStyle(0xb75738)
    graphics.fillRect(x + 12, y + 38, 94, 9)
    graphics.fillStyle(0xd7a84b)
    graphics.fillRect(x + 12, y + 52, 122, 8)
    graphics.fillStyle(0xf4ecd8)
    graphics.fillRect(x + 28, y + 68, 58, 12)
    graphics.fillStyle(0x171c24)
    graphics.fillRect(x + 34, y + 72, 44, 3)

    graphics.fillStyle(0x0b0e12)
    graphics.fillRect(x - 16, y + 45, 28, 54)
    graphics.lineStyle(2, 0xd7a84b)
    graphics.lineBetween(x - 13, y + 50, x + 8, y + 68)
    graphics.lineBetween(x - 13, y + 90, x + 8, y + 72)

    this.add.text(x + 15, y + 35, 'MAIRIE', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#f4ecd8',
      backgroundColor: '#b75738',
      padding: { x: 3, y: 1 },
    }).setDepth(3)

    this.add.text(x + 18, y + 53, 'RENOUV. URBAIN', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#171c24',
      backgroundColor: '#d7a84b',
      padding: { x: 3, y: 1 },
    }).setDepth(3)
  }

  private drawParkedVehicles(): void {
    this.drawParkedCar(350, 372, 0x4c6570)
    this.drawParkedCar(426, 372, 0x7f825f)
    this.drawParkedCar(816, 344, 0x8f3f36)
    this.drawParkedCar(848, 344, 0x2f3f4d)
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
    graphics.fillStyle(0xb75738)

    for (const [x, y] of [
      [356, 386],
      [392, 386],
      [838, 358],
      [870, 358],
    ]) {
      graphics.fillRect(x, y, 20, 28)
      graphics.fillStyle(0xf4ecd8, 0.8)
      graphics.fillRect(x, y + 8, 20, 3)
      graphics.fillStyle(0xb75738)
    }

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
    graphics.fillStyle(0xf4ecd8)
    graphics.fillRect(712, 104, 128, 12)
    graphics.fillStyle(0x171c24)
    graphics.fillRect(716, 108, 80, 3)

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
      [590, 166, 174, 94],
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

    this.add.sprite(514, 286, 'leduc').setDepth(2)
    this.add.sprite(326, 330, 'amar').setDepth(2)

    this.add.text(502, 252, '!', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#f4ecd8',
      backgroundColor: '#b75738',
      padding: { x: 5, y: 1 },
    }).setDepth(4)
  }

  private createHotspots(): void {
    this.hotspots = [
      {
        id: 'utility_van',
        label: "Examiner l'utilitaire municipal",
        scriptId: 'utility_van',
        x: 560,
        y: 282,
        radius: 86,
      },
      {
        id: 'leduc',
        label: 'Parler à Karine Leduc',
        scriptId: 'leduc',
        x: 514,
        y: 286,
        radius: 58,
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
      hotspot.marker = this.add.text(hotspot.x - 7, hotspot.y - 42, '...', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#171c24',
        backgroundColor: '#f4ecd8',
        padding: { x: 4, y: 1 },
      })
      hotspot.marker.setDepth(5)
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
        x: 610,
        y: 282,
        radius: 58,
      },
      {
        id: 'miroirs_orb_body',
        label: 'Regarder le corps',
        mode: 'visible',
        x: 672,
        y: 282,
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
        orb.marker = this.add.text(orb.x - 8, orb.y - 26, '?', {
          fontFamily: 'monospace',
          fontSize: '15px',
          color: '#171c24',
          backgroundColor: '#f4ecd8',
          padding: { x: 5, y: 1 },
        })
        orb.marker.setDepth(5)
      })
  }

  private updatePlayerMovement(): void {
    if (!this.player) {
      return
    }

    if (this.bridge.isDialogueOpen()) {
      this.player.setVelocity(0, 0)
      this.clearTapDestination()
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
      this.setTapDestinationNear(target.x, target.y)
      return
    }

    if (target?.kind === 'orb') {
      this.clearTapDestination()
      this.player.setVelocity(0, 0)
      this.bridge.openOrb(target.id)
      return
    }

    if (target?.kind === 'hotspot') {
      this.clearTapDestination()
      this.player.setVelocity(0, 0)
      this.bridge.triggerExplorationPassive(target.id)
      this.bridge.startDialogue(target.scriptId)
      return
    }

    if (this.isPointBlocked(x, y)) {
      this.clearTapDestination()
      this.player.setVelocity(0, 0)
      return
    }

    this.setTapDestination(x, y)
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

    const nearestTarget = [...orbTargets, ...hotspotTargets].sort(
      (left, right) => left.distance - right.distance,
    )[0]

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
          run: () => this.bridge.openOrb(nearestTarget.id),
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
        run: () => this.bridge.startDialogue(nearestTarget.scriptId),
      })
    }
  }
}
