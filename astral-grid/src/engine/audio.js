/**
 * Audio Engine — Realistic flight sounds via Web Audio API
 * Engine tone, wind, warnings (GPWS, stall, overspeed)
 */

export class AudioEngine {
  constructor() {
    this.ctx     = null;
    this.master  = null;
    this._nodes  = {};
    this._ready  = false;
  }

  init() {
    this.ctx    = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(this.ctx.destination);

    this._buildEngineSound();
    this._buildWindSound();
    this._buildCabinHum();
    this._ready = true;
    return this;
  }

  resume() {
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  // ── Engine sound — twin CFM56-style turbofan ─────────────────────────────

  _buildEngineSound() {
    const ctx = this.ctx;

    // Low-frequency core roar
    const lfo  = ctx.createOscillator();
    const base = ctx.createOscillator();
    const fan  = ctx.createOscillator();

    lfo.type  = 'sine';   lfo.frequency.value  = 48;
    base.type = 'sawtooth'; base.frequency.value = 96;
    fan.type  = 'sawtooth'; fan.frequency.value  = 240;

    const lfoGain  = ctx.createGain(); lfoGain.gain.value  = 0.6;
    const baseGain = ctx.createGain(); baseGain.gain.value = 0.3;
    const fanGain  = ctx.createGain(); fanGain.gain.value  = 0.12;

    // Filter — turbofan is band-limited
    const filter = ctx.createBiquadFilter();
    filter.type            = 'bandpass';
    filter.frequency.value = 180;
    filter.Q.value         = 0.8;

    const filter2 = ctx.createBiquadFilter();
    filter2.type            = 'lowpass';
    filter2.frequency.value = 1200;

    const engGain = ctx.createGain();
    engGain.gain.value = 0.25;

    lfo.connect(lfoGain);   lfoGain.connect(filter);
    base.connect(baseGain); baseGain.connect(filter);
    fan.connect(fanGain);   fanGain.connect(filter);
    filter.connect(filter2);
    filter2.connect(engGain);
    engGain.connect(this.master);

    lfo.start(); base.start(); fan.start();

    this._nodes.engLfo  = lfo;
    this._nodes.engBase = base;
    this._nodes.engFan  = fan;
    this._nodes.engGain = engGain;
    this._nodes.engFilter = filter;
  }

  // ── Wind sound — rushing air ─────────────────────────────────────────────

  _buildWindSound() {
    const ctx    = this.ctx;
    const bufLen = ctx.sampleRate * 2;
    const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const src  = ctx.createBufferSource();
    src.buffer = buf;
    src.loop   = true;

    const hp = ctx.createBiquadFilter();
    hp.type            = 'highpass';
    hp.frequency.value = 1800;

    const windGain = ctx.createGain();
    windGain.gain.value = 0;

    src.connect(hp); hp.connect(windGain); windGain.connect(this.master);
    src.start();

    this._nodes.windSrc  = src;
    this._nodes.windGain = windGain;
  }

  // ── Cabin hum — pressurisation / air conditioning ────────────────────────

  _buildCabinHum() {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 110;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 200;

    const humGain = ctx.createGain(); humGain.gain.value = 0.04;
    osc.connect(filter); filter.connect(humGain); humGain.connect(this.master);
    osc.start();
    this._nodes.cabinOsc = osc;
  }

  // ── Update every frame ───────────────────────────────────────────────────

  update(state) {
    if (!this._ready || !this.ctx) return;

    const t = this.ctx.currentTime;

    // Engine pitch/volume tracks N1 + speed
    const n1Norm = state.n1 / 100;
    const basePitch = 48 + n1Norm * 160;
    const fanPitch  = 240 + n1Norm * 800;

    this._nodes.engLfo.frequency.setTargetAtTime(basePitch * 0.5, t, 0.3);
    this._nodes.engBase.frequency.setTargetAtTime(basePitch, t, 0.3);
    this._nodes.engFan.frequency.setTargetAtTime(fanPitch, t, 0.2);
    this._nodes.engGain.gain.setTargetAtTime(0.15 + n1Norm * 0.35, t, 0.25);
    this._nodes.engFilter.frequency.setTargetAtTime(80 + n1Norm * 400, t, 0.25);

    // Wind scales with speed
    const windVol = Math.max(0, (state.speedKt - 100) / 400) * 0.18;
    this._nodes.windGain.gain.setTargetAtTime(windVol, t, 0.5);

    // Warnings
    if (state.stall && !this._nodes.stallPlaying) {
      this._startStallWarning();
    } else if (!state.stall && this._nodes.stallPlaying) {
      this._stopStallWarning();
    }

    if (state.gpws && !this._nodes.gpwsPlaying) {
      this._startGpwsWarning();
    } else if (!state.gpws && this._nodes.gpwsPlaying) {
      this._stopGpwsWarning();
    }
  }

  _startStallWarning() {
    if (this._nodes.stallPlaying) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'square'; osc.frequency.value = 660;
    const g = ctx.createGain(); g.gain.value = 0.15;
    osc.connect(g); g.connect(this.master);

    // Intermittent beep
    const beeperGain = g;
    let on = true;
    this._nodes.stallTimer = setInterval(() => {
      on = !on;
      beeperGain.gain.setValueAtTime(on ? 0.15 : 0, ctx.currentTime);
    }, 350);

    osc.start();
    this._nodes.stallOsc = osc;
    this._nodes.stallGain = g;
    this._nodes.stallPlaying = true;
  }

  _stopStallWarning() {
    clearInterval(this._nodes.stallTimer);
    this._nodes.stallOsc?.stop();
    this._nodes.stallOsc  = null;
    this._nodes.stallPlaying = false;
  }

  _startGpwsWarning() {
    if (this._nodes.gpwsPlaying) return;
    const ctx = this.ctx;
    const t   = ctx.currentTime;

    // "PULL UP" tone: rising 2-tone
    const playTone = (freq, startT, dur) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.2, startT);
      g.gain.exponentialRampToValueAtTime(0.001, startT + dur);
      o.connect(g); g.connect(this.master);
      o.start(startT); o.stop(startT + dur + 0.05);
    };

    this._nodes.gpwsTimer = setInterval(() => {
      const now = ctx.currentTime;
      playTone(880, now,       0.18);
      playTone(1100, now + 0.22, 0.18);
    }, 900);

    this._nodes.gpwsPlaying = true;
  }

  _stopGpwsWarning() {
    clearInterval(this._nodes.gpwsTimer);
    this._nodes.gpwsPlaying = false;
  }

  setVolume(v) {
    if (this.master) this.master.gain.value = Math.max(0, Math.min(1, v));
  }
}
