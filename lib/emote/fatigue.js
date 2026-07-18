// fatigue.js — drowsiness estimation from Eye Aspect Ratio.
// EAR < threshold => eyes closing. Consecutive closed frames => micro-sleep;
// PERCLOS (fraction of recent time with eyes closed) => sustained fatigue.

export class FatigueDetector {
  constructor({ earThreshold = 0.21, perclosWindow = 120, drowsyFrames = 12 } = {}) {
    this.earThreshold = earThreshold;   // below this = eye considered closed
    this.perclosWindow = perclosWindow; // frames kept for PERCLOS
    this.drowsyFrames = drowsyFrames;   // consecutive closed frames => alarm
    this.reset();
  }

  reset() {
    this.history = [];      // recent booleans (closed?)
    this.consecutiveLow = 0;
    this.blinks = 0;
    this._wasClosed = false;
    this.lastEar = 0;
  }

  // Clear per-moment state when the face is lost, but keep the session blink
  // tally so the counter doesn't reset every time you glance away.
  clearTransient() {
    this.history = [];
    this.consecutiveLow = 0;
    this._wasClosed = false;
    this.lastEar = 0;
  }

  // Feed one EAR sample; returns the current fatigue state.
  update(ear) {
    this.lastEar = ear;
    const closed = ear < this.earThreshold;

    // Blink = closed->open transition.
    if (closed && !this._wasClosed) this.consecutiveLow = 0;
    if (!closed && this._wasClosed) this.blinks++;
    this._wasClosed = closed;

    this.consecutiveLow = closed ? this.consecutiveLow + 1 : 0;

    this.history.push(closed ? 1 : 0);
    if (this.history.length > this.perclosWindow) this.history.shift();
    const perclos = this.history.reduce((a, b) => a + b, 0) / this.history.length;

    // Fatigue score blends sustained closure (PERCLOS) with an active micro-sleep.
    const microsleep = Math.min(1, this.consecutiveLow / this.drowsyFrames);
    const score = Math.max(0, Math.min(1, 0.7 * perclos * 3 + 0.3 * microsleep));

    let status = 'OK';
    if (this.consecutiveLow >= this.drowsyFrames) status = 'DROWSY';
    else if (score > 0.4) status = 'TIRED';

    return {
      ear,
      score,
      perclos,
      consecutiveLow: this.consecutiveLow,
      blinks: this.blinks,
      status,
    };
  }
}
