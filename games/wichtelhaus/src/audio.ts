/**
 * Leise Klänge per Web Audio – ohne Audiodateien (Spec: Ruhe-Design).
 * Nichts ist plötzlich laut: alle Klänge blenden weich ein und aus.
 */
type Ctx = AudioContext;

export class Sound {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private rain: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  volume = 0.3;
  muted = false;

  /** erst nach einer Berührung/Taste starten (Browser-Regel) */
  start() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.apply();
    // weißes Rauschen als Grundlage für Regen, Bürsten, Rascheln
    const len = this.ctx.sampleRate * 2;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  setVolume(v: number, muted: boolean) {
    this.volume = Math.max(0, Math.min(1, v));
    this.muted = muted;
    this.apply();
  }

  private apply() {
    if (!this.master || !this.ctx) return;
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.3);
  }

  /** gefiltertes Rauschen mit weicher Hüllkurve */
  private swish(dur: number, freq: number, level: number, q = 0.8) {
    if (!this.ctx || !this.master || !this.noise) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + dur * 0.35);
    g.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  private tone(
    freq: number,
    at: number,
    dur: number,
    level: number,
    type: OscillatorType = "sine",
  ) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + at;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  brush() {
    this.swish(0.7, 3200, 0.25, 0.6);
  }
  page() {
    this.swish(0.35, 5000, 0.18, 1.2);
  }
  water() {
    this.swish(1.2, 900, 0.18, 0.5);
  }
  knock() {
    this.tone(140, 0, 0.18, 0.35, "triangle");
    this.tone(140, 0.28, 0.18, 0.3, "triangle");
  }
  /** kleine, langsame Melodie (Pentatonik) */
  melody() {
    const notes = [523, 587, 659, 784, 880];
    for (let k = 0; k < 6; k++)
      this.tone(notes[Math.floor(Math.random() * notes.length)]!, k * 0.55, 0.9, 0.12, "triangle");
  }
  bird() {
    const base = 2200 + Math.random() * 800;
    for (let k = 0; k < 3; k++) this.tone(base + k * 180, k * 0.12, 0.1, 0.05);
  }
  cricket() {
    for (let k = 0; k < 3; k++) this.tone(4200, k * 0.09, 0.05, 0.02, "square");
  }
  crackle() {
    this.swish(0.08, 1800 + Math.random() * 1500, 0.08, 2);
  }

  /** leiser Regen im Hintergrund an/aus (weich ein- und ausblenden) */
  setRain(on: boolean) {
    if (!this.ctx || !this.master || !this.noise) return;
    const t = this.ctx.currentTime;
    if (on && !this.rain) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 1200;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 4);
      src.connect(f).connect(gain).connect(this.master);
      src.start();
      this.rain = { src, gain };
    } else if (!on && this.rain) {
      const r = this.rain;
      this.rain = null;
      r.gain.gain.setTargetAtTime(0, t, 1.2);
      r.src.stop(t + 6);
    }
  }
}
