# Difficulty and new-adventure choices — epic #213

Implementation order: rules #281, saves #282, difficulty UI #283, map-size choices #279, matched verification #284. Work is on `codex/difficulty-and-adventure-choices`, one tested initial commit per story. Earlier monster eligibility is separate Backlog #291.

## Rules and ownership — #281

`GameState.difficulty` owns the immutable runtime multiplier. New state defaults to Normal (1) and validates the supported values 0.75/1/1.25. `Difficulty.ts` owns validation and round-to-nearest, minimum-one scaling; `MonsterStats.ts` exposes actual maximum health and physical damage-range endpoints for future creature displays. Baseline catalogs and seed streams remain unchanged.

Fresh ordinary and optional-elite health scales after content placement; this retains identity, positions, loot and object generation. Return encounter health uses the same maximum-health helper. Enemy healing/regeneration use scaled caps, while recovery amounts and cadence remain unchanged.

Physical melee, ranged and charge attacks roll in their original range/stream, scale the landed raw result, then apply player armor. Misses remain zero and landed minimum-damage rules remain unchanged. Enemy spells and area attacks already bypass physical armor: they scale raw damage while retaining that behavior. Player damage, accuracy, enemy defenses, ongoing conditions, environmental damage, rewards/density and mana recovery are untouched.

The gameplay field is not exposed through UI yet. Current v19 restoration explicitly uses Normal; non-normal saved continuation is the next story, before any non-normal UI control becomes available.

Behavior tests failed first, then passed. Focused rules/physical/spell/area/charge/current-save coverage passes 6 files / 49 tests. Complete frontend formatting, tests and TypeScript/production build run through the standard commit hook.

## Saved continuation — #282

Save v20 explicitly adds difficulty to saved run configuration. Runtime difficulty is derived from that field during restoration, and the writer uses the active GameState value rather than a draft or mismatched configuration argument. V1–v19 migrations force Normal; unknown legacy difficulty metadata cannot select a non-normal run. Historical shape guards/fixtures remain unchanged, and the v1 configuration type now explicitly selects its seven historical fields so future runtime fields cannot silently broaden it.

Source-version actor validation uses the corresponding scaled cap only in v20. Wounded actors, removed kills/rewards, enchants, resources, actual geometry and prepared state remain authoritative. Missing/unsupported difficulty and easier actors above their scaled limit are rejected before restoration. Player death is retained as before; defeated monsters remain removed rather than becoming zero-health saved actors.

The new continuation tests failed first; current/legacy migration and validation coverage passes 6 files / 180 tests. The all-source dispatch table now includes 20 formats. Existing current-version assertions were updated without regenerating legacy fixtures.

## Difficulty interface — #283

A shared native-radio choice group appears on the welcome form and Settings. Settings retains the next-run draft until explicit application; current difficulty is separately shown there and in PlayerStatus. Generation receives only terrain configuration, while state creation receives the validated difficulty. Replay/random restart use the active applied configuration; restoring a save uses its canonical difficulty.

App now prepares a complete adventure with the same session factory before transitioning from the welcome dialog. Failed first-start generation preserves the selection/dialog and provides retry feedback. Home continues owning modal and map-focus lifecycle. The factory does not create the adventure a second time when Home mounts.

Observed creature information derives scaled maximum health and physical/blast/spell damage ranges. The developer catalog identifies its Normal baseline. Save summaries include the active difficulty. Native controls support keyboard selection; active map focus and G feedback were verified in the browser after a Settings restart. The welcome and Settings layout fit the 1280×720 browser viewport.

The four UI regressions failed first, then passed; focused opening/configuration/error/focus coverage passes 5 files / 50 tests. The standard full hook remains required for the story commit.

## Welcome map sizes — #279

The welcome form now offers dimension-only Small (20×20), Medium (40×40), and Large (60×60) presets. Large remains the default; floor count and difficulty are independent. A rectangular custom configuration is not mislabeled as a preset. The selected dimensions and floor count appear below the actions, and Settings retains custom sizing.

Five behavioral tests failed before implementation and now pass, including native keyboard selection and the actual configuration passed into generation. Focused opening coverage passes 4 files / 14 tests. The dark welcome dialog fits a 1280×720 viewport without internal scrolling (684px client/scroll height).

## Matched verification — #284

The generation regressions cover compact (20×20×5) and reference (60×60×20) runs, actor identity/placement, every catalog kind’s health and physical range, and return encounters. Two page regressions import Easier/Harder saves, use G/H immediately, retain custom 15×15 dimensions in Settings, restart the saved seed and use Space without selecting the map. These verification tests pass against the preceding implementation; this story introduces no additional gameplay tuning.

Run `node scripts/review-difficulty.mjs` from `frontend`; optional positional seeds replace the default 0, 1, 123, 987. The audit passed **24 matched generated adventures and 24 played save/turn continuations**, including **15 distinct optional elite actors**. It compares all state other than difficulty and monster health against a detached baseline, checks physical range rounding and floor-1 return actors, then wounds/kills actors through domain rules and resumes a v20 save across turn 29→30. Absent optional stair properties are normalized at the JSON boundary for comparison; no game data is regenerated to restore it.

| Seed 123 configuration | Monsters | Easier total initial HP | Normal HP | Harder HP |
| --- | ---: | ---: | ---: | ---: |
| 20×20×5 | 23 | 96 | 123 | 156 |
| 60×60×20 | 246 | 3,001 | 3,953 | 4,980 |

Geometry, ordinary/elite identities, objects, item opportunities, initial player resources and rewards stayed equal across modes. Integer rounding means a population’s effective health ratio is not exactly the multiplier. Existing physical, spell, area, charge and regeneration tests verify attack behavior; the audit does not claim to simulate fights across a whole adventure, every return floor, merchant decisions or human wins. Human Normal/Harder playtesting should evaluate meaningful supplies, counterplay and late-game/return pressure before changing more variables.

Browser checks at 1280×720 verified dark/light welcome dialogs (684px client and scroll height), default Large/Normal, selected Small/Harder startup, Settings drafts, custom-sized restart and Harder v20 import. G picked up the potion and H healed without another map click. After the Settings closing transition, focus returned to the map and Space committed a turn. The original Dark theme was restored; the browser save slot was not overwritten.

Five-story commits are ready for developer review. Earlier monster eligibility remains separate Backlog #291; CI/browser automation #277 and corridor travel #285 have not been implemented here.
