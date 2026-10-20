# First winnable adventure review

Epic [#109](https://github.com/danielgebhardt/larn-remake/issues/109), stories #110–115, is implemented on `codex/first-winnable-adventure`. Acceptance and merging remain developer-owned.

## Rules and design

The default adventure is five 15×15 floors. Settings supports custom depths 5–20: one reachable, independently seeded cure appears on the final configured floor. The floor-1 entrance is the original player start and is a map overlay, preserving generated terrain and stair rules. Cure and entrance use blue gem/door icons; ordinary gear and monster colors retain their separate palettes.

The cure enters a protected quest pouch, consumes no bag slot, and cannot be equipped, drunk, or dropped. Picking it up is a normal turn with retaliation. Delivery requires stepping onto the entrance carrying it; that movement consumes the final turn and captures victory before retaliation. Waiting on the entrance does not win. Returning without the cure logs a reminder. Death prevents delivery.

Victory retains the run and a snapshot of seed, configured floor count, turns, confirmed kills, and health. The kill count is independent of trimmed log history. All domain actions stop after victory, including free shortcut assignments, and UI item controls are disabled. Inspection, summary reopening, Settings, replay, and new adventures remain available. There is no timer, boss, XP, or persistence in this epic.

## Reproducible diagnostic runs

Run `pnpm --filter frontend exec node scripts/review-adventure.mjs`; optionally append numeric seeds. The walker uses real generated five-floor maps and domain actions. It equips improvements, heals at health 6 or lower, attacks nearby monsters, visits reachable content, recovers the cure, and follows up stairs back to the entrance. It knows unseen terrain and content. This is a diagnostic policy, not a human strategy or win-rate estimate; it does not optimize danger avoidance. A 500-action limit prevents loops.

| Seed | Outcome | Deepest floor | Turns | Health | Kills | Potions used | Cure recovered |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | Won | 5 | 171 | 9 | 12 | 5 | Yes |
| 1 | Died | 4 | 102 | 0 | 9 | 2 | No |
| 123 | Died | 2 | 28 | 0 | 7 | 0 | No |
| 987 | Won | 5 | 205 | 9 | 14 | 3 | Yes |

Victory snapshots match the diagnostic's final counters. No combat, healing, spawn density, or loot weights were changed simply to force successes. These examples demonstrate achievable five-floor adventures; they do not establish that every seed is fair or that twenty-floor adventures are balanced. Human playtesting remains the next balance input.

Settings now requires at least five floors to preserve the descent-and-return adventure. Smaller runs remain available to domain fixtures; the one-floor browser checks below record the original epic review before this minimum changed.

## Verification

- All 1,138 frontend tests in 119 files passed; Biome checks and production build/strict TypeScript checks passed.
- Backend `./gradlew test` succeeded using existing up-to-date outputs; backend code was unchanged.
- Domain tests cover default/custom quest depth, reachable unique placement, independent content streams, tiny-map fallback, full-bag pickup, protected ownership, retaliation on recovery, reminders, final-turn ordering, death, ended-run actions, summary counters, and replay reset.
- A complete three-floor domain scenario descends, recovers, returns through cleared floors, wins, and reconstructs the original replay state. Monsters are removed explicitly to isolate the quest loop; the real five-floor diagnostic runs above supply combat coverage. A real twenty-floor generation check keeps earlier ordinary loot/monsters unchanged and places the cure on floor 20.
- Home tests exercise keyboard and Character pickup, objective/pouch feedback, entrance reminders, automatic victory dialog, focus restoration, summary reopening, disabled equipment/potion controls, replay, new dungeon, and invalid seed preservation.
- Actual browser play completed one-floor seed 0 with fog enabled: equip the iron sword, fight both rats, recover with G, return to the entrance, and win at turn 14 with 9 health and 2 kills. Replay through the same controls produced the same outcome in light mode. Dark/light summary layouts were reviewed, along with a compact 390×700 preview. Dismissing victory restored map focus; attempting movement kept turn 14; reopening worked; replay reset turn, health, quest, actors, loot, and history. Temporary appearance/viewport changes were restored.

## Commit review guide

| Story | Review focus |
| --- | --- |
| #110 | `Adventure.ts`, GameState quest/kill ownership, confirmed-kill updates, and five-floor defaults. |
| #111 | `CurePlacement.ts`, independent seed namespace, reachable room preference/fallback, catalog quest type, and cure icon. |
| #112 | Cure transfer before bag-capacity checks, protected pouch, G prioritization, recovery message, Character/map/Help progress. |
| #113 | Entrance overlay/fog retention, arrival reminders, pure delivery transition, victory snapshot, and retaliation/action guards. |
| #114 | `VictoryDialog.tsx`, derived open/dismiss state, inspection/replay controls, focus, and disabled item/shortcut actions. |
| #115 | Complete-loop/custom-depth regressions, objective-aware diagnostic walker, README, ROADMAP, and these review notes. |
