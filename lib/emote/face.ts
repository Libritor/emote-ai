// MediaPipe FaceLandmarker wrapper + landmark geometry helpers.
// Ported from the Emote AI multi-file app (face.js), adapted to load MediaPipe
// from the npm package (lazy import so it never runs during SSR). One model
// powers every signal: rPPG ROI, fatigue EAR, and emotion blendshapes.

/* eslint-disable @typescript-eslint/no-explicit-any */

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export type Landmark = { x: number; y: number; z?: number };
export type Rect = { x: number; y: number; w: number; h: number };

// Landmark index sets (MediaPipe canonical face, 478 points).
export const FOREHEAD = [10, 67, 69, 104, 108, 151, 337, 299, 333, 297, 338, 109, 9];
export const LEFT_CHEEK = [50, 101, 118, 117, 123, 205];
export const RIGHT_CHEEK = [280, 330, 347, 346, 352, 425];
export const LEFT_EYE = { h: [33, 133], v: [[159, 145], [158, 153]] };
export const RIGHT_EYE = { h: [362, 263], v: [[386, 374], [385, 380]] };

export async function createFaceLandmarker(numFaces = 1): Promise<any> {
  const vision = await import("@mediapipe/tasks-vision");
  const { FaceLandmarker, FilesetResolver } = vision;
  const resolver = await FilesetResolver.forVisionTasks(WASM);
  return FaceLandmarker.createFromOptions(resolver, {
    baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: false,
    runningMode: "VIDEO",
    numFaces,
  });
}

/** Bounding box (normalized 0..1) of landmark indices, inset to stay on skin. */
export function landmarkBox(landmarks: Landmark[], indices: number[], inset = 0.12): Rect {
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const idx of indices) {
    const p = landmarks[idx];
    if (!p) continue;
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const w = maxX - minX;
  const h = maxY - minY;
  return { x: minX + w * inset, y: minY + h * inset, w: w * (1 - 2 * inset), h: h * (1 - 2 * inset) };
}

export function faceBounds(landmarks: Landmark[]): Rect {
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const p of landmarks) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function dist(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function eyeEAR(landmarks: Landmark[], eye: { h: number[]; v: number[][] }): number {
  const horiz = dist(landmarks[eye.h[0]], landmarks[eye.h[1]]);
  if (horiz === 0) return 0;
  let vert = 0;
  for (const [a, b] of eye.v) vert += dist(landmarks[a], landmarks[b]);
  vert /= eye.v.length;
  return vert / horiz;
}

export function averageEAR(landmarks: Landmark[]): number {
  return 0.5 * (eyeEAR(landmarks, LEFT_EYE) + eyeEAR(landmarks, RIGHT_EYE));
}
