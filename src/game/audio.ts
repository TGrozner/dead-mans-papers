declare const __STATIC_ASSET_VERSION__: string

const AUDIO_MUTED_STORAGE_KEY = 'dead-mans-papers:ambient-audio-muted'

export interface AmbientAudioControllerOptions {
  button: HTMLButtonElement
  sources: {
    format: 'ogg' | 'mp3'
    src: string
  }[]
  volume?: number
}

export class AmbientAudioController {
  private readonly audio: HTMLAudioElement
  private readonly button: HTMLButtonElement
  private readonly volume: number
  private muted: boolean
  private started = false
  private shouldResumeOnVisible = false

  constructor({ button, sources, volume = 0.18 }: AmbientAudioControllerOptions) {
    this.audio = new Audio()
    this.audio.src = this.pickSource(sources)
    this.audio.loop = true
    this.audio.preload = 'auto'
    this.audio.volume = volume
    this.audio.muted = false
    this.button = button
    this.volume = volume
    this.muted = loadMutedPreference()

    this.syncButton()
    this.bindEvents()
  }

  start(): void {
    if (this.muted) {
      return
    }

    if (this.started && !this.audio.paused) {
      return
    }

    this.started = true
    this.audio.volume = this.volume

    void this.audio.play().catch(() => {
      this.started = false
    })
  }

  private bindEvents(): void {
    this.button.addEventListener('click', () => {
      this.setMuted(!this.muted)
    })

    const startOnGesture = (event: Event) => {
      if (event.target instanceof Node && this.button.contains(event.target)) {
        return
      }

      this.start()
    }

    document.addEventListener('pointerdown', startOnGesture, { passive: true })
    document.addEventListener('keydown', startOnGesture)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.shouldResumeOnVisible = this.started && !this.muted && !this.audio.paused
        this.audio.pause()
        return
      }

      if (this.shouldResumeOnVisible) {
        this.shouldResumeOnVisible = false
        this.start()
      }
    })
  }

  private setMuted(muted: boolean): void {
    this.muted = muted
    saveMutedPreference(muted)

    if (muted) {
      this.audio.pause()
    } else {
      this.start()
    }

    this.syncButton()
  }

  private syncButton(): void {
    this.button.textContent = this.muted ? 'Muet' : 'Son'
    this.button.setAttribute('aria-pressed', String(!this.muted))
    this.button.setAttribute('aria-label', this.muted ? "Activer l'ambiance sonore" : "Couper l'ambiance sonore")
    this.button.title = this.muted ? "Activer l'ambiance sonore" : "Couper l'ambiance sonore"
    this.button.classList.toggle('audio-toggle--muted', this.muted)
  }

  private pickSource(sources: AmbientAudioControllerOptions['sources']): string {
    const probe = document.createElement('audio')
    const playableSource = sources.find(({ format }) => {
      if (format === 'ogg') {
        return this.audioCanPlay(probe, 'audio/ogg; codecs="vorbis"')
      }

      return this.audioCanPlay(probe, 'audio/mpeg')
    })

    return playableSource?.src ?? sources[0]?.src ?? ''
  }

  private audioCanPlay(probe: HTMLAudioElement, mimeType: string): boolean {
    return probe.canPlayType(mimeType) !== ''
  }
}

export function versionedAudioAsset(file: string): string {
  return `${import.meta.env.BASE_URL}assets/audio/${file}?v=${encodeURIComponent(__STATIC_ASSET_VERSION__)}`
}

function loadMutedPreference(): boolean {
  try {
    return window.localStorage.getItem(AUDIO_MUTED_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function saveMutedPreference(muted: boolean): void {
  try {
    window.localStorage.setItem(AUDIO_MUTED_STORAGE_KEY, String(muted))
  } catch {
    // Audio preference is optional; storage failures should not affect play.
  }
}
