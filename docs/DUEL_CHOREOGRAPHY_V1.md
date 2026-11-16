# Daggerlight — Duel Choreography v1

**Branch:** feature/duel-choreography-v1
**Base:** feature/board-animation-refinement-v3 (React Board v3)
**Isolated preview:** https://marianotripelhorn-ux.github.io/tcg-prototype/duel-choreography-v1/

## Goal
Make every real duel a single composition rather than independent animations. Preserve the original React card faces and game rules; the actual DuelSummary, final Power values, Life and EnginePlay notes remain the only sources of truth.

## Presentation timeline
| At | Beat | Display |
| --- | --- | --- |
| 0 ms | Approach | Both printed card faces lift from measured board positions and meet |
| 930 ms | Player Power | Reveal player final Power and the engine's modifier notes |
| 1240 ms | Rival Power | Reveal rival final Power and the engine's modifier notes |
| 1730 ms | Compare | Quiet hold of both real final Power values |
| 2070 ms | Impact | Controlled winner rise and loser recoil; no invented winner for draws |
| 2420 ms | Result | VICTORIA, DERROTA or EMPATE appears; real Champion Life updates |
| 3700 ms | Continue | In-round cards settle or move to Archive and new hand |

The physical card landing sound is cued at the existing animation's real landing-completion callback.

## Sound
Original low-key Web Audio synthesis: parchment/metal landing, quiet rise, gold resonances for increased Power, graphite resonance for reductions, a restrained impact, and separate victory/defeat/draw signatures. No recorded audio, downloads, or music. Sound unlocks only on a user gesture. SONIDO ON/OFF is persisted in browser localStorage, and mute changes take effect during an active duel. A blocked audio device never blocks gameplay.

## Feedback and accessibility
- Ability explanation uses EnginePlay.notes directly. Three explanations are shown; the additional-note count remains visible, and the source notes are accessible in the tooltip/inspection.
- Failed Augurio is displayed without a fabricated Power bonus.
- The existing classic board is unchanged.
- Skip-to-result and end-of-duel timers are centrally canceled on navigation, restart or skip.
- Reduced-motion mode immediately advances to a readable final result without unnecessary movements.
- Cards, Champion illustration, Gold & Shadow material language, and board structure are preserved.

## Automated verification
- npm test (including duelChoreography.test.ts)
- npm run build (TypeScript and Vite)
- scripts/duel-choreography-smoke.mjs (real headless AI duel, autonomous result, Power, audio control, and legacy geometry)
- The isolated workflow publishes only the duel-choreography-v1 folder to main; older previews and the playable game are not overwritten.

## Further manual QA
Inspect several factions and Champions; losses, victories and draws; zero-delta effects, Augurio success/failure, Champion healing, Quiero/No quiero, third duels, full-match endings, Archive transitions, mobile sizes and actual sound levels before promoting this preview to the primary board.
