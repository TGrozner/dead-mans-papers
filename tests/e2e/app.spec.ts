import { expect, test } from '@playwright/test'

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

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
})

test('starts with a bounded tutorial and opens the first dialogue', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('dialog', { name: 'Avance, observe, choisis' })).toBeVisible()
  await expect(page.locator('#objective')).toContainText('Reprendre assez de corps')
  await expect(page.getByText('Le dossier garde les indices.')).toHaveCount(1)

  const tutorialPanel = page.locator('.tutorial-panel')
  const panelBox = await tutorialPanel.boundingBox()
  const viewport = page.viewportSize()

  expect(panelBox).not.toBeNull()
  expect(viewport).not.toBeNull()
  expect(panelBox!.x).toBeGreaterThanOrEqual(0)
  expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(viewport!.width)

  await page.getByRole('button', { name: 'Commencer' }).click()

  await expect(page.getByRole('dialog', { name: 'Avance, observe, choisis' })).toBeHidden()
  await expect(page.locator('.dialogue-root')).toContainText('Parking P2')
  await expect(page.locator('.dialogue-root')).toContainText('Tu reviens au monde')
})

test('renders Phaser canvas and grouped case clues from a saved game', async ({ page }) => {
  await page.addInitScript(
    ({ key, tutorialKey, stats }) => {
      localStorage.setItem(tutorialKey, 'true')
      localStorage.setItem(
        key,
        JSON.stringify({
          flags: {},
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
          voiceStats: stats,
        }),
      )
    },
    { key: saveKey, tutorialKey: tutorialSeenKey, stats: voiceStats },
  )

  await page.goto('/')

  const canvas = page.locator('#game-stage canvas')
  await expect(canvas).toBeVisible()

  const canvasBox = await canvas.boundingBox()
  expect(canvasBox).not.toBeNull()
  expect(canvasBox!.width).toBeGreaterThan(100)
  expect(canvasBox!.height).toBeGreaterThan(60)

  await expect(page.locator('.clue-group-heading')).toContainText([
    'Corps / Ahmed',
    'Caméra P2',
    'Badge / accès',
    'Hami / santé',
    'Témoins',
  ])
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

  await page.goto('/')

  await expect(page.locator('#objective')).toContainText('Traiter la piste badge')
})
