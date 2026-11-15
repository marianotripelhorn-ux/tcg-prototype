# Daggerlight Animation Laboratory v4.1 — Engraved linework

**Branch:** `feature/animation-lab-v4-1` from the tested v4 laboratory.  
**Preview URL:** https://marianotripelhorn-ux.github.io/tcg-prototype/animation-lab-v4-1/?lab=animations  
**Change scope:** the first three isolated Power and damage visual studies only. No match integration, rules-engine changes, card-art edits, Manifestation changes, or mobile redesign.

## Approved refinement

Feedback: the invented diamond/star emblems are not part of the game's identity. Use *thin circular and semicircular lines* already consistent with the engraved ivory board. The fill and wave treatment should become **moderately less transparent**, not solidly opaque.

### What changed

- `src/animation-lab/AnimationLab.tsx`: removed the v4 center glyph from the Power gain/loss and damage studies. It has been replaced with a group of three concentric, **incomplete circular traces**. These rotate and contract/expand with the existing timelines. Champion impact adds two similarly restrained arcs around the Life crown.
- `src/animation-lab/v4-motion.css`: builds the arcs from fine 1–1.2 px outlines, not an icon, letter, star, diamond, or new worldbuilding symbol. Arc colors derive from the approved antique gold/ink-black polarity.
- Fill opacity under the normal intensity control moved from `min(.9,.63+intensity*.13)` to `min(.95,.71+intensity*.13)`; at the default intensity of 1.15 this is approximately **0.78 → 0.86**, a modest eight-point absolute increase.
- The front wave moved from 0.73 to 0.81 opacity; black Champion damage wash from 0.77 to 0.85; the stone resonance increased by four points. These are careful changes so the original printed art remains legible.
- `scripts/animation-lab-smoke.mjs`: retains the 13-effect Chromium playback test and now asserts that the invented emblem class is absent and that the new arc geometry exists.

### Motion language

**Ascenso de Poder:** gold fills the card; open circular arcs expand as Power rises.  
**Pérdida de Poder:** near-black ink moves over the card; arcs tighten and recede as Power falls.  
**Herida del Campeón:** ink-black wave travels to the crown; two thin partial rings indicate physical impact.

**Unchanged:** duration, Power and Life demo values, original Daggerlight cards, old experiments for comparison, and the actual playable game.

### Visual QA focus

Check that the rings read as *engraved traces*, not fantasy spell glyphs, especially at the peak of the black effect. Verify the gold and black waves have additional weight while the artwork remains recognizable. The final art-direction decision should be made from the interactive preview, not from passing automated tests alone.
