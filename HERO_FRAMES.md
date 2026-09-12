# Hero Concept – Three‑Frame Animation Blueprint

**Goal:** A hero section that stops the scroll, tells a micro‑story, and provides a visual hook for the GSAP‑driven scroll interaction.

**Overall Theme:** A dormant gate awakens as the user begins to scroll – ancient runes glow, particles swirl, and a faint Hunter silhouette appears.

---

## Frame 1 – “The Seal” (t = 0 s)
- **Background:** Deep‑space nebula gradient (`--bg-dark` → `--bg-mid`) with a very slow radial drift (parallax layer).  
- **Foreground:** Massive stone archway (gate) centered, etched with faded runes. Gate mostly dark; only a faint outline visible.  
- **Details:**  
  - Small floating ash particles drift upward slowly (opacity 0.07–0.12).  
  - Hunter’s sigil (simple geometric emblem) hovers just above the gate’s keystone, barely glowing (opacity 0.15).  
- **Mood:** Mysterious, still, inviting the user to lean in.

## Frame 2 – “The Awakening” (t = 1.5 s)
- **Trigger:** Begins when the user scrolls ~10 % of viewport height (handled via GSAP ScrollTrigger scrub).  
- **Visual Changes:** Visual Changes:**  
  - Runes along the gate ignite with the accent gradient (`#7c6ef0 → #a594f5 → #2dd4bf`). Glow pulses gently (scale 1 → 1.04 → 1).  
  - Particle density increases; they gain slight upward velocity, catching the glow (additive blend).  
  - Hunter’s sigil brightens to full opacity, emitting a soft outer glow (blur + opacity).  
  - A subtle vignette darkens edges to focus on the gate.  
- **Mood:** Anticipatory, the seal is breaking.

## Frame 3 – “The Gate Opens” (t = 3 s – loop point)
- **Trigger:** Continues as the user scrolls further (~30 % viewport) *or* can loop idle if the user pauses.  
- **Visual Changes:**  
  - Central doorway reveals a swirling vortex of cosmic colors (same gradient, now inner‑glow).  
  - Light beams shoot outward from the vortex, briefly illuminating surrounding stone (short flare animation).  
  - Hunter’s silhouette becomes visible through the doorway – a faint, armored figure holding an ethereal blade, outlined in the accent color.  
  - Particle flow now follows vortex motion, adding a spiral effect.  
- **Mood:** Reward & invitation – the user feels the gate is ready to be entered; the CTA button (“Enter the Gate”) pulses in sync with the vortex beat.

---

### Technical Sketch (GSAP + ScrollTrigger)

```js
// Hero container: <section id="hero">…</section>
const hero = document.getElementById('hero');
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: hero,
    start: 'top 80%',
    end: 'bottom 20%',
    scrub: true,          // smooth sync with scroll
    // markers: true      // uncomment for debugging
  }
});

// ---- Frame 1 → 2: rune glow ----
tl.fromTo('.rune',
  { opacity: 0.2, filter: 'none' },
  { opacity: 1, filter: 'drop-shadow(0 0 8px var(--accent-start))', duration: 1.5 },
  0
);

// ---- Frame 2 → 3: vortex reveal ----
tl.fromTo('.vortex',
  { scale: 0, opacity: 0 },
  { scale: 1, opacity: 0.8, duration: 1, ease: 'power2.out' },
  1.5
);

// ---- Particle system (could be CSS animation or lightweight canvas like tsparticles) ----
// (omitted for brevity – see notes below)

// ---- CTA pulse (independent of scroll, runs continuously) ----
gsap.to('.cta-button',
  { scale: [1, 1.05, 1], repeat: -1, duration: 2, ease: 'sine.inOut' }
);
```

#### Asset Notes
- **Gate SVG:** Layered (stone base, runes overlay, vortex mask).  
- **Particle Layer:** Small PNG sprite sheet or a lightweight canvas emitter (e.g., `tsparticles`).  
- **Hunter Silhouette:** Single‑color SVG tintable via `fill: currentColor`.  

These three frames give you a clear visual progression that can be exported as a short looping video/GIF from a tool like **Higgsfield** (or created directly in After Effects/Lottie) and then driven by the GSAP ScrollTrigger timeline above for an interactive, scroll‑responsive hero.

---

## Next Steps
1. **Create / gather the SVG assets** (gate, runes, vortex, sigil, particles).  
2. **Generate the 3‑frame loop** (using Higgsfield, After Effects, Lottie, or a simple CSS/JS animation).  
3. **Integrate the assets** into `index.html` / `src/components/` and wire up the GSAP timeline as sketched.  
4. **Proceed to the sections** (see `SECTIONS.md`) and apply the same motion principles throughout the site.

When you’re ready to move from concept to code, just let me know which file you’d like to open first or if you need help generating the assets. Happy building! 🚀