# Level 0 town rules — #326

Selected for implementation by the developer under epic #325. These rules govern the town foundation and its later travel/services; Live travel is connected in #329; shop services remain staged separately.

## Location and starts

Town is a fixed authored level 0, with a layout identity, dimensions and coordinates of its own. It is never inserted into `DungeonRun.floors`; positive floor numbers, the configured dungeon floor count, seeded placement and arrival coordinates keep their existing meaning. The town uses no seed or dungeon-size settings. Its geography and initial closed buildings are identical in every adventure. Future seeded stock is a separate service concern, not permission to randomize streets or entrances.

New/replayed adventures begin at the southern town approach facing the dungeon gate. Enter on the gate deliberately descends; Enter at the dungeon entrance deliberately returns. E remains object/sign inspection. Catalog retains an isolated preview.

Town and dungeon locations are explicit alternatives. Entering town must retain the actual dungeon run and its discovery, actors, loot and state, not regenerate it. The entrance and nearby arrival cells are reserved walkable locations. Deliberate gate interaction connects the town gate and floor-1 entrance in #329; walking over a gate alone will not switch locations.

## Safety, time and resources

- Town has no hostile actors, combat phase, traps or random encounters. Dungeon monsters cannot pursue into it.
- Town walking, inspecting signs, opening/closing menus and normal gate travel do not advance adventure turns, the dungeon simulation, timed effects or passive recovery. Closed doors and blocked moves do nothing to resources or turns.
- Health, mana, gold, equipment, inventory, spell knowledge and every timed-effect duration are retained on entering/leaving. Poison does not tick in town, but neither does healing, regeneration, buff duration or mana recovery. Real time, walking, waiting, browsing, reload and re-entry cannot restore resources.
- Later town trades and services are free of dungeon time. Each transaction atomically changes only its stated payment, stock, ownership or service result. A healer may restore health only through its explicit paid service; shopping itself cannot tick healing/mana effects. Prices, finite stock, costs and later restock eligibility belong to #331 onward. Existing dungeon merchants keep their current one-turn trade rules and stock.
- No rest button, free shrine, implicit refill, passive interest or cross-adventure storage is part of this foundation. The potion store opens in #332; other buildings remain visibly closed until their service story opens them.

## Ember homecoming and recall

The existing victory boundary remains authoritative: after recovering the ember, reaching the floor-1 entrance commits victory through the current domain rule. The beacon in town is its narrative destination, not a second hand-in condition or an alternate victory trigger. Do not require another walk after surviving the ascent.

Town admission during an active ember return is forbidden. In #329, a carrier reaching the entrance wins through the existing boundary before any ordinary town travel can occur. Victory remains terminal; town cannot be used for healing, shopping, storing the ember or recalling around the hunted ascent. A future playable victory epilogue requires its own story.

Exit scrolls retain their exact behavior: return to floor 1 beside the dungeon entrance, never to town; they cannot be read while holding the ember. No deep-floor town access or extra recall route is introduced.

## Death, replay and persistence

Death and victory retain ownership of ended adventures. Preview movement cannot move, revive or modify the actual character. Replay creates a new adventure with starting resources; it never carries service stock or stored goods across runs. Before #329, replay retains the current dungeon start; after #329 it may use the fixed town approach.

Current and legacy dungeon saves keep their played dungeon locations and all actual owned state. They must not be moved into town, regenerated or granted resource changes on load. A town location must carry the supported layout identity and a valid walkable coordinate; reject unknown identities, blocked/out-of-bounds locations and a claimed dungeon floor 0. #329 integrates the town location into v23 adventure saves; v1–v22 saves retain their dungeon location. V24 adds separately owned finite town-potion stock in #332; older saves initialize it once, and current saves retain actual depletion. The broader inventory/stock audit remains in #342. Do not silently serialize a town visit as a dungeon floor.

## Acceptance scenarios

| Scenario | Required result |
| --- | --- |
| Different seed, dungeon size or floor count | Identical town dimensions, terrain, signs and entrance coordinates; unchanged dungeon settings. |
| Walk 100 town steps, inspect every closed shop, leave/re-enter or load | No free HP/MP, effect ticks, stock refill or advancement of the dungeon simulation. |
| Failed move, invalid coordinate, building roof or closed service | Safe rejection/status message; no ownership/resource changes and no dead-end dialog. |
| Enter from floor 1 without the ember, then return (#329) | Same dungeon actors, loot, exploration, turn and resources; deterministic valid arrival and map focus. |
| Carry ember, attempt recall/storage/town entry | No shortcut around the ascent; floor-1 entrance retains existing terminal victory. |
| Load an old dungeon save, die, replay | Preserve the loaded adventure; death stays terminal; replay starts fresh. |
| Preview the town while an adventure is running | Clearly marked preview; the adventure and its save/export remain unchanged. |

Original Larn inspires the town and its shops. This authored settlement belongs to The Last Ember; taxes, interest, classes, crafting and NPC quest systems are not implied by this plan. Developer review remains final acceptance.

The compact `beacon-town:v2` layout relocates valid older v1 town visits to its safe arrival square. Original positions are checked against the original geometry before migration. This layout-only migration does not change the outer save schema, dungeon state, resources, time, inventory or store depletion; malformed or unknown town locations are still rejected.
