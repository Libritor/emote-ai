// --- 1. GLOBAL VARIABLES & CONFIG ---
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

// DOM Elements
const video = document.getElementById('webcam');
const canvas = document.getElementById('face-canvas');
const loader = document.getElementById('loader');
const loaderText = document.getElementById('loader-text');
const errorText = document.getElementById('error-text');
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const cbShowLandmarks = document.getElementById('show-landmarks');
const cbShowRoi = document.getElementById('show-roi');

// State
let isRunning = false;
let detectionInterval;
let chartUpdateInterval;

// --- 2. CHART.JS SETUP (Behavioral Assessment) ---
const ctxChart = document.getElementById('assessment-chart').getContext('2d');
const assessmentChart = new Chart(ctxChart, {
    type: 'line',
    data: {
        labels: Array(20).fill(''),
        datasets: [
            {
                label: 'Stress',
                data: Array(20).fill(0),
                borderColor: '#fb7185', // Rose
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 0
            },
            {
                label: 'Guilt Indicator',
                data: Array(20).fill(0),
                borderColor: '#c084fc', // Purple
                borderWidth: 2,
                borderDash: [5, 5],
                tension: 0.4,
                pointRadius: 0
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { display: false },
            y: { display: false, min: 0, max: 100 }
        },
        animation: { duration: 0 }
    }
});

// --- 3. INITIALIZATION & CAMERA ---
async function initModels() {
    try {
        loader.classList.remove('hidden');
        loaderText.innerText = "Loading AI Models (approx 10MB)...";
        btnStart.disabled = true;

        // Load required models
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
        ]);

        loaderText.innerText = "Models Loaded. Ready.";
        btnStart.disabled = false;

        // Hide loader after a sec
        setTimeout(() => { loader.classList.add('hidden'); }, 1000);
    } catch (err) {
        console.error(err);
        loaderText.innerText = "Error loading models.";
        errorText.innerText = "Ensure you are connected to the internet. Strict firewalls may block model downloads.";
        errorText.classList.remove('hidden');
    }
}

btnStart.addEventListener('click', async () => {
    loader.classList.remove('hidden');
    loaderText.innerText = "Accessing Camera...";
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        video.srcObject = stream;
        btnStart.classList.add('hidden');
        btnStop.classList.remove('hidden');
    } catch (err) {
        loaderText.innerText = "Camera Access Denied";
        errorText.innerText = err.message;
        errorText.classList.remove('hidden');
    }
});

btnStop.addEventListener('click', () => {
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }
    video.srcObject = null;
    btnStart.classList.remove('hidden');
    btnStop.classList.add('hidden');
    stopProcessing();
});

video.addEventListener('play', () => {
    loader.classList.add('hidden');
    startProcessing();
});

// --- 4. PROCESSING LOOP & MATH LOGIC ---

// Fatigue / EAR State
let blinkCount = 0;
let isEyeClosed = false;
let earHistory = [];

// rPPG (Heart Rate) State
let greenSignalBuffer = [];
const FPS = 15; // Target processing rate
const BUFFER_SIZE = 150; // 10 seconds at 15fps
let lastPeakTime = 0;
let intervals = [];

function getEAR(landmarks) {
    // Euclidean distance helper
    const dist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

    // EAR formula for one eye
    const calcEye = (eye) => {
        const v1 = dist(eye[1], eye[5]);
        const v2 = dist(eye[2], eye[4]);
        const h = dist(eye[0], eye[3]);
        return (v1 + v2) / (2.0 * h);
    };

    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    return (calcEye(leftEye) + calcEye(rightEye)) / 2.0;
}

function extractHeartRateSignal(ctx, landmarks) {
    // Define ROI (Region of Interest) on the forehead
    // Forehead is roughly above the eyes and between eyebrows
    const noseBridge = landmarks.getNose()[0];
    const leftBrow = landmarks.getLeftEyeBrow()[2];
    const rightBrow = landmarks.getRightEyeBrow()[2];

    // Width of forehead ROI
    const width = Math.abs(rightBrow.x - leftBrow.x);
    const height = width * 0.4; // Height relative to width

    // Center of ROI
    const cx = noseBridge.x;
    const cy = Math.min(leftBrow.y, rightBrow.y) - height;

    const x = Math.max(0, cx - width / 2);
    const y = Math.max(0, cy - height / 2);

    // Ensure ROI is within canvas bounds
    if (x < 0 || y < 0 || x + width > ctx.canvas.width || y + height > ctx.canvas.height) {
        return null; // Face too close to edge
    }

    // Draw ROI debug rectangle if toggled
    if (cbShowRoi.checked) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
    }

    // Extract pixel data
    const frame = ctx.getImageData(x, y, width, height);
    const data = frame.data;
    let greenSum = 0;
    let count = 0;

    // Average the green channel (most sensitive to hemoglobin absorption)
    for (let i = 1; i < data.length; i += 4) {
        greenSum += data[i];
        count++;
    }

    return count > 0 ? (greenSum / count) : null;
}

function calculateVitals(signal) {
    if (signal.length < BUFFER_SIZE) return { bpm: null, hrv: null };

    // 1. Smooth the signal (Simple Moving Average)
    const windowSize = 5;
    let smoothed = [];
    for (let i = windowSize; i < signal.length - windowSize; i++) {
        let sum = 0;
        for (let j = -windowSize; j <= windowSize; j++) sum += signal[i + j];
        smoothed.push(sum / (windowSize * 2 + 1));
    }

    // 2. Find Peaks (Basic heuristic: local maxima)
    let peaks = [];
    for (let i = 1; i < smoothed.length - 1; i++) {
        if (smoothed[i] > smoothed[i - 1] && smoothed[i] > smoothed[i + 1]) {
            // Filter small noise peaks by ensuring it's above the local mean
            let localMean = smoothed.slice(Math.max(0, i - 10), Math.min(smoothed.length, i + 10)).reduce((a, b) => a + b) / 20;
            if (smoothed[i] > localMean) {
                peaks.push(i);
            }
        }
    }

    // 3. Calculate BPM and HRV
    if (peaks.length < 3) return { bpm: null, hrv: null };

    let peakIntervals = []; // in frames
    for (let i = 1; i < peaks.length; i++) {
        peakIntervals.push(peaks[i] - peaks[i - 1]);
    }

    // Convert intervals from frames to milliseconds
    const msPerFrame = 1000 / FPS;
    const intervalsMs = peakIntervals.map(frames => frames * msPerFrame);

    // Average Interval for BPM
    const avgInterval = intervalsMs.reduce((a, b) => a + b) / intervalsMs.length;
    const bpm = (60000 / avgInterval).toFixed(0);

    // HRV (SDNN - Standard Deviation of Normal-to-Normal intervals)
    const variance = intervalsMs.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervalsMs.length;
    const hrv = Math.sqrt(variance).toFixed(1);

    // Sanity bounds (rPPG is noisy, clamp to human realistic values for UI display)
    let finalBpm = parseInt(bpm);
    if (finalBpm < 45 || finalBpm > 180) finalBpm = null;

    return { bpm: finalBpm, hrv: finalBpm ? hrv : null };
}

function startProcessing() {
    if (isRunning) return;
    isRunning = true;

    // Use intrinsic video dimensions instead of rendered client dimensions
    let displaySize = { width: video.videoWidth || 640, height: video.videoHeight || 480 };
    faceapi.matchDimensions(canvas, displaySize);
    const ctx2d = canvas.getContext('2d', { willReadFrequently: true });

    // Processing Loop (approx 15 FPS)
    detectionInterval = setInterval(async () => {
        if (!video.srcObject) return;

        // Handle camera initialization delay and window resizes dynamically
        if (video.videoWidth > 0 && (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight)) {
            displaySize = { width: video.videoWidth, height: video.videoHeight };
            faceapi.matchDimensions(canvas, displaySize);
        }

        // 1. Detect Face
        const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceExpressions();

        // Clear overlay
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);

        if (detection) {
            const resized = faceapi.resizeResults(detection, displaySize);

            // Draw landmarks if checked
            if (cbShowLandmarks.checked) {
                faceapi.draw.drawFaceLandmarks(canvas, resized);
            }

            // --- EMOTION UPDATE ---
            const expr = resized.expressions;
            updateEmotionUI(expr);
            updateFaceStatus("Tracking", "info");

            // --- FATIGUE UPDATE (EAR) ---
            const ear = getEAR(resized.landmarks);
            updateFatigueUI(ear);

            // --- VITALS UPDATE (rPPG) ---
            // Draw video frame to hidden canvas context to extract pixel data
            ctx2d.drawImage(video, 0, 0, canvas.width, canvas.height);
            const greenVal = extractHeartRateSignal(ctx2d, resized.landmarks);

            // Clear the video draw so only landmarks remain overlayed
            ctx2d.clearRect(0, 0, canvas.width, canvas.height);
            if (cbShowLandmarks.checked) faceapi.draw.drawFaceLandmarks(canvas, resized);

            updateVitalsUI(greenVal);

        } else {
            updateFaceStatus("No Face", "gray");
            updateEmotionUI(null);
            updateFatigueUI(null);
            updateVitalsUI(null, true); // True = Face lost
        }
    }, 1000 / FPS);

    // Chart Update Loop (Every second)
    chartUpdateInterval = setInterval(updateBehaviorChart, 1000);
}

function stopProcessing() {
    isRunning = false;
    clearInterval(detectionInterval);
    clearInterval(chartUpdateInterval);

    // Reset UI
    updateFaceStatus("Standby", "gray");
    updateEmotionUI(null);
    updateFatigueUI(null);
    updateVitalsUI(null, true);
    document.getElementById('ui-buffer-bar').style.width = '0%';
    document.getElementById('ui-buffer-txt').innerText = '0%';
}

// --- 5. UI UPDATERS ---

function updateFaceStatus(text, colorType) {
    const el = document.getElementById('ui-face-status');
    el.innerText = text;
    el.className = `status-pill bg-${colorType === 'info' ? 'info' : 'gray-600'} text-white`;
}

function updateEmotionUI(expr) {
    const uiDom = document.getElementById('ui-emotion');
    const uiConf = document.getElementById('ui-emotion-conf');
    const uiTrust = document.getElementById('ui-trust-score');

    if (!expr) {
        uiDom.innerText = "--";
        uiConf.innerText = "0";
        uiTrust.innerText = "--";
        uiTrust.className = "text-xl font-bold mt-1 text-gray-500";
        ['happy', 'angry', 'sad', 'guilt'].forEach(e => document.getElementById(`bar-${e}`).style.width = '0%');
        return;
    }

    // Find Dominant
    let dominant = Object.keys(expr).reduce((a, b) => expr[a] > expr[b] ? a : b);
    let conf = expr[dominant];

    uiDom.innerText = dominant;
    uiConf.innerText = (conf * 100).toFixed(0);

    // Calculate Guilt Heuristic (Fear + Sadness + small factor of Disgust)
    let guiltScore = (expr.fearful * 0.6) + (expr.sad * 0.3) + (expr.disgusted * 0.1);
    if (expr.neutral > 0.5) guiltScore *= 1.2; // Amplified if trying to hide true emotions
    guiltScore = Math.min(1, guiltScore);

    // Calculate Overall Trust Score
    // Base trust is 100, reduced by negative/deceptive emotions
    let penalty = (guiltScore * 60) + (expr.angry * 30) + (expr.fearful * 20) + (expr.disgusted * 10);
    let trustScore = Math.max(0, Math.min(100, 100 - penalty));

    uiTrust.innerText = trustScore.toFixed(0);
    if (trustScore >= 70) {
        uiTrust.className = "text-xl font-bold mt-1 text-success";
    } else if (trustScore >= 40) {
        uiTrust.className = "text-xl font-bold mt-1 text-primary";
    } else {
        uiTrust.className = "text-xl font-bold mt-1 text-red-500";
    }

    // Update Bars
    document.getElementById('bar-happy').style.width = `${expr.happy * 100}%`;
    document.getElementById('bar-angry').style.width = `${expr.angry * 100}%`;
    document.getElementById('bar-sad').style.width = `${expr.sad * 100}%`;
    document.getElementById('bar-guilt').style.width = `${guiltScore * 100}%`;

    // Store globally for Chart heuristics
    window.currentEmotions = expr;
    window.currentGuilt = guiltScore;
}

function updateFatigueUI(ear) {
    const uiEar = document.getElementById('ui-ear');
    const uiScore = document.getElementById('ui-fatigue-score');
    const uiBlinks = document.getElementById('ui-blinks');
    const uiStatus = document.getElementById('ui-fatigue-status');

    if (ear === null) {
        uiEar.innerText = "0.000";
        uiStatus.innerText = "Standby";
        uiStatus.className = "status-pill bg-gray-600 text-white";
        return;
    }

    uiEar.innerText = ear.toFixed(3);

    // Blink Detection Logic (EAR threshold usually ~0.2)
    const EAR_THRESHOLD = 0.22;
    if (ear < EAR_THRESHOLD && !isEyeClosed) {
        isEyeClosed = true;
    } else if (ear >= EAR_THRESHOLD && isEyeClosed) {
        isEyeClosed = false;
        blinkCount++;
        uiBlinks.innerText = blinkCount;
    }

    // Fatigue Logic (Low EAR sustained, or very high blink rate)
    earHistory.push(ear);
    if (earHistory.length > 100) earHistory.shift();

    let avgEar = earHistory.reduce((a, b) => a + b, 0) / earHistory.length;
    // Map avg EAR to a fatigue score (Lower avg EAR = Higher Fatigue)
    // Normal resting EAR is ~0.30. Sleepy is ~0.20.
    let fatigue = Math.max(0, Math.min(100, (0.32 - avgEar) * 1000));

    if (earHistory.length < 30) fatigue = 0; // Warmup

    uiScore.innerText = fatigue.toFixed(0);

    if (fatigue > 60) {
        uiStatus.innerText = "Warning";
        uiStatus.className = "status-pill bg-red-500 text-white";
    } else if (fatigue > 30) {
        uiStatus.innerText = "Monitor";
        uiStatus.className = "status-pill bg-primary text-black";
    } else {
        uiStatus.innerText = "OK";
        uiStatus.className = "status-pill bg-success text-white";
    }

    window.currentFatigue = fatigue;
}

function updateVitalsUI(greenVal, faceLost = false) {
    const uiStatus = document.getElementById('ui-hr-status');
    const uiBufferBar = document.getElementById('ui-buffer-bar');
    const uiBufferTxt = document.getElementById('ui-buffer-txt');
    const uiHr = document.getElementById('ui-hr');
    const uiHrv = document.getElementById('ui-hrv');

    if (faceLost || !greenVal) {
        uiStatus.innerText = "Face Lost";
        uiStatus.className = "status-pill bg-gray-600 text-white";
        return;
    }

    // Add to buffer
    greenSignalBuffer.push(greenVal);
    if (greenSignalBuffer.length > BUFFER_SIZE) greenSignalBuffer.shift();

    // Update Progress Bar
    const progress = Math.min(100, (greenSignalBuffer.length / BUFFER_SIZE) * 100);
    uiBufferBar.style.width = `${progress}%`;
    uiBufferTxt.innerText = `${progress.toFixed(0)}%`;

    if (progress < 100) {
        uiStatus.innerText = "Collecting";
        uiStatus.className = "status-pill bg-primary text-black animate-pulse";
        uiHr.innerText = "--";
        uiHrv.innerText = "--";
    } else {
        uiStatus.innerText = "Analyzing";
        uiStatus.className = "status-pill bg-success text-white";

        // Calculate
        const vitals = calculateVitals(greenSignalBuffer);

        if (vitals.bpm) {
            uiHr.innerText = vitals.bpm;
            uiHrv.innerText = vitals.hrv;
            window.currentHr = vitals.bpm;
        }
    }
}

function updateBehaviorChart() {
    if (!isRunning) return;

    // Heuristics for Stress and Guilt (Simulation for Demo purposes)
    // Real systems require extensive baseline calibration.

    let stress = 10; // Baseline
    let guilt = 5;  // Baseline

    // Incorporate Fatigue/EAR
    let fatigue = window.currentFatigue || 0;

    // Incorporate HR (if available, >80 adds stress)
    let hr = window.currentHr || 70;
    if (hr > 85) stress += (hr - 85);

    // Incorporate Emotions
    let expr = window.currentEmotions;
    if (expr) {
        // Negative emotions increase stress
        stress += (expr.angry * 40) + (expr.fearful * 50) + (expr.sad * 20);

        // "Guilt/Deception" heuristic: High stress + micro-expressions of fear/surprise while trying to appear neutral/happy
        if (stress > 40 && (expr.fearful > 0.1 || expr.surprised > 0.2)) {
            guilt += 30 + (expr.fearful * 40);
        }
    }

    // Clamp values
    stress = Math.min(100, Math.max(0, stress));
    guilt = Math.min(100, Math.max(0, guilt));

    // Smooth the data slightly
    let oldStress = assessmentChart.data.datasets[0].data[19];
    let oldGuilt = assessmentChart.data.datasets[1].data[19];

    stress = oldStress * 0.7 + stress * 0.3;
    guilt = oldGuilt * 0.7 + guilt * 0.3;

    // Update Chart Arrays
    assessmentChart.data.datasets[0].data.shift();
    assessmentChart.data.datasets[0].data.push(stress);

    assessmentChart.data.datasets[1].data.shift();
    assessmentChart.data.datasets[1].data.push(guilt);

    assessmentChart.update();

    // Update Text UI
    const uiStress = document.getElementById('ui-stress');
    if (stress < 30) { uiStress.innerText = "Low"; uiStress.className = "text-lg font-bold text-success"; }
    else if (stress < 70) { uiStress.innerText = "Elevated"; uiStress.className = "text-lg font-bold text-primary"; }
    else { uiStress.innerText = "High"; uiStress.className = "text-lg font-bold text-rose-500"; }

    const uiGuilt = document.getElementById('ui-guilt');
    if (guilt < 20) { uiGuilt.innerText = "Baseline"; uiGuilt.className = "text-lg font-bold text-gray-400"; }
    else if (guilt < 50) { uiGuilt.innerText = "Anomaly"; uiGuilt.className = "text-lg font-bold text-primary"; }
    else { uiGuilt.innerText = "Flagged"; uiGuilt.className = "text-lg font-bold text-rose-500"; }
}

// Init on load
window.addEventListener('DOMContentLoaded', initModels);
