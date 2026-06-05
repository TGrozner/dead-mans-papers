import { voices } from './content'
import type { ActiveSurface, GameState, VoiceId } from './types'

const STORAGE_KEY = 'dead-mans-papers:v12'
const TUTORIAL_HIDDEN_KEY = 'dead-mans-papers:tutorial-hidden-v2'
const TUTORIAL_SEEN_KEY = 'dead-mans-papers:tutorial-seen-v2'
const LEGACY_NAME_REPLACEMENTS: Array<[RegExp, string]> = [
  [/Zin\?dine Sa\?di/g, 'Zin\u00e9dine Sa\u00efdi'],
  [/Zin\?dine/g, 'Zin\u00e9dine'],
  [/Sa\?di/g, 'Sa\u00efdi'],
  [/Morad Sa\?di/g, 'Zin\u00e9dine Sa\u00efdi'],
  [/Morad Sa\u00efdi/g, 'Zin\u00e9dine Sa\u00efdi'],
  [/Morad/g, 'Zin\u00e9dine'],
  [/why_morad/g, 'why_zinedine'],
  [/ahmed_morad/g, 'ahmed_zinedine'],
  [/morad-/g, 'zinedine-'],
]

export function createInitialState(): GameState {
  const voiceStats = voices.reduce(
    (stats, voice) => {
      stats[voice.id] = voice.startingValue
      return stats
    },
    {} as Record<VoiceId, number>,
  )

  return {
    activeSurface: undefined,
    flags: {},
    clues: [],
    completedChecks: {},
    identityPosture: undefined,
    triggeredOrbs: {},
    triggeredPassives: {},
    visitedChoices: {},
    voiceStats,
  }
}

export function loadGameState(): GameState {
  const initialState = createInitialState()
  const rawState = localStorage.getItem(STORAGE_KEY)

  if (!rawState) {
    return initialState
  }

  try {
    const parsedState = JSON.parse(rawState) as Partial<GameState>

    return {
      activeSurface: migrateActiveSurface(parseActiveSurface(parsedState.activeSurface)),
      flags: parsedState.flags ?? initialState.flags,
      clues: parseClues(parsedState.clues, initialState.clues),
      completedChecks: parsedState.completedChecks ?? initialState.completedChecks,
      identityPosture: parsedState.identityPosture,
      triggeredOrbs: parsedState.triggeredOrbs ?? initialState.triggeredOrbs,
      triggeredPassives: migrateRecordKeys(parsedState.triggeredPassives ?? initialState.triggeredPassives),
      visitedChoices: migrateRecordKeys(parsedState.visitedChoices ?? initialState.visitedChoices),
      voiceStats: {
        ...initialState.voiceStats,
        ...parsedState.voiceStats,
      },
    }
  } catch {
    return initialState
  }
}

function parseClues(clues: unknown, fallback: string[]): string[] {
  if (!Array.isArray(clues)) {
    return fallback
  }

  return clues.filter((clue): clue is string => typeof clue === 'string').map(migrateLegacyNames)
}

function migrateActiveSurface(surface: ActiveSurface | undefined): ActiveSurface | undefined {
  if (surface?.type !== 'dialogue') {
    return surface
  }

  return {
    ...surface,
    nodeId: migrateLegacyNames(surface.nodeId),
  }
}

function migrateRecordKeys<T>(record: Record<string, T>): Record<string, T> {
  return Object.entries(record).reduce(
    (migrated, [key, value]) => {
      migrated[migrateLegacyNames(key)] = value
      return migrated
    },
    {} as Record<string, T>,
  )
}

function migrateLegacyNames(value: string): string {
  return LEGACY_NAME_REPLACEMENTS.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), value)
}

function parseActiveSurface(surface: Partial<ActiveSurface> | undefined): ActiveSurface | undefined {
  if (!surface || typeof surface !== 'object') {
    return undefined
  }

  if (surface.type === 'dialogue' && typeof surface.scriptId === 'string' && typeof surface.nodeId === 'string') {
    return {
      type: 'dialogue',
      scriptId: surface.scriptId,
      nodeId: surface.nodeId,
      checkId: typeof surface.checkId === 'string' ? surface.checkId : undefined,
    }
  }

  if (surface.type === 'orb' && typeof surface.orbId === 'string') {
    return {
      type: 'orb',
      orbId: surface.orbId,
    }
  }

  return undefined
}

export function saveGameState(state: GameState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function resetGameState(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function isTutorialHidden(): boolean {
  return localStorage.getItem(TUTORIAL_HIDDEN_KEY) === 'true'
}

export function isTutorialSeen(): boolean {
  return localStorage.getItem(TUTORIAL_SEEN_KEY) === 'true'
}

export function setTutorialSeen(seen: boolean): void {
  if (seen) {
    localStorage.setItem(TUTORIAL_SEEN_KEY, 'true')
    return
  }

  localStorage.removeItem(TUTORIAL_SEEN_KEY)
}

export function setTutorialHidden(hidden: boolean): void {
  if (hidden) {
    localStorage.setItem(TUTORIAL_HIDDEN_KEY, 'true')
    return
  }

  localStorage.removeItem(TUTORIAL_HIDDEN_KEY)
}
