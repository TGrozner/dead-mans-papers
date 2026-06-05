import { voices } from './content'
import type { GameState, VoiceId } from './types'

const STORAGE_KEY = 'dead-mans-papers:v11'
const TUTORIAL_HIDDEN_KEY = 'dead-mans-papers:tutorial-hidden-v2'
const TUTORIAL_SEEN_KEY = 'dead-mans-papers:tutorial-seen-v2'

export function createInitialState(): GameState {
  const voiceStats = voices.reduce(
    (stats, voice) => {
      stats[voice.id] = voice.startingValue
      return stats
    },
    {} as Record<VoiceId, number>,
  )

  return {
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
      flags: parsedState.flags ?? initialState.flags,
      clues: parsedState.clues ?? initialState.clues,
      completedChecks: parsedState.completedChecks ?? initialState.completedChecks,
      identityPosture: parsedState.identityPosture,
      triggeredOrbs: parsedState.triggeredOrbs ?? initialState.triggeredOrbs,
      triggeredPassives: parsedState.triggeredPassives ?? initialState.triggeredPassives,
      visitedChoices: parsedState.visitedChoices ?? initialState.visitedChoices,
      voiceStats: {
        ...initialState.voiceStats,
        ...parsedState.voiceStats,
      },
    }
  } catch {
    return initialState
  }
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
