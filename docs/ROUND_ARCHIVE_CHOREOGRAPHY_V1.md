# Daggerlight — Round & Archive Choreography v1

**Branch:** `feature/round-archive-choreography-v1`  
**Base:** `feature/duel-presentation-v1-1` (React Board v3)  
**Playable isolated preview:** https://marianotripelhorn-ux.github.io/tcg-prototype/round-archive-v1/

## Intent

A duel, the conclusion of the round, movement of its played cards into their **actual** Archives, and dealing the next hand must read as a single physical interaction. This pass preserves the approved Gold & Shadow visual grammar, the original React cards, the same Champion artwork, all engine rules, AI, persistence, card data and previously published previews.

## Duel feedback refinements

- Background focus increases from the subtle v1.1 treatment to a clear but still restrained central vignette (about 26% central / 44% edge shadow), with 3.2px backdrop blur.
- The redundant visible `DUELO N · RESOLUCIÓN DE PODER / PODER FINAL` heading is removed. The genuine outcome title (`VICTORIA / DERROTA / EMPATE`), numeric Power plates, and valuable outer-side ability explanations remain.
- Physical card convergence extends to 1,180 ms. The complete seven-beat duel timeline now runs for 5,290 ms (previously 3,880 ms), allowing more separation between Power explanations, comparison, impact, result and return.
- Sound is **unchanged**; there are no additional samples, music tracks or sound controls.

### Duel beat timings

| Relative time | Beat |
| --- | --- |
| 0 ms | Two original cards rise from their real board slots |
| 1320 ms | Player Power and actual rule notes resolve |
| 1890 ms | Rival Power and actual rule notes resolve |
| 2500 ms | Final Power values held for comparison |
| 2960 ms | Restrained true-outcome impact |
| 3380 ms | Outcome title and real Champion Life update |
| 4720–5290 ms | Cards travel back to their board positions; only then does the round transition start |

## Round-end choreography

The additional sequence runs only when the **engine has actually closed a round**, by completing its third duel or following a real `No quiero` decision.

1. **Round result (1,450 ms):** shows the exact `RoundSummary` score from `GameState.rounds`, with a clear player/rival outcome and actual `No quiero` reason when applicable. The last resolved cards remain physically on the board.
2. **Archive flight (approximately 1.2–1.9 seconds):** real React played cards move to their own side and position counters, staged in an opponent-then-player wave, across Siniestra, Trono and Diestra. Destination gold rings respond near actual arrival, not when the flight starts.
3. **Archive confirmation (840 ms):** the previous round's played cards leave the board, then real post-round Archive counts are shown. Only counters whose signed totals actually changed receive an animated emphasis. This correctly accommodates effects which *clear* Archives.
4. **Next deal (940 ms per card, staggered):** the next genuine engine-drawn hand flies from the physical deck before input is restored. Unused old hand cards dissolve into the discard shadow rather than flying into the Archive or back into the deck.

Both deck quantities and round score/number remain aligned with the correct authoritative game snapshot during each stage, preventing next-round data from appearing while old cards are still travelling.

## Design and rules constraints

- No change to `src/engine/`, factions, Champions, powers, card definitions, Archive contents, RNG, game outcomes, save format or AI.
- Reduced-motion access shortens the round and Archive confirmation, skips WAAPI travel, preserves full state progression and never blocks play.
- Transition hooks clean up on unmount, skip, navigation, restart or gameplay phase changes.
- The v1.1 side explanations and source-linked Champion/position/Archive highlights remain intact.
- No added VS lettering, large card plaques, extra particles or duel headings.

## Tests

- `npm test` includes `roundChoreography.test.ts`: authoritative RoundSummary, genuine Archive changes including negative deltas, no ceremony from invalid round state.
- `npm run build` checks TypeScript and Vite production.
- `scripts/round-archive-v1-smoke.mjs` drives a real headless Chromium AI match through normal hand selection and placement, first-duel effects, round closing, played-card Archive flight, changed counters, genuine new deal and return to idle.
- GitHub Actions publishes only `main/round-archive-v1/`; existing public client and separate V1/V1.1 previews are not replaced.

## Manual visual review

Check fast Quiero/No quiero flow, two-duel early round closure, full third duel, Archive counter alignment under multiple stacked cards, every faction and Champion, Archive clearing / Archive-count based abilities, lower desktop heights, and mobile or reduced-motion appearance. This draft preview is intentionally **not promoted** to the main playable game.
