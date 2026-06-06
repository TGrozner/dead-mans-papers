import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  MIRRORS_HOTSPOTS,
  MIRRORS_ORB_SPOTS,
  MIRRORS_SCENE_HEIGHT,
  MIRRORS_SCENE_WIDTH,
} from '../../src/game/scenes/mirrorsSceneData'

const saveKey = 'dead-mans-papers:v12'
const tutorialSeenKey = 'dead-mans-papers:tutorial-seen-v2'

const voiceStats = {
  memoire_saline: 2,
  procedure: 2,
  nerfs: 1,
  honte_publique: 2,
  bouches: 1,
  faim: 1,
  symbole: 2,
  main_gauche: 2,
}

const runtimeMirrorAssetFiles = [
  'p2-background.png',
  'p2-foreground.png',
  'actor-zinedine.png',
  'actor-leduc.png',
  'actor-amar.png',
  'actor-sofiane.png',
  'prop-cup.png',
  'prop-phone.png',
]

const allMirrorAssetFiles = [
  ...runtimeMirrorAssetFiles,
  'actor-amar.png',
  'actor-leduc.png',
  'actor-sofiane.png',
  'actor-zinedine.png',
  'concept-sheet.png',
  'prop-badge.png',
  'prop-page.png',
].filter((file, index, files) => files.indexOf(file) === index)

const progressedSave = {
  flags: {
    woke_up: true,
    trunk_opened: true,
    papers_seen: true,
    page_found: true,
    page_read: true,
  },
  clues: [
    "Le corps d'un vieil homme est dans l'utilitaire avec la carte, le badge municipal et l'ordonnance de Zinédine posés sur lui.",
    'La caméra du P2 est hors service mais son support est récent.',
    'Le badge municipal de Zinédine porte des rayures fraîches de lecteur.',
    'Une ordonnance de calmants signée Dr Nadia Hami est dans les papiers de Zinédine.',
    'Sofiane fume derrière la palissade pendant la découverte du corps.',
  ],
  completedChecks: {},
  triggeredOrbs: {},
  triggeredPassives: {},
  visitedChoices: {},
  voiceStats,
}

const trunkOpenedSave = {
  flags: {
    woke_up: true,
    trunk_opened: true,
  },
  clues: [
    "Le corps d'un vieil homme probablement Ahmed Berrichi est dans l'utilitaire avec les papiers de Zinédine posés sur lui.",
  ],
  completedChecks: {},
  triggeredOrbs: {},
  triggeredPassives: {},
  visitedChoices: {},
  voiceStats,
}

const completedEvidenceChecks = {
  camera_dead_angle: {
    checkId: 'camera_dead_angle',
    voice: 'procedure',
    supportVoice: 'memoire_saline',
    roll: 4,
    stat: 2,
    supportStat: 2,
    total: 8,
    difficulty: 8,
    passed: true,
  },
  badge_access_chain: {
    checkId: 'badge_access_chain',
    voice: 'main_gauche',
    supportVoice: 'procedure',
    roll: 4,
    stat: 2,
    supportStat: 2,
    total: 8,
    difficulty: 8,
    passed: true,
  },
  hami_prescription_line: {
    checkId: 'hami_prescription_line',
    voice: 'memoire_saline',
    supportVoice: 'procedure',
    roll: 4,
    stat: 2,
    supportStat: 2,
    total: 8,
    difficulty: 8,
    passed: true,
  },
}

const witnessReadySave = {
  ...progressedSave,
  completedChecks: completedEvidenceChecks,
}

const expectedMirrorsSceneAnchorTolerance = 12

const expectedMirrorsSceneFixture = {
  width: 1280,
  height: 720,
  hotspots: [
    { id: 'utility_van', x: 185, y: 407.5 },
    { id: 'leduc', x: 342.5, y: 435 },
    { id: 'amar', x: 875, y: 277.5 },
    { id: 'sofiane', x: 1022.5, y: 585 },
  ],
  orbs: [
    { id: 'miroirs_orb_phone', x: 610, y: 437.5 },
    { id: 'miroirs_orb_van', x: 190, y: 375 },
    { id: 'miroirs_orb_body', x: 142.5, y: 417.5 },
    { id: 'miroirs_orb_camera', x: 262.5, y: 112.5 },
    { id: 'miroirs_orb_technical_room', x: 1080, y: 197.5 },
    { id: 'miroirs_orb_neon', x: 635, y: 340 },
    { id: 'miroirs_orb_residents', x: 1042.5, y: 635 },
  ],
} as const

type ExpectedMirrorsSceneAnchor = {
  id: string
  x: number
  y: number
}

test.beforeEach(async ({ page }) => {
  await gotoApp(page)
  await page.evaluate(() => localStorage.clear())
})

async function gotoApp(page: Page) {
  await page.goto('./')
}

async function seedGame(page: Page, state: unknown) {
  await page.addInitScript(
    ({ key, tutorialKey, saveState }) => {
      localStorage.setItem(tutorialKey, 'true')
      localStorage.setItem(key, JSON.stringify(saveState))
    },
    { key: saveKey, tutorialKey: tutorialSeenKey, saveState: state },
  )
}

async function sampleCanvasPixels(canvas: Locator) {
  return await canvas.evaluate((element) => {
    const source = element as HTMLCanvasElement
    const sampleWidth = 64
    const sampleHeight = 36
    const scratch = document.createElement('canvas')
    scratch.width = sampleWidth
    scratch.height = sampleHeight

    const context = scratch.getContext('2d', { willReadFrequently: true })

    if (!context || source.width === 0 || source.height === 0) {
      return {
        sourceWidth: source.width,
        sourceHeight: source.height,
        sampledPixels: sampleWidth * sampleHeight,
        nonWhitePixels: 0,
        nonDarkPixels: 0,
        colorBuckets: 0,
      }
    }

    context.drawImage(source, 0, 0, sampleWidth, sampleHeight)

    const { data } = context.getImageData(0, 0, sampleWidth, sampleHeight)
    const colors = new Set<string>()
    let nonWhitePixels = 0
    let nonDarkPixels = 0

    for (let index = 0; index < data.length; index += 4) {
      const red = data[index]
      const green = data[index + 1]
      const blue = data[index + 2]
      const alpha = data[index + 3]
      const visible = alpha > 8
      const white = red > 245 && green > 245 && blue > 245 && alpha > 245

      if (visible && !white) {
        nonWhitePixels += 1
        colors.add(`${red >> 4}:${green >> 4}:${blue >> 4}`)
      }

      if (visible && red + green + blue > 64) {
        nonDarkPixels += 1
      }
    }

    return {
      sourceWidth: source.width,
      sourceHeight: source.height,
      sampledPixels: sampleWidth * sampleHeight,
      nonWhitePixels,
      nonDarkPixels,
      colorBuckets: colors.size,
    }
  })
}

async function expectCanvasToHaveRenderedPixels(canvas: Locator) {
  await expect
    .poll(
      async () => {
        const pixels = await sampleCanvasPixels(canvas)

        return (
          pixels.sourceWidth >= 1280 &&
          pixels.sourceHeight >= 720 &&
          pixels.nonWhitePixels > 24 &&
          pixels.nonDarkPixels > 80 &&
          pixels.colorBuckets > 16
        )
      },
      { message: 'canvas should contain varied rendered pixels' },
    )
    .toBe(true)

  const pixels = await sampleCanvasPixels(canvas)
  expect(pixels.sourceWidth).toBeGreaterThanOrEqual(1280)
  expect(pixels.sourceHeight).toBeGreaterThanOrEqual(720)
  expect(pixels.nonDarkPixels).toBeGreaterThan(80)
  expect(pixels.colorBuckets).toBeGreaterThan(16)
}

async function expectSceneReady(page: Page) {
  await expect(page.locator('#game-stage')).toHaveAttribute('data-scene-ready', 'true')
}

async function expectImageNaturalSize(page: Page, src: string, width: number, height: number) {
  const size = await page.evaluate(async (imageSrc) => {
    return await new Promise<{ width: number; height: number; complete: boolean }>((resolve) => {
      const image = new Image()
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight, complete: true })
      image.onerror = () => resolve({ width: 0, height: 0, complete: false })
      image.src = new URL(imageSrc, window.location.href).toString()
    })
  }, src)

  expect(size.complete).toBe(true)
  expect(size.width).toBe(width)
  expect(size.height).toBe(height)
}

async function expectRuntimeAssetVersioned(page: Page, assetPath: string) {
  await expect
    .poll(
      async () => {
        return await page.evaluate((expectedAssetPath) => {
          return performance
            .getEntriesByType('resource')
            .map((entry) => entry.name)
            .filter((name) => name.includes(expectedAssetPath))
            .map((name) => new URL(name).searchParams.get('v'))
            .some(Boolean)
        }, assetPath)
      },
      { message: `${assetPath} should be requested with a build version` },
    )
    .toBe(true)
}

async function expectPagesRuntimeMirrorAssetsVersioned(page: Page) {
  const runtimeAssetUrls = await page.evaluate(() => {
    return performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .filter((name) => name.includes('/assets/miroirs/'))
  })

  expect(runtimeAssetUrls.length).toBeGreaterThanOrEqual(runtimeMirrorAssetFiles.length)

  const runtimeFiles = new Set<string>()

  runtimeAssetUrls.forEach((assetUrl) => {
    const parsedUrl = new URL(assetUrl)
    const filename = parsedUrl.pathname.split('/').at(-1)

    if (filename) {
      runtimeFiles.add(filename)
    }

    expect(parsedUrl.pathname, `${assetUrl} should use the GitHub Pages base path`).toContain(
      '/dead-mans-papers/assets/miroirs/',
    )
    expect(parsedUrl.pathname, `${assetUrl} should not be requested from the site root`).not.toMatch(
      /^\/assets\/miroirs\//,
    )
    expect(parsedUrl.searchParams.get('v'), `${assetUrl} should include a cache-busting version`).toBeTruthy()
  })

  runtimeMirrorAssetFiles.forEach((assetFile) => {
    expect(runtimeFiles.has(assetFile), `${assetFile} should be loaded by the runtime`).toBe(true)
  })
}

async function expectAllPagesMirrorAssetsServed(page: Page) {
  const failedAssets: Array<{ file: string; status: number }> = []

  for (const assetFile of allMirrorAssetFiles) {
    const assetUrl = new URL(`assets/miroirs/${assetFile}?v=e2e`, page.url())

    expect(assetUrl.pathname).toBe(`/dead-mans-papers/assets/miroirs/${assetFile}`)

    const response = await page.request.get(assetUrl.toString())

    if (!response.ok()) {
      failedAssets.push({ file: assetFile, status: response.status() })
      continue
    }

    expect(response.headers()['content-type'] ?? '').toContain('image/png')
  }

  expect(failedAssets).toEqual([])
}

async function expectPageHasNoForcedScroll(page: Page) {
  const overflow = await page.evaluate(() => {
    return {
      bodyScrollHeight: document.body.scrollHeight,
      viewportHeight: document.documentElement.clientHeight,
      appScrollHeight: document.querySelector('#app')?.scrollHeight ?? 0,
      appClientHeight: document.querySelector('#app')?.clientHeight ?? 0,
    }
  })

  expect(overflow.bodyScrollHeight).toBeLessThanOrEqual(overflow.viewportHeight)
  expect(overflow.appScrollHeight).toBeLessThanOrEqual(overflow.appClientHeight)
}

async function expectInViewport(page: Page, selector: string) {
  const box = await page.locator(selector).boundingBox()
  const viewport = page.viewportSize()

  expect(box).not.toBeNull()
  expect(viewport).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width)
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height)
}

async function expectNoHorizontalDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const app = document.querySelector('#app')

    return {
      bodyScrollWidth: document.body.scrollWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      appScrollWidth: app?.scrollWidth ?? 0,
      appClientWidth: app?.clientWidth ?? 0,
    }
  })

  expect(overflow.bodyScrollWidth).toBeLessThanOrEqual(overflow.viewportWidth)
  expect(overflow.documentScrollWidth).toBeLessThanOrEqual(overflow.viewportWidth)
  expect(overflow.appScrollWidth).toBeLessThanOrEqual(overflow.appClientWidth)
}

async function expectFocusInside(page: Page, selector: string) {
  await expect
    .poll(async () => {
      return await page.evaluate((rootSelector) => {
        const root = document.querySelector(rootSelector)
        return Boolean(root?.contains(document.activeElement))
      }, selector)
    })
    .toBe(true)
}

interface VisibleBox {
  bottom: number
  left: number
  right: number
  top: number
}

async function getVisibleBox(page: Page, selector: string): Promise<VisibleBox | undefined> {
  return await page.evaluate((targetSelector) => {
    const element = document.querySelector(targetSelector)

    if (!element) {
      return undefined
    }

    const htmlElement = element as HTMLElement
    const style = window.getComputedStyle(element)
    const box = element.getBoundingClientRect()
    const visible =
      !htmlElement.hidden &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      box.width > 0 &&
      box.height > 0

    if (!visible) {
      return undefined
    }

    return {
      bottom: box.bottom,
      left: box.left,
      right: box.right,
      top: box.top,
    }
  }, selector)
}

async function expectNoElementOverlap(page: Page, firstSelector: string, secondSelector: string) {
  const firstBox = await getVisibleBox(page, firstSelector)
  const secondBox = await getVisibleBox(page, secondSelector)

  expect(firstBox, `${firstSelector} should be visible`).toBeDefined()
  expect(secondBox, `${secondSelector} should be visible`).toBeDefined()

  expect(boxesOverlap(firstBox!, secondBox!), `${firstSelector} should not overlap ${secondSelector}`).toBe(false)
}

async function expectNoVisibleElementOverlap(page: Page, firstSelector: string, secondSelector: string) {
  const firstBox = await getVisibleBox(page, firstSelector)
  const secondBox = await getVisibleBox(page, secondSelector)

  if (!firstBox || !secondBox) {
    return
  }

  expect(boxesOverlap(firstBox, secondBox), `${firstSelector} should not overlap ${secondSelector}`).toBe(false)
}

function boxesOverlap(firstBox: VisibleBox, secondBox: VisibleBox): boolean {
  const horizontalOverlap = Math.max(0, Math.min(firstBox.right, secondBox.right) - Math.max(firstBox.left, secondBox.left))
  const verticalOverlap = Math.max(0, Math.min(firstBox.bottom, secondBox.bottom) - Math.max(firstBox.top, secondBox.top))

  return horizontalOverlap > 0 && verticalOverlap > 0
}

function expectSceneAnchorWithinTolerance(
  productionAnchors: readonly ExpectedMirrorsSceneAnchor[],
  expectedAnchor: ExpectedMirrorsSceneAnchor,
  anchorKind: string,
) {
  const productionAnchor = productionAnchors.find((candidate) => candidate.id === expectedAnchor.id)

  expect(productionAnchor, `${anchorKind} ${expectedAnchor.id} should exist in production scene data`).toBeDefined()

  if (!productionAnchor) {
    return
  }

  for (const axis of ['x', 'y'] as const) {
    const drift = Math.abs(productionAnchor[axis] - expectedAnchor[axis])

    expect(
      drift,
      `${anchorKind} ${expectedAnchor.id} ${axis} drifted ${drift} scene px from the visual fixture`,
    ).toBeLessThanOrEqual(expectedMirrorsSceneAnchorTolerance)
  }
}

function scenePointForHotspot(hotspotId: string): { x: number; y: number } {
  const hotspot = MIRRORS_HOTSPOTS.find((candidate) => candidate.id === hotspotId)

  if (!hotspot) {
    throw new Error(`Unknown test hotspot: ${hotspotId}`)
  }

  return {
    x: hotspot.x,
    y: hotspot.y,
  }
}

function scenePointForOrb(orbId: string): { x: number; y: number } {
  const orb = MIRRORS_ORB_SPOTS.find((candidate) => candidate.id === orbId)

  if (!orb) {
    throw new Error(`Unknown test orb: ${orbId}`)
  }

  return {
    x: orb.x,
    y: orb.y,
  }
}

async function tapScenePoint(page: Page, x: number, y: number) {
  await page.locator('.stage-viewport').evaluate((element, options) => {
    const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth)
    const targetScroll = element.scrollWidth * (options.sceneX / options.sceneWidth) - element.clientWidth / 2

    element.scrollLeft = Math.max(0, Math.min(maxScroll, targetScroll))
  }, { sceneX: x, sceneWidth: MIRRORS_SCENE_WIDTH })

  const canvas = page.locator('#game-stage canvas')
  const canvasBox = await canvas.boundingBox()

  expect(canvasBox).not.toBeNull()

  const tapX = (x / MIRRORS_SCENE_WIDTH) * canvasBox!.width
  const tapY = (y / MIRRORS_SCENE_HEIGHT) * canvasBox!.height

  expect(tapX).toBeGreaterThanOrEqual(0)
  expect(tapY).toBeGreaterThanOrEqual(0)
  expect(tapX).toBeLessThanOrEqual(canvasBox!.width)
  expect(tapY).toBeLessThanOrEqual(canvasBox!.height)

  await canvas.tap({
    position: {
      x: tapX,
      y: tapY,
    },
  })
}

async function clickScenePoint(page: Page, x: number, y: number) {
  await expect(page.locator('#game-stage canvas')).toBeVisible()
  await expectSceneReady(page)

  await page.locator('.stage-viewport').evaluate((element, options) => {
    const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth)
    const targetScroll = element.scrollWidth * (options.sceneX / options.sceneWidth) - element.clientWidth / 2

    element.scrollLeft = Math.max(0, Math.min(maxScroll, targetScroll))
  }, { sceneX: x, sceneWidth: MIRRORS_SCENE_WIDTH })

  const canvas = page.locator('#game-stage canvas')
  const canvasBox = await canvas.boundingBox()

  expect(canvasBox).not.toBeNull()

  await page.mouse.click(
    canvasBox!.x + (x / MIRRORS_SCENE_WIDTH) * canvasBox!.width,
    canvasBox!.y + (y / MIRRORS_SCENE_HEIGHT) * canvasBox!.height,
  )
}

test('keeps Mirrors interactable anchors aligned with the visual fixture', () => {
  expect(MIRRORS_SCENE_WIDTH).toBe(expectedMirrorsSceneFixture.width)
  expect(MIRRORS_SCENE_HEIGHT).toBe(expectedMirrorsSceneFixture.height)

  expectedMirrorsSceneFixture.hotspots.forEach((expectedAnchor) => {
    expectSceneAnchorWithinTolerance(MIRRORS_HOTSPOTS, expectedAnchor, 'hotspot')
  })

  expectedMirrorsSceneFixture.orbs.forEach((expectedAnchor) => {
    expectSceneAnchorWithinTolerance(MIRRORS_ORB_SPOTS, expectedAnchor, 'orb')
  })
})

test('starts with a bounded tutorial and opens the first dialogue', async ({ page }) => {
  await gotoApp(page)

  await expect(page.getByRole('dialog', { name: "Avant d'ouvrir les yeux" })).toBeVisible()
  await expect(page.locator('#objective')).toContainText('Reprendre assez de corps')
  await expect(page.locator('#case-momentum')).toContainText('Appuis')
  await expect(page.locator('#case-momentum')).toContainText('Angles contre toi')
  await expect(page.locator('#lead-list')).toContainText('Téléphone fissuré')
  await expect(page.getByText("Une voix veut dormir. Une autre veut classer les preuves.")).toHaveCount(1)
  await expectFocusInside(page, '#tutorial-root')
  await page.keyboard.press('Tab')
  await expectFocusInside(page, '#tutorial-root')
  await page.keyboard.press('Shift+Tab')
  await expectFocusInside(page, '#tutorial-root')

  const tutorialPanel = page.locator('.tutorial-panel')
  const panelBox = await tutorialPanel.boundingBox()
  const viewport = page.viewportSize()

  expect(panelBox).not.toBeNull()
  expect(viewport).not.toBeNull()
  expect(panelBox!.x).toBeGreaterThanOrEqual(0)
  expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(viewport!.width)

  await page.getByRole('button', { name: 'Commencer' }).click()

  await expect(page.getByRole('dialog', { name: "Avant d'ouvrir les yeux" })).toBeHidden()
  await expect(page.locator('.dialogue-root')).toContainText('Parking P2')
  await expect(page.locator('.dialogue-root')).toContainText("Tu n'as pas encore ouvert les yeux")
  await expect(page.getByRole('button', { name: 'Marcher vers le hayon sans lire les appels. Laisser ton corps signer.' })).toBeVisible()
  await page.keyboard.press('Tab')
  await expectFocusInside(page, '#dialogue-root')
})

test('lets the player push straight from wake-up toward the utility van', async ({ page }) => {
  await gotoApp(page)

  await page.getByRole('button', { name: 'Commencer' }).click()
  await page.getByRole('button', { name: 'Marcher vers le hayon sans lire les appels. Laisser ton corps signer.' }).click()
  await expect(page.locator('.dialogue-root')).toContainText("Karine Leduc t'attend devant l'utilitaire blanc")
  await expect(page.locator('#case-momentum')).toContainText('Angles contre toi')
  await page.getByRole('button', { name: 'Aller vers elle et payer ce que tu as choisi.' }).click()
  await expect(page.locator('#dialogue-root')).toBeHidden()

  await clickScenePoint(page, scenePointForHotspot('utility_van').x, scenePointForHotspot('utility_van').y)
  await expect(page.locator('.dialogue-root')).toContainText('incident de chantier')

  await expect
    .poll(async () => {
      return await page.evaluate((key) => {
        const savedPayload = JSON.parse(localStorage.getItem(key) ?? '{}') as {
          state?: {
            flags?: Record<string, boolean>
          }
        }
        const flags = savedPayload.state?.flags ?? {}

        return flags.woke_up === true && flags.karine_call_ignored === true && flags.arrived_unready === true
      }, saveKey)
    })
    .toBe(true)
})

test('surfaces lead cards and unlocks weak witness contact after the trunk opens', async ({ page }) => {
  await seedGame(page, trunkOpenedSave)

  await gotoApp(page)

  await expect(page.locator('#case-momentum')).toContainText('2/8')
  await expect(page.locator('#lead-list')).toContainText('Nom sur le mort')

  await clickScenePoint(page, scenePointForHotspot('amar').x, scenePointForHotspot('amar').y)
  await expect(page.locator('.dialogue-root')).toContainText('Amar Boudiaf')
  await page.getByRole('button', { name: "Lui demander ce qu'il sait sans preuve en main." }).click()
  await expect(page.locator('.dialogue-root')).toContainText('Tu viens les mains vides')
})

test('renders Phaser canvas and grouped case clues from a saved game', async ({ page }) => {
  await seedGame(page, progressedSave)

  await gotoApp(page)

  const canvas = page.locator('#game-stage canvas')
  await expect(canvas).toBeVisible()

  const canvasBox = await canvas.boundingBox()
  expect(canvasBox).not.toBeNull()
  expect(canvasBox!.width).toBeGreaterThan(100)
  expect(canvasBox!.height).toBeGreaterThan(60)
  await expectCanvasToHaveRenderedPixels(canvas)

  await expect(page.locator('.clue-group-heading span:first-child')).toHaveText([
    'Corps / Ahmed',
    'Caméra P2',
    'Badge / accès',
    'Hami / santé',
    'Témoins',
  ])
})

test('keeps desktop play surfaces bounded without page scroll', async ({ page }) => {
  await seedGame(page, progressedSave)

  await gotoApp(page)

  await expect(page.locator('#game-stage canvas')).toBeVisible()
  await expect(page.locator('.case-panel')).toBeVisible()
  await expectPageHasNoForcedScroll(page)
  await expectInViewport(page, '.stage-wrap')
  await expectInViewport(page, '.case-panel')

  const layout = await page.evaluate(() => {
    const measure = (selector: string) => {
      const element = document.querySelector(selector)
      const box = element?.getBoundingClientRect()

      return {
        width: box?.width ?? 0,
        height: box?.height ?? 0,
        scrollHeight: element?.scrollHeight ?? 0,
        clientHeight: element?.clientHeight ?? 0,
      }
    }

    return {
      stage: measure('#game-stage'),
      panel: measure('.case-panel'),
      clues: measure('.clue-list'),
      voices: measure('.voice-list'),
    }
  })

  expect(layout.stage.width).toBeGreaterThan(300)
  expect(layout.stage.height).toBeGreaterThan(180)
  expect(layout.panel.height).toBeGreaterThan(250)
  expect(layout.clues.scrollHeight).toBeLessThanOrEqual(layout.clues.clientHeight)

  if (layout.voices.width > 0) {
    expect(layout.voices.scrollHeight).toBeLessThanOrEqual(layout.voices.clientHeight)
  }
})

test('keeps mobile play surfaces bounded with an internal case file scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seedGame(page, progressedSave)

  await gotoApp(page)

  await expect(page.locator('#game-stage canvas')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Dossier fermé' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cadrer Zinédine' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.case-panel')).toBeHidden()
  await expectPageHasNoForcedScroll(page)
  await expectNoHorizontalDocumentOverflow(page)
  await expectInViewport(page, '.stage-viewport')

  const layout = await page.evaluate(() => {
    const measure = (selector: string) => {
      const element = document.querySelector(selector)
      const box = element?.getBoundingClientRect()

      return {
        bottom: box?.bottom ?? 0,
        clientWidth: element?.clientWidth ?? 0,
        height: box?.height ?? 0,
        scrollWidth: element?.scrollWidth ?? 0,
        scrollHeight: element?.scrollHeight ?? 0,
        clientHeight: element?.clientHeight ?? 0,
        width: box?.width ?? 0,
      }
    }

    return {
      viewport: measure('.stage-viewport'),
      stage: measure('.stage-wrap'),
      panel: measure('.case-panel'),
    }
  })

  expect(layout.viewport.height).toBeGreaterThan(360)
  expect(layout.stage.height).toBeGreaterThan(300)
  expect(layout.stage.width).toBeGreaterThan(layout.viewport.clientWidth)
  expect(layout.viewport.scrollWidth).toBeGreaterThan(layout.viewport.clientWidth)

  await page.getByRole('button', { name: 'Dossier fermé' }).click()
  await expect(page.locator('.case-panel')).toBeVisible()
  await expectInViewport(page, '.case-panel')

  const panel = await page.evaluate(() => {
    const element = document.querySelector('.case-panel')
    return {
      height: element?.getBoundingClientRect().height ?? 0,
      scrollHeight: element?.scrollHeight ?? 0,
      clientHeight: element?.clientHeight ?? 0,
    }
  })

  expect(panel.height).toBeGreaterThan(320)
  expect(panel.scrollHeight).toBeGreaterThan(panel.clientHeight)
})

test('keeps the action prompt attached to the rendered scene @responsive', async ({ page }) => {
  await seedGame(page, progressedSave)

  await gotoApp(page)

  const canvas = page.locator('#game-stage canvas')
  const prompt = page.getByRole('button', { name: 'Regarder le téléphone' })
  const phoneOrb = scenePointForOrb('miroirs_orb_phone')
  const technicalRoomOrb = scenePointForOrb('miroirs_orb_technical_room')

  await expect(canvas).toBeVisible()
  await expectSceneReady(page)
  await expectCanvasToHaveRenderedPixels(canvas)
  const compactWidth = (page.viewportSize()?.width ?? 0) < 900

  if (compactWidth) {
    await page.locator('.stage-viewport').evaluate((element, options) => {
      element.scrollLeft = element.scrollWidth * (options.sceneX / options.sceneWidth) - element.clientWidth / 2
    }, { sceneX: phoneOrb.x, sceneWidth: MIRRORS_SCENE_WIDTH })
  }

  const canvasBox = await canvas.boundingBox()
  expect(canvasBox).not.toBeNull()
  await page.mouse.move(
    canvasBox!.x + (phoneOrb.x / MIRRORS_SCENE_WIDTH) * canvasBox!.width,
    canvasBox!.y + (phoneOrb.y / MIRRORS_SCENE_HEIGHT) * canvasBox!.height,
    { steps: 6 },
  )
  await expect(prompt).toBeVisible()

  const geometry = await page.evaluate(() => {
    const getBox = (selector: string) => {
      const box = document.querySelector(selector)?.getBoundingClientRect()

      return box
        ? {
            bottom: box.bottom,
            height: box.height,
            left: box.left,
            right: box.right,
            top: box.top,
            width: box.width,
          }
        : undefined
    }

    return {
      canvas: getBox('#game-stage canvas'),
      prompt: getBox('#interaction-prompt'),
      stage: getBox('.stage-wrap'),
    }
  })

  expect(geometry.canvas).toBeDefined()
  expect(geometry.prompt).toBeDefined()
  expect(geometry.stage).toBeDefined()
  if (compactWidth) {
    await expect(page.locator('#mobile-scene-nav')).toBeVisible()
    await expectInViewport(page, '#interaction-prompt')
    await expectInViewport(page, '.stage-viewport')
    await expectNoElementOverlap(page, '#interaction-prompt', '#mobile-scene-nav')

    await page.locator('.stage-viewport').evaluate((element, options) => {
      element.scrollLeft = element.scrollWidth * (options.sceneX / options.sceneWidth) - element.clientWidth / 2
    }, { sceneX: technicalRoomOrb.x, sceneWidth: MIRRORS_SCENE_WIDTH })
    const pannedCanvasBox = await canvas.boundingBox()
    expect(pannedCanvasBox).not.toBeNull()
    await page.mouse.move(
      pannedCanvasBox!.x + (technicalRoomOrb.x / MIRRORS_SCENE_WIDTH) * pannedCanvasBox!.width,
      pannedCanvasBox!.y + (technicalRoomOrb.y / MIRRORS_SCENE_HEIGHT) * pannedCanvasBox!.height,
      { steps: 6 },
    )
    await expect(page.getByRole('button', { name: 'Examiner le local technique' })).toBeVisible()
  } else {
    expect(geometry.stage!.height - geometry.canvas!.height).toBeLessThanOrEqual(12)
    expect(geometry.prompt!.bottom).toBeLessThanOrEqual(geometry.canvas!.bottom - 8)
    expect(geometry.prompt!.left).toBeGreaterThanOrEqual(geometry.canvas!.left + 8)
    expect(geometry.prompt!.right).toBeLessThanOrEqual(geometry.canvas!.right - 8)
    await expectInViewport(page, '.stage-wrap')
  }
})

test('opens utility and trunk visible orbs apart from the utility hotspot', async ({ page }) => {
  await seedGame(page, progressedSave)

  await gotoApp(page)

  const canvas = page.locator('#game-stage canvas')
  await expect(canvas).toBeVisible()
  await expectSceneReady(page)
  await expectCanvasToHaveRenderedPixels(canvas)

  const canvasBox = await canvas.boundingBox()
  expect(canvasBox).not.toBeNull()
  const vanOrb = scenePointForOrb('miroirs_orb_van')
  const bodyOrb = scenePointForOrb('miroirs_orb_body')

  await page.mouse.click(
    canvasBox!.x + (vanOrb.x / MIRRORS_SCENE_WIDTH) * canvasBox!.width,
    canvasBox!.y + (vanOrb.y / MIRRORS_SCENE_HEIGHT) * canvasBox!.height,
  )
  await expect(page.locator('.dialogue-root')).toContainText('Utilitaire municipal')
  await page.getByRole('button', { name: 'Fermer' }).click()

  await page.mouse.click(
    canvasBox!.x + (bodyOrb.x / MIRRORS_SCENE_WIDTH) * canvasBox!.width,
    canvasBox!.y + (bodyOrb.y / MIRRORS_SCENE_HEIGHT) * canvasBox!.height,
  )
  await expect(page.locator('.dialogue-root')).toContainText('Corps dans le coffre')
})

test('triggers proximity orbs as one-shot toasts instead of modal inspections', async ({ page }) => {
  await seedGame(page, progressedSave)

  await gotoApp(page)

  const canvas = page.locator('#game-stage canvas')
  await expect(canvas).toBeVisible()
  await expectSceneReady(page)
  await expectCanvasToHaveRenderedPixels(canvas)
  const canvasBox = await canvas.boundingBox()
  expect(canvasBox).not.toBeNull()
  const neonOrb = scenePointForOrb('miroirs_orb_neon')

  const flaqueX = canvasBox!.x + (neonOrb.x / MIRRORS_SCENE_WIDTH) * canvasBox!.width
  const flaqueY = canvasBox!.y + (neonOrb.y / MIRRORS_SCENE_HEIGHT) * canvasBox!.height
  await page.mouse.click(flaqueX, flaqueY)

  await expect(page.locator('.orb-toast')).toContainText('Flaque sous néon')
  await expect(page.locator('#dialogue-root')).toBeHidden()
  await expect
    .poll(async () => {
      return await page.evaluate((key) => {
        const savedPayload = JSON.parse(localStorage.getItem(key) ?? '{}') as {
          state?: {
            triggeredOrbs?: Record<string, boolean>
          }
          triggeredOrbs?: Record<string, boolean>
        }
        const savedState = savedPayload.state ?? savedPayload

        return savedState.triggeredOrbs?.miroirs_orb_neon === true
      }, saveKey)
    })
    .toBe(true)

  await page.getByRole('button', { name: "Fermer l'observation" }).click()
  await expect(page.locator('.orb-toast')).toHaveCount(0)
  await page.mouse.click(flaqueX, flaqueY)
  await expect(page.locator('.orb-toast')).toHaveCount(0)
})

test('supports real mobile touch taps on primary hotspots @mobile', async ({ page }) => {
  await seedGame(page, witnessReadySave)

  await gotoApp(page)

  const canvas = page.locator('#game-stage canvas')
  await expect(canvas).toBeVisible()
  await expectSceneReady(page)
  await expectCanvasToHaveRenderedPixels(canvas)
  await expect(page.locator('#mobile-scene-nav')).toBeVisible()

  const touchSupport = await page.evaluate(() => {
    return {
      coarsePointer: window.matchMedia('(pointer: coarse)').matches,
      maxTouchPoints: navigator.maxTouchPoints,
    }
  })

  expect(touchSupport.coarsePointer).toBe(true)
  expect(touchSupport.maxTouchPoints).toBeGreaterThan(0)

  const dialogue = page.locator('.dialogue-root')
  const targets = [
    { ...scenePointForHotspot('utility_van'), text: 'incident de chantier' },
    { ...scenePointForHotspot('leduc'), text: "Je n'ai pas besoin d'un héros" },
    { ...scenePointForHotspot('amar'), text: 'sale gueule' },
    { ...scenePointForHotspot('sofiane'), text: 'La palissade garde Sofiane' },
  ]

  for (const target of targets) {
    await tapScenePoint(page, target.x, target.y)
    await expect(dialogue).toContainText(target.text)
    await dialogue.getByRole('button', { name: 'Quitter', exact: true }).click()
    await expect(dialogue).toBeHidden()
  }
})

test('keeps mobile toasts, dossier, and scene navigation separated @mobile', async ({ page }) => {
  await seedGame(page, progressedSave)

  await gotoApp(page)

  await expect(page.locator('#game-stage canvas')).toBeVisible()
  await expectSceneReady(page)
  const neonOrb = scenePointForOrb('miroirs_orb_neon')
  await tapScenePoint(page, neonOrb.x, neonOrb.y)

  await expect(page.locator('.orb-toast')).toContainText('Flaque sous néon')
  await expect(page.locator('#mobile-scene-nav')).toBeVisible()
  await expectNoElementOverlap(page, '.orb-toast', '#mobile-scene-nav')

  await page.getByRole('button', { name: 'Dossier fermé' }).click()
  await expect(page.locator('.case-panel')).toBeVisible()
  await expect(page.locator('#mobile-scene-nav')).toBeHidden()
  await expectNoVisibleElementOverlap(page, '.orb-toast', '.case-panel')
})

test('keeps restored dialogue inside the viewport', async ({ page }) => {
  await seedGame(page, {
    ...progressedSave,
    activeSurface: {
      type: 'dialogue',
      scriptId: 'utility_van',
      nodeId: 'trunk_hub',
    },
  })

  await gotoApp(page)

  await expect(page.locator('#game-stage canvas')).toBeVisible()
  await expect(page.locator('.dialogue-root')).toContainText('Coffre ouvert')
  await expectPageHasNoForcedScroll(page)
  await expectInViewport(page, '.stage-wrap')
  await expectInViewport(page, '.dialogue-root')
})

test('updates the case objective from saved progression', async ({ page }) => {
  await page.addInitScript(
    ({ key, tutorialKey, stats }) => {
      localStorage.setItem(tutorialKey, 'true')
      localStorage.setItem(
        key,
        JSON.stringify({
          flags: {
            woke_up: true,
            trunk_opened: true,
            papers_seen: true,
            page_found: true,
            page_read: true,
          },
          clues: [],
          completedChecks: {
            camera_dead_angle: {
              checkId: 'camera_dead_angle',
              voice: 'procedure',
              supportVoice: 'memoire_saline',
              roll: 4,
              stat: 2,
              supportStat: 2,
              total: 8,
              difficulty: 8,
              passed: true,
            },
          },
          triggeredOrbs: {},
          triggeredPassives: {},
          visitedChoices: {},
          voiceStats: stats,
        }),
      )
    },
    { key: saveKey, tutorialKey: tutorialSeenKey, stats: voiceStats },
  )

  await gotoApp(page)

  await expect(page.locator('#objective')).toContainText('Traiter la piste badge')
})

test('drops impossible saved check results instead of advancing objectives', async ({ page }) => {
  await seedGame(page, {
    ...progressedSave,
    completedChecks: {
      camera_dead_angle: {
        checkId: 'camera_dead_angle',
        voice: 'procedure',
        supportVoice: 'memoire_saline',
        roll: 6,
        stat: 2,
        supportStat: 2,
        total: 99,
        difficulty: 8,
        passed: true,
      },
    },
  })

  await gotoApp(page)

  await expect(page.locator('#objective')).toContainText('Traiter la piste caméra')
})

test('moves the objective from evidence checks to witness confrontation', async ({ page }) => {
  await seedGame(page, witnessReadySave)

  await gotoApp(page)

  await expect(page.locator('#objective')).toContainText('Confronter Amar et Sofiane')
})

test('serves the saved game from the Pages base path @pages', async ({ page }) => {
  const mirrorAssetResponses: Array<{ status: number; url: string }> = []

  page.on('response', (response) => {
    const responseUrl = response.url()

    if (responseUrl.includes('/assets/miroirs/')) {
      mirrorAssetResponses.push({ status: response.status(), url: responseUrl })
    }
  })

  await seedGame(page, progressedSave)
  await page.evaluate(() => performance.clearResourceTimings())

  await gotoApp(page)

  const backgroundResponse = await page.request.get(
    new URL('assets/miroirs/p2-background.png', page.url()).toString(),
  )
  const canvas = page.locator('#game-stage canvas')
  expect(backgroundResponse.ok()).toBe(true)
  expect(backgroundResponse.headers()['content-type']).toContain('image/png')
  await expectRuntimeAssetVersioned(page, 'assets/miroirs/p2-background.png')
  await expectPagesRuntimeMirrorAssetsVersioned(page)
  await expectAllPagesMirrorAssetsServed(page)
  expect(mirrorAssetResponses.filter((response) => response.status >= 400)).toEqual([])
  await expectImageNaturalSize(page, 'assets/miroirs/p2-background.png', 2560, 1440)
  await expect(canvas).toBeVisible()
  await expectCanvasToHaveRenderedPixels(canvas)
  await expect(page.locator('#objective')).toContainText('Traiter la piste caméra')
})

test('keeps the minimum-width play layout unclipped @responsive', async ({ page }) => {
  await seedGame(page, progressedSave)

  await gotoApp(page)

  const canvas = page.locator('#game-stage canvas')
  await expect(canvas).toBeVisible()
  await expectCanvasToHaveRenderedPixels(canvas)
  await expectNoHorizontalDocumentOverflow(page)
  await expectInViewport(page, '.topbar')

  const compactWidth = (page.viewportSize()?.width ?? 0) < 900

  if (compactWidth) {
    await expect(page.getByRole('button', { name: 'Dossier fermé' })).toBeVisible()
    await expect(page.locator('.case-panel')).toBeHidden()
    await expectInViewport(page, '.stage-viewport')

    const stage = await page.evaluate(() => {
      const viewport = document.querySelector('.stage-viewport')
      const wrap = document.querySelector('.stage-wrap')

      return {
        viewportWidth: viewport?.clientWidth ?? 0,
        scrollWidth: viewport?.scrollWidth ?? 0,
        wrapHeight: wrap?.getBoundingClientRect().height ?? 0,
      }
    })

    expect(stage.scrollWidth).toBeGreaterThan(stage.viewportWidth)
    expect(stage.wrapHeight).toBeGreaterThan(300)
    return
  }

  await expect(page.getByRole('button', { name: 'Dossier ouvert' })).toBeVisible()
  await expect(page.locator('.case-panel')).toBeVisible()
  await expectInViewport(page, '.stage-wrap')
  await expectInViewport(page, '.case-panel')
})
