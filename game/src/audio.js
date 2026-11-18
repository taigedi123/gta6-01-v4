// WebAudio synth: engine hum, gunshots, sirens, cash register, and a tiny
// procedural radio — three stations (synthwave, latin, lo-fi) built from oscillators.
// Everything is generated; no audio files, no network.
export class SoundBank {
  constructor() {
    this.ctx = null; this.master = null; this.musicGain = null; this.sfxGain = null;
    this.station = 0; this.musicOn = true; this.muted = false;
    this.stations = ['SOLMAR FM — Synthwave', 'RADIO CALIENTE — Latin', 'LO-FI HARBOR — Chill'];
    this._nextNote = 0; this._step = 0;
    this._melodies = [
      [0, 3, 5, 7, 10, 7, 5, 3],      // synthwave minor
      [0, 2, 4, 7, 9, 7, 4, 2],       // latin major
      [0, 5, 7, 10, 12, 10, 7, 5],    // lo-fi pentatonic
    ];
    this._roots = [110, 130.81, 98];
  }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.16;
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 0.5;
      this.sfxGain.connect(this.master);
    } catch (e) { this.ctx = null; }
  }
  toggleMute() { this.muted = !this.muted; if (this.master) this.master.gain.value = this.muted ? 0 : 0.5; return this.muted; }
  cycleStation() { this.station = (this.station + 1) % 3; this._step = 0; return this.stations[this.station]; }
  _tone(freq, dur, type, vol, when = 0, slideTo = 0) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(this.sfxGain);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  _noise(dur, vol, lowpass = 1200) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lowpass;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.sfxGain); src.start(t0);
  }
  shoot(kind) {
    if (kind === 'shotgun') { this._noise(0.25, 0.9, 900); this._tone(90, 0.18, 'square', 0.4, 0, 40); }
    else if (kind === 'rifle') { this._noise(0.12, 0.6, 2400); this._tone(220, 0.08, 'square', 0.3, 0, 70); }
    else { this._noise(0.08, 0.5, 3000); this._tone(300, 0.06, 'square', 0.25, 0, 90); }
  }
  hit() { this._tone(180, 0.1, 'triangle', 0.35, 0, 90); }
  crash() { this._noise(0.3, 0.7, 500); this._tone(70, 0.25, 'sawtooth', 0.3, 0, 35); }
  pickup() { this._tone(660, 0.09, 'sine', 0.35); this._tone(990, 0.14, 'sine', 0.35, 0.08); }
  cash() { this._tone(880, 0.08, 'sine', 0.3); this._tone(1174, 0.08, 'sine', 0.3, 0.07); this._tone(1568, 0.16, 'sine', 0.3, 0.14); }
  siren() { this._tone(700, 0.5, 'sine', 0.12, 0, 950); this._tone(950, 0.5, 'sine', 0.12, 0.5, 700); }
  missionOk() { [523, 659, 784, 1046].forEach((f, i) => this._tone(f, 0.18, 'triangle', 0.3, i * 0.11)); }
  missionFail() { [400, 350, 300, 200].forEach((f, i) => this._tone(f, 0.22, 'sawtooth', 0.22, i * 0.13)); }
  engine(rpm) { if (!this.ctx) return; this._tone(50 + rpm * 90, 0.09, 'sawtooth', 0.05); }
  // Called every frame while music is on: schedules a soft bass + lead note.
  tickMusic(dt) {
    if (!this.ctx || !this.musicOn || this.muted) return;
    this._nextNote -= dt;
    if (this._nextNote > 0) return;
    this._nextNote = 0.24;
    const mel = this._melodies[this.station];
    const root = this._roots[this.station];
    const deg = mel[this._step % mel.length];
    const freq = root * Math.pow(2, deg / 12) * (this._step % 16 === 0 ? 2 : 1);
    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = this.station === 2 ? 'sine' : 'triangle';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.12, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5);
    o.connect(g); g.connect(this.musicGain); o.start(t0); o.stop(t0 + 0.55);
    if (this._step % 4 === 0) {
      const b = this.ctx.createOscillator(), bg = this.ctx.createGain();
      b.type = 'sine'; b.frequency.value = root / 2;
      bg.gain.setValueAtTime(0.2, t0); bg.gain.exponentialRampToValueAtTime(0.001, t0 + 0.9);
      b.connect(bg); bg.connect(this.musicGain); b.start(t0); b.stop(t0 + 0.95);
    }
    this._step++;
  }
}
