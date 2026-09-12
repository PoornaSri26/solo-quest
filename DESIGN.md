# Solo Quest Design Language

## 1. Soul & Mood
- **Core Feeling:** Mystical adventure mixed with quiet determination. The experience should feel like stepping into an ancient, living dungeon where each scroll reveals a new layer of lore and power.
- **Adjectives:** enigmatic, resonant, tactile, luminous, measured.
- **Narrative Tone:** The user is a Hunter progressing through gates; the UI whispers hints of forgotten legends, encouraging curiosity without overwhelming.

## 2. Typography
- **Primary Font:** **Orbitron** (futuristic, geometric, slightly condensed) – used for headings, numbers, and UI accents to evoke a sci‑fantasy techno‑rune vibe.
- **Secondary Font:** **Space Grotesk** (clean, neutral sans) – body text, labels, and secondary info for readability.
- **Accent Font (optional):** **JetBrains Mono** for code‑like snippets or debug‑style numbers (e.g., cooldown timers).
- **Hierarchy:**
  - H1: Orbitron 700, clamp(3.5rem, 9vw, 7rem), letter‑spacing -0.02em
  - H2: Orbitron 600, clamp(2.5rem, 6vw, 4.5rem)
  - H3: Orbitron 500, clamp(1.75rem, 4vw, 2.5rem)
  - Body: Space Grotesk 400, 1rem (16px), line‑height 1.6
  - UI labels / metrics: Space Grotesk 500, 0.875rem, text‑transform uppercase, letter‑spacing 0.05em

## 3. Color Logic
- **Base Palette (Dark Soul):**
  - `--bg-dark`: #0a0a0c (almost black, deep void)
  - `--bg-mid`: #111114 (subtle lift for panels)
  - `--bg-light`: #1e1e25 (glass‑morphism surfaces)
- **Accent Gradient (Mana Flow):**
  - Start: `#7c6ef0` (soft violet)
  - Mid: `#a594f5` (lavender glow)
  - End: `#2dd4bf` (teal‑cyan spark)
- **Semantic Colors:**
  - Success / Green: `#22c55e` (activated gate)
  - Warning / Amber: `#f59e0b` (cooldown)
  - Danger / Red: `#ef4444` (danger zone / failed attempt)
- **Usage Rules:**
  - Backgrounds: dark base with subtle animated gradient shifts (see Motion).
  - Primary UI elements (buttons, active tabs): accent gradient via `background: linear-gradient(90deg, var(--accent-start), var(--accent-end))`.
  - Text: `--text-light` (#e8e8f0) on dark surfaces; `--text-muted` (#9898b0) for secondary info.
  - Borders / outlines: `--border` (#2a2a38) with hover lift to `--border2` (#363645).

## 4. Motion Principles
- **Entrance:** Elements float‑in with a soft scale + vertical offset (`float-in` keyframe) using `cubic-bezier(0.23,1,0.32,1)`.
- **Hover Lift:** Slight upward translate (-6px) and increased shadow depth for interactive items.
- **Scroll‑Reveal:** Each section fades‑in + slight upward drift (`reveal-up`) triggered by GSAP ScrollTrigger (`start: "top 80%"`).
- **Mana Pulse:** Accent‑gradient UI pieces have a slow `subtle-pulse` (scale 1 → 1.02 → 1) combined with a glow filter that expands/contracts.
- **Column‑Shift:** As the user scrolls, parallax layers (background nebula, mid‑ground runes) move at different rates (`data-speed` attributes) to create depth.
- **Micro‑Interactions:** Button presses emit a brief “ripple” effect (CSS `clip-path` animation) and a soft click sound (optional Web Audio).
- **Performance:** All animations use `transform` and `opacity` where possible; prefers `requestAnimationFrame`/`GSAP` with `will‑change: transform, opacity`.

## 5. Imagery & Iconography
- **Style:** Line‑based, glyphic runes with occasional soft glows. Strokes ~2px, rounded caps.
- **Palette:** Use accent gradient strokes on dark fills; invert for light surfaces.
- **Sources:** Custom SVGs stored in `/src/assets/icons/`; each icon can be tinted via CSS `fill: currentColor`.

## 6. Sound & Haptics (Future)
- Low‑frequency hum when entering a new gate.
- Soft chime on successful quest capture.
- Subtle vibration on mobile for critical actions (if supported).

---
*This document captures the soul before any pixel is touched. All subsequent UI work should reference these values.*