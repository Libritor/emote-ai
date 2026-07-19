import Link from "next/link";
import { SectionHeading } from "@/components/ui";
import IntegrityDisclaimer from "@/components/IntegrityDisclaimer";

export const metadata = {
  title: "Emote AI Wiki - Signals, methods & research",
  description:
    "Technical notes and research references behind Emote AI measures: Eye Aspect Ratio fatigue, PERCLOS, rPPG heart rate, HRV stress, expression, and the experimental integrity signal.",
};

const TOC = [
  { id: "pipeline", label: "Signal pipeline" },
  { id: "landmarks", label: "Face landmarks" },
  { id: "fatigue", label: "Fatigue · EAR · blinks" },
  { id: "rppg", label: "Heart rate · rPPG" },
  { id: "stress", label: "Stress · HRV" },
  { id: "expression", label: "Expression" },
  { id: "integrity", label: "Integrity fusion" },
  { id: "limits", label: "What we do not claim" },
  { id: "references", label: "References" },
] as const;

type Ref = {
  id: string;
  authors: string;
  title: string;
  venue: string;
  href: string;
  note?: string;
};

const REFS: Ref[] = [
  {
    id: "soukupova2016",
    authors: "Soukupová, T. & Čech, J.",
    title: "Real-Time Eye Blink Detection using Facial Landmarks",
    venue: "CVWW 2016",
    href: "https://vision.fe.uni-lj.si/cvww2016/proceedings/papers/05.pdf",
    note: "Defines the Eye Aspect Ratio (EAR) used for blink / closure detection.",
  },
  {
    id: "soukupova-tr",
    authors: "Soukupová, T. & Čech, J.",
    title: "Real-Time Eye Blink Detection using Facial Landmarks (technical report)",
    venue: "CTU CMP TR-2016-05",
    href: "https://cmp.felk.cvut.cz/ftp/articles/cech/Soukupova-TR-2016-05.pdf",
    note: "Extended treatment of EAR thresholds, temporal windows, and blink timing (~100–400 ms).",
  },
  {
    id: "dinges1998",
    authors: "Dinges, D. F. & Grace, R.",
    title: "PERCLOS: A Valid Psychophysiological Measure of Alertness As Assessed by Psychomotor Vigilance",
    venue: "FHWA-MCRT-98-006",
    href: "https://rosap.ntl.bts.gov/view/dot/313",
    note: "PERCLOS - proportion of time eyes are closed - as a validated drowsiness metric.",
  },
  {
    id: "wierwille1994",
    authors: "Wierwille, W. W. et al.",
    title: "Research on vehicle-based driver status/performance monitoring",
    venue: "NHTSA DOT HS 808 247 (1994)",
    href: "https://rosap.ntl.bts.gov/view/dot/1548",
    note: "Foundational driver-drowsiness work linking eyelid closure metrics to alertness.",
  },
  {
    id: "wang2017",
    authors: "Wang, W., den Brinker, A. C., Stuijk, S. & de Haan, G.",
    title: "Algorithmic Principles of Remote-PPG",
    venue: "IEEE Trans. Biomed. Eng. 64(7), 2017",
    href: "https://doi.org/10.1109/TBME.2016.2609282",
    note: "Introduces Plane-Orthogonal-to-Skin (POS) - the pulse extraction method used in Emote AI.",
  },
  {
    id: "wang2017preprint",
    authors: "Wang, W. et al.",
    title: "Algorithmic Principles of Remote-PPG (open preprint)",
    venue: "Eindhoven University of Technology",
    href: "https://pure.tue.nl/ws/portalfiles/portal/31563684/TBME_00467_2016_R1_preprint.pdf",
    note: "Open PDF of the POS / rPPG principles paper.",
  },
  {
    id: "verkruysse2008",
    authors: "Verkruysse, W., Svaasand, L. O. & Nelson, J. S.",
    title: "Remote plethysmographic imaging using ambient light",
    venue: "Opt. Express 16(26), 2008",
    href: "https://doi.org/10.1364/OE.16.021434",
    note: "Shows that ambient-light camera video carries a usable pulse signal, strongest in the green channel.",
  },
  {
    id: "hrv1996",
    authors: "Task Force of the ESC and the NASPE",
    title: "Heart rate variability: standards of measurement, physiological interpretation and clinical use",
    venue: "Circulation 93(5), 1996",
    href: "https://doi.org/10.1161/01.CIR.93.5.1043",
    note: "Canonical HRV standards; RMSSD as a short-term parasympathetic marker.",
  },
  {
    id: "thayer2012",
    authors: "Thayer, J. F., Åhs, F., Fredrikson, M., Sollers, J. J. & Wager, T. D.",
    title: "A meta-analysis of heart rate variability and neuroimaging studies: implications for heart rate variability as a marker of stress and health",
    venue: "Neurosci. Biobehav. Rev. 36(2), 2012",
    href: "https://doi.org/10.1016/j.neubiorev.2011.11.009",
    note: "Links reduced HRV to stress / arousal states relevant to our stress index.",
  },
  {
    id: "mediapipe2019",
    authors: "Kartynnik, Y., Ablavatski, A., Grishchenko, I. & Grundmann, M.",
    title: "Real-time Facial Surface Geometry from Monocular Video on Mobile GPUs",
    venue: "CVPR Workshop / arXiv:1907.06724, 2019",
    href: "https://arxiv.org/abs/1907.06724",
    note: "MediaPipe Face Mesh geometry that underpins landmark indices for ROI, EAR, and blendshapes.",
  },
  {
    id: "mediapipe-docs",
    authors: "Google MediaPipe",
    title: "Face Landmarker task documentation",
    venue: "MediaPipe Tasks Vision",
    href: "https://developers.google.com/mediapipe/solutions/vision/face_landmarker",
    note: "Product docs for the Face Landmarker model Emote AI loads in-browser.",
  },
  {
    id: "ekman1978",
    authors: "Ekman, P. & Friesen, W. V.",
    title: "Facial Action Coding System (FACS)",
    venue: "Consulting Psychologists Press, 1978",
    href: "https://www.paulekman.com/facial-action-coding-system/",
    note: "Action-unit vocabulary that ARKit / MediaPipe blendshapes loosely approximate.",
  },
  {
    id: "bond2006",
    authors: "Bond, C. F. & DePaulo, B. M.",
    title: "Accuracy of deception judgments",
    venue: "Pers. Soc. Psychol. Rev. 10(3), 2006",
    href: "https://doi.org/10.1207/s15327957pspr1003_2",
    note: "Meta-analysis: human deception detection accuracy is barely above chance.",
  },
  {
    id: "nrc2003",
    authors: "National Research Council",
    title: "The Polygraph and Lie Detection",
    venue: "National Academies Press, 2003",
    href: "https://nap.nationalacademies.org/catalog/10448/the-polygraph-and-lie-detection",
    note: "Authoritative review: physiological signals alone are not reliable evidence of deception.",
  },
];

export default function WikiPage() {
  return (
    <main className="px-4 py-8 sm:px-6">
      <SectionHeading
        eyebrow="Research & methods"
        title="Wiki"
        desc="How Emote AI turns a face into heart rate, fatigue, stress, and expression - and why the integrity score stays an experimental context signal, never evidence of wrongdoing."
        right={
          <Link href="/analyze" className="btn btn-primary shrink-0">
            Try the analyzer -&gt;
          </Link>
        }
      />

      <div className="mb-8 max-w-3xl">
        <IntegrityDisclaimer />
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <nav className="card p-4" aria-label="Wiki sections">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
              On this page
            </div>
            <ul className="space-y-1.5">
              {TOC.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="block rounded-md px-2 py-1 text-sm text-muted transition hover:bg-surface-2 hover:text-ink"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0 space-y-10">
          <Section id="pipeline" title="Signal pipeline">
            <p>
              Everything runs client-side from a webcam or uploaded clip. One MediaPipe Face
              Landmarker pass supplies geometry for three independent estimators, then a fusion
              step produces the experimental integrity reading shown beside markets and the
              Integrity Room.
            </p>
            <ol className="mt-4 space-y-3">
              {[
                {
                  n: "01",
                  t: "Landmarks",
                  d: "478-point face mesh + ARKit-style blendshapes every video frame.",
                },
                {
                  n: "02",
                  t: "Physiology",
                  d: "Forehead / cheek RGB → POS rPPG → BPM + RMSSD; EAR → blinks + PERCLOS fatigue.",
                },
                {
                  n: "03",
                  t: "Expression",
                  d: "Blendshape activations mapped to seven expression probabilities (heuristic, not a trained FER net).",
                },
                {
                  n: "04",
                  t: "Fusion",
                  d: "Stress from HR/HRV + expression heuristics → suspicion meter, gated by signal quality.",
                },
              ].map((s) => (
                <li key={s.n} className="flex gap-3">
                  <span className="mono grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border-bright text-xs font-bold text-primary">
                    {s.n}
                  </span>
                  <div>
                    <div className="font-bold">{s.t}</div>
                    <div className="text-sm text-muted">{s.d}</div>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-sm text-muted">
              Implementation lives under{" "}
              <code className="mono text-primary">lib/emote/</code> (
              <code className="mono">face.ts</code>, <code className="mono">rppg.js</code>,{" "}
              <code className="mono">fatigue.js</code>, <code className="mono">stress.js</code>,{" "}
              <code className="mono">emotion.js</code>, <code className="mono">integrity.ts</code>
              ). Live demo: <Link href="/analyze" className="font-semibold text-primary">/analyze</Link>.
            </p>
          </Section>

          <Section id="landmarks" title="Face landmarks">
            <p>
              Emote AI uses Google&apos;s MediaPipe Face Landmarker (Tasks Vision). One model
              drives every downstream signal: forehead / cheek ROIs for rPPG, eyelid landmarks
              for Eye Aspect Ratio, and 52 blendshapes for expression.
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted">
              <li>
                Forehead and cheek index sets sample skin for mean RGB over time (
                <RefLink id="mediapipe2019" />, <RefLink id="mediapipe-docs" />).
              </li>
              <li>
                Left / right eye horizontal and vertical pairs compute EAR each frame (
                <RefLink id="soukupova2016" />).
              </li>
              <li>Processing stays on-device; video is never uploaded.</li>
            </ul>
          </Section>

          <Section id="fatigue" title="Fatigue · Eye Aspect Ratio · blinks · PERCLOS">
            <p>
              Fatigue is the most directly research-grounded panel in the analyzer. We do not
              invent a novel drowsiness classifier; we implement published eyelid metrics.
            </p>

            <h3 className="mt-5 text-sm font-bold uppercase tracking-[0.12em] text-primary">
              Eye Aspect Ratio (EAR)
            </h3>
            <p className="mt-2">
              Soukupová &amp; Čech showed that facial landmarks are precise enough to estimate
              eye openness from a single scalar: the ratio of vertical eyelid distances to eye
              width. EAR stays roughly constant when the eye is open and collapses toward zero
              during a blink (<RefLink id="soukupova2016" />, <RefLink id="soukupova-tr" />).
            </p>
            <div className="card-2 mt-3 overflow-x-auto p-4">
              <code className="mono text-sm text-ink">
                EAR = (||p₂ − p₆|| + ||p₃ − p₅||) / (2 · ||p₁ − p₄||)
              </code>
              <p className="mt-2 text-xs text-muted">
                Emote AI averages left and right eyes from MediaPipe indices, then treats{" "}
                <code className="mono">EAR &lt; 0.21</code> as closed (default threshold in{" "}
                <code className="mono">FatigueDetector</code>).
              </p>
            </div>

            <h3 className="mt-5 text-sm font-bold uppercase tracking-[0.12em] text-primary">
              Blink counting
            </h3>
            <p className="mt-2">
              A blink is detected on the closed → open transition. Typical blinks last roughly
              100–400 ms (<RefLink id="soukupova-tr" />). Consecutive closed frames beyond a
              drowsiness window are flagged as a micro-sleep candidate rather than a normal blink.
            </p>

            <h3 className="mt-5 text-sm font-bold uppercase tracking-[0.12em] text-primary">
              PERCLOS
            </h3>
            <p className="mt-2">
              PERCLOS (PERcentage of eyelid CLOSure) is the fraction of recent time the eyes are
              closed. Dinges &amp; Grace validated it against psychomotor vigilance as a
              psychophysiological alertness measure for transportation safety (
              <RefLink id="dinges1998" />; earlier vehicle monitoring work in{" "}
              <RefLink id="wierwille1994" />). Emote AI keeps a rolling window of closed/open
              frames and blends PERCLOS with a micro-sleep term into a 0–100 fatigue score:
            </p>
            <div className="card-2 mt-3 p-4">
              <code className="mono text-sm text-ink">
                score ≈ 100 · clamp(0.7 · PERCLOS · 3 + 0.3 · microsleep)
              </code>
              <p className="mt-2 text-xs text-muted">
                Status labels: OK → TIRED (score &gt; 40) → DROWSY (sustained consecutive closure).
              </p>
            </div>
            <p className="mt-3 text-sm text-muted">
              Why this matters for Integrity Markets: fatigue is a real, published biometric -
              useful as match context (e.g. late-game officiating load) without claiming intent
              or guilt.
            </p>
          </Section>

          <Section id="rppg" title="Heart rate · remote photoplethysmography (rPPG)">
            <p>
              Blood volume pulses change how skin reflects light. A webcam pointed at a stable
              skin ROI can recover heart rate without contact. Verkruysse et al. demonstrated
              remote PPG from ambient light, with the green channel carrying the strongest pulse
              (<RefLink id="verkruysse2008" />).
            </p>
            <p className="mt-3">
              Emote AI implements <b className="text-ink">POS</b> (Plane-Orthogonal-to-Skin) from
              Wang et al.: temporally normalize RGB, project onto a plane orthogonal to skin tone,
              overlap-add short windows, then band-pass (0.7–4 Hz ≈ 42–240 BPM) and FFT for BPM
              plus peak-interval analysis for HRV (<RefLink id="wang2017" />,{" "}
              <RefLink id="wang2017preprint" />). This is the method named in{" "}
              <code className="mono text-primary">lib/emote/rppg.js</code> - not a mock waveform.
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted">
              <li>Sliding ~12 s analysis window; first estimate after ~6 s of buffer.</li>
              <li>Signal quality gates downstream stress / integrity so bad lighting does not invent drama.</li>
              <li>Accuracy still depends on stillness, illumination, and visible skin - the quality meter exists for that reason.</li>
            </ul>
          </Section>

          <Section id="stress" title="Stress · arousal from HR and HRV">
            <p>
              Sympathetic arousal tends to raise heart rate and suppress short-term heart-rate
              variability. The ESC/NASPE Task Force standardized HRV metrics including RMSSD
              for short-term parasympathetic activity (<RefLink id="hrv1996" />). Meta-analytic
              work links reduced HRV to stress-related states (<RefLink id="thayer2012" />).
            </p>
            <p className="mt-3">
              Emote AI calibrates a personal resting baseline over ~30 s of good-quality samples,
              then scores deviations:
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted">
              <li>HR component: how far BPM sits above the baseline (soft-clamped).</li>
              <li>HRV component: how far RMSSD sits below the baseline.</li>
              <li>Blend ≈ 60% HR + 40% HRV → 0–100 arousal index (Calm / Elevated / High).</li>
            </ul>
            <p className="mt-3 text-sm text-muted">
              This is a coarse <em>arousal</em> proxy - deliberately not labelled as guilt, lying,
              or match-fixing.
            </p>
          </Section>

          <Section id="expression" title="Expression from blendshapes">
            <p>
              MediaPipe exposes ARKit-style blendshape activations. Emote AI maps those to seven
              expression buckets (neutral, happy, sad, angry, surprised, fearful, disgusted) with
              hand-tuned rules and a softmax. That is an interpretable expression readout - not a
              trained facial-emotion-recognition network, and not a measure of felt emotion.
            </p>
            <p className="mt-3 text-sm text-muted">
              The Action Unit tradition behind modern face coding is FACS (
              <RefLink id="ekman1978" />). We cite it as conceptual background; our mapping is a
              lightweight heuristic on top of MediaPipe outputs (
              <RefLink id="mediapipe-docs" />).
            </p>
          </Section>

          <Section id="integrity" title="Integrity fusion (experimental)">
            <p>
              Track 1 Integrity Markets (see the pitch: trade the result <em>and</em> whether
              officiating reads clean) needs a single chip beside each fixture. The composite is
              honest about what it is: a transparent entertainment heuristic, shown as context,
              never as the settlement source.
            </p>
            <div className="card-2 mt-4 space-y-2 p-4 text-sm">
              <div>
                <span className="text-muted">guilt heuristic</span> - fear + sadness + disgust,
                amplified under a neutral mask
              </div>
              <div>
                <span className="text-muted">tells</span> - fearful / disgusted / surprised mass
              </div>
              <div>
                <span className="text-muted">masking</span> - neutral face while physiology says
                high arousal
              </div>
              <div>
                <span className="text-muted">suspicion</span> - weighted blend, scaled by signal
                quality confidence
              </div>
              <div className="pt-1 text-xs text-faint">
                Labels: Composed → Nervous → Elevated → Flagged
              </div>
            </div>
            <p className="mt-4 text-sm text-muted">
              Markets settle from the TxODDS result oracle and a recomputable sha256 evidence
              hash (<Link href="/verify" className="font-semibold text-primary">/verify</Link>).
              The integrity chip is context - &quot;built to be audited, not to accuse.&quot;
            </p>
          </Section>

          <Section id="limits" title="What we do not claim">
            <p>
              Facial and physiological deception detection is not scientifically reliable as
              evidence of wrongdoing. Large reviews find human deception judgments barely above
              chance (<RefLink id="bond2006" />), and the National Academies concluded that
              polygraph-style physiological inference is not a dependable test of lying (
              <RefLink id="nrc2003" />).
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted">
              <li>Detection of HR, HRV, EAR, and expression geometry is real engineering.</li>
              <li>The integrity / suspicion score is an experimental heuristic for entertainment.</li>
              <li>It is not a lie detector, not forensic evidence, and not an accusation of match-fixing.</li>
              <li>It never settles a market; settlement is the verifiable result hash.</li>
            </ul>
          </Section>

          <Section id="references" title="References">
            <p className="mb-4 text-sm text-muted">
              Primary papers and standards behind the measures above. Prefer DOIs / official PDFs
              when citing Emote AI methods externally.
            </p>
            <ol className="space-y-4">
              {REFS.map((r, i) => (
                <li key={r.id} id={`ref-${r.id}`} className="card-2 scroll-mt-24 p-4">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="mono text-xs font-bold text-primary">[{i + 1}]</span>
                    <span className="text-sm font-semibold text-ink">{r.authors}</span>
                  </div>
                  <a
                    href={r.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block text-sm font-bold text-primary hover:underline"
                  >
                    {r.title} ↗
                  </a>
                  <div className="mt-1 text-xs text-muted">{r.venue}</div>
                  {r.note && <p className="mt-2 text-sm text-muted">{r.note}</p>}
                </li>
              ))}
            </ol>
          </Section>

          <div className="card flex flex-wrap items-center gap-3 p-5">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold">See the signals live</div>
              <p className="text-sm text-muted">
                Point the analyzer at a face, or open Integrity Markets to see the chip as context.
              </p>
            </div>
            <Link href="/analyze" className="btn btn-primary">
              Analyze -&gt;
            </Link>
            <Link href="/markets" className="btn btn-ghost">
              Markets
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-3 text-xl font-black tracking-tight">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-ink/95">{children}</div>
    </section>
  );
}

function RefLink({ id }: { id: string }) {
  const index = REFS.findIndex((r) => r.id === id);
  if (index < 0) return null;
  return (
    <a href={`#ref-${id}`} className="mono text-xs font-bold text-primary hover:underline">
      [{index + 1}]
    </a>
  );
}
