/**
 * ~3 s "welcome" sound for the login moment, synthesised with Web Audio (no audio file to ship).
 * Timeline matches WelcomeReveal: a soft whoosh while the circle opens, a warm pad underneath,
 * chime notes when the check mark lands (~1 s), a high sparkle, then a long fade.
 */

const LENGTH = 3.2

type AudioCtor = typeof AudioContext

/** Create the context inside the click/submit handler — browsers only allow sound after a user gesture. */
export function prepareLoginSound(): AudioContext | null {
  try {
    const Ctor: AudioCtor | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext
    if (!Ctor) return null
    const ctx = new Ctor()
    void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

export function discardLoginSound(ctx: AudioContext | null) {
  void ctx?.close().catch(() => {})
}

/** Schedules the whole sound on `ctx` starting at `t0`. Works on a live or an offline context. */
export function scheduleLoginSound(ctx: BaseAudioContext, t0 = ctx.currentTime): void {
  const master = ctx.createGain()
  master.gain.value = 0.55
  const compressor = ctx.createDynamicsCompressor()
  master.connect(compressor).connect(ctx.destination)

  // short, dark room tail shared by everything
  const reverb = ctx.createConvolver()
  const len = Math.floor(ctx.sampleRate * 1.8)
  const ir = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6)
  }
  reverb.buffer = ir
  const wet = ctx.createGain()
  wet.gain.value = 0.42
  reverb.connect(wet).connect(master)
  const bus = ctx.createGain()
  bus.connect(master)
  bus.connect(reverb)

  // whoosh: filtered noise that swells and opens up with the reveal
  const noise = ctx.createBufferSource()
  const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const nd = nb.getChannelData(0)
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1
  noise.buffer = nb
  noise.loop = true
  const band = ctx.createBiquadFilter()
  band.type = 'bandpass'
  band.Q.value = 0.8
  band.frequency.setValueAtTime(260, t0)
  band.frequency.exponentialRampToValueAtTime(2600, t0 + 0.9)
  const whoosh = ctx.createGain()
  whoosh.gain.setValueAtTime(0.0001, t0)
  whoosh.gain.exponentialRampToValueAtTime(0.1, t0 + 0.55)
  whoosh.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.2)
  noise.connect(band).connect(whoosh).connect(bus)
  noise.start(t0)
  noise.stop(t0 + 1.3)

  // pad: G2 / D3 / G3 / B3 triangles, slow swell, long release
  const padFilter = ctx.createBiquadFilter()
  padFilter.type = 'lowpass'
  padFilter.frequency.setValueAtTime(500, t0)
  padFilter.frequency.exponentialRampToValueAtTime(2200, t0 + 1.4)
  padFilter.frequency.exponentialRampToValueAtTime(700, t0 + LENGTH)
  const pad = ctx.createGain()
  pad.gain.setValueAtTime(0.0001, t0)
  pad.gain.exponentialRampToValueAtTime(0.09, t0 + 1.0)
  pad.gain.setValueAtTime(0.09, t0 + 1.5)
  pad.gain.exponentialRampToValueAtTime(0.0001, t0 + LENGTH)
  padFilter.connect(pad).connect(bus)
  for (const [f, detune] of [[98, -4], [146.83, 3], [196, -3], [246.94, 5]] as const) {
    const o = ctx.createOscillator()
    o.type = 'triangle'
    o.frequency.value = f
    o.detune.value = detune
    o.connect(padFilter)
    o.start(t0)
    o.stop(t0 + LENGTH + 0.05)
  }

  // chimes: sine + a bright inharmonic partial, quick attack, exponential decay
  const bell = (at: number, freq: number, level: number, decay: number) => {
    const t = t0 + at
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(level, t + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
    g.connect(bus)
    for (const [mult, amp] of [[1, 1], [2.76, 0.28], [5.4, 0.08]] as const) {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = freq * mult
      const a = ctx.createGain()
      a.gain.value = amp
      o.connect(a).connect(g)
      o.start(t)
      o.stop(t + decay + 0.05)
    }
  }
  bell(1.05, 523.25, 0.2, 1.7) // C5 — lands with the check
  bell(1.22, 659.25, 0.17, 1.6) // E5
  bell(1.4, 783.99, 0.16, 1.6) // G5
  bell(1.62, 1046.5, 0.14, 1.5) // C6
  bell(1.95, 1567.98, 0.07, 1.2) // G6 sparkle
}

/** Plays the sound on a context made by `prepareLoginSound`, then releases it. */
export function playLoginSound(ctx: AudioContext | null) {
  if (!ctx) return
  try {
    scheduleLoginSound(ctx)
    window.setTimeout(() => discardLoginSound(ctx), (LENGTH + 0.8) * 1000)
  } catch {
    discardLoginSound(ctx)
  }
}
