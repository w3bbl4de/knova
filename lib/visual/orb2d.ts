// src/lib/visual/orb2d.ts
// Canvas2D "orb" visualiser driven by input/output analyser levels and optional FFT bins.
// Designed to be called every animation frame.

export type Orb2DParams = {
  inLevel: number; // 0..1
  outLevel: number; // 0..1
  inBins?: Uint8Array | null; // optional, from AnalyserNode.getByteFrequencyData
  outBins?: Uint8Array | null;
  phaseRef: { current: number }; // persistent phase accumulator (useRef)
  active?: boolean; // if false, render a calmer idle orb
};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function sampleBins(bins: Uint8Array | null | undefined, idx: number) {
  if (!bins || bins.length === 0) return 0;
  const i = Math.max(0, Math.min(bins.length - 1, idx));
  return bins[i] / 255;
}

/**
 * Draw an audio-reactive orb.
 * Call once per animation frame.
 */
export function drawOrb2D(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, p: Orb2DParams) {
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;

  const inL = clamp01(p.inLevel);
  const outL = clamp01(p.outLevel);

  const active = p.active ?? true;

  // energy is a combined measure; bias output a bit (speaker tends to dominate visuals)
  const energy = clamp01(inL * 0.85 + outL * 1.15);

  // phase advance: slow when idle, faster when active
  p.phaseRef.current += (active ? 0.014 : 0.006) + energy * 0.02;
  const t = p.phaseRef.current;

  // base radius
  const rBase = Math.min(W, H) * 0.28;
  const rPulse = rBase * (1 + (active ? 0.12 : 0.04) * inL + (active ? 0.18 : 0.06) * outL);

  // clear
  ctx.clearRect(0, 0, W, H);

  // transparent background; orb is drawn standalone
  // (if you want a backplate, uncomment)
  // ctx.fillStyle = "rgba(0,0,0,0.15)";
  // ctx.fillRect(0, 0, W, H);

  // color weights
  const warm = clamp01(inL * 1.35);
  const cool = clamp01(outL * 1.35);

  // ---- OUTER GLOW ----
  const glowR = rPulse * (1.55 + 0.35 * energy);
  const glowA = (active ? 0.30 : 0.16) + 0.35 * energy;

  const g = ctx.createRadialGradient(cx, cy, rPulse * 0.18, cx, cy, glowR);
  g.addColorStop(0.0, `rgba(255, 120, 120, ${glowA * warm})`);
  g.addColorStop(0.22, `rgba(255, 140, 200, ${0.22 * warm})`);
  g.addColorStop(0.34, `rgba(80, 170, 255, ${glowA * cool})`);
  g.addColorStop(0.70, `rgba(30, 140, 255, ${0.14 * cool})`);
  g.addColorStop(1.0, `rgba(0, 0, 0, 0)`);

  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
  ctx.fill();

  // ---- EDGE WOBBLE PATH ----
  const steps = 140;
  const wobble = rPulse * ((active ? 0.045 : 0.02) + (active ? 0.08 : 0.03) * energy);

  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;

    // Use a handful of low bins (stable, less jitter)
    const bIn = sampleBins(p.inBins, 2 + (i % 8));
    const bOut = sampleBins(p.outBins, 2 + ((i + 3) % 8));
    const tex = 0.55 * bOut + 0.45 * bIn; // 0..1

    // Smooth wobble + audio texture contribution
    const w =
      wobble *
      (0.55 * Math.sin(a * 3 + t * 1.15) +
        0.30 * Math.sin(a * 7 - t * 0.92) +
        0.42 * (tex - 0.5));

    const rr = rPulse + w;
    const x = cx + rr * Math.cos(a);
    const y = cy + rr * Math.sin(a);

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  // ---- ORB BODY GRADIENT ----
  const body = ctx.createRadialGradient(cx - rPulse * 0.25, cy - rPulse * 0.25, rPulse * 0.12, cx, cy, rPulse * 1.25);

  // bright core -> tinted mid -> deep body
  body.addColorStop(0.0, `rgba(255,255,255, ${active ? 0.14 : 0.10})`);
  body.addColorStop(0.14, `rgba(120, 200, 255, ${0.18 * cool})`);
  body.addColorStop(0.20, `rgba(255, 140, 200, ${0.14 * warm})`);
  body.addColorStop(0.55, "rgba(12, 14, 24, 0.94)");
  body.addColorStop(1.0, "rgba(6, 6, 10, 0.98)");

  ctx.fillStyle = body;
  ctx.fill();

  // ---- RIM / EDGE LIGHT ----
  ctx.save();
  ctx.globalAlpha = (active ? 0.30 : 0.16) + 0.28 * energy;
  ctx.lineWidth = Math.max(2, rPulse * 0.04);

  // cool rim then warm rim (double-stroke)
  ctx.strokeStyle = `rgba(120, 180, 255, ${0.35 * cool})`;
  ctx.stroke();
  ctx.strokeStyle = `rgba(255, 140, 200, ${0.25 * warm})`;
  ctx.stroke();

  ctx.restore();

  // ---- INNER HIGHLIGHTS ----
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = (active ? 0.30 : 0.16) + 0.38 * energy;

  ctx.beginPath();
  ctx.arc(cx - rPulse * 0.16, cy - rPulse * 0.18, rPulse * 0.42, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(120, 200, 255, ${0.22 * cool})`;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx + rPulse * 0.12, cy + rPulse * 0.10, rPulse * 0.32, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 140, 200, ${0.18 * warm})`;
  ctx.fill();

  ctx.restore();

  // ---- OPTIONAL: subtle sparkle noise (disabled by default) ----
  // Enable if you want extra “shimmer” (CPU cost is small but non-zero).
  // if (active && energy > 0.12) {
  //   ctx.save();
  //   ctx.globalAlpha = 0.04 + 0.04 * energy;
  //   for (let i = 0; i < 90; i++) {
  //     const a = Math.random() * Math.PI * 2;
  //     const rr = (Math.random() * 0.9 + 0.1) * rPulse;
  //     const x = cx + rr * Math.cos(a);
  //     const y = cy + rr * Math.sin(a);
  //     ctx.fillStyle = "rgba(255,255,255,0.85)";
  //     ctx.fillRect(x, y, 1, 1);
  //   }
  //   ctx.restore();
  // }
}
