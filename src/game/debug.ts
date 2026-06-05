export interface DebugEntry {
  time: string
  scope: string
  event: string
  data?: Record<string, unknown>
}

const DEBUG_STORAGE_KEY = 'dead-mans-papers:debug'

export function isDebugEnabled(): boolean {
  const params = new URLSearchParams(window.location.search)
  return params.has('debug') || localStorage.getItem(DEBUG_STORAGE_KEY) === '1'
}

export function setDebugEnabled(enabled: boolean): void {
  if (enabled) {
    localStorage.setItem(DEBUG_STORAGE_KEY, '1')
    return
  }

  localStorage.removeItem(DEBUG_STORAGE_KEY)
}

export function debugLog(scope: string, event: string, data?: Record<string, unknown>): void {
  if (!isDebugEnabled()) {
    return
  }

  const entry: DebugEntry = {
    time: new Date().toISOString(),
    scope,
    event,
    data,
  }

  console.debug(`[DMP:${scope}] ${event}`, data ?? {})
  window.dispatchEvent(new CustomEvent<DebugEntry>('dmp:debug', { detail: entry }))
}
