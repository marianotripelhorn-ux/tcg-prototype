# DAGGERLIGHT — Board Redesign v1
**Status:** Step 1 implemented on the experimental branch (14 November 2026). Existing rules and classic comparison view preserved; premium timeline/archive animations remain Step 2. Build and tests verified by GitHub Actions.
**Branch:** prototype/board-redesign-v1 (based on prototype/gameplay-v1)
**Reference:** User-supplied ROUGH BOARD REDESIGN.png, 14 November 2026; Daggerlight Game Design Bible v0.3 (2 November 2026); docs/IDENTIDAD_VISUAL.md; current React and prior Phaser prototypes.
**Purpose:** A faithful, higher-quality and tactile reinterpretation of the supplied layout, not an alternative board design.

## 1. Locked direction

**Materials:** Pale aged ivory/limestone battlefield inset into a dark charcoal ceremonial-stone surround, connected by subtle bevels, engraved metallic seams, dark textile banners and occasional antique gold hardware. Keep the original contrast of the black position ribbon. Preserve neutral structural colors (ivory, black, gold); faction colors live mainly in cards and Champion banners.

**Look:** Precision and physicality over magical glow. Atmospheric raking light, low-relief concentric engravings and minimal fine surface wear. Material complexity must never obscure card images or positional information. Material artwork is replaceable without changing layout or gameplay.

**Typography:** Keep the Daggerlight wordmark, bold uppercase position labels and existing card typography. Use consistently sized legible utility labels, restrained outlines and high-contrast numbers.

**Nonnegotiable:** Do not redraw/replace existing printed card faces. Reuse CardFace, existing card sprite sheets, Champion portrait assets, card inspection, legal-play indicators and special-card interfaces until replacements have equivalent behavior.

## 2. Layout contract — desktop landscape

The 1648 × 893 reference is the compositional guide, NOT a fixed-pixel canvas. Use fluid normalized anchors and a logical 16:9 stage.

- **Top bar:** Full-width near-black header, Daggerlight wordmark on the left, RONDA / DUELO prominently centered, utilities right. Score is not duplicated unnecessarily.
- **Left sidebar:** Narrow, independently lit column. Enemy Champion compact at the upper left; the player's Champion/banner open by default below, showing player name, full Champion name, faction and exact current ability description. The banner is a layered fabric or enamel panel, not a generic browser accordion. Existing champion art and background assets remain in use.
- **Central field:** Large pale engraved stone disk, centered approximately behind the three positions. The circular engraving is a visual guide, not a separate rules system. Three positions and two teams remain clearly distinguished. Upper semicircle = rival's cards; lower semicircle = player's cards.
- **Central axis:** ONE continuous black heraldic ribbon labeled SINIESTRA / TRONO / DIESTRA in the existing order, with consistent visual column alignment. This is a static navigational/positional object, not three independent duel tracks.
- **Right field edge:** Two prominent, contrasting Champion life crests/crowns (rival upper, player lower), separated by a score pennant (e.g., 1–0). Preserve the silhouette and object placement of the rough board. Make scorer orientation unambiguous.
- **Deck:** Physical deck/card-back object toward the lower right, with real remaining-deck count available on hover/click. Art is temporary; display no mechanics or counts that the engine cannot support.
- **Bottom rail:** Black or very dark stone command rail integrated with the three-card hand. The rail must be functional, visually quiet and should not consume a large fraction of the playing surface.

At 16:9, preserve these relations before optimizing decorative detail: LEFT CHAMPIONS | CENTERED THREE-POSITION BOARD | RIGHT LIFE/SCORE/DECK | HEADER ABOVE | HAND/COMMAND BELOW. Avoid the existing gameplay-v1 layout's visibly boxed three-lane appearance; position hit zones may be invisible until interactive.

**Important draft correction:** The original screenshot partly clips the bottom hand. The usable redesign must ensure all cards can be selected/inspected without obstruction; when cards rise they may overlay the board but must not move the board, displace the central axis or obscure the active drop targets during dragging.

## 3. Champion banner interaction

Default state: player's panel OPEN, opponent's panel COMPACT. Compact panel displays portrait and identity; expanded panel displays the username/side label, full Champion name and ability text.

- Desktop pointer hover/focus over opponent => opponent banner unfolds; player banner folds into a compact rectangle. Leaving the enemy returns to default, unless the user has deliberately pinned it.
- Desktop hover/focus over player => player open, opponent compact.
- Touch => tap portrait toggles which Champion is expanded. Keyboard => focus and Enter/Space expose the same information. Screen reader state must be announced.
- Animation target: 280–420 ms, material-appropriate easing. The panel should seem to unfold using layered masks, texture shifts and shadow movement; its text should become readable rather than geometrically squish during the transition.
- Maintain fixed overall sidebar allocation so expanding one panel does not resize/reflow the battlefield.
- Do not hide a Champion's ability permanently behind hover-only access.
- Champion Vida stays authoritative in the right-side life crest; optionally show a non-duplicative label in expanded banner for accessibility.

## 4. Card representation and inspection

**Hand:** Show all three full card faces, respecting the current 63/88 artwork ratio and Card Studio layout. On precise-pointer hover, lift and enlarge the hovered card to a naturally readable size (target 320–400 CSS px wide when available), raise z-index and shadow, and slightly separate adjacent cards if needed. No battlefield reflow; use an overlay or shared-element presentation. Never enlarge the card into a clipped parent. Click/tap => existing inspect modal, with Select action where supported. Keyboard focus => same read-sized preview; Escape closes inspection. Pointer drag remains available and shows only legal targets.

**Field:** The active-duel card is full-color and clearly foregrounded. Other cards played in the current round are smaller and desaturated, like the example horizontal gray prior-duel card in the supplied draft, but remain inspectable and retain enough silhouette/Power information to recognize them. For multiple cards in a position, stack without losing access to individual cards. The current duel compares the two played cards independent of position: no lane-versus-lane combat illusion.

**Pending response:** The first player's played card and location remain fully legible to the responder; when current Power depends on a hidden response, show pending/unknown instead of inventing a number. Do not reveal hidden hand contents.

**Specials:** Existing Dagger, Shield, Relic and Symmetry interactions must remain usable, inspectable and distinct from normal cards.

**Archives:** Each player has three position-specific Archives. The numbers beside slots must express current-round occupied/capacity AND persistent Archive count, with meaning available by hover/tap/accessibility label. Archives are public count data for ordinary mechanics; special archive interactions already supported by the engine must remain actionable.

## 5. Premium physical motion language

Movement should look like tabletop objects moving through space:
- **Lift:** subtle elevation + shadow separation + small perspective shift, NEVER blur the printed card text.
- **Place:** interpolate hand card into target position; shallow rotation, 1–2 small settle motions, contact shadow and short rim highlight. Target 300–450 ms.
- **Power up/down:** numeric power rolls/settles to actual calculated value; distinct restrained warm-gold rise vs cooler/muted fall. A change from printed Power is a gameplay signal, not a permanent neon aura.
- **Activated/inactive abilities:** visible, readable state from engine notes; a conditional effect that sets up a future bonus must not be falsely portrayed as failed.
- **Win/loss/draw:** winning active card catches light and lifts; losing active card recoils/dims; draws use a symmetric, non-punitive pulse. Brief 500–800 ms highlight. Preserve existing inspectability and allow skip.
- **Damage/heal:** life crest physically reacts, old numeral transitions to new numeral at the correct moment, and outcome is unmistakable. Healing must have its own readable visual language. Target 300–500 ms.
- **Archive:** ONLY at END OF ROUND, not after every duel. Each played card travels toward its own side+position Archive, then appears to sink below the playing surface. Corresponding count increments upon arrival; one unused hand card moves face down to discard. Target 500–900 ms for the sequence. Archives keep counts across rounds. Animate a metaphorical downward sinking even when the opponent's Archive is visually above the central axis.
- **Deal:** New hand enters from deck after Archive transition. Keep the original hand of three cards and do not invent a resource/mana animation.
- **Quiero/No quiero:** decision integrates with command rail; the third duel begins only when the actual rules demand it.

Numbers are planning targets, not approved fixed timings. Support Skip, reduced motion, and coherent immediate state when resuming a saved game.

## 6. Presentation architecture (engine stays authoritative)

Engine authority: src/engine/game.ts, src/engine/rules.ts, src/engine/state.ts, src/engine/champions.ts, src/engine/decks.ts, src/engine/presentation.ts. Do not change mechanics, AI strategy, card effects, legal positions, persistence schema or deck composition for visual work.

Current difficulty: src/App.tsx clones and resolves the GameState before committing the new state. endRound archives the current round's plays, discards unplayed hand cards, resets scores and deals the next hand synchronously. Existing duel presentation has a snapshot for life/score and timed overlays, but not a complete animated transition for position-specific cards to Archives.

Proposed decoupling:
1. Before any submitted action, take an immutable **visual before** snapshot (round, duel, hand, both sides' roundPlays, Archives, life, score, pending play and phase).
2. Let the existing engine produce the **authoritative after** GameState exactly as today. Persist it on the current schedule; never defer game correctness for animation.
3. A dedicated **presentation coordinator** reads before + after + lastDuel/engine events and builds a queue of purely visual beats: played-card placement, Power resolution, result, life/healing, end-of-round archiving, hand deal, ceremony.
4. Render **presentation state**, not just the newly mutated GameState, until a beat has finished. Input is explicitly gated while irreversible moves are on screen. Explicit skip/reduced-motion always moves to the same authoritative after-state, with no repeated engine calls.
5. Animation movement must identify each play by a stable visual instance ID (round + side + duel index or created presentation ID). Do not rely only on card.id: the deck contains two copies of each design, and duplicate cards may occur in one zone.
6. A saved/reloaded game resumes in the consistent authoritative state without replaying transient cinematics; route transitions, unmount and tab visibility changes must cleanly stop/complete animations.
7. Avoid depending on text-log parsing as the only motion trigger; distinguish clearly between game events, presentation outcomes and game effects.

Keep the gameplay client intact. Provisional implementation location:
- src/board-redesign/BoardScreen.tsx (new screen shell; opt-in route/flag, not replacing the current game by default)
- src/board-redesign/components/ChampionBanner.tsx
- src/board-redesign/components/BoardCard.tsx
- src/board-redesign/components/HandDock.tsx
- src/board-redesign/components/ArchiveSlot.tsx
- src/board-redesign/components/LifeCrest.tsx
- src/board-redesign/components/CommandRail.tsx
- src/board-redesign/presentation.ts (visual snapshots + queue, NOT game logic)
- src/board-redesign/board.css and tokens.css (scoped stylesheet; no new pile of arena-v2 override rules)
- src/board-redesign/*.test.ts(x) for deterministic presentation and interactions

Component names are proposals, not implemented files. Reuse existing CardFace/ManifestCard behavior from App.tsx by extracting only the necessary presentation components without changing their printed-card design.

## 7. Command rail — baseline functional design

A shallow black/charcoal bar and hand dock that presents **one priority action** at a time:
1. Immediate contextual prompt: respond, select a position, Quiero / No quiero, special-card target, or duel result.
2. Real game-status access: archive summary and round history/log (expand on demand; do not present three contradictory archive counters).
3. Short controls: inspect deck count, help, settings, skip animation, exit.
4. Three-card hand visually integrated above/within the rail; specials remain visible in a separate, clear tray when present.

A permanent giant data dashboard would compete with the cards and is out of scope. Keep the bar useful without sacrificing the 16:9 layout.

## 8. Materials and assets

Color starting point (subject to visual iteration; reuse established palette where possible):
- pale inset stone ~ #d9d6c8 with fine warm/cool wear;
- dark rim ~ #1f201f or #252420;
- deepest black #191919;
- ivory text #eae2d5;
- antique gold #d3b787 with less saturated engraved shadow.

Use SVG for precision rings, geometric inlays and ribbon silhouettes; tiled high-resolution compressed WebP/AVIF for physical material texture; CSS highlights/shadows for object depth. Keep existing public/cards and public/champions references. Original card sprites must remain sharp at inspection scale; do not upscale a thumbnail where a full-resolution art sheet is available.

The original draft's deck/card-back, stone textures and physically folded banner are assets to refine, NOT established canon artwork. Keep placeholders clearly replaceable.

Target desktop high-density displays with appropriately sized assets; avoid large always-running filters or blur layers. Animate transform/opacity preferentially; protect legibility at 100% browser zoom. Aim for smooth 60 fps on contemporary desktop hardware, responsive fallback on less capable/mobile devices; measure rather than assume.

## 9. Responsive and accessibility contract

- **Wide desktop:** faithful source composition with a visible hand and no cropping.
- **Laptop / 16:10 / shorter viewport:** preserve axis and card hit targets; reduce peripheral ornament first.
- **Tablet landscape:** compact side panel, movable inspection overlay, target-sized legal slots.
- **Portrait mobile:** preserve gameplay order but rearrange peripheral hardware into compact Champion selectors and life counters; never compress six large cards into illegible columns. Tap-to-select and tap-to-position work without hovering.
- All interactive objects are real buttons/controls with focus states and accessible names.
- Full information is available by click/tap/keyboard, not only hover. Offer reduced-motion mode and meaningful contrast independent of color.

## 10. Exact regression boundary

Maintain existing:
- 9 starting Vida per Champion; damage 1 per won duel, none on draw;
- 3 sequential duels max per round, 3 cards per hand, player/opponent can play in different positions in the SAME duel;
- base capacity one card per position, expanded only where Champion effects permit;
- Quiero / No quiero resolution after 2–0, no extra round-win point;
- position-specific Archives increase only at round end; discard of unused hand;
- two-copy 24-card monofaction and multifaction lab deck formats;
- all nine Champions, five factions, Augurio v2, four special manifestations, current UI inspection and AI levels;
- persistence, continuation and existing match history/Arcade flows.

Special situations to exercise: Majestad Dextral second Diestra slot, Athos third slot, Vinira out-of-affinity, Desartes tied Archive capacities, Priorato matching and failing Augurio, Prioresa healing, Archive clearing, in-duel Power unknown, long Champion names, dual identical cards, active shield/relic, Simetría copy, player defeated before round end, Quiero and No quiero, draw, saved-game reload during match and route navigation mid-animation.

## 11. Delivery steps and acceptance gates

**0 — Specification (this commit).** Direction, layout, mechanics and animation contract frozen enough to build; no gameplay changes.

**1 — Interactive composition.** Implement opt-in board shell with existing cards, Champions and live engine state. Sidebar swapping, correct life placement, black unified position ribbon, readable counters, working drag and inspection, functional command rail. Capture visual comparison against the supplied draft in 16:9 and typical laptop resolutions.

**2 — Object animation.** Add motion library only if needed (Motion for React is first preference; GSAP only if choreography warrants it). Coordinator, hand placement, hover/inspection, inactive current-round cards, Power/outcome/Vida feedback, Archive/deal transitions and skip.

**3 — Art finish.** High-resolution material tiles, banner masks and hardware details, deck-back replacement, controlled light, optional sounds, mobile treatment. All artwork approved against the original draft's identity.

**4 — Verification.** Existing tests/build remain green; run added presentation unit tests, real browser interaction and screenshot checks. Evaluate contrast, frame pacing, overflow, legal targeting and all Champions. Do not merge or make default until explicitly approved.

### First playable-slice acceptance criteria
- Layout obviously reads as the user's reference composition, not as the old three-box arena.
- User and enemy banner behavior works with mouse, touch and keyboard.
- Existing Card Studio card face remains unchanged, readable on hover and in inspection.
- Existing engine remains source of truth; 3-position gameplay, additional capacities and specials remain legal.
- Score, life, Archive and capacity labels are correct, legible and not conflated.
- Hand/deck/Archive are actual interactive components rather than painted elements.
- No undesired horizontal scroll, clipped hover card or blocked drop target at 16:9 or laptop aspect ratios.

## 12. Pending art decisions (non-blocking)

1. Exact pale/dark seam profile and ring-engraving motif.
2. Final Champion banner fabrication: heavy embroidered fabric vs more rigid layered leather/fabric.
3. Final deck-back illustration and card sleeve material.
4. Audio palette and how strongly the environment reacts to faction-specific abilities.
5. Whether Archive wells appear as three small physical pockets per side or as counters set into the stone. Both must map to the actual six independent Archives.

None of these decisions requires modifying rules or stopping the first faithful layout build.


## Step 1 implementation log — 14 November 2026

- New component: `src/board-redesign/HybridBoardHardware.tsx` (interactive reciprocal Champion panels, life crests, real-data deck, Archive and history rail, scalable engraving).
- New CSS skin: `src/board-redesign/board.css` (hybrid pale/dark materials, three-position ribbon, card/slot/hand positioning, desktop and mobile layouts).
- New editable vector ornament: `public/board/hybrid-engraving.svg` (resolution-independent circular engraving; final physical material texture remains art polish).
- `src/App.tsx` shows hybrid board by default on **this experimental branch**, with a `CLÁSICO` comparison toggle or the `?board=classic` URL parameter; the original live React gameplay branch is unchanged.
- Integration uses the existing `src/engine` state and action handlers, including card inspection, legal play, abilities, specials and Quiero / No quiero. No changes to game mechanics or saved-game schema.
- Test: `src/board-redesign/HybridBoardHardware.test.tsx` ensures the hardware reads engine state and does not mutate it.
- Preview workflow: `.github/workflows/board-redesign-v1-preview.yml` validates engine tests, builds the React client and publishes a **separate** `board-redesign-v1/` GitHub Pages path; it does not overwrite the gameplay-v1 build.
- **Not implemented as Step 1:** animated card travel into Archives, high-end material assets, full presentation-state timeline, faction-specific particle choreography. They are covered by Step 2/3 above.
- **Visual QA caveat:** automated build and data tests pass, but final visual screenshot comparison, touch testing on real devices and performance profiling remain to be done as part of visual sign-off.
