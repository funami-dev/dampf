/** Leise Klänge per Web Audio – ohne Audiodateien (Spec: Klang). */
export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
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
  }

  setVolume(v: number, muted: boolean) {
    this.volume = Math.max(0, Math.min(1, v));
    this.muted = muted;
    this.apply();
  }

  private apply() {
    if (!this.master || !this.ctx) return;
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
  }

  private tone(freq: number, dur: number, type: OscillatorType, level: number, delay = 0) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /** Einrasten eines Kabels */
  click() {
    this.tone(1800, 0.05, "square", 0.08);
  }
  /** Schalter umlegen */
  clack() {
    this.tone(320, 0.07, "triangle", 0.25);
    this.tone(180, 0.09, "triangle", 0.15, 0.03);
  }
  /** Lämpchen geht an */
  pling() {
    this.tone(880, 0.35, "sine", 0.18);
    this.tone(1320, 0.3, "sine", 0.08, 0.04);
  }
  /** Kurzschluss: kurzes tiefes Brummen */
  buzz() {
    this.tone(90, 0.45, "sawtooth", 0.12);
  }
  /** Mission geschafft */
  tada() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, "triangle", 0.18, i * 0.12));
  }
}
