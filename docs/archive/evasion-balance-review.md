# Shared evasion review and applied experiment — #320

October 15, 2026, on `codex/player-follow-margins`, following #314 and measured-review commit `8ed8b30`. The developer approved the diminishing-returns curve below for human playtesting. It is now active in shared physical combat. Player accuracy, attribute growth, armor, enemy stats, difficulty, XP, loot and save ownership are retained; Character explains the revised curve. Completed champion tuning #304 stays historical.

The original measurements below compare the previous linear rule (called “current” in the original review) with the approved change (called “proposed”). The diagnostic now labels these `legacy` and `applied`; applied encounters use the live shared rule with unmodified seeded rolls. All 384,000 pressure outcomes, 144 action scenarios and 192 reward samples match the approved pre-implementation measurements exactly.

## Pre-change rule and root cause

Total Dexterity includes automatic level growth, both rings and temporary effects. Its modifier is **round down((Dexterity − 10) / 2)**. Evasion is **20% + 5 percentage points per modifier**, clamped to 5–95%. `floor` in the source means mathematical rounding down, never dungeon depth. The same character has the same evasion everywhere.

Automatic growth is 10 Dexterity plus 2 at every even character level. Level 10 has 20 Dexterity / 45% evasion, level 18 has 28 / 65%, and level 20 has 30 / 70%, before gear. Two Bands of the Forgotten add another 4 Dexterity: the reported level-18 character reaches 32 / 75%, and the final character 34 / 80%. Growth alone therefore accounts for most of the late avoidance; this is a shared combat concern.

`MeleeRules.deriveAccuracy` supplies the same monster hit threshold to ordinary melee, ranged physical shots, prepared heavy attacks and charges. There is no elite accuracy distinction. Player attacks also benefit from Dexterity but reach their 95% cap at 14 Dexterity. Enemy spells, area effects, ongoing conditions and traps have separate resolution; the displayed evasion is not universal protection from damage. Armor applies after a physical hit and can reduce it to the one-damage minimum.

Six consecutive misses at 75% evasion have a 17.8% probability. At most one hit among seven attempts has a 44.5% probability. The observed sequence is compatible with the rules; it does not demonstrate a broken RNG.

## Reproduction and method

Run:

```sh
pnpm --filter frontend exec node scripts/review-evasion.mjs
pnpm --filter frontend exec vitest run src/__tests/EvasionBalanceReview.test.ts
```

The command emits machine-readable JSON with pressure streams, action encounters and reward samples. `scripts/evasion-review.ts` is imported only by diagnostics and tests, never by the application. Tests type-check it through their ordinary import.

The level-18 checkpoint reproduces XP 3,129, both relic bands, Star-forged blade, Tower shield, Scholar robe and Runic helmet +3: Dexterity 32, 75% evasion, attack 18–20, armor 11 and maximum health 44. The level-20 checkpoint uses XP 4,547 and blade +1: Dexterity 34, 80% evasion, attack 20–22, armor 11 and maximum health 48.

These are synthetic open-room encounters in Normal 40×40×20 runs. The original save and champion actor identity were not supplied, so these are not a reconstruction of the original seed's complete turn stream. One controlled test reconstructs the reported actions at turns 6975–6982: a wait, six bumps dealing 18/19/18/20/20/19, six missed retaliations and one raw 28 hit reduced by armor to 17, then Drain Life dealing 15 to the remaining 12 health. It ends at 39/44 health and 16 mana from 22, with 12 healing. This verifies the interaction, not the original RNG sequence.

For each pressure scenario, all 20 D20 faces and every legal damage result are enumerated for exact expected damage per **attack attempt**. Eight matched seeds (`0, 1, 7, 42, 123, 987, 2026, 1172903873`) each supply 2,000 independently keyed attempts for each curve. The nine melee profiles yield 288,000 outcomes; three additional champion charge profiles yield 96,000. Standalone attempts avoid understating pressure by stopping a sample when the player dies. Their damage totals are not per-world-turn DPS: heavy attacks and charges still have preparation/recovery, and monsters may spend turns moving or being controlled.

## Approved change: diminish evasion growth above 20 Dexterity

Keep the existing evasion curve through Dexterity 20. Above that, give another 5 percentage points for each **four additional Dexterity**, instead of every two. Keep the existing 5–95% safety bounds. This is a growth change, not a new 60% cap, and never depends on dungeon floor. Player accuracy, Dexterity growth itself, trap disarming, enemy health/damage and difficulty multipliers stay unchanged.

For modifier `m`, the active monster threshold is:

```text
clamp(5 + min(m, 5) + round down(max(0, m − 5) / 2), 2, 20)
```

| Total Dexterity | Current evasion | Proposed evasion |
| --- | ---: | ---: |
| 10 | 20% | 20% |
| 14 | 30% | 30% |
| 20 | 45% | 45% |
| 22 | 50% | 45% |
| 24 | 55% | 50% |
| 28 | 65% | 55% |
| 30 | 70% | 55% |
| 32 | 75% | 60% |
| 34 | 80% | 60% |
| 36 | 85% | 65% |

This preserves all low-Dexterity outcomes and the representative level-10 checkpoint, regardless of location. It cannot promise that every character on dungeon floors 1–10 is untouched: equipment or temporary bonuses can push Dexterity above 20 earlier. A +2 Dexterity item or effect above the knee sometimes needs another +2 before improving evasion; this is a real tradeoff of retaining D20 resolution. Evasive gear still advances the curve, but its marginal value is lower. Both relic bands at level 18 still improve proposed evasion from 55% to 60%. Paired ring/effect thresholds and expiry are tested. Character now shows actual capped hit/evasion values from `deriveAccuracy` and explains the diminishing returns, replacing the previous linear “+modifier × 5” description. Equipment and merchant previews already share this domain calculation and therefore show the actual stepped evasion changes.

## Expected pressure and matched measurements

| Checkpoint / incoming physical attack | Armor | Current expected damage/attempt | Proposed |
| --- | ---: | ---: | ---: |
| Level 1, goblin | 1 | 0.80 | 0.80 |
| Level 10, ogre heavy strike | 7 | 0.73 | 0.73 |
| Level 10, floor-10 champion | 7 | 7.15 | 7.15 |
| Reported level 18, wraith | 11 | 0.25 | 0.40 |
| Reported level 18, demon warden heavy strike | 11 | 1.75 | 2.80 |
| Reported level 18, floor-17 champion bump or charge | 11 | 4.00 | 6.40 |
| Reported level 20, wyvern physical hit | 11 | 0.20 | 0.40 |
| Reported level 20, demon warden heavy strike | 11 | 1.40 | 2.80 |
| Reported level 20, floor-20 champion bump or charge | 11 | 3.80 | 7.60 |

The observed melee landed-hit percentages across 16,000 attempts per scenario were 80.14% at the early checkpoint and 55.09% in the middle, identical for both curves. At level 18 they were **25.17% → 40.09%**; at level 20 **19.88% → 39.85%**. Independent charge-key streams gave **25.19% → 40.01%** and **19.76% → 39.30%**. These agree with the intended probabilities; they are deterministic sampling evidence, not human win rates.

At the reported level-18 champion's average landed damage of 16, seven independent attack opportunities represent **28 expected damage currently versus 44.8 proposed**, before healing and without accounting for death truncation. The extra 16.8 is approximately 3.36 regular five-health potions or 1.12 greater fifteen-health potions in healing capacity. Actual demand depends on overheal, control, killing the enemy sooner, and retaliation on the drinking turn. The reported 12-health Drain Life recovery would no longer cancel most of that expected exposure. Drain Life still costs six mana and restores only actual health removed, bounded by missing player health; it is not a guaranteed fixed heal.

The 144 real action scenarios compare nine policies over the eight seeds under both curves. Applied scenarios use the production threshold and unmodified hit/damage rolls. Only the historical linear-rule scenarios adapt incoming physical faces; matched player and damage rolls remain keyed identically. A twenty-face charge test confirms it produces exactly five current versus eight proposed hits. Low D20 faces still miss and the maximum face can still hit. The live RNG is unchanged; the shared production threshold now implements the approved curve.

In the eight level-18 stationary melee scenarios, current rules produced six kills and two deaths; the proposal produced five kills and three deaths. Mean incoming rolled damage was 18.625 versus 35, with samples ending on death/kill. These small controlled fixtures show that ignoring defense can already be dangerous and that the proposal increases risk; they are not a win-rate estimate. A fixed six-bump/then-Drain policy produced mean healing 3.875 versus 8.625; some characters died before casting and some were still healthy enough to receive no healing. It is not an optimal policy and the lower mean mana spending in the proposal is partly death censoring, not improved efficiency.

Frost Bolt's first cast dealt a mean 27.25 damage through the champion's cold weakness and prevented that phase's attack through slowing, at four mana. Magic Missile dealt a mean 7.5 through arcane resistance, at three mana, and permitted retaliation. Sidestepping a prepared fixed charge avoided all damage at no mana cost; Web, Sleep and Fear also prevented charge damage at their existing three/five/four mana costs. All remain useful under both curves. Explicit full-phase tests check the shared 75% gate for melee, shots, heavy attacks and charges.

## Rewards, saves and recommendation

Sixty-four independent reward seeds per checkpoint use actual elite selection and the shared equipment comparison against the checkpoint loadout:

| Loadout | Better | Same | Tradeoff | Lower |
| --- | ---: | ---: | ---: | ---: |
| Representative level 10 | 35 | 12 | 6 | 11 |
| Recorded level 18 | 0 | 24 | 11 | 29 |
| Recorded level 20 | 0 | 14 | 9 | 41 |

The recorded Runeblade is Lower at both late checkpoints. The champion guarantees equipment but not an upgrade; 24 XP is also modest next to the final 370-XP level step. Increased risk can make an optional fight unattractive for a fully equipped player. Retain optionality and the current rewards for this isolated proposal; coordinate redundant gear/economy with existing #308/#321 after human feedback. Do not guarantee a stronger item or inflate health to compensate for this audit.

Wounded player health, wounded champion health and a prepared charge survive actual v20 serialize/parse/restore, and their next seeded action matches uninterrupted play. The v20 schema is unchanged. Evasion is derived from saved XP/equipment/effects, so existing saves immediately use the new curve while retaining their actual wounds, preparation and resource state. A saved level-18 character with 32 Dexterity now has 60% evasion; a D20 face of 13 lands for both a bump and a prepared charge, while the old 75% curve would miss. Same seeds/actions no longer promise the same outcomes as the previous rules version. No wounds are erased, monsters rerolled or resources granted to compensate. Newly saved continuations remain deterministic under the applied rules.

The developer selected this shared diminishing-returns experiment before an elite-specific accuracy bonus, a further champion stat increase, escape-pressure changes or supply cuts. It targets avoidance across all physical fights and keeps low-Dexterity play intact. Armor already makes several ordinary enemies weak even after they land a hit, so this experiment alone cannot establish overall late-game balance. Human Normal runs should validate early boosted builds, late healing demand, gear choices and control usage before selecting #311/#321 changes. The numerical experiment is authorized; final balance acceptance remains pending human playtesting. Keep #320 open and In Review until developer acceptance.

Verification covers exact curve/odd-Dexterity boundaries, unchanged player accuracy, ring and temporary-effect combinations and expiry, loadout previews, the reconstructed combat log, cross-floor invariance, all-face physical gates, counterplay and save continuation. A production browser flow imports the final level-20 loadout, checks Dexterity 34 / evasion 60% / hit 95%, reads the growth explanation and restores map focus without advancing the turn. Full frontend checks and existing browser flows are required for handoff.
