# Section Ideation for Solo Quest

## Overview
The site is conceived as a **single‑page, scroll‑driven journey** through the “Gates” of a mysterious dungeon. Each major section represents a gate or a facet of the Hunter’s progression. The flow should feel episodic: a teaser, a challenge, a reveal, and a reward, all tied together by the visual language defined in DESIGN.md.

## Section List (in scroll order)

| Section | Purpose / Narrative | Key UI Elements | Interaction / Animation Highlights |
|---------|---------------------|-----------------|------------------------------------|
| **0️⃣ Prologue / Hero** | Sets the mood, introduces the Hunter’s sigil and the looming gate. | Full‑bleed background (animated nebula), large title (“Solo Quest”), subtitle, primary CTA (“Enter the Gate”). | Parallax background, floating particles, CTA pulse on hover, subtle scroll‑triggered reveal of the gate silhouette. |
| **1️⃣ Gate Inscription** | Displays the ancient glyph that must be deciphered. | Large centered glyph (SVG), translucent rune panel, short lore tooltip. | Glyph draws itself via SVG stroke‑dashoffset (GSAP), tooltip fades in on scroll, slight rotation on hover. |
| **2️⃣ Stat Dashboard** | Shows the Hunter’s current attributes (Health, Mana, Focus, Stamina). | Four metric cards arranged in a grid, each with icon, value, and label. | Cards stagger‑in from sides, values animate via GSAP `numbers` plugin, subtle pulse on each metric change (if interactive). |
| **3️⃣ Quest Log** | List of active/incomplete quests with rewards. | Vertical list of quest cards (title, description, reward icon, progress bar). | Each card slides up on reveal, progress bar fills via scrubbed ScrollTrigger tied to scroll depth (optional). |
| **4️⃣ Daily Dungeon** | Rotating challenge preview (like a “daily quest”). | Card with timer, difficulty badge, loot preview, “Start” button. | Countdown timer ticks down (GSAP tween), badge pulses when <1h left, button scales on hover. |
| **5️⃣ Lore Compendium** | Expandable entries about the world, monsters, artifacts. | Accordion / tabs with illustrated panels. | Panel expands with staggered fade‑out with height‑tween, icon rotates, background texture shifts slightly. |
| **6️⃣ Leaderboard** (optional) | Shows top hunters – adds social motive. | Table with rank, avatar, score, badge. | Rows stagger‑in, highlight row on hover with glow, subtle bar‑chart animation for scores. |
| **7️⃣ Call‑to‑Action / Forge** | Invite user to craft or upgrade gear. | Forge UI: material slots, result preview, “Forge” button. | Slot items drag‑and‑drop (if interactive), forge button emits spark particles on click. |
| **8️⃣ Footer / Sigil** | Copyright, links, and a final sigil that reacts to cursor. | Small sigil centered, social icons, legal text. | Sigil follows mouse with subtle lag (custom cursor), pulses on click. |

### Transition Philosophy
- **Between sections:** Use a full‑width “Divider” component – a thin animated rune line that sweeps left‑to‑right as the user passes.
- **State persistence:** If the site were to become an app, each section could map to a route (`/gate`, `/dashboard`, etc.) but for now it’s a single page experience.
- **Accessibility:** All animated elements respect `prefers-reduced-motion`; animations fallback to simple opacity changes.

---
*This list is a starting point – feel free to reorder, combine, or split sections as the narrative evolves.*