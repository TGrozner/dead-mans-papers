const AUDIO_MUTED_STORAGE_KEY = 'dead-mans-papers:ambient-audio-muted'
const DRIP_MIN_DELAY_MS = 1400
const DRIP_MAX_DELAY_MS = 4300
const FLICKER_MIN_DELAY_MS = 1800
const FLICKER_MAX_DELAY_MS = 6200

type AudioContextCtor = typeof AudioContext

export interface AmbientAudioControllerOptions {
  button: HTMLButtonElement
  volume?: number
}

export class AmbientAudioController {
  private readonly button: HTMLButtonElement
  private readonly volume: number
  private context?: AudioContext
  private masterGain?: GainNode
  private neonGain?: GainNode
  private muted: boolean
  private started = false
  private shouldResumeOnVisible = false
  private dripTimer?: number
  private flickerTimer?: number

  constructor({ button, volume = 0.2 }: AmbientAudioControllerOptions) {
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

    const context = this.ensureContext()

    if (!context || !this.masterGain) {
      return
    }

    this.started = true
    void context.resume().then(() => {
      const now = context.currentTime
      this.masterGain?.gain.cancelScheduledValues(now)
      this.masterGain?.gain.setTargetAtTime(this.volume, now, 0.9)
      this.startSchedulers()
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
        this.shouldResumeOnVisible = this.started && !this.muted && this.context?.state === 'running'
        this.stopSchedulers()
        void this.context?.suspend()
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
      this.fadeOutAndSuspend()
    } else {
      this.start()
    }

    this.syncButton()
  }

  private ensureContext(): AudioContext | undefined {
    if (this.context) {
      return this.context
    }

    const ContextCtor = getAudioContextConstructor()

    if (!ContextCtor) {
      return undefined
    }

    const context = new ContextCtor()
    const masterGain = context.createGain()
    masterGain.gain.value = 0
    masterGain.connect(context.destination)

    this.context = context
    this.masterGain = masterGain
    this.createParkingDrone(context, masterGain)
    return context
  }

  private createParkingDrone(context: AudioContext, destination: AudioNode): void {
    const roomTone = context.createGain()
    roomTone.gain.value = 0.5
    roomTone.connect(destination)

    this.createOscillatorLayer(context, roomTone, 'sawtooth', 38, 0.018, 180)
    this.createOscillatorLayer(context, roomTone, 'sine', 55, 0.028, 120)
    this.createOscillatorLayer(context, roomTone, 'triangle', 91, 0.012, 260)

    const hissFilter = context.createBiquadFilter()
    hissFilter.type = 'bandpass'
    hissFilter.frequency.value = 1900
    hissFilter.Q.value = 0.55
    const hissGain = context.createGain()
    hissGain.gain.value = 0.015
    const hiss = context.createBufferSource()
    hiss.buffer = this.createNoiseBuffer(context, 2)
    hiss.loop = true
    hiss.connect(hissFilter)
    hissFilter.connect(hissGain)
    hissGain.connect(roomTone)
    hiss.start()

    const neonGain = context.createGain()
    neonGain.gain.value = 0.018
    neonGain.connect(destination)
    this.neonGain = neonGain
    this.createOscillatorLayer(context, neonGain, 'square', 118, 0.014, 1700)
    this.createOscillatorLayer(context, neonGain, 'sawtooth', 236, 0.007, 2200)
  }

  private createOscillatorLayer(
    context: AudioContext,
    destination: AudioNode,
    type: OscillatorType,
    frequency: number,
    gainValue: number,
    filterFrequency: number,
  ): void {
    const oscillator = context.createOscillator()
    const filter = context.createBiquadFilter()
    const gain = context.createGain()

    oscillator.type = type
    oscillator.frequency.value = frequency
    filter.type = 'lowpass'
    filter.frequency.value = filterFrequency
    filter.Q.value = 0.7
    gain.gain.value = gainValue

    oscillator.connect(filter)
    filter.connect(gain)
    gain.connect(destination)
    oscillator.start()
  }

  private startSchedulers(): void {
    if (this.dripTimer === undefined) {
      this.scheduleDrip()
    }

    if (this.flickerTimer === undefined) {
      this.scheduleNeonFlicker()
    }
  }

  private stopSchedulers(): void {
    window.clearTimeout(this.dripTimer)
    window.clearTimeout(this.flickerTimer)
    this.dripTimer = undefined
    this.flickerTimer = undefined
  }

  private scheduleDrip(): void {
    this.dripTimer = window.setTimeout(() => {
      this.dripTimer = undefined
      this.playWaterDrip()

      if (!this.muted && this.context?.state === 'running') {
        this.scheduleDrip()
      }
    }, randomBetween(DRIP_MIN_DELAY_MS, DRIP_MAX_DELAY_MS))
  }

  private playWaterDrip(): void {
    const context = this.context
    const masterGain = this.masterGain

    if (!context || !masterGain) {
      return
    }

    const now = context.currentTime
    const dripGain = context.createGain()
    const dripTone = context.createOscillator()
    const dripFilter = context.createBiquadFilter()

    dripTone.type = 'sine'
    dripTone.frequency.setValueAtTime(randomBetween(520, 900), now)
    dripTone.frequency.exponentialRampToValueAtTime(randomBetween(170, 260), now + 0.22)
    dripFilter.type = 'bandpass'
    dripFilter.frequency.value = randomBetween(650, 1100)
    dripFilter.Q.value = 8
    dripGain.gain.setValueAtTime(0.0001, now)
    dripGain.gain.exponentialRampToValueAtTime(randomBetween(0.04, 0.075), now + 0.012)
    dripGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42)

    dripTone.connect(dripFilter)
    dripFilter.connect(dripGain)
    dripGain.connect(masterGain)
    dripTone.start(now)
    dripTone.stop(now + 0.48)
  }

  private scheduleNeonFlicker(): void {
    this.flickerTimer = window.setTimeout(() => {
      this.flickerTimer = undefined
      this.playNeonFlicker()

      if (!this.muted && this.context?.state === 'running') {
        this.scheduleNeonFlicker()
      }
    }, randomBetween(FLICKER_MIN_DELAY_MS, FLICKER_MAX_DELAY_MS))
  }

  private playNeonFlicker(): void {
    const context = this.context
    const neonGain = this.neonGain

    if (!context || !neonGain) {
      return
    }

    const now = context.currentTime
    neonGain.gain.cancelScheduledValues(now)
    neonGain.gain.setValueAtTime(0.018, now)
    neonGain.gain.linearRampToValueAtTime(0.085, now + 0.025)
    neonGain.gain.linearRampToValueAtTime(0.011, now + 0.07)
    neonGain.gain.linearRampToValueAtTime(0.062, now + 0.105)
    neonGain.gain.linearRampToValueAtTime(0.018, now + 0.18)
  }

  private fadeOutAndSuspend(): void {
    this.stopSchedulers()

    if (!this.context || !this.masterGain) {
      return
    }

    const context = this.context
    const now = context.currentTime
    this.masterGain.gain.cancelScheduledValues(now)
    this.masterGain.gain.setTargetAtTime(0.0001, now, 0.18)
    window.setTimeout(() => {
      if (this.muted) {
        void context.suspend()
      }
    }, 380)
  }

  private createNoiseBuffer(context: AudioContext, durationSeconds: number): AudioBuffer {
    const frameCount = Math.max(1, Math.floor(context.sampleRate * durationSeconds))
    const buffer = context.createBuffer(1, frameCount, context.sampleRate)
    const samples = buffer.getChannelData(0)

    for (let index = 0; index < frameCount; index += 1) {
      samples[index] = (Math.random() * 2 - 1) * 0.72
    }

    return buffer
  }

  private syncButton(): void {
    this.button.textContent = this.muted ? 'Muet' : 'Son'
    this.button.setAttribute('aria-pressed', String(!this.muted))
    this.button.setAttribute('aria-label', this.muted ? "Activer l'ambiance sonore" : "Couper l'ambiance sonore")
    this.button.title = this.muted ? "Activer l'ambiance sonore" : "Couper l'ambiance sonore"
    this.button.classList.toggle('audio-toggle--muted', this.muted)
  }
}

function getAudioContextConstructor(): AudioContextCtor | undefined {
  return window.AudioContext ?? (window as Window & { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
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
