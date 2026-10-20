# Distinct enemy tactics: review guide

Epic #146, branch `codex/enemy-tactics`. Implement stories one commit at a time and pause for developer review. Stories #147–153 are implemented for review. Agent diagnostics/browser checks are complete; developer playtest, acceptance and merge remain pending.

## #147: Instance intent and compatible save evolution

This document accompanies the story's commit. The readiness cleanup is already merged into main: PlayerActions owns committed turns, protected stair arrivals are validated, and save shape/consistency checks are separate. This story reuses those contracts.

Each Monster now requires `intent`, either `{ type: "idle" }` or `{ type: "preparing-attack", target: { row, col } }`. The target is on that actor's floor; it is a fixed tile rather than a reference to the player's changing position. There is no countdown, UI-owned attack state, generic ability engine or additional turn increment. All generated actors initialize idle, and current pursuit/melee is unchanged. Existing explicit test fixtures add idle intent to satisfy the required domain contract.

Save format v2 explicitly includes intent. The original v1 aggregate and monster contract remain intact. Common adventure shape checks are shared; version-specific guards require the appropriate version and, for v2, valid intent. Semantic validation requires a prepared target to be walkable and orthogonally adjacent to the actor, and still prohibits monsters on protected stairs/arrivals. The player may be elsewhere or on another floor. Intent variants reject missing/unknown fields and idle targets.

The parse boundary validates a v1 source's shape and consistency before adapting its monsters to idle. It retains terrain, linked floors, resources, items, exploration, history and other played state. Callers always receive the current v2 document. Legacy extra monster fields cannot become a prepared attack. No content is regenerated, and the retained literal v1 fixture is unchanged.

Local storage and file import share parsing/migration. Reading a legacy slot leaves its bytes untouched; the next confirmed save writes v2. Invalid intent and unsupported versions preserve the existing progress/slot through the existing adapters. Balance compatibility still follows current rules; migration does not promise the same combat outcomes after future tuning.

## Verification and scope

The initial intent/save suite had 15 failures before implementation. Coverage now includes generated/replayed idle actors, full legacy played-data migration, a prepared target on an inactive floor, free/rejected action retention, malformed variants/coordinates, non-walkable/distant targets, and legacy protected arrivals. Adapter tests exercise legacy local read without rewriting, explicit save to v2, malformed replacement protection, and file migration. Home imports both current and literal legacy files while preserving the local slot. Existing turn, combat, floor retention, death/victory and maximum-size save regressions remain in the full suite.

There is no new visible gameplay in this story. #148 introduces ranged attacks; #149 creates and resolves preparation after one committed player response, clears it, and tests inactive-floor pauses/revisits. #150 adds threat presentation. Pending intent is stored now so those behaviors can use the shared domain/save boundary.

Before advancing, review Monster intent, source validation versus migration, the unchanged v1 fixture, and the tests. The final commit hook runs frontend checks, the full test suite and TypeScript/Vite build; exact results are reported with the commit. Backend and UI layout are unchanged.

## #148: Goblin archer range and cover

The archer definition has 5 HP, nominal damage 2 (raw damage 1–3), 6 XP, detection radius 6, shooting range 4, floors 2–20 and provisional relative weight 1. Drop chance/preferences match the basic goblin for this first slice. `spawnEnabled: false` keeps it out of the generated candidate pool until #151, preserving current seeded populations. Range and rollout are definition properties rather than hardcoded branches on monster names.

On each ordinary monster phase, existing detection runs first: Euclidean radius and terrain line of sight, including the existing closed-corner rule. Undetected or inactive actors do nothing. A detected archer uses ordinary melee at Manhattan distance 1, shoots without moving at distances 2–4, and otherwise pursues one tile using the existing collision/protected-stair pathfinding. Movement never also attacks. Blocking walls prevent detection as well as shots; this story adds no remembered pursuit target. Creatures do not intercept shots and archers do not retreat.

Shooting reuses the existing D20 threshold, Dexterity evasion, bounded damage and armor/minimum-damage resolver. Its attack context uses the actor's stable ID plus `:shot`, isolating ranged rolls from that actor's melee and from unrelated actors. Existing melee contexts are unchanged. Numeric spawn order, earlier actor positions, death stopping, player-first kills, one-time XP and seeded drops remain shared.

New `monster-shot-hit` and `monster-shot-missed` events produce distinct activity descriptions and are accepted by save validation. A basic goblin visual with the archer label keeps the visual catalog complete for controlled encounters; distinct artwork/threat presentation belongs to #150. No generated run contains archers yet, so ordinary play has no new encounter distribution or UI layout.

Controlled tests cover horizontal/diagonal range boundaries, next-turn shooting after pursuit, walls/closed corners, no detection/inactive floors, actor/stair collision, creature non-interception, order, evasion without damage rolls, armor and bounded damage, seeded repetition/actor independence, fatal shots and a seeded loot-producing kill. Catalog tests assert the profile and disabled rollout; narration and v2 actor/event round trips are covered. Fifteen initial encounter tests failed before the definition/behavior existed. Full verification runs in the story commit hook. Pause before #149 for review.

## #149: Brute preparation and a fixed response opportunity

The dungeon brute definition has 10 HP, nominal damage 5 (raw 4–6), 12 XP, detection radius 6, floors 4–20 and provisional relative weight 1. Its drop policy follows the orc. It remains disabled for seeded spawning until #151, with provisional skull artwork until #150. A definition flag enables melee preparation; validation rejects combining that preparation with ranged attacks in this first tactics slice.

An idle, detected brute pursues one tile when distant. When adjacent it copies the player's current coordinate into instance intent, emits a preparation event and ends its phase without rolling or dealing damage. A move into adjacency never also prepares. There is no timer, additional turn increment or UI state governing its attack.

On its next active-floor phase, a pending intent is handled before ordinary detection. It clears intent and checks both the fixed target and adjacency. If the player has moved, it emits an avoided attack without rolls; even moving beyond detection clears the old threat. If still on the target and adjacent, it resolves existing D20/evasion/armor/damage rules using the stable actor-ID `:heavy` namespace. A failed hit roll produces a distinct missed outcome. Both hit and miss consume the phase; it cannot pursue, retarget or immediately prepare again. A following committed turn may start a new preparation.

PlayerActions still owns response timing. Rejected movement, missing items, invalid casts and free hotbar changes preserve preparation. A successful wait, heal, cast, pickup/drop, equipment change or surviving bump attack spends the response turn, applying the player effect first. Killing the brute removes the actor before retaliation and uses existing one-time rewards. Death stops later actors; quest completion skips the entire pending phase.

Stairs change the active floor before the monster phase. The departing brute stays paused with its original target across additional turns and save/load. On return it resolves that target once, rather than aiming at the stair arrival. V2 already supports the intent shape; this story adds the new activity variants to source validation and narration without another format bump. Presentation/highlighting belongs to #150.

The focused suite covers preparation without rolls, sequential phases, fixed-target dodging, out-of-detection cleanup, evasion, raw 4–6 damage with armor/minimum damage, pursuit, rejected/free actions, nine committed response types, kills, fatal stopping, victory, real linked stair revisits and exact saved/uninterrupted next-turn equality. Narration distinguishes preparation, landed blow, failed roll and avoided blow. Sixteen behavior tests failed after the catalog existed but before phase implementation. Existing archer tests pass. Full frontend verification runs in the story commit hook; backend and generated populations are unchanged. Pause before #150 for review.

## #150: Readable tactical enemies and visible threats

Archers use a custom goblin-face-and-bow SVG in cyan; brutes use a custom broad-shouldered, square-jawed SVG in indigo. Both have separate light/dark tokens within the monster palette, rather than loot colors. The catalog remains the single source of monster labels. No spawn flag or gameplay rule changes in this story.

The map derives a sparse set of threatened columns per row from living prepared actors. Both the source monster and its fixed target must be currently visible; the player tile follows the map's existing always-visible rule. Hidden/remembered sources never reveal a warning on a visible target, and hidden/remembered targets never reveal a warning from a visible source. Fog-off treats valid floor tiles as visible. Overlapping threats share one marker; dead or cleared intent removes it.

A target cell keeps its existing content and gains an inset danger border, faint tint and a small warning badge. Its accessible label appends “prepared heavy attack,” with a native explanatory title. The overlay is decorative and ignores pointer events, preserving item/player/stair icons and spell-target buttons. Violet spell selection remains separate from the danger border. Preparation activity gets a warning icon, stronger text and subtle danger styling; routine shots, blows and dodges retain ordinary narration. Existing log order, announcements and scrolling are unchanged.

Help explains both silhouettes, Manhattan archer range, walls/creature interception, one committed response action, healing/gear timing and paused intent across floors. No menu or keyboard mapping changes.

Row memoization compares the sparse threat columns by value. Each cell receives a consistent boolean warning prop: the performance test caught undefined-to-false changes that otherwise redrew unthreatened cells when a marker appeared. Preparation and clearing on a 100×100 map now perform fewer than five TileIcon renders and no MonsterIcon rerender for unchanged actor visuals. This is a focused render contract, not a browser frame-time benchmark; broader profiling remains #153.

Tests cover fixed targets, source/target fog combinations, removal/death, overlap, player/stair/item preservation, clickable selected monster targets, new labels, Help and activity emphasis. Five initial marker tests and three presentation/performance tests failed before their fixes. Existing keyboard targeting regressions pass.

Browser review used validated controlled 15×15×5 and 100×100×5 snapshots at the isolated `127.0.0.1:5174` origin, in both themes and at 1280×720 laptop dimensions. It exercised imported focus, Z selection/cancellation beside the warning, keyboard dodge, repeated preparation, Heal before retaliation, Help and player-following scrolling. The large fixture also contained a hidden prepared brute: source/target stayed remembered floor with no leaked monster/warning label. No browser warnings/errors were observed; the existing unavailable backend diagnostic remained visible. Temporary tab/server and viewport override were cleaned up. Dark/light screenshots accompany the implementation response.

Final frontend verification runs in the story commit hook. Pause before #151, which enables floor-appropriate mixed populations and initial idle intent.


## #151: Seeded mixed tactical encounters

Both new catalog entries now participate in ordinary seeded selection: goblin archers from floor 2 through 20, dungeon brutes from floor 4 through 20, each at relative weight 1. Existing goblin/rat/orc weights remain 3/2/2; rats still stop after floor 4. Eligibility means a kind can appear, not that every eligible floor must contain one. Small floors may contain only two monsters, so an individual run can omit a tactical kind.

The production change removes the two temporary disabled-spawn flags. It reuses existing weighted selection and per-floor/per-actor seed namespaces. No placement, pursuit, attack, loot, population-density, or save-loading algorithm changes. The existing density cap remains 12, starting/stair/arrival buffers remain protected, and actors initialize at full health with idle intent. Position sampling remains separate from kind sampling; extending run depth preserves earlier populations. New adventures with an old seed can have different kinds than the pre-rollout catalog, while saved adventures retain their actual actors without resampling.

Tests first produced 12 expected failures before enabling the catalog entries. Updated catalog checks cover floor boundaries 1/2/3/4/5/20/21 and weighted selection. Seven new tests exercise the exact floor-4 weight intervals, real 50×50 generated populations for seeds 0/123/987, same-seed reproduction, extending five floors to twenty, initial health/intent, twenty-floor caps and protected buffers, unique identities/positions, complete named visuals and catalog eligibility. A played-population round trip removes an actor, wounds an archer and brute, stores a fixed target, waits on an inactive floor, saves/loads, and revisits floor 4 through a real reciprocal stair. The brute resolves its retained intent without returning to full health; killed actors remain absent. A sampler spy verifies neither restore nor transitions regenerate a population. Existing controlled brute stair tests continue to cover the original target and paused intent.

Browser review imports a validated seed-123 50×50×5 generated population on isolated port 5174. Only the player's review position and fog setting were adjusted to inspect floor 4; monster types and initial positions came from ordinary generation. Floor 4 contained all five kinds with twelve actors. One real wait prepared the nearby brute's attack; Z selected it, Escape canceled for free, and Left dodged on turn 2, cleared the warning and logged avoidance. The import restored map focus, and the goblin-and-bow icon is shared by Help/map. The existing unavailable backend diagnostic is unchanged.

Verification: 160 Vitest files / 1,531 tests, Biome and standalone typecheck pass. The commit hook repeats the full frontend suite and TypeScript/Vite build. Pause before #152 (save/replay and complete-adventure integration).


## #152: Save/load continuation and full adventure integration

This story adds regression coverage and documentation; existing production turn, persistence and focus ownership already satisfy these checks. It does not introduce another save version, rebuild actors on load, or change combat values. Domain and adapter scenarios use real seeded rolls. The separate short complete-adventure scenario uses landed nominal hits to isolate integration without becoming a balance golden test.

`TacticalReplayTestHelpers.ts` defines a valid five-floor mixed encounter: one brute, one clear-shot archer, a wounded goblin, health/mana potions and the deepest-floor cure. A wait actually prepares the brute and resolves the archer's shot. A follow-up sequence includes a free invalid pickup, a dodge, spells, two kills, seeded loot, potion recovery and further brute combat. The fixture asserts these events occurred, avoiding a vacuous replay of an empty or already-ended fight.

`TacticalSaveReplay.test.ts` compares uninterrupted continuation with both real local-storage load and FileReader import at three checkpoints: before preparation, immediately after preparation/shot, and after mixed kills/recovery. After each subsequent action it compares the entire action resolution and records actual seeded D20/damage values plus attack contexts for equality. This includes resources, positions/intent, rejected-action errors, turn costs, kills, drops and ordered history. Six final waits let the surviving brute approach and resolve further rolls even from the post-fight checkpoint. Death and victory round trips remain terminal. Malformed intent, out-of-bounds targets and protected actor positions fail through the real adapters without replacing a valid slot. A literal v1 file migrates to the same idle actors through both adapters and leaves original slot bytes unchanged; this does not promise matching outcomes across different rules versions.

`HomeTacticalSaves.test.tsx` focuses on page ownership: confirmed local load and direct file import restore map focus; Character browsing pauses preparation; I closes it; Z selection/cancellation is free; H performs healing before retaliation without clicking the map. A subsequent confirmed save exposes the real page-owned aggregate for comparison with the domain action, without a state-inspection hook. Three representative invalid imports retain the current map/history/turn and prior slot while reporting an error. Existing save/load, file, keyboard, stair, death and victory suites retain their focused coverage.

`TacticalAdventure.test.ts` uses five linked, short two-row rooms. It takes archer shots, defeats the archer with spells, encounters the brute, saves during actual preparation, restores and dodges, combines a spell/potion/melee to defeat it, earns both rewards, visits the deepest floor, recovers the cure and returns through cleared floors to victory. Every walked step checks that the player survives and reaches the tile or takes the final stair transition. Cleared actors stay absent on return; victory freezes actions and a fresh scenario resets the encounter. Save parsing is exercised at the battle checkpoint.

Generated-run smoke review: `node scripts/review-adventure.mjs 0 1 123 987 --policy spell-aware --max-actions 1000` on default 15×15×5 yielded wins for seeds 0/1/987 at turns 127/144/157 and death for seed 123 on floor 2 at turn 22. No action-limit or no-route outcomes. This existing omniscient policy has no explicit brute dodge/cover response; its limited combat counters also omit tactical event families. Improving diagnostic policy/metrics and reviewing balance belong to #153, rather than tuning until this small batch wins. No new browser checkpoint is claimed for this test-only story; the real Home integration cases cover the restored shortcuts.

Final verification runs through the commit hook: 163 frontend test files / 1,546 tests, Biome and TypeScript/Vite build. Standalone typecheck passes. Pause before #153, the final diagnostics and human play checkpoint.


## #153: Tactical diagnostics, performance and final review

The diagnostic retains old policies and adds a named tactical-aware alternative plus complete combat/damage, equipment, mixture and level-up counters. Tests first exposed missing dodging/cover behavior and later a cover/recovery oscillation. A bounded diagnostic-only recovery detour fixes the latter. All five matched seed batches (two sizes × two policies, plus one maximum-size seed) were repeated with byte-identical output. No population, resource or combat-stat tuning was applied.

The one production change is a measured blocked-pursuit early exit: four unavailable destinations beside the player imply no possible path. A structural terrain-read regression failed before the fix. Synthetic crowded phase median fell from 16.596 ms to 0.036 ms; reachable pursuit and ranged/intent costs remain small. Existing BFS ordering and whole-run old-policy outputs are preserved.

Detailed [playtest notes](enemy-tactics-playtest.md) and [recorded results](enemy-tactics-results.jsonl) contain commands, metrics, limitations, browser cover/dodge/keyboard/export-resume checks in both themes, and the human handoff. Large runs still reach level 5 on floors 2–3 and observe mostly redundant equipment. These are follow-up tuning decisions, not changes hidden inside this story.

Verification: 166 frontend files / 1,559 tests, Biome, standalone typecheck and commit-hook TypeScript/Vite build. Fresh backend tests: two passed. All epic implementation is ready for review; stop here for developer playtest and acceptance.
