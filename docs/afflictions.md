# Afflictions

Current reference for harmful player conditions. Each affliction's definition in `AFFLICTION_DEFINITIONS` (`frontend/src/domain/game/AfflictionDefinitions.ts`) is the single source. It holds the lifetime, the modifiers, whether it blocks running, the cure item, the sanctuary fee and all of its text. The sanctuary services, status popovers, Developer Catalog, bestiary traits, remedy text, Activity messages and save validation all derive from it. Story history lives in epic #382.

## Shared rules

- **Cap:** at most **three** active conditions (`PLAYER_AFFLICTION_LIMIT`). A fourth is rejected and logged; nothing is displaced.
- **Lifetime:** `until-cured` or a number of committed phases. The landing phase counts as phase 1. Reapplying a timed condition resets its duration without deepening it; reapplying at full strength is a silent no-op.
- **Step damage:** Bleeding's `damagePerMove` ticks once per successful voluntary dungeon step (`tickMovementDamage`), including run steps and a step onto stairs, before the arrival tile's gold and trap resolve. A lethal step ends the action there. Waits, attacks, failed moves, town movement and forced relocation don't tick.
- **Phase order:** monsters act, then affliction damage ticks (`tickAfflictionDamage`), then timed effects (Renewal, monster poison), then affliction durations advance, then mana recovery. Lethal poison therefore can't be healed away by Renewal in the same phase. Expiry is logged once.
- **Cures:** each remedy item lists `removesAfflictions`. One effective use costs one item and one turn and clears its conditions before monsters act. Using it with nothing to cure is free and names what is absent. The sanctuary cures any condition for its `sanctuaryFee`; a complete cleanse costs min(600, the total). Cures restore capacity, never HP or mana.
- **Running:** a condition with `blocksRunning` refuses corridor runs while it lasts; any onset stops a run.
- **Visibility:** status icons lead the HUD row in a fixed single row. Popovers give exact current numbers from `afflictionImpact`, the rule and both cures. Character stat notes name the condition behind each changed value.

## Conditions

| Condition | Lifetime | Effect | Portable cure | Sanctuary | Sources |
|---|---|---|---|---|---|
| Poison | 6 phases | 1 damage per phase after monsters act | Antidote | 40 | Giant spider and wyvern bites, fountains, thrones |
| Disease | until cured | Maximum HP ×0.8 (minimum 1) | Cure Disease potion | 150 | Plague rat (floors 2–6), 20% per landed bite |
| Slowed | 30 phases | Evasion −10 points (minimum 5%) | Cleansing potion | 50 | Giant spider web (telegraphed; step off the tile) |
| Mana Burn | 90 phases | No passive mana recovery (three lost 30-turn ticks) | Cleansing potion | 75 | Mana leech (floors 9–16): every hit drains 2–4 mana, plus a 20% burn |
| Curse | until cured | Melee to-hit −10, melee damage −1 (minimum 1) | Remove Curse scroll | 250 | Hexweaver (floors 6–12): telegraphed ranged hex, 2 arcane damage plus Curse |
| Soul Drain | until cured | Maximum mana ×0.8 (minimum 1) | Soul Restoration potion | 400 | Soul wraith (floors 14–20): unprepared soul bolt in sight within 3 tiles, 6 shadow damage plus Soul Drain; 4-phase cooldown |
| Bleeding | until cured | 1 damage per successful dungeon step | Bandages | 50 | Visible traps that deal damage (30%, `seed:trap-id:bleeding`); wolves (floors 2–9), 15% per landed bite |
| Blinded | 30 phases | Live sight radius capped at 2 (map memory kept), melee to-hit −20 | Cleansing potion | 50 | Shadow stalker (floors 7–14): telegraphed adjacent strike; a landed melee roll blinds |

Monster poison (from the Poison Dart spell) is a separate monster timed effect.

## Sources and remedy supply

- **Sparse budget:** dedicated source monsters (`afflictionSource`) never spawn through ordinary selection. On each eligible floor, a 25% roll on `seed:floor:affliction-source` replaces one of the first two ordinary spawns, so there is at most one source per floor. Giant spiders and wolves are explicit exceptions: every spider can web and every wolf bite can cause Bleeding, and traps are a non-monster source.
- **Guaranteed cure:** at adventure creation, the shallowest source of each affliction saves `remedyDrop` and always drops that affliction's cure.
- **Remedy loot:** remedies join floor, chest and drop loot in their floor bands. Cure Disease: floors 2–6. Cleansing: 3–12. Remove Curse: 6–14. Bandages: 2–12. Soul Restoration: 14–20. Antidote: from floor 2.
- **Telegraphed attacks:** webs, hexes and blinding strikes mark their intent first. Sleep or Fear cancels a prepared attack. `TARGET_TELEGRAPHS` (`MonsterTelegraphs.ts`) declares each single-target telegraph's owner, saved-target check and threat advice; the saved `telegraphTurn` record enforces cooldowns.
- **Sight:** Blinded's `sightRadius` modifier caps the radius passed to exploration, so rendering, inspection, targeting and threat markers share one visibility grid. With fog disabled in Settings everything stays visible.

## Adding a condition

Adding one means a definition, its mechanic hook, a remedy item, an icon and a Help entry. The contract tests (`AfflictionContract`, `AfflictionSources`, `SanctuaryConditions`) and the test seed then cover it automatically.
