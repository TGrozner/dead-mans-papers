import { expect, test, type Locator, type Page } from '@playwright/test'

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
    const sampleWidth = 32
    const sampleHeight = 32
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
      }
    }

    context.drawImage(source, 0, 0, sampleWidth, sampleHeight)

    const { data } = context.getImageData(0, 0, sampleWidth, sampleHeight)
    const colors = new Set<string>()
    let nonWhitePixels = 0

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
    }

    return {
      sourceWidth: source.width,
      sourceHeight: source.height,
      sampledPixels: sampleWidth * sampleHeight,
      nonWhitePixels,
      colorBuckets: colors.size,
    }
  })
}

async function expectCanvasToHaveRenderedPixels(canvas: Locator) {
  await expect
    .poll(
      async () => {
        const pixels = await sampleCanvasPixels(canvas)

        return pixels.nonWhitePixels
      },
      { message: 'canvas should contain non-white rendered pixels' },
    )
    .toBeGreaterThan(24)

  const pixels = await sampleCanvasPixels(canvas)
  expect(pixels.sourceWidth).toBeGreaterThanOrEqual(1280)
  expect(pixels.sourceHeight).toBeGreaterThanOrEqual(720)
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

test('starts with a bounded tutorial and opens the first dialogue', async ({ page }) => {
  await gotoApp(page)

  await expect(page.getByRole('dialog', { name: 'Observe, clique, choisis' })).toBeVisible()
  await expect(page.locator('#objective')).toContainText('Reprendre assez de corps')
  await expect(page.getByText('Le dossier garde les indices.')).toHaveCount(1)
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

  await expect(page.getByRole('dialog', { name: 'Observe, clique, choisis' })).toBeHidden()
  await expect(page.locator('.dialogue-root')).toContainText('Parking P2')
  await expect(page.locator('.dialogue-root')).toContainText('Tu reviens au monde')
  await page.keyboard.press('Tab')
  await expectFocusInside(page, '#dialogue-root')
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

  await expect(page.locator('.clue-group-heading')).toContainText([
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

test('keeps the action prompt attached to the rendered scene @responsive', async ({ page }) => {
  await seedGame(page, progressedSave)

  await gotoApp(page)

  const canvas = page.locator('#game-stage canvas')
  const prompt = page.getByRole('button', { name: 'Regarder le téléphone' })

  await expect(canvas).toBeVisible()
  await expectCanvasToHaveRenderedPixels(canvas)
  const canvasBox = await canvas.boundingBox()
  expect(canvasBox).not.toBeNull()
  await page.mouse.move(canvasBox!.x + (610 / 1280) * canvasBox!.width, canvasBox!.y + (438 / 720) * canvasBox!.height, {
    steps: 6,
  })
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
  expect(geometry.stage!.height - geometry.canvas!.height).toBeLessThanOrEqual(12)
  expect(geometry.prompt!.bottom).toBeLessThanOrEqual(geometry.canvas!.bottom - 8)
  expect(geometry.prompt!.left).toBeGreaterThanOrEqual(geometry.canvas!.left + 8)
  expect(geometry.prompt!.right).toBeLessThanOrEqual(geometry.canvas!.right - 8)

  await expectInViewport(page, '.stage-wrap')
})

test('triggers proximity orbs as one-shot toasts instead of modal inspections', async ({ page }) => {
  await seedGame(page, progressedSave)

  await gotoApp(page)

  const canvas = page.locator('#game-stage canvas')
  await expect(canvas).toBeVisible()
  await expectCanvasToHaveRenderedPixels(canvas)
  const canvasBox = await canvas.boundingBox()
  expect(canvasBox).not.toBeNull()

  const flaqueX = canvasBox!.x + (476 / 960) * canvasBox!.width
  const flaqueY = canvasBox!.y + (272 / 576) * canvasBox!.height
  await page.mouse.click(flaqueX, flaqueY)

  await expect(page.locator('.orb-toast')).toContainText('Flaque sous néon')
  await expect(page.locator('#dialogue-root')).toBeHidden()
  await expect
    .poll(async () => {
      return await page.evaluate((key) => {
        const savedState = JSON.parse(localStorage.getItem(key) ?? '{}') as {
          triggeredOrbs?: Record<string, boolean>
        }

        return savedState.triggeredOrbs?.miroirs_orb_neon === true
      }, saveKey)
    })
    .toBe(true)

  await page.getByRole('button', { name: "Fermer l'observation" }).click()
  await expect(page.locator('.orb-toast')).toHaveCount(0)
  await page.mouse.click(flaqueX, flaqueY)
  await expect(page.locator('.orb-toast')).toHaveCount(0)
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
  await seedGame(page, {
    ...progressedSave,
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
    },
  })

  await gotoApp(page)

  await expect(page.locator('#objective')).toContainText('Confronter Amar et Sofiane')
})

test('serves the saved game from the Pages base path @pages', async ({ page }) => {
  await seedGame(page, progressedSave)

  await gotoApp(page)

  const backgroundResponse = await page.request.get(
    new URL('assets/miroirs/p2-background.png', page.url()).toString(),
  )
  const canvas = page.locator('#game-stage canvas')
  expect(backgroundResponse.ok()).toBe(true)
  expect(backgroundResponse.headers()['content-type']).toContain('image/png')
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
  await expect(page.getByRole('button', { name: 'Dossier ouvert' })).toBeVisible()
  await expect(page.locator('.case-panel')).toBeVisible()
  await expectNoHorizontalDocumentOverflow(page)
  await expectInViewport(page, '.topbar')
  await expectInViewport(page, '.stage-wrap')
  await expectInViewport(page, '.case-panel')
})
