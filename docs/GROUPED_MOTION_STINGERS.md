# Daggerlight — Grouped Motion Integration (270 / 640 / 800 ms)

**Working branch:** `feature/round-archive-shadow-sweep-v3` (continue refining this branch; no new feature branches)  
**Same Pages preview:** https://marianotripelhorn-ux.github.io/tcg-prototype/round-shadow-sweep-v3/

## Reference language

The three designs specified in **“Improve game visual design”** are implemented with the requested visual vocabulary:

- **Curved stinger wipe:** a single matte-black, broadly curved surface traveling left to right. It hides the previous round, holds its next-round number while fully covering the field, and slides out to show the next real board and hand.
- **Zenless Zone Zero grouped panel choreography:** the text is part of the same DOM element as its moving surface, never a separately animated overlay. Entry, elastic settle, and decisive exit are defined as one motion.
- **Daggerlight lane ribbon:** the actual center-lane notched silhouette is echoed in one black result ribbon, white numerals and white outcome type.

There are no particle systems, spark trails, or decorative animation emitters in these three effects.

## Motion contract

| Event (actual engine source) | Duration | Visual | Transition |
| --- | ---: | --- | --- |
| Player card committed via `submitPlayerPlay` | **270 ms** | Real card travels from measured hand rect to the committed player's lane; its down-right matte shadow stretches at lift and tightens at landing | `flight` → `duel` |
| Engine-resolved duel `result` beat | **640 ms** | Single notched ribbon holds the two authentic `finalPower` values and `outcome` in the same grouped surface; white-on-matte-black typography | `result` → `settle` (after ribbon fully exits) |
| A completed round's cards finish flying into real Archives | **800 ms** | One broad-curved matte-black wipe covers the **entire ivory arena**, including the hand and score. After the 298ms cover WAAPI animation actually finishes, the actual already-committed new game round replaces the visible old board underneath. `RONDA N` is centered white Archivo Black and moves with the shape; wipe continues right and clears after an 86ms covered hold and 407ms exit (~791ms total) | `archive` → `round-wipe` → `round-wipe-reveal` → idle |

The next-round reveal is **presentation-only**: there is no new deal, random decision, scoring rule, Archive calculation or card draw in this code. The real next hand and Archives were already determined by the engine. A truly finished match retains its original final-ceremony path rather than advertising a round that cannot start.

## What stays untouched

- `src/engine/` rules, outcomes, cards, abilities, Save, AI, Life and scoring
- The established ivory board image and geometries, mobile arena structure and faction-art Champion banners
- Original `Quiero / No quiero` choice sequence and restored hanging faction banner
- Real played-card → correct-side/correct-lane Archive flight, including unused hand discard
- Responsive UI controls, deck, Archives, score, sound, reduced-motion preference and match outcome ceremony

## Accessibility and reduced motion

The resulting Power and outcome are announced with a grouped `role=status` label. The new-round number is an accessible `role=status`, not decorative-only lettering. Under `prefers-reduced-motion:reduce`, card flight is skipped, CSS stinger movement is suppressed and board cover/swap completes quickly without blocking input or changing the engine's sequence.

## Validation

- Vitest: `stingerMotion.test.tsx` (engine-owned Power/result, grouped surfaces, old-state hold and real new-state reveal)
- `npm test`; TypeScript/Vite production via `npm run build`
- `scripts/stinger-motion-smoke.mjs`: **two actual AI matches**, desktop 1600×900 and phone 390×844. Plays real hand cards through the existing inspection and placement controls. Captures the 270ms flight's hand-origin and linked shadow, both final Power values and outcome in one 640ms ribbon, and the full-field 800ms round wipe. Checks that the DOM surface persists across the real mid-cover board+hand swap, and that Archive and Quiero phases remain reachable.
- Existing GitHub Actions publishes from the **same branch** to the **same preview URL**, only after passing validation.

## Visual QA notes

Watch for the 270ms card landing in a tiny or heavily stacked lane; the 640ms result's legibility at narrow widths; the curved wipe's connected edge and uninterrupted 800ms passage over the whole board including the old and new hand. The overlay is one surface: do not split its round number into a separate moving graphic. An animation-finished callback controls the actual board swap so dropped frames cannot reveal new cards before full cover.
