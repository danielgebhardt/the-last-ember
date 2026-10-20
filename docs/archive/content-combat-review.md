# Content and combat review

## Fixed-damage content milestone (#98)

Configuration: five 15×15 floors, default room generation, starter health 10, initial iron sword in the bag, and the catalog/density values documented in README. Combat still always hits at this milestone.

`pnpm --filter frontend exec node scripts/review-adventure.mjs` runs a reproducible diagnostic walker for seeds 0, 1, 123, and 987. It heals at health 6 or lower, equips carried improvements, attacks adjacent monsters, then visits nearest reachable monsters/items before descending. It knows unseen terrain/content and is not a player strategy, human playtest, or statistical win-rate test. It does not avoid dangerous opponents or optimize equipment changes under attack. Numeric seeds can be passed to inspect another run. The 500-action safety limit prevents a diagnostic loop from hanging.

| Seed | Deepest floor | Result | Turns | Health | Kills | Potions used |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | 5 | Cleared final floor | 118 | 8 | 12 | 4 |
| 1 | 4 | Died | 99 | 0 | 8 | 2 |
| 123 | 2 | Died | 23 | 0 | 4 | 0 |
| 987 | 5 | Cleared final floor | 151 | 8 | 14 | 3 |

Observations:

- Seeds 0 and 987 permit a complete descent with upgraded chest/head protection and timely healing. This does not establish that every seed is fair or winnable.
- Seed 123 supplies no initially found healing until floor 4; attacking everything without retreat runs out of health early. Loot weights remain probabilistic rather than guaranteeing a potion every floor.
- Seed 1 demonstrates that multiple deeper orcs can punish equipment/action choices even with leather protection. Chest/head protection matters against their four-damage hits, while every landed hit still deals at least one damage.
- No constants were changed solely to make this simple walker succeed. Reassess thresholds, healing supply, armor and crowding once randomized combat and a victory objective exist. In particular, stronger late-floor variety beyond two eligible monster kinds remains future work.

Browser review:

- Seed 0, five 15×15 floors: `w w d d g` from the start reaches and picks up leather armor. Open Character, select it, and equip in chest. Armor rises from 1 to 2, and the equip turn triggers normal retaliation.
- Character reviewed in dark/light desktop layouts and at 390×700; equipment, shared details, body scrolling, pinned stats/footer, and bag controls remain usable.
- Seed 0, five 100×100 floors: density caps each floor at 12 monsters. Ten alternating movement inputs resolved promptly. This is a responsiveness check with automation overhead, not a frame-time benchmark.
- Floor-count validation/settings now allow 20; monster and loot eligibility tests cover that boundary. Extension tests verify earlier floor populations/loot remain unchanged.
- Full frontend checks and production build pass at each story commit. Fixed corridor encounter tests explicitly request three actors so density tuning does not rewrite their intended scenario.

There is no quest/victory state yet. “Cleared final floor” is a diagnostic outcome, not a player-facing win condition. Twenty-floor configurations are supported but have not been balanced as complete adventures.

## Randomized combat milestone (#106)

Same five-floor configuration and diagnostic policy as above, now using real keyed combat rolls. Two independent runs produced identical output for all four seeds.

| Seed | Deepest | Result | Turns | Health | Kills | Potions | Player hits / misses | Monster hits / misses |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | 5 | Cleared final floor | 129 | 9 | 12 | 5 | 20 / 8 | 21 / 4 |
| 1 | 4 | Died | 102 | 0 | 9 | 2 | 16 / 5 | 18 / 7 |
| 123 | 2 | Died | 28 | 0 | 7 | 0 | 11 / 1 | 10 / 3 |
| 987 | 5 | Cleared final floor | 156 | 9 | 14 | 3 | 22 / 6 | 16 / 6 |

Counts include all events encountered, including those eventually trimmed from the displayed history. Small samples can have miss rates well above or below configured probabilities; these counts are observations, not statistical assertions or a balancing target.

Final rules remain the proposed player 85% / monster 80% accuracy, nominal damage ±1 (minimum raw 1), additive armor with minimum landed damage 1, and no critical hits. The examples did not justify changing thresholds simply to force the walker to win. Healing scarcity on some seeds and multiple-orc encounters remain explicit balance questions for the first winnable-adventure milestone. No twenty-floor balance claim is made.

Additional verification:

- Real seeded integration tests replay a corridor action sequence without global randomness, verify free/rejected actions leave the next attack unchanged, and retain populated inactive-floor actors by reference.
- Controlled outcome tests cover threshold and damage endpoints, misses without damage rolls, armor contributions, stable multi-actor ordering, kills/drops, healing before retaliation, fatal phase termination, and readable accessible log feedback.
- Browser seed 0, five 15×15 floors: equip the iron sword, close Character, then `a a d d`. The observed fight included a four-damage hit, a monster miss, and a two-damage hit. Both rats died, with player health 9. The script refers to this rules version, not a permanent seed-specific promise.
- Character displays 1–3 / 85% for the starting weapon and 2–4 / 85% after equipping the iron sword. Reviewed at desktop and 390×700 widths. Armor layout was also checked in light mode; colors preserve the existing theme tokens.
- Settings successfully created a 20-floor 15×15 run, with the header showing Floor 1 of 20.
- Settings also created a 20-floor 100×100 run. Ten alternating movement inputs advanced ten turns in roughly half a second including automation overhead; this is a practical input check, not a frame-time measurement. Only active-floor actors receive turns.

## Commit-by-commit review guide

| Story | Main change and review focus |
| --- | --- |
| #91 | Monster definitions, validated floor bands/stats, and distinct rat/orc icons. Existing AI remains shared. |
| #92 | Weighted eligible kind selection in a separate seed stream; Settings floor limit raised to 20; existing positions remain stable. |
| #93 | Four armor items and item floor/source metadata. Found and drop weights are independent. |
| #94 | Chest/head ownership, swaps and unequipping; additive armor and one normal retaliation phase. |
| #95 | Four visible equipment slots and an armor breakdown using shared details, with UI tests and responsive review. |
| #96 | Eligible weighted found loot and per-monster drops; shared future-stair reservation preserves earlier loot when extending runs. |
| #97 | Safe-space density with minimum two / cap twelve, plus explicit count overrides and fixed-count corridor fixtures. |
| #98 | Recorded fixed-damage content review, diagnostic walker, and weighted-selection boundary/validation tests. |
| #100 | Pure D20 threshold and bounded-damage rules, independently tested before gameplay integration. |
| #101 | Independent hit/damage contexts keyed by seed, floor, turn and actor identities; no mutable global RNG. |
| #102 | Player hit/miss integration and controlled-roll helpers that isolate older ownership/AI/UI scenarios. Real seeded tests use the domain directly. |
| #103 | Per-monster outcomes in stable order, cumulative armor, phase termination on death, and roll-source forwarding through every action path. |
| #104 | Honest damage range/accuracy display and Help/README explanations. Chance text derives from the shared thresholds. |
| #105 | Cross-action narrative tests, catalog-derived names, and accessible miss feedback without invented damage. |
| #106 | Real seeded replay/inactive-floor regressions, diagnostic hit/miss counts, final browser checks, and these review notes. No gameplay tuning was hidden in a statistical test. |

Both epics remain In Review until developer acceptance. The quest, victory screen, XP, attributes, and magic are still future work.

The diagnostic walker was subsequently extended in epic #109 to recover the cure and return to the entrance. The historical results above describe the original content/combat review; see [adventure review notes](adventure-review.md) for current objective outcomes.
