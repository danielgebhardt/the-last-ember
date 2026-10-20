# Optional champion tuning — #304

Branch: `codex/elite-champion-tuning`. Developer review and merge remain pending.

The old 32-health, nominal-damage-8 champion was defeated in three hits by the recorded level-11 loadout; armor 7 reduced its nominal hit to 1. Deeper gear made it less meaningful still. This change adjusts only the champion's health and melee/charge damage profile; optional placement, behavior, elemental responses, XP/gold and equipment rewards retain their rules.

## Profile

Catalog values describe floor 8: 72 maximum health and nominal damage 18. Each deeper floor through 20 adds 6 health and 1 nominal damage. Shared monster-stat helpers apply depth first and the existing difficulty rounding second. Ordinary monster profiles are unchanged.

| Floor | Normal maximum health | Normal raw melee/charge damage |
| --- | --- | --- |
| 8 | 72 | 17–19 |
| 14 | 108 | 23–25 |
| 20 | 144 | 29–31 |

On floor 20, Easier has 108 health and raw 22–23 damage; Harder has 180 health and raw 36–39. Armor still reduces landed physical damage, and normal evasion remains active.

Fresh elite spawning, actual melee and charge resolution, difficulty-adjusted initialization and save health validation use the actor's floor. Gate warnings use the gate floor/current difficulty, and Help uses the observed actor floor. The catalog retains the base profile; the champion trait explains its depth growth.

## Counterplay and reward

The existing charge stays fixed to its announced line, with a response action and a recovery phase. Sidestepping avoids it; Web interrupts movement and Sleep/Fear retain their existing counterplay. Cold deals double damage, arcane half. No condition immunities, extra actions or new enemy abilities were introduced.

The room can remain sealed without blocking stairs, the cure or the return. Its existing guaranteed, depth-eligible equipment reward favors recent tiers without promising a useful upgrade. Reward ownership and no-resampling behavior are covered by existing tests. Gold/XP and general loot tuning are outside this focused mechanic change.

## Persistence

Save format remains v20: floor, kind, current health, actor ID and preparation already supply everything needed. No regenerated actors, health refills or new saved modifier state are needed. Previously saved champions retain their actual wounds/charge targets; **future attacks in those saves use the new profile**. Older saved health is below the higher capacity and remains valid. The new ceiling rejects health above the actual floor/difficulty maximum.

## Verification and limits

- Primary depth/loadout behavior tests failed against the old profile, then passed.
- Seven focused files / 40 tests pass: explicit floor/difficulty values, generated identity/geometry preservation, reward ownership, Help/gate values, and wounded/prepared save continuation at all three difficulties.
- The recorded level-11 scenario has attack 10–12, armor 7 and evade 45%. Forced landed hits now deal nominal 11 after armor on floor 8; standing adjacent for three bumps kills the player while the champion has 39 health remaining.
- The late scenario has armor 11 and evade 70%. On floor 20, two forced landed exchanges leave the champion at 106 health and the player at 8/46. A landed charge deals 19 after armor, followed by recovery. Sidesteps and actual control/cold casts preserve useful responses.
- Controlled rolls deliberately measure health/armor pressure; these are not human win rates. Real evasion and spell/resource decisions still matter. Human playtesting should tune the constants if early champions feel excessive or late ones remain trivial.
- Manual browser review imported a validated floor-9 Harder gate: warning and Help both report 98 maximum health / raw 23–25 damage. Cancel stayed at Turn 0; opening advanced once to Turn 1. Browser save storage was not written.
- The commit hook verifies formatting/lint, the full frontend suite and production build.

The separate developer request to default to Medium is implemented in its own subsequent commit on this branch.


## #307: Medium as the default

The developer explicitly chose Medium, superseding the backlog story's earlier conditional default decision. `DEFAULT_RUN_CONFIGURATION` now uses 40 rows / 40 columns, retaining twenty floors and Normal difficulty. The welcome screen derives its selected preset from this shared configuration. Small (20×20), Large (60×60) and custom Settings remain available; saved/replayed configuration remains authoritative. Historical 60×60 diagnostic results are retained as larger reference/stress evidence, not relabeled as Medium results.

Welcome/default-generation tests failed before the change, then passed with the same seeded start/focus and independent size/difficulty controls. Population, rewards, progression and other generation parameters are unchanged; comparative human pacing/balance work is not claimed complete by this default preference.
