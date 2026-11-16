# Daggerlight Animation Lab v5 — Motion Vocabulary Revamp

**Branch:** `feature/animation-lab-v5`, isolated from `feature/animation-lab-v4-2`.  
**Preview:** https://marianotripelhorn-ux.github.io/tcg-prototype/animation-lab-v5/?lab=animations  
**Scope:** motion **laboratory only**. The existing playable game, AI, card data and balance are unchanged.

## Approved visual direction carried from v4.2

The user approved the earlier reference-inspired spectral dissolution and its later refinements: **warm metallic gold** for empowering or restorative effects; **dense ink black** for harmful effects; full (unbroken), fine concentric circles; rich but not completely opaque color fills; one meaningful wave and concise anticipation/impact/release. Avoid new invented symbols and excessive generic particle showers.

A neutral action such as placement, storage or Champion presentation defaults to gold **for preview**, but the palette control may be switched to black to test other conditions. This does not prescribe an in-game polarity for any specific mechanic.

## The four new v5 animations

### 01 · Materialización (v5)
- **Anticipation**: the engraved stone develops one muted golden response.
- **Construction**: the card's etched outline and three complete circle rings emerge first.
- **Reveal**: a continuous material-color wave travels upward while the real printed card is progressively revealed from bottom to top. Its ghost and fill fade away.
- **Resolution**: the real card settles at full opacity. No generated particle burst.

### 02 · Archivo (v5)
- **Anticipation**: printed card rises; a controlled golden fill and three full rings signal transmutation.
- **Physical transfer**: one **solid quadratic path** connects the real card's current location to the actual Archive receptacle. A fine luminous line draws along the path with a low-opacity blur under it.
- **Capture**: the whole card shrinks and moves into the Archive well instead of exploding, and the receptacle responds with **two full rings**. Example count **3 → 4** appears on arrival.
- **Resolution**: the channel and rings fade out. No generated particle burst.

### 03 · Colocación (v5)
- **Travel**: the actual card moves from the hand area with a lifting tilt, shadow and controlled easing. No magical effects during travel.
- **Contact**: the landing generates a **short, physical stone wave** and **two full thin floor circles**, plus one subdued gold wash on the card.
- **Resolution**: the card returns to its engraved slot at full opacity and the circular resonance dissipates. No generated particle burst.

### 04 · Estandarte (v5)
- **Unfurl**: the existing textured champion banner scales downward with its notched cloth shape intact, not as an unrelated flat panel.
- **Material illumination**: a restrained gold wave runs across its **actual fabric**, accompanied by **two complete circles**.
- **Reveal**: original Champion copy and existing cutout character appear during the wave, settling into a still banner. No generated particle burst.

These four intentionally have **different motion arcs** (rebuild, capture, land and unfurl), rather than assigning a common glow animation to unrelated gameplay actions.

## Preservation and comparison

- The first seven lab options are the **new design system**: 4 new v5 studies plus v4.2's Power gain, Power loss and Champion damage.
- Earlier v3 dissolution, v2 chiral studies and v1 studies remain selectable under "Estudios anteriores · comparación", so animations can be evaluated against their original forms.
- All original cards still render via `CardFace`. The added SVG and DOM FX layers do not change game-state data.
- Manifestations and mobile layout remain outside this motion experiment; gameplay integration must be authorized after visual review.

## Implementation

- `src/animation-lab/AnimationLab.tsx`: four new GSAP timelines, separate paused/replayable sequences, shared existing material color palette and round full-ring layers, new SVG path geometry and fabric overlays. Ref cleanup in `reset()`.
- `src/animation-lab/v5-motion.css`: physical transfer path, Archive/floor circular response, cloth overlay, scrolling experiment picker and full-circle line styling.
- `scripts/animation-lab-smoke.mjs`: Playwright checks 17 experiments, card recreation, Archive count +1, placement visibility, banner reveal, approved v4 Power and Vida changes, full-circle geometries and palette switching.
- `.github/workflows/animation-lab-v5-preview.yml`: isolated preview publication in `site/animation-lab-v5/` with existing game previews left intact.

## Review guidance

Try the four effects in sequence with the **same real card**. Compare how materialization uses color to build an object, Archive uses geometry to move one, placement emphasizes weight, and banner uses a surface sweep. Evaluate whether the stronger color fills are readable at normal speed and whether a short visual variant might be needed for frequent repeat triggers during matches.

This lab is not the actual match renderer. Integration later must address animation queues, cancellation, reduced motion, timing alignment to engine events, and input responsiveness.
