import Phaser from 'phaser'
import type { HarborGameBridge } from '../createHarborGame'

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

export class HarborScene extends Phaser.Scene {
  private bridge: HarborGameBridge
  private player?: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys
  private keys?: Record<string, Phaser.Input.Keyboard.Key>
  private hotspots: Hotspot[] = []
  private orbSpots: OrbSpot[] = []
  private obstacles: Phaser.GameObjects.Rectangle[] = []
  private activeHotspotId?: string
  private activeOrbId?: string

  constructor(bridge: HarborGameBridge) {
    super('harbor')
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
      ['#1f2630', 6, 0, 12, 4],
      ['#f0c58b', 7, 4, 10, 7],
      ['#293b52', 5, 11, 14, 12],
      ['#d7a84b', 3, 13, 4, 10],
      ['#d7a84b', 17, 13, 4, 10],
      ['#1d2430', 6, 23, 5, 7],
      ['#1d2430', 13, 23, 5, 7],
    ])

    this.makePixelTexture('officer', 24, 30, [
      ['#262b35', 6, 0, 12, 4],
      ['#e0b783', 7, 4, 10, 7],
      ['#4d674f', 5, 11, 14, 12],
      ['#f4ecd8', 9, 13, 6, 3],
      ['#1d2430', 6, 23, 5, 7],
      ['#1d2430', 13, 23, 5, 7],
    ])

    this.makePixelTexture('worker', 24, 30, [
      ['#68412e', 6, 0, 12, 4],
      ['#d9a16f', 7, 4, 10, 7],
      ['#b75738', 5, 11, 14, 12],
      ['#24313a', 4, 13, 3, 10],
      ['#24313a', 17, 13, 3, 10],
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
        const isWater = row >= 14
        const isDock = row >= 11 && row < 14
        const color = isWater ? 0x2a7281 : isDock ? 0x6f5d45 : 0x3b4651

        graphics.fillStyle(color)
        graphics.fillRect(x, y, tile, tile)
        graphics.fillStyle(isWater ? 0x65b7c6 : 0x232b33, 0.28)
        graphics.fillRect(x + 3, y + 28, 22, 2)
      }
    }

    graphics.fillStyle(0x29313a)
    graphics.fillRect(0, 0, 960, 42)
    graphics.fillStyle(0xd7a84b)
    graphics.fillRect(0, 42, 960, 3)

    this.drawContainer(590, 166, 154, 78, 0x236f9e, true)
    this.drawContainer(692, 70, 162, 64, 0x7f3b30, false)
    this.drawContainer(122, 88, 176, 64, 0x2e6b4f, false)
    this.drawWarehouse()
    this.drawProps()
    this.createColliders()
  }

  private drawContainer(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    open: boolean,
  ): void {
    const graphics = this.add.graphics()
    graphics.fillStyle(0x101820)
    graphics.fillRect(x + 6, y + 8, width, height)
    graphics.fillStyle(color)
    graphics.fillRect(x, y, width, height)
    graphics.lineStyle(3, 0x0d1117)
    graphics.strokeRect(x, y, width, height)

    for (let stripe = x + 12; stripe < x + width - 8; stripe += 24) {
      graphics.lineStyle(2, 0x0d1117, 0.32)
      graphics.lineBetween(stripe, y + 6, stripe, y + height - 6)
    }

    if (open) {
      graphics.fillStyle(0x0b0e12)
      graphics.fillRect(x + 14, y + 14, width - 28, height - 26)
      graphics.fillStyle(0xf4ecd8)
      graphics.fillRect(x + 60, y + 36, 38, 10)
      graphics.fillRect(x + 68, y + 28, 18, 8)
      graphics.fillStyle(0xb75738)
      graphics.fillRect(x + 100, y + 22, 30, 8)
    }
  }

  private drawWarehouse(): void {
    const graphics = this.add.graphics()
    graphics.fillStyle(0x25333b)
    graphics.fillRect(54, 230, 230, 132)
    graphics.lineStyle(3, 0x0d1117)
    graphics.strokeRect(54, 230, 230, 132)
    graphics.fillStyle(0xb75738)
    graphics.fillRect(76, 252, 62, 70)
    graphics.fillStyle(0xd7a84b)
    graphics.fillRect(174, 252, 58, 18)
    graphics.fillStyle(0x111820)
    graphics.fillRect(182, 276, 46, 44)
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
      graphics.fillStyle(0x0d1117, 0.45)
      graphics.fillRect(x, y + 8, 20, 3)
      graphics.fillStyle(0xb75738)
    }

    graphics.fillStyle(0xd7a84b)
    graphics.fillRect(486, 68, 18, 266)
    graphics.fillRect(446, 68, 120, 16)
    graphics.fillStyle(0x0d1117)
    graphics.fillRect(550, 84, 8, 54)
    graphics.fillStyle(0xd45d59)
    graphics.fillRect(542, 138, 24, 18)
  }

  private createColliders(): void {
    const obstacles = [
      [54, 230, 230, 132],
      [590, 166, 154, 78],
      [692, 70, 162, 64],
      [122, 88, 176, 64],
      [0, 0, 960, 45],
      [0, 448, 960, 128],
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

    this.add.sprite(514, 286, 'officer').setDepth(2)
    this.add.sprite(326, 330, 'worker').setDepth(2)

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
        id: 'container',
        label: 'Examiner le container bleu',
        scriptId: 'container',
        x: 560,
        y: 282,
        radius: 86,
      },
      {
        id: 'varga',
        label: 'Parler à Varga',
        scriptId: 'varga',
        x: 514,
        y: 286,
        radius: 58,
      },
      {
        id: 'mado',
        label: 'Parler à Mado',
        scriptId: 'mado',
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
        id: 'harbor_orb_container',
        label: 'Observer le container',
        mode: 'visible',
        x: 612,
        y: 286,
        radius: 48,
      },
      {
        id: 'harbor_orb_body',
        label: 'Regarder le corps',
        mode: 'visible',
        x: 675,
        y: 286,
        radius: 52,
      },
      {
        id: 'harbor_orb_crane',
        label: 'Inspecter la grue',
        mode: 'visible',
        x: 486,
        y: 186,
        radius: 62,
      },
      {
        id: 'harbor_orb_warehouse',
        label: "Lire l'entrepôt",
        mode: 'visible',
        x: 174,
        y: 278,
        radius: 78,
      },
      {
        id: 'harbor_orb_sea',
        label: 'Écouter la mer',
        mode: 'proximity',
        x: 470,
        y: 468,
        radius: 96,
      },
      {
        id: 'harbor_orb_dockers',
        label: 'Écouter les dockers',
        mode: 'proximity',
        x: 314,
        y: 388,
        radius: 82,
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
