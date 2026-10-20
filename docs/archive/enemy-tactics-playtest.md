# Enemy tactics: final diagnostic and playtest review

Story #153, epic #146, branch `codex/enemy-tactics`. Implementation is ready for developer review. Human playtest and acceptance remain the developer's decision. Population cap stays 12 and mana recovery stays 30 turns; no balance values changed.

## What changed

The existing `baseline` and `spell-aware` policies remain available. `tactical-aware` builds on spell-aware decisions: dodge visible fixed targets before recovery/equipment actions; prefer free exits with less immediate nominal incoming damage; avoid occupied tiles, other prepared targets and unintended stairs; use a guaranteed lethal spell if trapped; seek cover before recovery or while shortening a route toward a shooting archer; prioritize visible shooting archers when casting. It uses actual catalog stats, spell potency, armor, visibility and line of sight.

This is a one-step heuristic with omniscient routing and loot knowledge, not a human player or an optimal combat planner. It does not predict future pursuit or deliberately rest to recover mana. Its recovery-cover detour is limited to one step before taking the recovery action. This diagnostic-only memory resets per seed and never enters GameState or saves. Initial experiments exposed two cover oscillations on large seeds 8/19; a failing regression led to the bounded detour. Both seeds now finish. These were script failures, not changes to gameplay.

Counters now include shots, preparation, heavy hits/misses/avoidance, spell hits, resolved incoming/outgoing damage, damage and kills by kind, actual level-up floor/turn, potion/spell use, initial mixtures, and gear usefulness. Damage follows the log's overkill convention. Each gear copy is classified once against current equipment when its active floor is first inspected, including drops; this is omniscient observation, not fog-based discovery. Pickups and upgrades are counted separately. Death, action-limit exhaustion and no-route outcomes remain separate.

## Recorded matched runs

Seeds 0–19 were run with each policy on each size, then repeated. Seed 1 was also run twice at 100×100×20. All five final JSONL output pairs matched byte for byte: 162 final executions, not 162 distinct seeds. The retained [results](enemy-tactics-results.jsonl) contain per-seed metrics/checkpoints, aggregate results, SHA-256 hashes of full CLI output, and domain timings. The table includes both winning and losing runs; winner medians are separately retained in the results.

| Size | Policy | Wins | Deaths | Budget / no route | Median turns | Resolved incoming damage |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 15×15×5 | spell-aware | 17/20 | 3 | 0 / 0 | 134 | 383 |
| 15×15×5 | tactical-aware | 16/20 | 4 | 0 / 0 | 137 | 373 |
| 50×50×10 | spell-aware | 20/20 | 0 | 0 / 0 | 3,896 | 1,261 |
| 50×50×10 | tactical-aware | 19/20 | 1 | 0 / 0 | 4,254.5 | 1,246 |
| 100×100×20, seed 1 | tactical-aware | 1/1 | 0 | 0 / 0 | 20,822 | 55 |

The budgets were 3,000 / 20,000 / 100,000 actions respectively. Outcome fractions are diagnostic outcomes, not human win-rate estimates. Policy changes also change combat seeds, routes, exposure and survival duration; total damage is not a controlled estimate of tactical benefit. A better threat response does not guarantee a better overall policy.

Tactical batches avoided 163 / 3,062 / 207 prepared blows, with zero heavy hits. The old policy took 9 / 46 heavy hits in small/large batches. Tactical small/large runs cast Missile 169 / 1,420 times and Heal 14 / 12 times; consumed health potions 35 / 208 and mana potions 61 / 320. Cover-step decisions totaled 35 / 59. The maximum-size run used 245 Missiles, 10 health and 27 mana potions.

## Balance recommendations for review

Keep current values for this merge. The evidence supports deciding on the next small tuning story after human play, rather than changing several systems together here:

- All twenty large seeds hit level 5: seven on floor 2, thirteen on floor 3, under both policies. The maximum-size run capped on floor 3. XP progression clearly outpaces dungeon depth; review the cap/curve or intended adventure length first.
- Large tactical runs classified 79 observed gear copies as better and 908 as same/lower (about 92% redundant), then picked up 73 useful copies. Adjusting repeated basic equipment or introducing purposeful variety remains relevant. Observation includes drops and can classify an item before a later upgrade.
- Brutes are avoidable by design. The script's high dodge count also shows that its greedy routing can prolong a fight; do not treat that count as a required human combat duration. Human play should check whether the attack/response rhythm feels satisfying before altering windup or damage.
- Large travel supplies substantial mana recovery, and safe waiting remains unlimited. One successful 20-floor run is not enough evidence to change recovery from 30 again. Compact adventures remain a better quick playtest than using maximum dimensions as the default experience.

## Measured pursuit and tactical overhead

`review-performance.mjs` warms each domain scenario five times and records thirty calls on 100×100×20 state, retaining 228 inactive actors. It measures only domain work, excluding React, layout and paint. Synthetic active encounters isolate blocked/reachable pursuit, clear shots, preparation and resolution; actors take normal seeded turns and stop on death. These are informational timings rather than machine-dependent test thresholds.

| Scenario | Active actors | Before median ms | After median ms | After p95 ms |
| --- | ---: | ---: | ---: | ---: |
| All player-adjacent goals occupied | 12 | 16.596 | 0.036 | 0.056 |
| Reachable pursuit | 12 | 0.414 | 0.424 | 0.464 |
| Clear archer shots | 10 | 0.016 | 0.016 | 0.024 |
| Brute preparation | 4 | 0.012 | 0.011 | 0.019 |
| Brute resolution | 4 | 0.012 | 0.011 | 0.015 |
| Visibility, radius 6 | — | 0.063 | 0.061 | 0.076 |

Blocked pursuit previously searched the whole floor despite having no available destination beside the player. A structural regression failed at 10,294 terrain-row reads for one pursuer. Checking the four possible goal tiles first avoids that impossible search. It leaves the existing BFS, neighbor tie order and ordered actor updates intact. Recorded pre-optimization fields for all forty old-policy runs matched post-optimization runs; existing pursuit/turn/replay and render-efficiency tests pass. No broader caching, shared path field or UI rendering rewrite is warranted by this measurement.

## Browser checkpoint and human handoff

Agent-driven browser review used isolated port 5174 at the existing 1280×720 viewport, both themes, and validated controlled 15×15×5 and 100×100×20 snapshots. The large snapshot retained 240 actors, twelve active, and a small carved review room; it is not a naturally occurring seed encounter.

Verified a visible preparation warning and log; stepping behind a wall both avoided the heavy attack and hid the archer without another shot; Heal from cover; Character pause and I toggle/map focus; Z plus a direction casting; low-health cue; large-map movement/scrolling; and actual file export/import with a pending attack. Resuming the downloaded file restored turn 4, the fixed target, map focus and keyboard targeting; a subsequent dodge logged avoidance at turn 5. No browser warnings/errors were observed. The existing backend-unavailable footer was unchanged. Temporary browser tab/server were closed, and the isolated origin's appearance was restored. Review screenshots accompany the story response.

Developer playtest suggestions: seed 1 on the default small configuration for the archer/brute rhythm; seed 8 for a more dangerous small adventure; a 50×50×10 run to judge repetition and XP pace. Try cover, holding position during preparation, dodging, healing while threatened, and saving/resuming mid-fight. This agent checkpoint does not substitute for your play or acceptance.

## Reproduction and verification

From the repository root, run each batch with `spell-aware` and `tactical-aware`, then repeat and compare the JSONL output:

```sh
pnpm --dir frontend exec node scripts/review-adventure.mjs --seed-start 0 --seed-count 20 --policy tactical-aware --max-actions 3000
pnpm --dir frontend exec node scripts/review-adventure.mjs --seed-start 0 --seed-count 20 --policy tactical-aware --rows 50 --cols 50 --floors 10 --max-actions 20000
pnpm --dir frontend exec node scripts/review-adventure.mjs 1 --policy tactical-aware --rows 100 --cols 100 --floors 20 --max-actions 100000
pnpm --dir frontend exec node scripts/review-performance.mjs
```

`--summary-only` prints aggregates; `LARN_REVIEW_TRACE=1` adds actions for diagnosing a particular seed. Reproducibility applies to the same rules, policy version, configuration and action budget. Timings are deliberately separate from deterministic adventure output.

Verification: 166 frontend files / 1,559 tests, Biome, standalone typecheck and TypeScript/Vite build through the commit hook. Backend `./gradlew test --rerun-tasks` executed both tests successfully. Developer acceptance and merge remain pending; this story is In Review.
