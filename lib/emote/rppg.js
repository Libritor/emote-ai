// rppg.js — remote photoplethysmography engine.
// Turns a stream of skin-ROI mean-RGB samples into heart rate + HRV.
//
// Method: POS (Plane-Orthogonal-to-Skin, Wang et al., IEEE TBME 2017) to derive
// a motion/illumination-robust pulse signal, then zero-phase band-pass (0.7–4 Hz)
// + FFT for HR and peak-interval analysis for HRV. This is a real, published
// rPPG pipeline — not a mock. Accuracy still depends on lighting, stillness and
// skin visibility, which is exactly what the SIGNAL QUALITY readout reflects.

import * as dsp from './dsp.js';

const FS = 30;            // uniform resample rate (Hz)
const LO_HZ = 0.7;        // 42 BPM
const HI_HZ = 4.0;        // 240 BPM

export class RppgEngine {
  constructor({ windowSec = 12, minSec = 6 } = {}) {
    this.windowSec = windowSec;   // sliding analysis window
    this.minSec = minSec;         // min data before a first estimate
    this.fs = FS;
    this.samples = [];            // { t, r, g, b } in seconds / 0-255
    this.smoothedBpm = null;      // exponential smoothing of the HR estimate
  }

  reset() {
    this.samples = [];
    this.smoothedBpm = null;
  }

  // Push one ROI mean-colour sample. `t` is a monotonic time in seconds.
  push(t, r, g, b) {
    this.samples.push({ t, r, g, b });
    const cutoff = t - this.windowSec;
    while (this.samples.length && this.samples[0].t < cutoff) this.samples.shift();
  }

  // 0..1 fill fraction of the analysis window (drives BUFFER PROGRESS).
  progress() {
    if (this.samples.length < 2) return 0;
    const dur = this.samples[this.samples.length - 1].t - this.samples[0].t;
    return Math.max(0, Math.min(1, dur / this.windowSec));
  }

  bufferedSeconds() {
    if (this.samples.length < 2) return 0;
    return this.samples[this.samples.length - 1].t - this.samples[0].t;
  }

  // POS pulse extraction with overlap-add over 1.6 s sub-windows.
  _pos(R, G, B) {
    const n = R.length;
    const l = Math.round(1.6 * this.fs);
    const H = new Float64Array(n);
    if (n < l) {
      // Too short for POS windowing — fall back to normalized green (still valid).
      const g = dsp.detrend(G);
      return g;
    }
    for (let m = 0; m + l <= n; m++) {
      let mr = 0, mg = 0, mb = 0;
      for (let i = m; i < m + l; i++) { mr += R[i]; mg += G[i]; mb += B[i]; }
      mr /= l; mg /= l; mb /= l;
      const S1 = new Float64Array(l);
      const S2 = new Float64Array(l);
      for (let i = 0; i < l; i++) {
        const rn = mr !== 0 ? R[m + i] / mr : 0;
        const gn = mg !== 0 ? G[m + i] / mg : 0;
        const bn = mb !== 0 ? B[m + i] / mb : 0;
        // Projection onto the plane orthogonal to skin tone.
        S1[i] = gn - bn;               // [ 0, 1, -1]
        S2[i] = -2 * rn + gn + bn;     // [-2, 1,  1]
      }
      const sd1 = dsp.std(S1);
      const sd2 = dsp.std(S2);
      const alpha = sd2 !== 0 ? sd1 / sd2 : 0;
      let hm = 0;
      const h = new Float64Array(l);
      for (let i = 0; i < l; i++) { h[i] = S1[i] + alpha * S2[i]; hm += h[i]; }
      hm /= l;
      for (let i = 0; i < l; i++) H[m + i] += h[i] - hm; // overlap-add, mean-removed
    }
    return H;
  }

  // Run the full pipeline. Returns null until there is enough data; otherwise
  // { bpm, quality, snr, hrv, waveform, fs }.
  compute() {
    if (this.bufferedSeconds() < this.minSec) return null;
    if (this.samples.length < this.fs * this.minSec * 0.4) return null;

    const times = this.samples.map((s) => s.t);
    const R = dsp.resampleUniform(times, this.samples.map((s) => s.r), this.fs);
    const G = dsp.resampleUniform(times, this.samples.map((s) => s.g), this.fs);
    const B = dsp.resampleUniform(times, this.samples.map((s) => s.b), this.fs);
    if (R.length < 16) return null;

    const pulse = dsp.detrend(this._pos(R, G, B));
    const wave = dsp.bandpass(pulse, this.fs, LO_HZ, HI_HZ);

    const hr = dsp.estimateHR(wave, this.fs, 42, 240);
    if (!hr) return null;

    // Signal quality: map SNR (roughly -3..+8 dB in practice) to 0..100%.
    const quality = Math.max(0, Math.min(100, ((hr.snr + 3) / 11) * 100));

    // Only smooth / trust the HR when the pulse is reasonably clean.
    let bpm = hr.bpm;
    if (quality < 15) {
      // Signal too weak / dead — don't emit a misleading heart-rate number.
      this.smoothedBpm = null;
      bpm = null;
    } else if (quality > 25) {
      this.smoothedBpm = this.smoothedBpm == null
        ? bpm
        : 0.7 * this.smoothedBpm + 0.3 * bpm;
      bpm = this.smoothedBpm;
    }

    // HRV — only attempt on a good-quality pulse (rPPG HRV is fragile).
    let hrv = null;
    if (quality > 45) {
      const beats = dsp.detectBeats(wave, this.fs, 220);
      hrv = dsp.hrvFromBeats(beats, this.fs);
    }

    return {
      bpm,
      rawBpm: hr.bpm,
      snr: hr.snr,
      quality,
      hrv,
      waveform: wave,
      fs: this.fs,
    };
  }
}
