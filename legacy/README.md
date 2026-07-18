# Emote AI — Cognitive Intelligence

A single-page, in-browser demo that runs entirely client-side. It uses your webcam plus
[face-api.js](https://github.com/justadudewhohacks/face-api.js) to show:

- **HRV Analysis** — an rPPG heart-rate / HRV estimate from subtle color changes on the forehead ROI
- **Fatigue Detection** — Eye Aspect Ratio (EAR), blink counting, and a fatigue score
- **Emotion Analysis** — dominant emotion, per-emotion probabilities, and a heuristic "trust" score
- **Behavioral Assessment** — a live stress / guilt-indicator chart ([Chart.js](https://www.chartjs.org/))

Everything runs locally in the browser — no video ever leaves the device. All processing is
heuristic and for **demonstration purposes only**; it is **not** a medical, diagnostic, or
lie-detection tool.

## Deploy

No build step. It's a static `index.html` — deploy it to any static host. On
[Vercel](https://vercel.com), import this repo with the **Other** framework preset (no build
command, no output directory) and it serves as-is.

## Run locally

Serve the folder over HTTP (the camera API requires a secure context — `https://` or
`http://localhost`):

```bash
npx serve .
# then open the printed http://localhost:3000
```

## Notes

- Requires camera permission (click **Start Camera**).
- The face-api.js model weights load from a CDN on first use (~10 MB).
