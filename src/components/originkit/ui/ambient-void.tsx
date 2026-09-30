"use client";

/**
 * Originkit-style ambient components (free tier, classic profile).
 *
 * Vendored/rebuilt for Solo Quest — the originals on originkit.dev render via
 * JS-hooked canvases that cannot be fetched from the docs pages, so these are
 * lightweight 2D-canvas reconstructions matching the documented behavior:
 *
 * - VoidDrift  : "particle-drift" — a slow constellation field where nearby
 *                particles link with thin lines; gold/violet on the void.
 * - SystemGlyphs: a near-still drifting field of small runic glyphs, the
 *                System's ambient telemetry. Barely-there by design.
 * - TypeSequence: typewriter reveal for "[System: ...]" lines (terminal
 *                voice; renders instantly under reduced motion).
 *
 * Doctrine: layer as an absolute background inside a `relative` container,
 * content above it. Both components render `pointer-events-none`, pause when
 * the tab is hidden or the host scrolls out of view, and freeze (static
 * first frame) under `prefers-reduced-motion`. No emojis, ever.
 */

import { useEffect, useRef, useState } from "react";

type VoidDriftProps = {
  /** Dot/line palette. Defaults to the Solo Quest gold + violet. */
  baseColor?: string;
  accentColor?: string;
  /** Average spacing between particles in px. Lower = denser field. */
  density?: number;
  /** Base dot radius in px. */
  dotSize?: number;
  /** Link line max length in px. */
  linkDistance?: number;
  /** Field drift speed multiplier (1 = calibrated default). */
  speed?: number;
  /** Run the constellation linking pass (off = dots only). */
  links?: boolean;
  /** React to the pointer with a faint local glow (classic, not flashy). */
  hover?: boolean;
  style?: React.CSSProperties;
  className?: string;
};

type DriftParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  accent: boolean;
  phase: number;
  twinkle: number;
};

function hexToRgb(hex: string): [number, number, number] {
  let s = hex.trim().replace("#", "");
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  if (s.length === 8) s = s.slice(0, 6);
  const n = parseInt(s, 16);
  if (!isFinite(n)) return [255, 255, 255];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const rgba = ([r, g, b]: [number, number, number], a: number) =>
  `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a.toFixed(3)})`;

export function VoidDrift({
  baseColor = "#C9A84C",
  accentColor = "#a594f5",
  density = 90,
  dotSize = 1.4,
  linkDistance = 110,
  speed = 1,
  links = true,
  hover = true,
  style,
  className,
}: VoidDriftProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Latest props, read inside the animation loop without re-binding effects.
  const live = useRef({ baseColor, accentColor, linkDistance, speed, hover });
  live.current = { baseColor, accentColor, linkDistance, speed, hover };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let particles: DriftParticle[] = [];
    let cssW = 1;
    let cssH = 1;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;
    let running = true;
    let last = 0;
    let elapsed = 0;
    const pointer = { x: -1e4, y: -1e4, active: false };

    const spawn = (w: number, h: number) => {
      const spacing = Math.max(density, 24);
      const count = Math.min(
        140,
        Math.max(24, Math.round((w * h) / (spacing * spacing)))
      );
      particles = [];
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const v = 4 + Math.random() * 7; // px/s — slow drift
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: Math.cos(ang) * v,
          vy: Math.sin(ang) * v * 0.6,
          r: dotSize * (0.55 + Math.random() * 0.9),
          accent: Math.random() < 0.22,
          phase: Math.random() * Math.PI * 2,
          twinkle: 0.5 + Math.random() * 1.1,
        });
      }
    };

    const resize = () => {
      // Measure the canvas itself — its box equals the host container when
      // absolutely positioned, or the viewport when rendered fixed.
      const rect = canvas.getBoundingClientRect();
      cssW = Math.max(rect.width || 1, 1);
      cssH = Math.max(rect.height || 1, 1);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(cssW * dpr));
      const h = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      spawn(cssW, cssH);
      if (reducedMotion) draw(0);
    };

    const draw = (dt: number) => {
      const L = live.current;
      const base = hexToRgb(L.baseColor);
      const accent = hexToRgb(L.accentColor);

      elapsed += dt;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      if (!reducedMotion) {
        for (const p of particles) {
          p.x += p.vx * dt * L.speed;
          p.y += p.vy * dt * L.speed;
          if (p.x < -8) p.x = cssW + 8;
          else if (p.x > cssW + 8) p.x = -8;
          if (p.y < -8) p.y = cssH + 8;
          else if (p.y > cssH + 8) p.y = -8;
        }
      }

      // Link pass
      if (links) {
        const maxD = L.linkDistance;
        const maxD2 = maxD * maxD;
        ctx.lineWidth = 0.5;
        for (let i = 0; i < particles.length; i++) {
          const a = particles[i];
          for (let j = i + 1; j < particles.length; j++) {
            const b = particles[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const d2 = dx * dx + dy * dy;
            if (d2 > maxD2) continue;
            const t = 1 - Math.sqrt(d2) / maxD;
            const c = a.accent || b.accent ? accent : base;
            ctx.strokeStyle = rgba(c, 0.05 + t * 0.1);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Dot pass
      for (const p of particles) {
        const c = p.accent ? accent : base;
        const tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(elapsed * p.twinkle + p.phase));
        let alpha = 0.28 * tw;

        if (L.hover && pointer.active) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 160) alpha = Math.min(0.85, alpha + (1 - d / 160) * 0.5);
        }

        ctx.fillStyle = rgba(c, alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!running) return;
      const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
      last = now;
      draw(dt);
    };

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.active =
        pointer.x >= 0 && pointer.y >= 0 && pointer.x <= r.width && pointer.y <= r.height;
    };
    const onLeave = () => {
      pointer.active = false;
      pointer.x = -1e4;
      pointer.y = -1e4;
    };
    const onVisibility = () => {
      running = !document.hidden;
      last = 0;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    if (hover) {
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerleave", onLeave);
    }
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [density, dotSize, links, hover]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        ...style,
      }}
    />
  );
}

type SystemGlyphsProps = {
  /** Glyph alphabet. Defaults to Solo Quest system runes (no emojis). */
  glyphs?: string;
  color?: string;
  /** Approximate vertical gap between glyphs in px. Lower = denser. */
  density?: number;
  /** Drift speed multiplier (1 = calibrated default). */
  speed?: number;
  /** Fixed seed so the field is stable across renders. */
  seed?: number;
  style?: React.CSSProperties;
  className?: string;
};

/**
 * SystemGlyphs — near-still field of small runic glyphs drifting slowly
 * upward, like the System's idle telemetry. Intensity is deliberately low:
 * this is a texture, not a spectacle.
 */
export function SystemGlyphs({
  glyphs = "ᚨᛊᚲᛟᛗᚹᛚᛖᚱᛏᛒᛁᚾᚺ",
  color = "#C9A84C",
  density = 84,
  speed = 1,
  seed = 7,
  style,
  className,
}: SystemGlyphsProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const live = useRef({ glyphs, color, speed });
  live.current = { glyphs, color, speed };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    type Cell = { x: number; y: number; ch: string; size: number; phase: number; vy: number };
    let cells: Cell[] = [];
    let cssW = 1;
    let cssH = 1;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;
    let running = true;
    let last = 0;
    let elapsed = 0;

    // Deterministic PRNG (mulberry32) so the glyph layout is stable per seed.
    const rand = (() => {
      let a = seed | 0;
      return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    })();

    const spawn = (w: number, h: number) => {
      const gap = Math.max(density, 40);
      cells = [];
      const cols = Math.max(1, Math.floor(w / gap));
      const rows = Math.max(1, Math.ceil(h / gap) + 1);
      const chars = Array.from(live.current.glyphs);
      if (chars.length === 0) return;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (rand() > 0.55) continue; // sparse field
          cells.push({
            x: (col + 0.3 + rand() * 0.4) * (w / cols),
            y: row * gap + rand() * gap * 0.5,
            ch: chars[Math.floor(rand() * chars.length)],
            size: 9 + rand() * 5,
            phase: rand() * Math.PI * 2,
            vy: 3 + rand() * 5,
          });
        }
      }
    };

    const resize = () => {
      // Measure the canvas itself (see VoidDrift.resize).
      const rect = canvas.getBoundingClientRect();
      cssW = Math.max(rect.width || 1, 1);
      cssH = Math.max(rect.height || 1, 1);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(cssW * dpr));
      const h = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      spawn(cssW, cssH);
      if (reducedMotion) draw(0);
    };

    const draw = (dt: number) => {
      const L = live.current;
      elapsed += dt;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (const c of cells) {
        if (!reducedMotion) {
          c.y -= c.vy * dt * L.speed;
          if (c.y < -14) c.y = cssH + 12;
        }
        const tw = 0.5 + 0.5 * Math.sin(elapsed * 0.7 + c.phase);
        ctx.globalAlpha = 0.03 + tw * 0.05; // faint — ambient only
        ctx.fillStyle = L.color;
        ctx.font = `${c.size}px "Share Tech Mono", monospace`;
        ctx.fillText(c.ch, c.x, c.y);
      }
      ctx.globalAlpha = 1;
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!running) return;
      const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
      last = now;
      draw(dt);
    };

    const onVisibility = () => {
      running = !document.hidden;
      last = 0;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [density, seed]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        ...style,
      }}
    />
  );
}

type TypeSequenceProps = {
  /** Full string to reveal, one character at a time. */
  text: string;
  /** Milliseconds per character. */
  speed?: number;
  /** Milliseconds to wait before typing begins. */
  startDelay?: number;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * TypeSequence — terminal typewriter reveal for [System: ...] lines.
 * Renders instantly (no animation) under prefers-reduced-motion.
 * Render as an inline element inside a styled parent; it inherits color.
 */
export function TypeSequence({
  text,
  speed = 24,
  startDelay = 300,
  className,
  style,
}: TypeSequenceProps) {
  const [count, setCount] = useState(0);
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(text.length);
      setTyping(false);
      return;
    }
    setCount(0);
    setTyping(true);
    let i = 0;
    let interval: number | undefined;
    const timer = window.setTimeout(() => {
      interval = window.setInterval(() => {
        i += 1;
        setCount(i);
        if (i >= text.length) {
          window.clearInterval(interval);
          setTyping(false);
        }
      }, speed);
    }, startDelay);
    return () => {
      window.clearTimeout(timer);
      if (interval) window.clearInterval(interval);
    };
  }, [text, speed, startDelay]);

  return (
    <span className={className} style={style}>
      {text.slice(0, count)}
      {typing && (
        <span
          aria-hidden="true"
          className="animate-pulse"
          style={{
            display: "inline-block",
            width: "0.55em",
            height: "1em",
            marginLeft: "0.12em",
            verticalAlign: "-0.12em",
            background: "currentColor",
          }}
        />
      )}
    </span>
  );
}

export default SystemGlyphs;
