# Daggerlight — Animation Lab v2 / Quiral Color-Mass Studies

**Branch:** `feature/animation-lab-v2` from `feature/animation-lab-v1`.  
**Preview:** https://marianotripelhorn-ux.github.io/tcg-prototype/animation-lab-v2/?lab=animations  
**Status:** experimental artwork. **NOT integrated into live matches.**

## Direction from review

The first laboratory animation had a clear sequence but looked generic: too many scattered particles, electrical decorations, and insufficient interaction between light, color, and the printed card. The new direction deliberately separates **subtle buildup** from **bold, graphic payoff**, rooted in Daggerlight's opposing Quiral forces and physical tabletop.

Three principles:
1. **Color is the effect.** Large, deterministic fill masses advance from opposite sides of the actual original printed card. The fills are saturated and intentionally controlled rather than random fragments.
2. **Opposition is the grammar.** Two asymmetrical curved fronts approach, collide into a vertical line and diamond seal, and extend a broad wave across the stone.
3. **Restraint communicates weight.** No particle bursts in either new v2 experiment. A precise center seam, compact seal and one major wave are the visual accents.

The previous `Disolución etérea (v1)` remains available unchanged for A/B comparison, alongside its other six animations.

## Two experiments

### 01 · Marea Quiral (v2) — solid dissolution

1. Printed card rises minimally in anticipation.
2. A pair of opaque-tinted colors advances inward from the left and right using opposing broad wave boundaries.
3. An engraved central diamond lights up as the masses collide; a single horizontal wave reaches onto the stone.
4. The original card becomes hidden beneath the filled surface.
5. The colored surface physically folds into a narrow center line, then fades. The card is gone.
6. The environment recovers quietly.

This is a **color-plate disappearance**, not a shower of sparks. Future candidates might go into the Archive, but in the lab this is deliberately unconnected to any rule.

### 02 · Sello de Poder (v2) — contained activation

1. The same two opposing fills build up to the center.
2. The center seal locks and sends one broad wave across the board.
3. The filled surface withdraws, revealing the original card unchanged.
4. A sample Power count goes from printed Power to printed Power + 3.
5. The seal and glow resolve, leaving a grounded card.

This shows a build-and-release mechanic rather than destruction. The +3 is **illustrative only**.

## Implementation

- `src/animation-lab/chiralWave.ts`: deterministic clip polygon generator, with asymmetric **smooth** wave fronts and clamped progress. No frame randomness. Unit tests in `chiralWave.test.ts`.
- `src/animation-lab/chiral.css`: solid color layers, dense opposing gradients, a center seam, engraved diamond, light sheet and broad wave on stone.
- `src/animation-lab/AnimationLab.tsx`: two independently playable GSAP timelines, preserving the existing v1 Lab and original printed CardFace implementation.
- `scripts/animation-lab-smoke.mjs`: automated Chromium playback checks **nine** independent experiments. Existing engine tests and a production build remain required.
- `.github/workflows/animation-lab-v2-preview.yml`: publishes under `animation-lab-v2/` only and leaves `animation-lab-v1/`, `board-motion-v1/` and current gameplay intact.
- The new demos do not call `fx.burst`, `fx.arc` or `fx.ring`; PixiJS remains available for legacy studies but is not the visual foundation of the new ones.

## Art direction and decisions to review

Use the same real card across the two treatments. Begin with the **Dorado** treatment, which has an aged-gold vs deep crimson opposition. Try **Arcano** afterward (teal vs deep blue); these are **experimental palettes**, not confirmed faction identities.

Compare:
- Is the buildup readable and restrained before the bold color collision?
- Does the center seam and diamond feel like Daggerlight, not a generic magic spell?
- Is the amount of color fill too opaque, or just enough to transform the material?
- Does the broad stone wave feel physically integrated, or does it need a more three-dimensional material response?
- Is disappearing into a line convincing for Archive, or should this remain a distinct discard/special transition?
- Is the Power activation more compelling because the original card reappears?

The effects remain intentionally simplified prototypes; the broad wave currently uses CSS/GSAP masks and gradients, not texture-based WebGL shaders. The next iteration could move the approved fill to a custom shader with physical refraction and high-quality lighting. **Do not connect effects to engine events until the visual language is selected.**

## Accessibility and scope

- Desktop-first. Mobile visual layout is deferred by request.
- Manually triggered animation; reduced motion respected unless a tester explicitly opts into motion.
- No game-state changes, save changes, card rule changes, or Manifestation changes.
