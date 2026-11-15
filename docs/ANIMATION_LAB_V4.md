# Daggerlight Animation Lab v4 — Power & Champion Impact

**Base:** `feature/animation-lab-v3` (approved Gold & Shadow spectral visual direction).  
**Branch:** `feature/animation-lab-v4`.  
**Standalone preview:** https://marianotripelhorn-ux.github.io/tcg-prototype/animation-lab-v4/?lab=animations

## Scope and locked art direction

Do **not** replace the original React CardFace, new gameboard, existing card art, rules, AI, save format or deck. This branch exists only to evaluate motion in isolation; Manifestations remain disabled in the separate board-motion gameplay experiment, and mobile work is deferred.

Follow the v3-approved visual grammar:
- Warm engraved **gold** = positive Power and empowerment.
- Dense material **black** = negative Power and Champion damage.
- **Buildup → one decisive wave → visible state change → quiet release.**
- Broad fills, disciplined line work and restrained stone response rather than scattered sparks. All three new v4 effects deliberately call **zero PixiJS particle bursts** (existing v1–v3 comparisons retain their original effects).
- The UI defaults to the appropriate polarity whenever one of the three new studies is selected. The experimenter can override the palette to test alternatives.

## Three newly replayable studies

### 01 · Ascenso de Poder (v4)
1. The original card rises a few pixels, not a dramatic hover.
2. Its existing etched border activates; a broad golden color mass travels across the illustration.
3. The central sigil becomes legible as the wave reaches its peak.
4. A single quiet resonance expands into the engraved stone.
5. A sample Power value increases by 3, accompanied by a temporary +3 indicator.
6. The fill recedes and the original printed card stays visible.

### 02 · Pérdida de Poder (v4)
1. The card compresses subtly; the surrounding stone darkens.
2. Ink-black mass drains the card's illumination in a directional sweep.
3. A graphite-edged sigil appears briefly.
4. The sample Power value decreases by up to 3 **without becoming negative**.
5. The wave withdraws, returning legibility to the original illustration.

### 03 · Herida del Campeón (v4)
1. The card builds up dense black energy.
2. A single solid directional wave crosses the battlefield from the card toward the opponent's actual crown object in the lab.
3. The crown receives a short ink-black surface fill with a thin contrasting metal rim.
4. The sample Vida decreases **9 → 8** precisely at the impact. The crown responds with a small deliberate recoil.
5. The transfer wave collapses and the environment settles.

No animated ability in this lab has any effect on a live card or Champion. The Power changes and the one point of Vida loss are illustrative, not a substitute for the real game engine's calculations.

## Implementation notes

- `src/animation-lab/AnimationLab.tsx`: three new GSAP timelines. The previously approved `spectral-refined` v3 study stays available, as do all nine older v1/v2 effects (13 studies total).
- `src/animation-lab/v4-motion.css`: gold/black palette, inset card sigil, physical transfer wave, crown wash and stone resonance layers.
- `scripts/animation-lab-smoke.mjs`: exercises 13 studies in a real Chromium browser and asserts that the new sequences use their correct default polarities and illustrative Power/Vida values.
- `.github/workflows/animation-lab-v4-preview.yml`: isolated validation and GitHub Pages deployment. Publishing never overwrites the previous lab previews or playable game.

## Review points before integration

- Does the gold Power increase feel like **strength entering the card**, rather than an unrelated overlay?
- Does Power decrease feel like **light being absorbed**, without hiding printed information unnecessarily?
- Does the black wave visibly reach the crown before the Life numeral changes?
- Is the animation subtle enough for frequent duels yet satisfying when an important effect triggers?
- Would a shorter, faster version be preferable in live gameplay while retaining the full version in this lab?

These remain visual prototypes. Do not integrate them into gameplay until reviewed. A subsequent integration will need presentation-state alignment, cancellation/skip, reduced motion, and performance testing.
