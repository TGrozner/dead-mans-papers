import { voices } from './content'
import type { ActiveSurface, CheckResult, GameState, IdentityPosture, VoiceId } from './types'

const STORAGE_KEY = 'dead-mans-papers:v12'
const TUTORIAL_HIDDEN_KEY = 'dead-mans-papers:tutorial-hidden-v2'
const TUTORIAL_SEEN_KEY = 'dead-mans-papers:tutorial-seen-v2'
const identityPostures = new Set<IdentityPosture>(['accept', 'refuse', 'perform', 'defile'])
const voiceIds = new Set<VoiceId>(voices.map((voice) => voice.id))

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
  const rawState = readStorage(STORAGE_KEY)

  if (!rawState) {
    return initialState
  }

  try {
    const parsedState = JSON.parse(rawState) as unknown

    if (!isRecord(parsedState)) {
      return initialState
    }

    return {
      activeSurface: parseActiveSurface(parsedState.activeSurface),
      flags: parseBooleanRecord(parsedState.flags),
      clues: parseStringList(parsedState.clues),
      completedChecks: parseCompletedChecks(parsedState.completedChecks),
      identityPosture: parseIdentityPosture(parsedState.identityPosture),
      triggeredOrbs: parseBooleanRecord(parsedState.triggeredOrbs),
      triggeredPassives: parseBooleanRecord(parsedState.triggeredPassives),
      visitedChoices: parseBooleanRecord(parsedState.visitedChoices),
      voiceStats: parseVoiceStats(parsedState.voiceStats, initialState.voiceStats),
    }
  } catch {
    return initialState
  }
}

function parseActiveSurface(surface: unknown): ActiveSurface | undefined {
  if (!isRecord(surface)) {
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
  writeStorage(STORAGE_KEY, JSON.stringify(state))
}

export function resetGameState(): void {
  removeStorage(STORAGE_KEY)
}

export function isTutorialHidden(): boolean {
  return readStorage(TUTORIAL_HIDDEN_KEY) === 'true'
}

export function isTutorialSeen(): boolean {
  return readStorage(TUTORIAL_SEEN_KEY) === 'true'
}

export function setTutorialSeen(seen: boolean): void {
  if (seen) {
    writeStorage(TUTORIAL_SEEN_KEY, 'true')
    return
  }

  removeStorage(TUTORIAL_SEEN_KEY)
}

export function setTutorialHidden(hidden: boolean): void {
  if (hidden) {
    writeStorage(TUTORIAL_HIDDEN_KEY, 'true')
    return
  }

  removeStorage(TUTORIAL_HIDDEN_KEY)
}

function parseBooleanRecord(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'),
  )
}

function parseStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return [...new Set(value.filter((item): item is string => typeof item === 'string'))]
}

function parseCompletedChecks(value: unknown): Record<string, CheckResult> {
  if (!isRecord(value)) {
    return {}
  }

  const checks: Record<string, CheckResult> = {}

  for (const [key, result] of Object.entries(value)) {
    const parsedResult = parseCheckResult(result)

    if (parsedResult && parsedResult.checkId === key) {
      checks[key] = parsedResult
    }
  }

  return checks
}

function parseCheckResult(value: unknown): CheckResult | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  if (
    typeof value.checkId !== 'string' ||
    !isVoiceId(value.voice) ||
    !isFiniteNumber(value.roll) ||
    !isFiniteNumber(value.stat) ||
    !isFiniteNumber(value.total) ||
    !isFiniteNumber(value.difficulty) ||
    typeof value.passed !== 'boolean'
  ) {
    return undefined
  }

  const supportVoice = isVoiceId(value.supportVoice) ? value.supportVoice : undefined
  const supportStat = isFiniteNumber(value.supportStat) ? value.supportStat : undefined

  return {
    checkId: value.checkId,
    voice: value.voice,
    supportVoice,
    roll: value.roll,
    stat: value.stat,
    supportStat,
    total: value.total,
    difficulty: value.difficulty,
    passed: value.passed,
  }
}

function parseIdentityPosture(value: unknown): IdentityPosture | undefined {
  return typeof value === 'string' && identityPostures.has(value as IdentityPosture)
    ? (value as IdentityPosture)
    : undefined
}

function parseVoiceStats(
  value: unknown,
  initialVoiceStats: Record<VoiceId, number>,
): Record<VoiceId, number> {
  if (!isRecord(value)) {
    return initialVoiceStats
  }

  const voiceStats = { ...initialVoiceStats }

  for (const voice of voices) {
    const stat = value[voice.id]

    if (isFiniteNumber(stat)) {
      voiceStats[voice.id] = stat
    }
  }

  return voiceStats
}

function isVoiceId(value: unknown): value is VoiceId {
  return typeof value === 'string' && voiceIds.has(value as VoiceId)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage may be blocked or full; gameplay can continue in memory.
  }
}

function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // Storage may be blocked; resetting in-memory state still works.
  }
}
