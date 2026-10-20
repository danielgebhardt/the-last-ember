# Larn Remake roadmap

For current implemented behavior, see [README](README.md). This roadmap retains historical story ordering and review-stage notes; it is not a substitute for the live GitHub backlog. The October 18 cleanup establishes [v27-only save support](docs/save-policy.md).

Updated October 15, 2026. This project reimagines Larn while providing a place to practice TDD and software design. The aim is an enjoyable, understandable dungeon crawler; original Larn is inspiration rather than a specification.

[Issue #38](https://github.com/danielgebhardt/larn-remake/issues/38) is the running index and discussion point. This file owns the detailed order; individual stories own acceptance criteria. Planning does not authorize implementation. Future epics use native GitHub parent/sub-issue links.

## Development approach

- The developer owns architecture, acceptance and release decisions. AI reviews, pairs or implements when explicitly asked.
- Usually work test-first, one failing behavior at a time. Keep tests readable, with at most one nested `describe`.
- Build small visible slices. Keep domain rules independent of React and avoid a generalized RPG engine before concrete behaviors require it.
- For delegated epics: a branch, one initial commit per story, and Backlog/Ready → In Progress → In Review → Done. Review adjustments may add follow-up commits. Implementation is not final acceptance.
- Follow [Definition of Done](docs/definition-of-done.md) and [AI working agreement](docs/ai-working-agreement.md). Verify actual layout, focus and scrolling in the browser.

## Current playable baseline

Merged into `main` and accepted by the developer:

- Seeded multi-floor terrain, linked stairs, collision, player-following scrolling, efficient large maps, fog and per-floor discovery memory.
- Welcome/start/resume, cure recovery and return victory, death dialog, turn resolution and activity history.
- Twenty ordinary creature kinds plus charger, sentry and optional champion profiles; melee/ranged/prepared attacks, announced threats and bounded conditions/defenses.
- Level-based Strength, Dexterity and Intelligence, a level-20 cap, reproducible hit/miss and damage, armor and mana.
- Twenty spells in the catalog. Magic Missile and Heal start known; other knowledge comes from seeded, depth-eligible spellbooks. A run does not guarantee every spell.
- Main hand, off hand, head, chest and two rings; derived equipment bonuses and comparison feedback.
- Found/dropped loot, healing/mana/antidote supplies, gold, doors, finite chests, visible traps, fountains, thrones and shrines.
- Character/Spells tabs, Settings, Help, developer catalog tabs, keyboard pickup/object choices and potion shortcuts.
- Confirmed localStorage Save/Load plus validated file export/import. Actual played floors and state are saved; backend/accounts are not required to play.

The default adventure is **Medium: 40×40 tiles, 20 floors**. **Medium / Normal is the primary human testing and balancing baseline.** The 60×60 size remains the Large option and a larger reference/stress case. Supported sizes remain **10–100 rows/columns and 5–20 floors**; support does not promise equal balance for every size. Mana recovers **1 point every 30 committed turns**. Normal monster populations remain capped at twelve per floor. These are current rules, not commitments against later tuning.

## Published alpha: inventory, exploration and interface polish

Merged, tagged and published by the developer before this program. These are the established alpha contents, not future tasks:

| Stories | Outcome |
| --- | --- |
| #217 | Identical potion kinds occupy one bag slot; 27 slots with nine columns on desktop. Drinking/dropping still affects one bottle. |
| #218 | Upstairs vary by seeded room and tile, with reciprocal arrivals. |
| #219–220 | Named hotbar slots, compact spell cards, shared instructions and colored Assigned controls. |
| #221–222 | Distinct potion shapes/colors and counted visible loot piles. |
| #223–225 | Six spell shortcuts on 5–9/0, four potion shortcuts on 1–4, default visibility radius 8 and automatic equipment pickup into empty compatible slots. |
| #227–229 | Quieter map focus, seeded layout diagnostics and bounded short corridor loops for alternate routes. |
| #230–231 | Resource panel on the left, hotbars on the right, stable low-health color cues, consistent dark hotbar boxes and wider two-column Settings. |

Epics [#216](https://github.com/danielgebhardt/larn-remake/issues/216) and [#226](https://github.com/danielgebhardt/larn-remake/issues/226). Review guides: [inventory polish](docs/alpha-polish-review.md), [exploration/status polish](docs/release-polish-review.md). Release text: [next alpha notes](docs/alpha-release-notes.md).

The published alpha used **v12**: old valid saves migrate, retaining their items and four assigned spell slots with two empty slots added. Played saves retain their terrain/stairs. New or replayed runs can have changed geometry and upstairs placement, even with a historical seed; seed equality is not a cross-release layout guarantee.

Matched layout measurements on five seeds at 60×60×20 (100 floors) show mean bottleneck tiles falling from **181.46 to 119.00**, and entry-to-downstairs distance from **66.18 to 62.58**. No unreachable tiles were found; a separate sixty-floor 100×100 batch also stayed connected. These measure topology, not human run duration or combat difficulty. The final gameplay commit passes **1,839 tests**, Biome, TypeScript and the frontend production build.

## Completed pursuit, return, merchant and discovery program

Merged into `main` and accepted, with 28 initial story commits. Native parent epics and stories are closed and marked Done. Review logic, tests and diagnostic limits in [the program review guide](docs/pursuit-escape-merchant-review.md).

| Epic / stories | Implemented outcome |
| --- | --- |
| [#232](https://github.com/danielgebhardt/larn-remake/issues/232), #233–237 | Remembered last-seen positions, bounded pursuit/search, visible cues and saved continuation. |
| [#238](https://github.com/danielgebhardt/larn-remake/issues/238), #239–244 | Explicit hunted return, one finite seeded wave per return floor, stronger bounded pursuit and progress/diagnostics. |
| [#245](https://github.com/danielgebhardt/larn-remake/issues/245), #246–251 | Telegraphed chargers, interruptible one-shot alarm sentries, nearby alerts and optional skull-gated champions/rewards. |
| [#256](https://github.com/danielgebhardt/larn-remake/issues/256), #257–264 | Shared finite potion merchant on floors 5/10/15 below the goal, keyboard Buy/Sell, deliberate prices and saved ownership. |
| [#252](https://github.com/danielgebhardt/larn-remake/issues/252), #253–255 | Capacity-scaled finite fountains, temporary attribute potions and guaranteed per-item enchantment capped at +3. |

This milestone introduced **v18**; the latest reviewed save format is **v21**. Valid older saves migrate without regenerating played terrain/actors/loot; old merchant-free formats initialize reachable stalls/stock once. Current saves retain pursuit, alarms, escape activation, stock and actual enchantments. The primary balancing baseline is now Medium / Normal (40×40×20), with level cap 20 and mana recovery every 30 turns. Ordinary population remains twelve per floor; return waves cap total living actors at sixteen. Human difficulty/pacing still needs playtesting.

The six-seed generated merchant budget found 776–841 ordinary gold by floor 5 and 8,371–8,576 across 20 floors if everything is collected, versus 14,000 for full stock. Controlled return and budget diagnostics are not human win-rate evidence. Review chargers/alarms, optional challenges, supply spending and return pressure before another broad balance change.

## Completed pacing and tactical clarity

Merged into `main` and accepted, with eight initial story commits and a separate post-review fix. Both native parent epics and all eight stories are closed and marked Done.

| Epic | Stories / outcome |
| --- | --- |
| [#265](https://github.com/danielgebhardt/larn-remake/issues/265), Pacing and meaningful rewards | #266 per-visit pacing reports; #267 depth-sensitive ordinary equipment weights; #268 supply budgets; #269 twenty-floor XP audit. Supply probabilities and XP thresholds were retained based on available evidence. |
| [#270](https://github.com/danielgebhardt/larn-remake/issues/270), Tactical clarity and counterplay | #271 visible threat/condition counterplay; #272 recent damage defeat recap; #273 spell elements/duration/target-adjusted damage; existing #212 intelligent enemies opening ordinary doors for one action. |

The door-opening milestone introduced **v19**: validated enemy door-opening history is added, while all v18 played state and enchantments migrate intact. Orcs, cultists and necromancers can open ordinary doors during remembered pursuit; elite gates remain player-only. Loaded items remain authoritative; only new/replayed loot selection changes.

[Story review guide](docs/pacing-tactics-review.md) contains logic and six-seed evidence. [Post-epic codebase review](docs/codebase-review-2026-10-13.md) records immediate fixes to diagnostic stacking/capacity, elite routing, current resource estimates and stale Help, followed by the accepted session/save refactors #274–276. CI and startup follow-ups remain planned. Scripted policies remain limited; human playtesting is still the next balance gate.

## Alpha run #3: usability and late-game challenge

[Epic #313](https://github.com/danielgebhardt/larn-remake/issues/313) owns the nine observations from the October 14 Medium / Normal playtest. [Full compiled evidence](docs/alpha-run-3-feedback.md) preserves the exact champion combat log, equipped gear and final inventory. Seed **1172903873** ended at **9,199 turns**, **267 defeats**, level **20 / 4,547 XP**, **36/48 health**, **80% evasion** and **88 retained consumables**. Floors 1–10 felt reasonably balanced; the second half and cure escape felt too easy. These are human observations; root causes and numerical tuning remain to be established.

| Priority | Story | Purpose |
| --- | --- | --- |
| First | [#319 — Stable consumable stacks](https://github.com/danielgebhardt/larn-remake/issues/319) | Stop remaining scroll/potion stacks moving after partial consumption; verify interleaved copies and selection continuity. |
| First | [#317 — Stable merchant Sell panel](https://github.com/danielgebhardt/larn-remake/issues/317) | Implemented for review: stable sales, sold placeholders and deliberate focus; review follow-up adds compact responsive four-column desktop trading. [Review](docs/merchant-selling-review.md). |
| Alongside #317 | [#322 — Sell all Lower equipment](https://github.com/danielgebhardt/larn-remake/issues/322) | Implemented for review: confirmed atomic sale of red/Lower carried gear for one turn; Same/Tradeoff/Better items remain. |
| Merged / Done | [#316 — Starter potion defaults](https://github.com/danielgebhardt/larn-remake/issues/316) | New/replayed adventures start with one Healing Potion on 1 and one Mana Potion on 2, freely reassignable; existing saves retain their actual state. |
| Implemented for review | [#318 — Spell potency comparisons](https://github.com/danielgebhardt/larn-remake/issues/318) | Shared Spell damage bonus and Heal bonus rows use the casting Intelligence modifier, including both ring destinations and active effects. No combat/save change. |
| Implemented for review | [#314 — Scroll configuration](https://github.com/danielgebhardt/larn-remake/issues/314) | Central UI configuration provides independent horizontal/vertical tile margins, preserving five on both axes. Browser checks cover manual scrolling, tiny viewport centering and focus. |
| Applied for playtest / In Review | [#320 — Shared evasion and late-game pressure](https://github.com/danielgebhardt/larn-remake/issues/320) | [Measured review](docs/evasion-balance-review.md) reproduces both loadouts, ordinary/elite hit pressure, counterplay, rewards and saves. Developer-approved diminishing returns above 20 Dexterity are active; the recorded 32/34 Dexterity loadouts now evade 60%. Character, previews and saves use the shared rule. Human playtest feedback pending. Keep #304 historical. |
| Implemented for review | [#311 — Urgent post-cure escape](https://github.com/danielgebhardt/larn-remake/issues/311) | Up to four floor-20 hunters favor stair routes; 24-step cure sensing drives pursuit through walls while normal attack sight and arrival safety remain. [Measured review](docs/urgent-return-review.md); human playtest pending. |
| After combat demand is clearer | [#321 — Late-game supply/economy audit](https://github.com/danielgebhardt/larn-remake/issues/321) | Separate found/bought/used supplies and earned/current gold; retained stock alone does not prove a generation bug. |
| Implemented for review | [#315 — Original identity and narrative](https://github.com/danielgebhardt/larn-remake/issues/315) | Developer-selected **The Last Ember**: dying beacon, original ember quest, sparse dry humor and a shared amber ember SVG. Visible copy/metadata updated; internal/save identifiers retained. |

**#319 is implemented** in local main; [review notes](docs/stable-consumable-stacks-review.md) explain ordering, stack identity and verification. **#316 is merged, closed and Done. #317 and companion #322 are implemented for developer review** on `codex/merchant-selling`; [merchant review](docs/merchant-selling-review.md) explains fixed bounds, deliberate transactions and single-turn bulk selling. **#318 is implemented for developer review** on `codex/spell-potency-comparisons`. **#314 is implemented for developer review** on `codex/player-follow-margins`. **#320’s approved evasion curve is applied for developer playtesting** on the same branch; [evasion review](docs/evasion-balance-review.md) records the shared rule, measured pressure, compatibility and remaining limits. Final acceptance is pending human feedback. **#311 is implemented for developer review** on `codex/urgent-cure-return`; human return playtesting remains pending. Epic #313 is In Progress; **#315 is implemented for developer review** on `codex/the-last-ember`; #321 is the remaining original backlog story. No later story is selected by completing this work. Keep Normal balance separate from additional difficulty levers #292 / earlier eligibility #291. Existing #308 retains the ring/redundant-reward audit, and #302 retains offensive spell roles; both coordinate with this evidence. Prefer one measured balance change at a time, retaining early-game playability and cold/control counterplay. Diagnostics supplement human play, not human win-rate claims.

[Leaderboard #312](https://github.com/danielgebhardt/larn-remake/issues/312) remains Backlog until backend persistence work begins.

## Current implementation and next program

The developer agreed to this order after merging the engineering and visual polish. Stories are linked as native sub-issues. Difficulty epic #213 and CI/browser epic #277 are closed and merged. All three GitHub runner jobs passed on the CI implementation. Corridor eligibility #286, keyboard controller #287 and continuation/lifecycle verification #288 are implemented for review; human usability acceptance remains pending. Starting classes, town services and cold-start measurement remain later work.

| Order | Epic | Outcome |
| --- | --- | --- |
| 1 | [#213 — Difficulty and new-adventure choices](https://github.com/danielgebhardt/larn-remake/issues/213) | Immutable combat pressure, saved continuation, explicit start/settings choices and fixed map-size boxes. Five stories below, completed. |
| Alongside | [#277 — Declared-toolchain CI and browser smoke coverage](https://github.com/danielgebhardt/larn-remake/issues/277) | Configured frontend/backend checks and four isolated Chromium flows; local and all three GitHub jobs pass. Completed. |
| 2 | [#285 — Interruptible safe corridor travel](https://github.com/danielgebhardt/larn-remake/issues/285) | Reduce repetitive movement through quiet corridors while preserving each committed turn and stopping at decisions or danger. |
| Ongoing | Human pacing/counterplay playtests | Supplies at real fights, merchant spending, useful upgrades, leveling and hunted return. Keep human reports alongside bounded diagnostics. |
| Later | Town/entrance service, then starting classes | Reuse the merchant transaction foundation and existing base/gear/effect ownership; avoid a broad economy or stat-distribution framework. |

### Difficulty and start-dialog choices — five stories

1. **[#281](https://github.com/danielgebhardt/larn-remake/issues/281): difficulty rules and ownership.** Supported Easier / Normal / Harder multipliers are 0.75 / 1.0 / 1.25. Scale enemy maximum health and direct melee/ranged/charge/area damage with documented rounding and a positive minimum of 1. Keep Normal behavior, XP, loot, population, armor/resistance/accuracy, spell availability, environmental damage and ongoing conditions unchanged initially. Round to nearest, minimum one; physical rolls scale before armor and enemy spells/area attacks retain their existing armor bypass.
2. **[#282](https://github.com/danielgebhardt/larn-remake/issues/282): saved continuation and replay.** Explicitly version difficulty and validate actual wounded/scaled actors. Migrate v1–v19 saves to Normal without regenerating played state. Preserve deterministic continuation and existing merchant/escape/effect/enchantment ownership.
3. **[#283](https://github.com/danielgebhardt/larn-remake/issues/283): difficulty UI.** Choose before starting; Settings edits the next-run draft. Show the active choice and actual scaled creature values, keep the catalog baseline clear, and retain keyboard/focus/error behavior.
4. **[#279](https://github.com/danielgebhardt/larn-remake/issues/279): Small / Medium / Large boxes.** Implemented row/column dimensions: 20×20 / 40×40 / 60×60. Floors remain independently configurable. Retain custom Settings and the Large 60×60 reference/stress case; Medium 40×40 is now the default.
5. **[#284](https://github.com/danielgebhardt/larn-remake/issues/284): matched verification.** Compare compact and recommended seeds; verify intended geometry/content stability, actual scaling, normal-mode regression, save/replay and keyboard lifecycle. Treat scripted observations as limited mechanics evidence, not human win rates.

Persistence and UI are implemented together: v20 stores active difficulty, and valid v1–v19 saves restore Normal. Review evidence and limitations are recorded in [the epic review guide](docs/difficulty-adventure-review.md). Changing one combat multiplier does not authorize simultaneous supply/XP/density tuning.

### Interruptible safe corridor travel — #286–288 implemented for review

[Engineering review](docs/corridor-travel-review.md) records the conservative observable policy, 120ms ordinary steps, cancellation and #288 continuation/lifecycle/maximum-size verification.

1. **[#286](https://github.com/danielgebhardt/larn-remake/issues/286): eligibility and interruption policy — implemented for review.** Use player-visible/remembered information. Stop at threats, junctions, rooms, doors, stairs, loot, objects and meaningful newly revealed content; stop after damage/harmful conditions. No hidden knowledge, auto-combat, pickup, door opening or automatic exploration.
2. **[#287](https://github.com/danielgebhardt/larn-remake/issues/287): keyboard/controller — implemented for review.** R followed by Arrow/WASD starts one-step-at-a-time travel at 120ms per ordinary turn; Escape cancels. Keep each action visible and interruptible, and cancel on manual action, modal/focus change, new/load/replay, death or victory. Closing menus must not resume it.
3. **[#288](https://github.com/danielgebhardt/larn-remake/issues/288): continuation/lifecycle verification — implemented for review.** Three-seed per-step state/discovery equivalence, live danger/decision boundaries, validated mid-run saves and cancellation across restart/terminal states. Production browser checks include twenty 100×100 floors, following, cancellation, confirmed save/load, new adventure and fatal-step replay. Travel instructions remain transient; human usability acceptance is pending.

### CI and browser smoke coverage — two stories

1. **[#289](https://github.com/danielgebhardt/larn-remake/issues/289): declared-toolchain CI.** Frontend Biome/full tests/TypeScript/build and backend Gradle tests, with documented Node/pnpm/Java versions, frozen lockfiles and bounded runner concurrency. Preserve local hooks and verify actual successful CI jobs.
2. **[#290](https://github.com/danielgebhardt/larn-remake/issues/290): controlled browser smoke suite.** Isolated storage and compact deterministic fixtures for welcome/start, Settings focus, pickup/heal/hotbars, save/load and a terminal adventure flow. Add difficulty/size coverage when available. Keep it small and investigate timing failures rather than raising timeouts indiscriminately.


### Alpha feedback gate

Gather a small set of feedback on the merged build before another content/balance expansion. Keep seed, dimensions, depth, release version and a save near the reported problem. Prioritize Medium / Normal (40×40×20) runs, alongside a shorter 15×15×5 correctness/survival check and Large/maximum-map performance checks when relevant. Human play remains essential: diagnostics know routes and follow a limited policy, so their win rate is not a player difficulty rating.

Look specifically for bag frustration after stacking, usefulness of deep-floor loot, spell choice, ranged-threat readability, floor-by-floor level growth and quiet travel. Fix reproducible input/save/combat bugs before balance proposals. Tune one system at a time and retain before/after seed comparisons.

## Engineering and sharing alongside playtesting

- **Frontend publishing #211:** share a static build when deployment is explicitly authorized; the backend check is already disabled. Confirm actual hosting configuration/limits at implementation time. Browser saves belong to an origin/profile; export/import is the existing transfer mechanism. No accounts or Java deployment are needed for this alpha.
- **CI #277/#289:** planned alongside difficulty work, before the next large feature merge where practical. This supports releases without changing game rules.
- **Browser smoke #290:** welcome/start, Settings focus restoration, hotbar/pickup, save/load and one death/victory flow, using isolated controlled fixtures.
- **Performance:** retain large-map movement regressions. Measure startup before further lazy loading; the approximately 600kB main chunk currently produces a non-blocking build warning. Measure pursuit, targeting and saves if new behavior makes them slow.
- **Persistence:** version changed saved contracts and retain captured legacy fixtures. Named save slots can follow demonstrated demand; autosave/IndexedDB should follow measured need, not replace working manual saves by default.

## Expanded future backlog — town, uniques and escape scrolls

Planning only; these stories do not authorize implementation or change the active corridor-work order.

- [#323 — Rare seed-determined unique catalog](https://github.com/danielgebhardt/larn-remake/issues/323): original named discoveries, targeting no more than 20% of seeds containing any unique, deterministic eligibility/selection/placement, and saved actual ownership.
- [#324 — Exit-dungeon scrolls](https://github.com/danielgebhardt/larn-remake/issues/324) — implemented for review: found-only seeded scrolls, safe cardinal arrival beside floor 1, ember restriction, stable stacks, one arrival-floor turn and v21 saved ownership/history. [Engineering review](docs/exit-scroll-review.md).
- [#325 — Level 0 beacon town](https://github.com/danielgebhardt/larn-remake/issues/325): 18 native child stories, #326–343. Beacon square, dungeon approach, market street, sanctuary/library lane and forge/storage courtyard form a coherent authored layout. Foundation: rules/homecoming #326, layout #327, location #328, travel #329, navigation #330, economy #331. Services: potion #332, armor #333, weapon #334, scroll #335, library #336, healer #337, forge #338, stash #339 and optional gold vault #340. Lore #341, saves #342 and full-journey review #343 complete the plan. Start with one useful service; later shops remain backlog until selected. No implicit stock refills, free recovery loops, ember-storage bypass, cross-run banking or hidden change to victory. #329–332 are implemented for review on `codex/beacon-town-foundation`: live travel, readable directory, finite economy and eight-potion store. V24 owns town-stock depletion and validates purchased identities; stock and dungeon state survive visits/load. Prices remain provisional pending human playtesting.
  - Selected foundation: #326 rules/homecoming, #327 authored layout, and #328 town representation on `codex/beacon-town-foundation`. [Town rules](docs/town-rules.md) preserve the floor-1 victory boundary and prohibit free recovery loops; the [authored 29×21 plan](docs/town-layout.md) and [map](docs/town-layout.svg) fix every destination across seeds. Town travel (#329) and services remain separate stories. #328 adds an isolated **Catalog → Town** walkable preview with domain-owned locations, collision, closed signs and validated layout snapshots; [Town economy #331](docs/town-economy.md) defines separate finite town stock, 7,600-gold provisional clearance cost, no refill/resale loop and six-seed budget evidence. Navigation #330 adds distinct SVG landmarks and a read-only directory with coordinate/sign labels, keyboard/touch access and focus restoration. Live travel #329 is implemented for review: deliberate Enter/button crossings, new starts in town, retained dungeon state, v23 location persistence and v1–v22 dungeon-preserving migration.

## Later gameplay directions

After the pacing/tactical milestones:

1. Starting classes with different initial attributes and automatic growth, rather than manual point allocation. Keep base growth separate from equipment/permanent effects.
2. Level 0 beacon town #325 and its staged service backlog, expanded only after the first service proves useful.
3. More varied special rooms/discoveries that create visible decisions, not merely longer catalogs.
4. Selective gear/stat effects, two-handed weapons or extra equipment slots when concrete content warrants their ownership and UI rules.
5. Eight-direction movement only with explicit player/enemy adjacency, corner-cutting, pathfinding, vision and targeting rules.
6. Quest time pressure or resting tradeoffs only after normal resource pacing is enjoyable and clearly explained.

Use [Larn's monsters](https://larn.fandom.com/wiki/Monsters), [spells](https://larn.fandom.com/wiki/Spells) and [dungeon objects](https://larn.fandom.com/wiki/Dungeon_Objects) as optional design references. These links are inspiration; this update does not introduce or verify new original-game rules.

## Explicitly deferred

- Inventory weight, item footprints/rotation, drag-and-drop and mandatory management friction. Potion stacking and 27 slots are deliberate quality-of-life choices.
- Crafting, large affix/rarity systems, unidentified/harmful consumables and a complete tabletop combat ruleset.
- Manual stat distribution, large skill trees, classes and a broad modifier engine introduced together.
- Respawning, reinforcement schedules, complex speed/initiative, summons and sophisticated AI without a concrete tactical need.
- Multiplayer, backend saves, accounts and automatic cloud synchronization.
- Town implementation beyond the selected first useful service; optional gold-vault #340 remains deferred. Interest, taxes and cross-run banking are outside the town plan.
- Equal balance guarantees across every supported size or exhaustive device/browser testing.

## Completed milestone history

| Milestone | Reference |
| --- | --- |
| Floor-aware content and armor #90; randomized combat #99 | [Content/combat review](docs/content-combat-review.md) |
| Cure-and-return adventure #109 | [Adventure review](docs/adventure-review.md) |
| Progression #116 | [Progression review](docs/progression-review.md) |
| Mana and casting #127 | [Mana review](docs/mana-review.md) |
| Local saves #143 | [Save review](docs/local-save-review.md) |
| Domain/action/save readiness cleanup | [Codebase review](docs/codebase-review-2026-10-11.md) |
| Distinct enemy tactics #146 | [Tactics review](docs/enemy-tactics-review.md), [diagnostics](docs/enemy-tactics-playtest.md) |
| Expanded adventure #154/#159/#170/#176/#185/#194 and prior UI polish | [Story plan](docs/expanded-adventure-plan.md), [implementation review](docs/expanded-adventure-review.md) |
| Current alpha polish #216/#226 | [Inventory review](docs/alpha-polish-review.md), [exploration/status review](docs/release-polish-review.md) |
| Pursuit/return/tactical encounters/merchant/discoveries #232/#238/#245/#256/#252 | [Program review](docs/pursuit-escape-merchant-review.md) |
| Pacing/tactical clarity #265/#270, including doors #212 | [Pacing/tactics review](docs/pacing-tactics-review.md), [codebase review](docs/codebase-review-2026-10-13.md) |
| Session/save ownership #274–276 | [Maintainability review](docs/session-save-maintainability-review.md) |
| Icon/catalog polish #280 | [Visual review](docs/dungeon-visual-polish-review.md) |

Completed milestone details live in these review guides and GitHub stories. They should not reappear as outstanding roadmap work.

## Engineering follow-up from October 13 review

Session ownership #275 and save-validation ownership #276 are accepted and merged under completed epic #274. Merchant/item/spell/monster visual polish #280, including the final varied monster palette and poison bottle, is also accepted and merged.

CI/browser checks are organized under epic #277. Startup measurement and selective dialog splitting [#278](https://github.com/danielgebhardt/larn-remake/issues/278) stay Backlog; splitting is conditional on measured benefit. Size presets #279 are now part of difficulty/new-adventure epic #213.

The latest recorded complete frontend verification passes **292 files / 2,144 tests**, Biome, TypeScript and production build. Final visual-feedback changes also passed the focused 14-test set and production build. No gameplay or save format changes were introduced by that polish.

Earlier appearances of stronger monster kinds are a separate [Backlog experiment #291](https://github.com/danielgebhardt/larn-remake/issues/291), after the health/damage baseline. Keep its progression/reward effects separate from the current difficulty multipliers.

## Alpha run #2 feedback

[Epic #293](https://github.com/danielgebhardt/larn-remake/issues/293) captures all 17 observations. The first eight usability stories (#296, #298, #300, #310, #301, #303, #295 and #299) were merged into main. Optional champion tuning #304 and the developer-selected Medium default #307 are implemented on `codex/elite-champion-tuning` for review; seven stories remain Backlog. The default-size request narrowed #307 to configuration/UI consistency; comparative pacing/balance experiments remain later work. See [the champion/default review](docs/elite-champion-review.md), [spell/HUD review](docs/spell-hud-polish-review.md), [equipment review](docs/equipment-stat-review.md) and [interaction review](docs/alpha2-interaction-review.md).


**#302 is implemented for developer review** on `codex/spell-balance-pass`: stronger learned attacks, dangerous radius-three Fireball, scaling Renewal/poison, twenty-turn spell buffs, longer Blink, and a shared 3–6-book discovery budget. Heal/Magic Missile and control spells retain their baseline roles; enemy spell damage is isolated from player buffs. Current saves emit v22 and preserve earlier played state. See [the spell balance review](docs/spell-balance-review.md). Human balance acceptance remains pending.


**#305 is implemented for developer review** on `codex/laptop-adventure-layout`: compact status/hotbars, a taller dungeon with a 288px right-side Activity panel at laptop widths, turn-grouped messages, readable damage/healing/condition emphasis, and Latest/new-event controls. Below 1024px, the map and log stack without horizontal overflow. Reference map height improved from 36.2% to 71.5% at 1280×720 after the compact status-strip follow-up; both themes and 1440×900 were compared. [Layout review](docs/laptop-layout-review.md). Human usability acceptance remains pending.
