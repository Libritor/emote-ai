// emotion.js — heuristic facial-expression classifier from ARKit blendshapes.
//
// HONEST SCOPE: this maps MediaPipe's 52 blendshape activations to 7 expression
// categories with hand-tuned rules + a softmax. It reads *expressions*, not felt
// emotion, and it is NOT a trained FER model. Treat it as an interpretable
// signal, not ground truth. (The heart-rate/HRV panel is the validated feature.)

const EMOTIONS = ['neutral', 'happy', 'sad', 'angry', 'surprised', 'fearful', 'disgusted'];

// Build a name->score lookup from the blendshapes category array.
function toMap(categories) {
  const m = Object.create(null);
  for (const c of categories) m[c.categoryName] = c.score;
  return m;
}
const g = (m, k) => m[k] || 0;

function softmax(scores, temp = 2.2) {
  const vals = EMOTIONS.map((e) => (scores[e] || 0) * temp);
  const max = Math.max(...vals);
  const exp = vals.map((v) => Math.exp(v - max));
  const sum = exp.reduce((a, b) => a + b, 0) || 1;
  const out = {};
  EMOTIONS.forEach((e, i) => { out[e] = exp[i] / sum; });
  return out;
}

export function classifyEmotion(blendshapeCategories) {
  if (!blendshapeCategories || !blendshapeCategories.length) return null;
  const m = toMap(blendshapeCategories);

  const smile = g(m, 'mouthSmileLeft') + g(m, 'mouthSmileRight');
  const frown = g(m, 'mouthFrownLeft') + g(m, 'mouthFrownRight');
  const browDown = g(m, 'browDownLeft') + g(m, 'browDownRight');
  const browInner = g(m, 'browInnerUp');
  const browOuter = g(m, 'browOuterUpLeft') + g(m, 'browOuterUpRight');
  const eyeWide = g(m, 'eyeWideLeft') + g(m, 'eyeWideRight');
  const jawOpen = g(m, 'jawOpen');
  const noseSneer = g(m, 'noseSneerLeft') + g(m, 'noseSneerRight');
  const upperUp = g(m, 'mouthUpperUpLeft') + g(m, 'mouthUpperUpRight');
  const stretch = g(m, 'mouthStretchLeft') + g(m, 'mouthStretchRight');
  const press = g(m, 'mouthPressLeft') + g(m, 'mouthPressRight');

  const raw = {
    neutral: 0.35,
    happy: smile,
    sad: frown + 0.5 * browInner,
    angry: browDown + 0.5 * noseSneer + 0.4 * press,
    surprised: 0.5 * browInner + 0.5 * browOuter + jawOpen + 0.5 * eyeWide,
    fearful: eyeWide + browInner + 0.6 * stretch,
    disgusted: noseSneer + 0.7 * upperUp,
  };

  const probs = softmax(raw);
  let dominant = 'neutral', best = -1;
  for (const e of EMOTIONS) if (probs[e] > best) { best = probs[e]; dominant = e; }

  return { dominant, confidence: best, probabilities: probs, order: EMOTIONS };
}

export { EMOTIONS };
