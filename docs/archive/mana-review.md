# Mana and spellcasting epic review

Implementation date: October 11, 2026. Branch: `codex/mana-spellcasting`, based on merged #136. All stories await developer acceptance; nothing is pushed or merged automatically.

**Subsequent tuning:** mana recovery is now every **30 committed turns**, rather than the original 10 described in this epic checkpoint. A matched experiment ran seeds 0–19 at 50×50×10 with recovery intervals 20/30/50: all 60 spell-aware adventures won. Mean Missile casts were 87.65/69.05/53.85; mean healing-potion uses were 4.75/6.60/7.60. Slower recovery increased resource pressure without changing the sampled win rate. Thirty turns is the provisional setting; original results below retain their original ten-turn tuning.

## Commit-by-commit review

| Story | Commit | What to inspect |
| --- | --- | --- |
| #128 | `6f50df1` | Run-owned current mana; level-derived Intelligence/capacity; missing-mana preservation and ordered earned growth. |
| #137 | `4ad20c3` | Shared spell definitions, both initially known, stable knowledge independent of XP/level. |
| #129 | `7ff96a3` | Validated, seeded Magic Missile and shared melee/spell damage/kill rewards. |
| #130 | `0f5c3f9` | Mana status, known-spell hotbar, visible targets, Z/arrows/Enter/click/Escape controls and focus/protection. |
| #131 | `edb4f8a` | Self-healing normal turn, H/button equivalence, actual recovery and free rejected casts. |
| #132 | `6f0048a` | Shared recovery after retaliation on every tenth global committed turn; no fatal/victory recovery. |
| #133 | `b37eeeb` | Mana potion catalog/loot, unified resource consumption, distinct presentation and mixed shortcuts. |
| #134 | `a68fd7c` | Character/Spells tabs, shared derived values, Intelligence column and Help. |
| #135 | This document's commit | Complete-adventure tests, named diagnostic policies, recorded runs, final keyboard guards, docs and browser review. |

The final review also disables potion and self-heal buttons during targeting (not only their keys), avoids giving the one-shot Heal button toggle semantics, and removes a duplicated range number from catalog prose. These are concrete review fixes rather than additional gameplay scope.

## Rules and design

- Intelligence 10/12/14 at character levels 1/3/5; modifier 0/1/2. Capacity 10/12/14. XP determines level; **level determines attributes**, consistent with existing automatic growth. Classes, equipment stat bonuses and permanent stat potions are deferred; manual distribution is not planned.
- Magic Missile costs 3, always hits one visible eligible target, Manhattan range 6 and clear terrain sight, damage 3–5 plus Intelligence modifier. Other creatures do not block. Heal costs 4 and restores up to 4 + modifier HP.
- Both spells start known. Leveling never teaches spells. Future spellbooks are the acquisition mechanism; no spellbook content is included now.
- Validation precedes spending. Successful spell effect, shared kill reward/health/mana growth and loot occur before survivor retaliation. Spells use a distinct attacker identity in the seeded combat context, retaining old melee namespaces.
- Restore 1 mana after resolved living turns 10/20/30…, with earned capacity applied first. Every successful action counts; menus/preview/cancel/assignment/rejection do not. No regeneration after death/victory, no pre-funding unaffordable casts.
- Health/mana potions share ownership and consumption rules, restore up to 5 of their own resource before retaliation, and use separate per-kind shortcut assignments/counts. Found/drop weights are explicit; current mana-potion eligibility is floors 1–20.
- Character retains its existing inventory layout and scrollable body. Spells is a separate informational tab; close Character to cast. Reopening defaults to Character. Known-spell membership is shared with the hotbar.

## Diagnostic policies and reproducibility

`baseline` is the original omniscient walker: equip carried upgrades, consume a health potion at HP ≤6, approach/bump monsters, collect all reachable gear until the bag fills, then recover/return. It never casts or drinks mana potions. Its hoarding limitation remains explicit. New catalog entries change loot results from earlier versions, so comparisons do not isolate only spell use.

`spell-aware` uses the same domain actions with omniscient routing but casts only currently visible targets within normal range/sight. It collects potions/cure and better compatible gear, equips upgrades, heals at HP ≤ max(5, floor(maxHP/2)), prefers a carried healing potion before Heal, and drinks mana potions when at least five mana is missing. It uses affordable visible missiles, falls back to melee, and returns with the cure. It **does not deliberately rest to fill mana**. This simple policy is named and tested, not claimed to be optimal or human-like. It can still fill its bag with potions on very long runs; stacking or supply policy changes remain separate decisions.

Every reported cast/use was committed successfully; a rejected policy action is a diagnostic error. Budgets, routing failures, deaths and wins remain distinct. Reports include known spells, mana/capacity, casts per spell, potion uses per kind, progression/equipment, kills, turns and floor/resource checkpoints.

Run from `frontend`:

```sh
node scripts/review-adventure.mjs --policy baseline --max-actions 3000
node scripts/review-adventure.mjs --policy spell-aware --max-actions 3000
node scripts/review-adventure.mjs 0 1 123 987 --policy spell-aware --rows 50 --cols 50 --floors 10 --max-actions 15000
node scripts/review-adventure.mjs 0 123 --policy spell-aware --rows 100 --cols 100 --floors 20 --max-actions 50000
# Broader batches and replay traces are opt-in:
node scripts/review-adventure.mjs --policy spell-aware --seed-start 0 --seed-count 20 --max-actions 3000 --summary-only
LARN_REVIEW_TRACE=1 node scripts/review-adventure.mjs 123 --policy spell-aware --max-actions 3000
```

## Recorded outcomes

Character cap is 5 in all configurations. These are deterministic route-policy outcomes, not probability assertions or human win rates. No tuning was changed to guarantee wins.

### 15×15×5 baseline

| Seed | Outcome | Turns | Kills | Level / XP | HP | Mana | Missiles / Heal | Health / mana potions |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | won | 158 | 12 | 3 / 58 | 7/14 | 12/12 | 0 / 0 | 2 / 0 |
| 1 | won | 190 | 14 | 4 / 79 | 5/16 | 12/12 | 0 / 0 | 1 / 0 |
| 123 | died | 83 | 8 | 3 / 37 | 0/14 | 12/12 | 0 / 0 | 0 / 0 |
| 987 | won | 196 | 14 | 3 / 57 | 10/14 | 12/12 | 0 / 0 | 2 / 0 |

### 15×15×5 spell-aware

| Seed | Outcome | Turns | Kills | Level / XP | HP | Mana | Missiles / Heal | Health / mana potions |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | won | 128 | 12 | 3 / 58 | 12/14 | 4/12 | 10 / 0 | 0 / 2 |
| 1 | won | 140 | 14 | 4 / 79 | 10/16 | 7/12 | 11 / 0 | 0 / 3 |
| 123 | won | 144 | 15 | 4 / 63 | 14/16 | 7/12 | 10 / 1 | 0 / 3 |
| 987 | won | 158 | 14 | 3 / 57 | 11/14 | 8/12 | 13 / 0 | 0 / 4 |

### 50×50×10 spell-aware

| Seed | Outcome | Turns | Kills | Level / XP | HP | Mana | Missiles / Heal | Health / mana potions |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | won | 3,667 | 111 | 5 / 675 | 10/18 | 14/14 | 112 / 0 | 0 / 9 |
| 1 | won | 3,702 | 117 | 5 / 712 | 10/18 | 14/14 | 124 / 0 | 0 / 17 |
| 123 | won | 4,021 | 112 | 5 / 678 | 13/18 | 14/14 | 121 / 0 | 1 / 14 |
| 987 | won | 4,162 | 115 | 5 / 645 | 13/18 | 14/14 | 122 / 0 | 1 / 12 |

### 100×100×20 spell-aware

| Seed | Outcome | Turns | Kills | Level / XP | HP | Mana | Missiles / Heal | Health / mana potions |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | won | 20,768 | 239 | 5 / 1655 | 11/18 | 14/14 | 302 / 0 | 0 / 8 |
| 123 | won | 21,152 | 235 | 5 / 1563 | 13/18 | 14/14 | 293 / 0 | 1 / 12 |

Small, medium and large spell-aware batches were repeated with byte-identical JSON output. The representative two-seed large replay took about 30 seconds locally, including generation, routing and roughly 42,000 resolved turns; this is a diagnostic wall-time observation, **not a browser frame benchmark**. Explicit budgets were 3,000/15,000/50,000 respectively; none exhausted them or reported routing failures.

## What the results imply—and leave open

Ranged guaranteed hits avoid much incoming damage against the current melee-only enemies. Mana is scarce enough to trigger fallback melee and Heal on the short seed 123 adventure, but long map walks replenish so much mana that most sampled large runs rarely need healing. Safe-room waiting also allows unlimited recovery. The mechanic is renewable as agreed, but future ranged enemies/pressure may be needed to maintain decisions.

Large adventures still require over 20,000 turns for these seeds, and the character caps early. Spellcasting does not solve sparse encounters, repeated equipment, late XP pace or long travel. Useful-only loot avoids the old diagnostic's redundant-gear hoarding; it does not prove loot supply is balanced. More monsters alone would accelerate leveling and resource demand. No spawn-density, XP curve, level cap, damage or cost tuning was made in this epic.

## Browser review

- Default 1280×720 browser viewport: light/dark Spells tabs, actual scaled values, Character/gear/bag/progression, readable mana and visible focus. Character's body remains scrollable on short viewports; Spells fits without needing the inventory column.
- Seed 0: Z/nearest target, arrow cycling, free Escape cancellation, targeted-button/map-click casting, full-health Heal rejection. Visible target rings remain distinct from normal monster colors.
- Seed 123: replayed the full recorded 144-action adventure through UI controls. Verified turn and mana after every action from turn 7 onward; early equip/casts were checked separately. Includes melee and missile kills, level 3 Intelligence, pickup/autoassigned mana shortcuts, three mana potions, H healing, gear swaps, stacked potion chooser, cure recovery and return. Victory matched turn 144, 15 kills, level 4, 63 XP and 14/16 HP; mana 7/12.
- Victory: spell controls disabled; Character and Spells remained inspectable. Replay reset turn 0, level 1, full 10 mana and starting knowledge.
- 100×100×20: 10,000 map cells, forty actual movement turns, target-unavailable feedback and tab browsing worked; no new console warnings/errors were observed. This is a functional smoke check, not an FPS claim.
- Seed 0 deliberate defeat after one missile: waiting died at turn 16 with 8 mana; extra waits stopped advancing, Heal was disabled. New Dungeon reset resources and both known spells.
- Restored the original Dark preference and closed only the temporary review tab. The existing server-connectivity diagnostic was unchanged.

## Validation and developer checkpoint

Behavior tests cover Intelligence/capacity boundaries, spell knowledge, exact costs/effects, range/walls/other-creature pass-through, controlled damage boundaries, kill/growth/retaliation order, real seeded replay, recovery on all action families, mana potion generation/ownership/hotbars, keyboard/focus/menu/fog guards and default tabs. A complete mixed spell/melee/potion/recovery/cure-return adventure verifies retained state and ended-run guards. Tests keep readable scenarios and at most one nested describe.

Final frontend tests, Biome and strict TypeScript/Vite build are required by the existing commit hook. Backend Gradle tests passed (tasks up-to-date). Review the final commit output for the exact test count.

Before accepting, play several short adventures and one 50×50×10 or 100×100×20 run. Try canceling/changing targets, H under pressure, both potion shortcuts, new-run/replay, menu browsing and tab reopening. Judge travel time, resource availability and combat choices as a human. Next scope remains a decision: distinct ranged/melee enemy tactics, resource pressure, and then useful dungeon interactions. Spellbooks/additional spells, classes, equipment attribute bonuses, permanent stat potions, statuses, cooldowns, resistances, area attacks and manual point allocation are not implemented here.
