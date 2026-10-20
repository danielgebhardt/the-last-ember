# Urgent hunted return — #311

October 15, 2026, branch `codex/urgent-cure-return`. The developer selected a deliberately aggressive first experiment: retain up to four hunters, move them toward stair routes, use the ordinary floor-20 monster pool on every return floor, and give enemies wide cure sensing. No periodic reinforcements or descent changes are included. Human playtesting controls final acceptance.

## Implementation and tuning

- `EscapeEncounters.ts` retains four new hunters, the sixteen-living-actor cap and small-map density limit. Its `maximumNewMonsters` is the primary tuning knob. Floor-20 eligibility/weights select ordinary kinds; champions are excluded. Actors retain the actual floor number, ordinary difficulty-scaled health, abilities, XP and floor-based loot rules.
- `EscapeApproaches.ts` builds two distance maps per activation, from arrival and exit, excluding sealed chambers. Placement scores proximity to a connecting ascent route and a ten-step stair approach, alternating the preferred stair. Selection among the twelve best available tiles preserves seeded variation. Hunters are spaced apart; occupied/protected tiles are excluded. Closed ordinary doors can be part of a route, but new hunters never spawn on them. Disconnected terrain is excluded.
- New ranged hunters spawn farther from protected locations than their ranged attack distance. Other hunters begin idle and must move or prepare normally. A one-health/zero-mana arrival survives the first new-hunter phase on all three difficulties, including guaranteed maximum incoming rolls.
- `ESCAPE_PURSUIT_RULES.cureSenseRadius` is 24 orthogonal steps. All active-floor enemies sense the carrier through walls while in range. `MonsterTurns` distinguishes sensing from visual detection: sensed targets refresh pursuit, while attacks still require normal sight, ranges and telegraphs. Ordinary door-openers can plan an approach through a closed door and spend an action opening it; elite gates stay closed. Other creatures remain blocked by doors.
- Sleep, Fear and rooting retain their normal priority. Outside sensing range, the existing last-known-position memory/search applies. Inactive floors remain paused. Activity messages and Help explain the hunters, sensing and one-time waves without revealing hidden map tiles.

## Matched return evidence

Reused `scripts/review-return.mjs`, adding compact encounter/engagement counters and a direct-ascent policy. An encountered actor is within eight tiles and line of sight at a decision boundary. An engaged actor participates in a hit/damage roll or targeted control cast. Direct ascent follows the shortest known stair route, healing when the existing tactical policy selects healing; it bumps through blocking enemies. The original tactical policy prefers fighting nearby threats.

Normal 40×40×20, cleared descent, level 20, 33 starting health, fixed late gear, full mana, three greater healing and seven greater mana potions. Both versions use the approved evasion curve. These are controlled mechanics comparisons with omniscient routing, not human win rates or the original playtest save. The historical 3–4 human encounter count was not reproduced by these scripted policies; even the old rules produced 21–35 visible encounters, despite spawning 76 actors.

| Seed | Ascent-first encounters, old → new | Engaged, old → new | Defeated, old → new | Turns, old → new | Potions, old → new | Outcome |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 0 | 21 → 75 | 11 → 70 | 9 → 59 | 736 → 926 | 2 → 10 | Both escaped |
| 123 | 29 → 75 | 22 → 70 | 17 → 61 | 1,034 → 1,202 | 3 → 10 | Both escaped |
| 1172903873 | 35 → 75 | 27 → 72 | 20 → 68 | 955 → 1,129 | 3 → 7 | Both escaped |

Each completed ascent spawned exactly 76 hunters in both versions. The change increases meaningful contact and resource demand without increasing the count. The ascent-first policy still fights many blocking hunters; it does not demonstrate effortless kiting or guarantee an escape for every wounded build.

The old fight-first policy escaped all three seeds, defeating 21/28/34 actors. Under the new rules it died on floors 14/14/12 after 20/19/27 defeats, using all ten supplied potions. This supports the intended cost of lingering to clear threats; different policies are not a controlled estimate of player skill or difficulty. The initial result is intentionally harsh and should be judged through human play before changing supplies in #321.

Reproduce from the repository root, adding/removing `--legacy-return` and `--direct-ascent` for the four comparisons:

```sh
pnpm --filter frontend exec node scripts/review-return.mjs 0 123 1172903873 --rows 40 --cols 40 --floors 20 --max-actions 6000 --direct-ascent --legacy-return
```

`--legacy-return` loads only the four old return/pursuit modules from Git commit `33207d1` inside the diagnostic process. It requires that historical object locally and never modifies the checkout. The default command uses live rules. Seeded combat roll values are unchanged by telemetry.

## Continuity, safety and verification

V20 fields are unchanged. Existing actors, wounds, resources, terrain and activated-floor progress retain ownership. Loaded cure carriers immediately use the new sensing rule; only future, unactivated return floors generate the new pool/placement. Revisiting or loading an activated floor never replaces or duplicates its wave. Outcomes and future wave placement differ from the previous rules version, while current-rule save continuation remains deterministic. Existing legacy cure-carrier migration still exempts the loaded current floor from a surprise wave.

Focused tests cover pool eligibility, deterministic independent streams, route/stair proximity, ranged arrival buffers, occupancy/caps, 10/40/60/100-sized twenty-floor runs, valid saves, wounded arrivals across all difficulties, sensing boundaries and inactive floors, pursuit around walls, caster sight, door opening, control effects and mid-pursuit save continuation. Production browser coverage imports a cure carrier, ascends, checks the hunter announcement and Help explanation, and verifies focus and turn count.

The existing large-map benchmark now includes sixteen sensed hunters routing around a wall on 100×100×20 terrain: median **5.297 ms**, p95 **5.547 ms**, maximum **5.714 ms** across thirty warmed monster-phase samples on this machine. Timings are informational, not portable pass/fail thresholds. Run `pnpm --filter frontend exec node scripts/review-performance.mjs` to repeat.

For human review, compare continuing upward against stopping to clear a floor; note unavoidable-looking arrivals, corridor crowding, control usefulness and healing/mana demand. Cleared return floors still become safe; no timer prevents recovery after every hunter is defeated. Short five-floor/custom adventures also receive endgame hunters by the selected rule and may be especially punishing for lower-level characters. Keep sensing/placement/pool fixed initially and adjust the hunter count from that feedback. #311 stays open and In Review until developer acceptance.
