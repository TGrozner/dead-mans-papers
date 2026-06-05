import Phaser from 'phaser'
import type { MirrorsGameBridge } from '../createMirrorsGame'

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
    if (!this.input.keyboard) {
      return
    }

    this.cursors = this.input.keyboard.createCursorKeys()
    this.keys = this.input.keyboard.addKeys('W,A,S,D,Z,Q,E,SPACE,ENTER') as Record<
      string,
      Phaser.Input.Keyboard.Key
    >
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

    graphics.fillStyle(0x22262c)
    graphics.fillRect(0, 0, 960, 42)
    graphics.fillStyle(0xcfd6d2)
    graphics.fillRect(0, 42, 960, 2)
    graphics.fillStyle(0xd7a84b)

    for (let x = 342; x < 860; x += 86) {
      graphics.fillRect(x, 332, 52, 3)
      graphics.fillRect(x, 406, 52, 3)
    }

    this.drawUtilityVan(590, 166)
    this.drawPrefab(692, 70)
    this.drawPalisade(118, 88)
    this.drawTechnicalRoom()
    this.drawProps()
    this.createColliders()
  }

  private drawTowerBackdrop(): void {
    const graphics = this.add.graphics()
    const towers = [
      [4, 48, 76, 408, 'C'],
      [880, 42, 72, 420, 'D'],
      [342, 46, 98, 118, 'Bât. C'],
      [34, 392, 118, 116, 'Dalle haute'],
    ] as Array<[number, number, number, number, string]>

    towers.forEach(([x, y, width, height, label]) => {
      graphics.fillStyle(0x171a1d, 0.72)
      graphics.fillRect(x + 8, y + 10, width, height)
      graphics.fillStyle(0x20262c)
      graphics.fillRect(x, y, width, height)
      graphics.lineStyle(2, 0x0d1117, 0.8)
      graphics.strokeRect(x, y, width, height)

      for (let windowY = y + 18; windowY < y + height - 14; windowY += 24) {
        for (let windowX = x + 10; windowX < x + width - 12; windowX += 20) {
          const lit = (windowX + windowY) % 3 === 0
          graphics.fillStyle(lit ? 0xd7a84b : 0x334550, lit ? 0.72 : 0.42)
          graphics.fillRect(windowX, windowY, 8, 6)
        }
      }

      this.add.text(x + 8, y + 6, label, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#f4ecd8',
        backgroundColor: '#171c24',
        padding: { x: 3, y: 1 },
      }).setDepth(1)
    })

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

  private drawUtilityVan(x: number, y: number): void {
    const graphics = this.add.graphics()
    graphics.fillStyle(0x0d1117, 0.45)
    graphics.fillRect(x + 8, y + 14, 176, 90)
    graphics.fillStyle(0xe7e2d2)
    graphics.fillRect(x, y + 18, 174, 70)
    graphics.fillStyle(0xc6c0af)
    graphics.fillRect(x + 120, y + 8, 54, 34)
    graphics.fillStyle(0x1c252b)
    graphics.fillRect(x + 128, y + 14, 34, 16)
    graphics.lineStyle(3, 0x0d1117)
    graphics.strokeRect(x, y + 18, 174, 70)
    graphics.fillStyle(0xb75738)
    graphics.fillRect(x + 14, y + 34, 88, 8)
    graphics.fillStyle(0xd7a84b)
    graphics.fillRect(x + 14, y + 48, 118, 7)
    graphics.fillStyle(0x0b0e12)
    graphics.fillRect(x + 16, y + 61, 82, 25)
    graphics.fillStyle(0xf4ecd8)
    graphics.fillRect(x + 42, y + 72, 38, 8)
    graphics.fillStyle(0xb75738)
    graphics.fillRect(x + 96, y + 68, 32, 7)
    graphics.fillStyle(0x0d1117)
    graphics.fillRect(x + 26, y + 84, 22, 10)
    graphics.fillRect(x + 130, y + 84, 22, 10)
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
    if (!this.player || !this.cursors || !this.keys) {
      return
    }

    if (this.bridge.isDialogueOpen()) {
      this.player.setVelocity(0, 0)
      return
    }

    const speed = 132
    const left = this.cursors.left.isDown || this.keys.A.isDown || this.keys.Q.isDown
    const right = this.cursors.right.isDown || this.keys.D.isDown
    const up = this.cursors.up.isDown || this.keys.W.isDown || this.keys.Z.isDown
    const down = this.cursors.down.isDown || this.keys.S.isDown
    const velocity = new Phaser.Math.Vector2(
      Number(right) - Number(left),
      Number(down) - Number(up),
    )

    if (velocity.length() > 0) {
      velocity.normalize().scale(speed)
    }

    this.player.setVelocity(velocity.x, velocity.y)

    if ((this.activeHotspotId || this.activeOrbId) && (this.keys.E.isDown || this.keys.SPACE.isDown || this.keys.ENTER.isDown)) {
      if (this.activeOrbId) {
        this.bridge.openOrb(this.activeOrbId)
        return
      }

      const hotspot = this.hotspots.find((target) => target.id === this.activeHotspotId)
      hotspot && this.bridge.startDialogue(hotspot.scriptId)
    }
  }

  private updateInteractionTarget(): void {
    if (!this.player || this.bridge.isDialogueOpen()) {
      this.bridge.setInteraction(undefined)
      this.activeHotspotId = undefined
      this.activeOrbId = undefined
      return
    }

    this.orbSpots
      .filter((orb) => orb.mode === 'proximity')
      .forEach((orb) => {
        const distance = Phaser.Math.Distance.Between(this.player!.x, this.player!.y, orb.x, orb.y)

        if (distance <= orb.radius) {
          this.bridge.triggerProximityOrb(orb.id)
        }
      })

    const orbTargets = this.orbSpots
      .filter((orb) => orb.mode === 'visible')
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
      this.bridge.triggerExplorationPassive(nearestTarget.id)
      this.bridge.setInteraction({
        label: nearestTarget.label,
        run: () => this.bridge.startDialogue(nearestTarget.scriptId),
      })
    }
  }
}
