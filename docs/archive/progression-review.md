# Character progression review

Epic #116 is implemented in ordered slices on `codex/character-progression`, pending developer acceptance. See README for formulas. XP is authoritative; level and automatic attributes are derived, independently of log retention and dungeon floor count.

## XP/health-only checkpoint (#120)

Rules: rat/goblin/orc rewards 2/5/10 XP; cumulative level thresholds 0/10/30/60/100; character cap 5; +2 maximum/current health per earned level, preserving missing health. At the cap, XP continues but health does not grow or regenerate. No damage/accuracy changes in this checkpoint.

Command: `pnpm --filter frontend exec node scripts/review-adventure.mjs`. Four default seeds use the existing omniscient walker: upgrade gear, heal at health 6 or lower, clear reachable content, recover the cure, and return. The fixed healing threshold is intentional for comparison; this policy is neither a human playtest nor an estimated human win rate. Optional `LARN_REVIEW_TRACE=1` includes the action trace.

| Seed | Outcome | Deepest | Turns | Level | XP | Health | Kills | Potions |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | Won | 5 | 171 | 3 | 58 | 7/14 | 12 | 4 |
| 1 | Died | 4 | 102 | 3 | 44 | 0/14 | 9 | 2 |
| 123 | Died | 4 | 105 | 3 | 46 | 0/14 | 11 | 0 |
| 987 | Won | 5 | 205 | 3 | 57 | 10/14 | 14 | 3 |

For seed 0, first arrival at floors 2/3/4/5 occurs at levels 1/2/2/3 with XP 4/13/23/33. On the return, XP remains 58 and no cleared-floor rewards repeat. Original pre-progression seeds 0/987 also won; seed 123 died on floor 2 and now reaches floor 4. Seed 1 still dies on floor 4. No tuning changes were made to force success.

Browser review used seed 0 with enabled fog through the real equipment, pickup, and movement controls. The first level-up occurred at turn 30, reaching 11 XP; maximum health became 12 and the log ordered death → XP → level-up. By turn 34, Character showed level 2, 13 XP, and health 7/12. C and I toggled the dialog without consuming turns or losing map focus. At 1280×720 the progression/equipment/bag columns and potion assignments fit together; lower inspection text remains scrollable. The final attribute UI will receive another layout/theme review.

Tests also verify rewards retained across stair revisits, no duplicate cleared-floor awards, bounded log history independent of authoritative XP, capped rewards without healing, death/victory guards, and replay reset. Existing real-seeded action replay and twenty-floor generation regressions remain in the suite. Full frontend checks/build run at every story commit.

This completes the XP/health implementation checkpoint before Strength/Dexterity. The developer remains the final reviewer; the request authorizes continuing through the full epic.

## Final rules and adventure review (#124)

Strength grows at levels 3/5 to 12/14 and adds +1/+2 nominal melee damage; Dexterity grows at levels 2/4 to 12/14 and adds +5/+10 percentage points to player accuracy and evasion. Starting chances are 85% hit and 20% evade; level 5 has 95% hit and 30% evade. Armor remains separate. Health reaches 18 at level 5. No content, potion, armor, or spawn tuning was changed to force wins.

### Reference seeds, 15×15, five floors, 500-action budget

| Seed | Outcome | Turns | Level / XP | STR / DEX | Health | Kills | Potions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | Won | 158 | 3 / 58 | 12 / 12 | 11/14 | 12 | 3 |
| 1 | Won | 192 | 4 / 79 | 12 / 14 | 2/16 | 14 | 2 |
| 123 | Won | 189 | 4 / 63 | 12 / 14 | 11/16 | 15 | 2 |
| 987 | Won | 199 | 3 / 57 | 12 / 12 | 11/14 | 14 | 2 |

All four reference seeds now win under this policy; seeds 1 and 123 previously died in the XP/health-only checkpoint. Seed 1 still finishes at 2/16 health. Seeds 0/987 use fewer potions than at the checkpoint. These are reproducible observations of one omniscient policy, not promises that all human runs win. Final equipment: seed 0 iron-sword/wooden-shield/leather-armor/iron-helmet; seed 1 iron-sword/wooden-shield/leather-armor/iron-helmet; seed 123 iron-sword/wooden-shield/chain-armor/iron-helmet; seed 987 iron-sword/wooden-shield/chain-armor/iron-helmet. The JSON reports exact equipment and hit/miss totals as well as floor-arrival checkpoints.

### Broader coverage

- Seeds 0–19, 15×15, five floors, 1,000 actions: 16 won, four died, no routing failures or budget cutoffs. Final levels: one at level 1, three at level 2, three at level 3, thirteen at level 4. XP range 7–97. The complete JSON output reproduced byte-for-byte on a second run.
- Seeds 0/123, 100×100, twenty floors, 10,000 actions: both died, on floors 9/7 after 8,582/6,325 turns. Both reached character level 5, Strength/Dexterity 14, maximum health 18; XP continued to 645/408, with 107/73 kills and 13/5 potions used. Neither outcome was a routing failure or budget cutoff.
- A one-action seed-0 run reports `action limit` separately from `died`. Unit tests cover parser limits and routing-failure aggregation; these outcomes are never treated as statistical pass/fail targets.

The large runs show that long-term survival after the cap needs human review. The walker explores all reachable loot/monsters, knows the whole map, equips upgrades immediately, and heals at an absolute health threshold of 6. A human may avoid fights, heal earlier, or miss supplies behind fog. Neither twenty-floor run reached the objective, so full twenty-floor balance remains unproven.

### Running the diagnostic

From the repository root:

```sh
# Fast reference seeds (positional seeds remain supported)
pnpm --filter frontend exec node scripts/review-adventure.mjs
pnpm --filter frontend exec node scripts/review-adventure.mjs 123 987

# Consecutive batch; aggregate only is optional
pnpm --filter frontend exec node scripts/review-adventure.mjs --seed-start 0 --seed-count 20 --max-actions 1000 --summary-only

# Large twenty-floor adventures with an explicit larger budget
pnpm --filter frontend exec node scripts/review-adventure.mjs 0 123 --rows 100 --cols 100 --floors 20 --max-actions 10000

# Optional replay trace
LARN_REVIEW_TRACE=1 pnpm --filter frontend exec node scripts/review-adventure.mjs 0
```

Each seed prints JSON followed by one aggregate JSON summary. `--summary-only` suppresses per-seed records. Dimensions/depth use the same limits/defaults as Settings; seeds use the same unsigned 32-bit range. Batch count is 1–10,000, with no overflow/wrap; positional seeds and batch arguments cannot be mixed. `--help` lists options. The budget counts attempted actions, including free ones, rather than elapsed time. Routing failures are reported as `no route`; budget exhaustion as `action limit`. Fatal/victory outcomes on the last allowed action are classified correctly. Route lookup shares a lazily created breadth-first traversal per decision, with stairs permitted only as endpoints, preserving direction and target tie order. This optimization affects the diagnostic only.

### Verification and manual checkpoint

A complete domain journey kills an orc, gains level 2/Dexterity, recovers the cure, returns through retained floors, captures nonzero XP in victory, freezes actions, and resets on replay. Separate focused tests cover misses/nonlethal attacks, simultaneous level gains, new health/Dexterity before retaliation, Strength on the next attack, the cap, trimmed log retention, floor revisits, deterministic combat, and death/ended-run guards. Diagnostic tests cover valid/invalid CLI combinations and stair-safe routing.

Browser review repeated seed 0 under final rules through the complete cure-and-return victory (158 turns, level 3, 58 XP, health 11/14), matching the diagnostic. Real controls included equipment upgrades, potion shortcuts, stacked-item pickup, and return stairs. Victory remained inspectable in both themes. the turn-30 kill logged XP → level 2 → Dexterity 12, followed by normal later combat. Character at turn 34 showed 13 XP, health 7/12, hit 90%, evade 25%, and separate gear/Strength contributions. I/i and C/c opened/closed without advancing turns; Help and Settings paused gameplay. Light/dark layouts were reviewed at 1280×720 and 1440×800. At laptop dimensions the three columns and potion shortcuts fit; detailed ground-item inspection remains scrollable. The server status reported the existing unavailable backend while the local game remained playable.

**Developer checkpoint before more mechanics:** review each story commit, then play several large twenty-floor seeds with fog enabled. Check potion availability, missed-hit feel, incentive to keep fighting after level 5, recovery on the return trip, and whether Strength/Dexterity benefits are clear. Record seed/configuration and action context for any suspicious outcome. Human play remains essential.

### Ordered commit review

| Story | Commit | Focus |
| --- | --- | --- |
| #117 | `bfa22bb` | Progression rules/catalog rewards. |
| #118 | `e1bfa9c` | Same-turn kill XP and health growth. |
| #119 | `eb5dc4b` | UI, victory snapshot, shared I/C shortcut. |
| #120 | `07f6946` | XP/health checkpoint and retention. |
| #121 | `0539acf` | Strength and single damage contribution. |
| #122 | `bec7eb2` | Dexterity and derived accuracy/evasion. |
| #123 | `aedd6be` | Shared explanations and ordered multi-level narrative. |
| #124 | Final branch commit | Complete journey, batch diagnostics, final review. |

Every story commit runs Biome, the full frontend suite, and strict TypeScript/Vite build through the existing pre-commit hook. Backend Gradle tests also passed at the final checkpoint (unchanged backend; tasks up-to-date). Issues remain In Review until developer acceptance; no branch push or merge is implied.
