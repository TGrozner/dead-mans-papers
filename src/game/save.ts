import { voices } from './content'
import type { GameState, VoiceId } from './types'

const STORAGE_KEY = 'dead-mans-papers:v7'

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
