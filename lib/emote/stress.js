// stress.js — physiologically-grounded stress / arousal index.
//
// Ties the whiteboard's "stress level" to the real HR/HRV signal. Sympathetic
// arousal shows up as elevated heart rate AND suppressed short-term HRV (RMSSD).
// We auto-calibrate a personal resting baseline over the first ~30 s, then score
// deviations. This is a coarse *arousal* proxy, clearly labelled as experimental
// — deliberately NOT a "guilt" or "lie" score (see README on why we don't ship
// that: face/physio deception detection is not scientifically reliable).

export class StressEstimator {
  constructor({ calibrationSec = 30 } = {}) {
    this.calibrationSec = calibrationSec;
    this.reset();
  }

  reset() {
    this.baselineHr = null;
    this.baselineRmssd = null;
    this._hrAcc = []; this._rmssdAcc = [];
    this._startT = null;
    this.smoothed = 0;
  }

  // hr in BPM, rmssd in ms (may be null when HRV isn't available yet).
  update(t, hr, rmssd, quality) {
    if (this._startT == null) this._startT = t;
    const elapsed = t - this._startT;

    // Only learn baseline / score from good-quality readings.
    const good = quality > 45 && hr && hr > 40 && hr < 180;

    if (elapsed < this.calibrationSec) {
      if (good) { this._hrAcc.push(hr); if (rmssd) this._rmssdAcc.push(rmssd); }
      return { index: null, calibrating: true, elapsed };
    }

    if (this.baselineHr == null && this._hrAcc.length >= 5) {
      this._hrAcc.sort((a, b) => a - b);
      this.baselineHr = this._hrAcc[this._hrAcc.length >> 1];
      if (this._rmssdAcc.length >= 3) {
        this._rmssdAcc.sort((a, b) => a - b);
        this.baselineRmssd = this._rmssdAcc[this._rmssdAcc.length >> 1];
      }
    }
    if (this.baselineHr == null || !good) {
      return { index: this.smoothed, calibrating: false, baselineHr: this.baselineHr };
    }

    // HR component: +1 point per BPM above baseline (soft-clamped).
    const hrComp = Math.max(0, Math.min(1, (hr - this.baselineHr) / 25));
    // HRV component: RMSSD dropping below baseline raises arousal.
    let hrvComp = 0;
    if (this.baselineRmssd && rmssd) {
      hrvComp = Math.max(0, Math.min(1, (this.baselineRmssd - rmssd) / this.baselineRmssd));
    }
    const index = Math.round(100 * Math.max(0, Math.min(1, 0.6 * hrComp + 0.4 * hrvComp)));
    this.smoothed = Math.round(0.8 * this.smoothed + 0.2 * index);

    let level = 'Calm';
    if (this.smoothed > 66) level = 'High';
    else if (this.smoothed > 33) level = 'Elevated';

    return { index: this.smoothed, level, calibrating: false, baselineHr: this.baselineHr };
  }
}
