// facerec.js — face presence + lightweight enroll/match.
//
// HONEST SCOPE: this is NOT production face recognition. It builds a small,
// scale/translation-normalized geometric descriptor from stable landmarks and
// matches by nearest-neighbour distance. Good enough to tell enrolled people
// apart in a demo; not an identity/biometric system. Enrollment stays in-memory.

const ANCHORS = [1, 33, 263, 61, 291, 199, 10, 152, 234, 454]; // nose, eyes, mouth, chin, jaw

function descriptor(landmarks) {
  const pts = ANCHORS.map((i) => landmarks[i]).filter(Boolean);
  if (pts.length < ANCHORS.length) return null;
  // Normalize by inter-ocular distance to be scale-invariant.
  const scale = Math.hypot(landmarks[33].x - landmarks[263].x, landmarks[33].y - landmarks[263].y) || 1;
  const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
  const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
  const d = [];
  for (const p of pts) { d.push((p.x - cx) / scale, (p.y - cy) / scale); }
  return d;
}

function l2(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) { const dd = a[i] - b[i]; s += dd * dd; }
  return Math.sqrt(s);
}

export class FaceRecognizer {
  constructor({ threshold = 0.18 } = {}) {
    this.threshold = threshold;
    this.enrolled = []; // { name, desc }
  }

  reset() { this.enrolled = []; }

  enroll(name, landmarks) {
    const desc = descriptor(landmarks);
    if (!desc) return false;
    this.enrolled.push({ name, desc });
    return true;
  }

  identify(landmarks) {
    const desc = descriptor(landmarks);
    if (!desc) return { present: true, name: null, distance: null };
    let best = null, bestD = Infinity;
    for (const e of this.enrolled) {
      const dd = l2(desc, e.desc);
      if (dd < bestD) { bestD = dd; best = e; }
    }
    if (best && bestD <= this.threshold) return { present: true, name: best.name, distance: bestD };
    return { present: true, name: this.enrolled.length ? 'Unknown' : null, distance: bestD === Infinity ? null : bestD };
  }
}
