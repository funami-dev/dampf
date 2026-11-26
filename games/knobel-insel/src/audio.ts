/** Leise Klänge per Web Audio – ohne Audiodateien (startet bei 30 %). */
export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  volume = 0.3;
  muted = false;

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
  private tone(freq: number, dur: number, type: OscillatorType, level: number, delay = 0, to = 0) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  /** Pfannkuchen anheben */
  pick() {
    this.tone(520, 0.08, "sine", 0.15, 0, 700);
  }
  /** Pfannkuchen ablegen: weiches „Plopp“ */
  drop() {
    this.tone(260, 0.12, "sine", 0.22, 0, 140);
  }
  /** „Autsch!“ – kleines Quietschen */
  ouch() {
    this.tone(900, 0.18, "triangle", 0.14, 0, 1500);
    this.tone(1400, 0.12, "triangle", 0.08, 0.12, 700);
  }
  click() {
    this.tone(1200, 0.05, "square", 0.05);
  }
  /** Boot legt ab: leises Plätschern */
  splash() {
    this.tone(300, 0.25, "sine", 0.1, 0, 180);
    this.tone(450, 0.2, "sine", 0.06, 0.08, 220);
  }
  /** Gans schnattert erschrocken */
  honk() {
    this.tone(420, 0.12, "sawtooth", 0.08, 0, 360);
    this.tone(420, 0.12, "sawtooth", 0.08, 0.16, 330);
  }
  tada() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, "triangle", 0.16, i * 0.12));
  }
}
