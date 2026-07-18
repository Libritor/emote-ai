// dsp.js — signal-processing primitives for the rPPG heart-rate / HRV estimator.
// Pure functions, no DOM. Everything works on Float64Array for speed & precision.

export function mean(x) {
  let m = 0;
  for (let i = 0; i < x.length; i++) m += x[i];
  return x.length ? m / x.length : 0;
}

export function std(x) {
  const n = x.length;
  if (n < 2) return 0;
  const m = mean(x);
  let s = 0;
  for (let i = 0; i < n; i++) { const d = x[i] - m; s += d * d; }
  return Math.sqrt(s / (n - 1));
}

export function median(arr) {
  if (!arr.length) return 0;
  const s = Array.from(arr).sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : 0.5 * (s[mid - 1] + s[mid]);
}

export function nextPow2(n) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

// Hann window of length n.
export function hann(n) {
  const w = new Float64Array(n);
  if (n === 1) { w[0] = 1; return w; }
  for (let i = 0; i < n; i++) w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
  return w;
}

// Resample an unevenly-sampled series (times in seconds, ascending) onto a
// uniform grid at `fs` Hz via linear interpolation. rPPG frames arrive at a
// jittery ~30fps, so this is required before any FFT / IIR filtering.
export function resampleUniform(times, values, fs) {
  const len = times.length;
  if (len < 2) return new Float64Array(0);
  const t0 = times[0];
  const t1 = times[len - 1];
  const n = Math.max(2, Math.floor((t1 - t0) * fs));
  const out = new Float64Array(n);
  let j = 0;
  for (let i = 0; i < n; i++) {
    const t = t0 + i / fs;
    while (j < len - 2 && times[j + 1] < t) j++;
    const ta = times[j], tb = times[j + 1];
    const va = values[j], vb = values[j + 1];
    const span = tb - ta;
    const frac = span > 0 ? (t - ta) / span : 0;
    out[i] = va + (vb - va) * Math.max(0, Math.min(1, frac));
  }
  return out;
}

// Remove DC offset and linear trend (least-squares) — kills slow drift from
// lighting / breathing before band-pass filtering.
export function detrend(x) {
  const n = x.length;
  if (n < 2) return Float64Array.from(x);
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sx += i; sy += x[i]; sxx += i * i; sxy += i * x[i]; }
  const denom = n * sxx - sx * sx;
  const slope = denom !== 0 ? (n * sxy - sx * sy) / denom : 0;
  const intercept = (sy - slope * sx) / n;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = x[i] - (intercept + slope * i);
  return out;
}

// Direct-form-1 biquad.
function biquad(x, b0, b1, b2, a1, a2) {
  const y = new Float64Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xi = x[i];
    const yi = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = xi; y2 = y1; y1 = yi;
    y[i] = yi;
  }
  return y;
}

// RBJ 2nd-order Butterworth low-/high-pass (Q = 1/sqrt(2)).
function lowpassOnce(x, fs, fc, Q = Math.SQRT1_2) {
  const w0 = (2 * Math.PI * fc) / fs;
  const cos = Math.cos(w0), sin = Math.sin(w0), alpha = sin / (2 * Q);
  const a0 = 1 + alpha;
  return biquad(x, ((1 - cos) / 2) / a0, (1 - cos) / a0, ((1 - cos) / 2) / a0,
    (-2 * cos) / a0, (1 - alpha) / a0);
}
function highpassOnce(x, fs, fc, Q = Math.SQRT1_2) {
  const w0 = (2 * Math.PI * fc) / fs;
  const cos = Math.cos(w0), sin = Math.sin(w0), alpha = sin / (2 * Q);
  const a0 = 1 + alpha;
  return biquad(x, ((1 + cos) / 2) / a0, (-(1 + cos)) / a0, ((1 + cos) / 2) / a0,
    (-2 * cos) / a0, (1 - alpha) / a0);
}

function reversed(x) {
  const n = x.length, out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = x[n - 1 - i];
  return out;
}

// Zero-phase band-pass (forward+backward filtfilt-style). Zero phase matters:
// HRV beat timing must not be shifted by the filter.
export function bandpass(x, fs, lo, hi) {
  if (x.length < 9) return Float64Array.from(x);
  let y = highpassOnce(x, fs, lo);
  y = lowpassOnce(y, fs, hi);
  y = reversed(y);
  y = highpassOnce(y, fs, lo);
  y = lowpassOnce(y, fs, hi);
  return reversed(y);
}

// In-place iterative radix-2 Cooley-Tukey FFT. re/im length must be a power of 2.
export function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len >> 1; k++) {
        const ar = re[i + k], ai = im[i + k];
        const br = re[i + k + (len >> 1)], bi = im[i + k + (len >> 1)];
        const tr = br * cr - bi * ci, ti = br * ci + bi * cr;
        re[i + k] = ar + tr; im[i + k] = ai + ti;
        re[i + k + (len >> 1)] = ar - tr; im[i + k + (len >> 1)] = ai - ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}

// Estimate heart rate (BPM) from a pulse signal via a windowed, zero-padded FFT.
// Returns { bpm, freq, snr } where snr is a dB measure of how peaked the
// spectrum is inside the [loBpm,hiBpm] band (used for signal-quality scoring).
export function estimateHR(pulse, fs, loBpm = 42, hiBpm = 240) {
  const L = pulse.length;
  if (L < 16) return null;
  const N = nextPow2(L * 2); // zero-pad ×2 for finer frequency resolution
  const w = hann(L);
  const m = mean(pulse);
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let i = 0; i < L; i++) re[i] = (pulse[i] - m) * w[i];
  fft(re, im);
  const half = N >> 1;
  const mag = new Float64Array(half);
  for (let i = 0; i < half; i++) mag[i] = Math.hypot(re[i], im[i]);

  const loBin = Math.max(1, Math.floor(((loBpm / 60) / fs) * N));
  const hiBin = Math.min(half - 2, Math.ceil(((hiBpm / 60) / fs) * N));
  let peak = loBin, peakVal = -1;
  for (let i = loBin; i <= hiBin; i++) {
    if (mag[i] > peakVal) { peakVal = mag[i]; peak = i; }
  }
  // Parabolic interpolation for sub-bin frequency accuracy.
  const yl = mag[peak - 1] || 0, yc = mag[peak], yr = mag[peak + 1] || 0;
  const denom = yl - 2 * yc + yr;
  const delta = denom !== 0 ? (0.5 * (yl - yr)) / denom : 0;
  const freq = ((peak + delta) * fs) / N;
  const bpm = freq * 60;

  // SNR: power within ±0.2 Hz of the fundamental (and 1st harmonic) vs. the
  // rest of the pulse band. Higher = a cleaner, more trustworthy pulse.
  const halfW = Math.max(1, Math.round((0.2 / fs) * N));
  const h1 = peak, h2 = Math.min(half - 1, peak * 2);
  let sig = 0, tot = 0;
  for (let i = loBin; i <= hiBin; i++) {
    const p = mag[i] * mag[i];
    tot += p;
    if (Math.abs(i - h1) <= halfW || Math.abs(i - h2) <= halfW) sig += p;
  }
  const noise = tot - sig;
  // A degenerate zero-power signal (covered lens, frozen frame, flat ROI) has
  // sig === 0 and tot === 0. That must read as the WORST quality, not the best —
  // otherwise a dead signal would fake 100% quality with a bogus BPM. A genuine
  // pulse always leaves some out-of-band leakage (noise > 0), so it never hits
  // the sentinel branch.
  const snr = (sig > 0 && noise > 0) ? 10 * Math.log10(sig / noise) : (sig > 0 ? 20 : -100);
  return { bpm, freq, snr, peakVal };
}

// Detect systolic peaks in a clean (band-passed, zero-phase) pulse waveform.
export function detectBeats(pulse, fs, maxBpm = 220) {
  const minDist = Math.max(1, Math.floor((fs * 60) / maxBpm));
  const s = std(pulse);
  const thr = 0.3 * s;
  const peaks = [];
  for (let i = 1; i < pulse.length - 1; i++) {
    if (pulse[i] > pulse[i - 1] && pulse[i] >= pulse[i + 1] && pulse[i] > thr) {
      const last = peaks[peaks.length - 1];
      if (last !== undefined && i - last < minDist) {
        if (pulse[i] > pulse[last]) peaks[peaks.length - 1] = i; // keep the taller of two close peaks
      } else {
        peaks.push(i);
      }
    }
  }
  return peaks;
}

// Compute HRV metrics from detected beat indices (RMSSD & SDNN in ms).
// Applies a physiological + ectopic-beat filter before computing.
export function hrvFromBeats(peaks, fs) {
  if (peaks.length < 4) return null;
  const ibis = [];
  for (let i = 1; i < peaks.length; i++) ibis.push(((peaks[i] - peaks[i - 1]) / fs) * 1000);
  const med = median(ibis);
  const clean = ibis.filter((v) => v >= 300 && v <= 1500 && Math.abs(v - med) <= 0.3 * med);
  if (clean.length < 3) return null;
  const sdnn = std(clean);
  let sq = 0;
  for (let i = 1; i < clean.length; i++) { const d = clean[i] - clean[i - 1]; sq += d * d; }
  const rmssd = Math.sqrt(sq / (clean.length - 1));
  const meanHr = 60000 / mean(clean);
  return { rmssd, sdnn, meanHr, nBeats: clean.length + 1 };
}
