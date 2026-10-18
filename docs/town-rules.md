# Level 0 town rules — #326

Current town and travel rules under epic #325. The potion, armor and weapon stores and The Rag & Bone are open; the remaining reserved buildings belong to later service stories.

## Location and starts

Town is a fixed authored level 0, with a layout identity, dimensions and coordinates of its own. It is never inserted into `DungeonRun.floors`; positive floor numbers, the configured dungeon floor count, seeded placement and arrival coordinates keep their existing meaning. The town uses no seed or dungeon-size settings. Its geography and authored storefronts are identical in every adventure. Future seeded stock is a separate service concern, not permission to randomize streets or entrances.

New/replayed adventures begin at the southern town approach facing the dungeon gate. Enter on the gate deliberately descends; Enter at the dungeon entrance deliberately returns. E remains object/sign inspection. Catalog retains an isolated preview.

Town and dungeon locations are explicit alternatives. Entering town must retain the actual dungeon run and its discovery, actors, loot and state, not regenerate it. The entrance and nearby arrival cells are reserved walkable locations. Deliberate gate interaction connects the town gate and floor-1 entrance; walking over a gate alone will not switch locations.

## Safety, time and resources

- Town has no hostile actors, combat phase, traps or random encounters. Dungeon monsters cannot pursue into it.
- Town walking, inspecting signs, opening/closing menus and normal gate travel do not advance adventure turns, the dungeon simulation, timed effects or passive recovery. Closed doors and blocked moves do nothing to resources or turns.
- Health, mana, gold, equipment, inventory, spell knowledge and every timed-effect duration are retained on entering/leaving. Poison does not tick in town, but neither does healing, regeneration, buff duration or mana recovery. Real time, walking, waiting, browsing, reload and re-entry cannot restore resources.
- Later town trades and services are free of dungeon time. Each transaction atomically changes only its stated payment, stock, ownership or service result. A healer may restore health only through its explicit paid service; shopping itself cannot tick healing/mana effects. Prices, finite stock, costs and later restock eligibility belong to #331 onward. Existing dungeon merchants keep their current one-turn trade rules and stock.
- No rest button, free shrine, implicit refill, passive interest or cross-adventure storage is part of this foundation. The potion, armor and weapon stores and The Rag & Bone are open; reserved services remain visibly closed.

## Ember homecoming and recall

The existing victory boundary remains authoritative: after recovering the ember, reaching the floor-1 entrance commits victory through the current domain rule. The beacon in town is its narrative destination, not a second hand-in condition or an alternate victory trigger. Do not require another walk after surviving the ascent.

Town admission during an active ember return is forbidden. A carrier reaching the entrance wins through the existing boundary before any ordinary town travel can occur. Victory remains terminal; town cannot be used for healing, shopping, storing the ember or recalling around the hunted ascent. A future playable victory epilogue requires its own story.

Town portal scrolls (#354, saved internally as `exit-scroll`) now create one returnable trip from a cleared dungeon area to the fixed circle west of the beacon at (8, 9). Reading spends one scroll and one originating-floor response/effect/recovery phase, then pauses the dungeon in town; fatal damage spends the scroll but leaves no portal or town location. Living enemies in line of sight within 8 tiles, or any prepared enemy attack on the active floor, prevent reading. The Last Ember always prevents use. Enter on the circle returns for free to the recorded floor and coordinate and closes the portal. If blocked by terrain, a creature or a live trap, choose a clear tile within three walkable steps in stable N/E/S/W breadth-first order. No safe tile: keep the portal open and explain the failure. Taking the south gate instead abandons the portal and enters floor 1; a blocked gate leaves everything intact. Ordinary town visits leave the circle dormant. Fresh runs/replay have no portal. Version 27 saves preserve the anchor. Formats v1–v26 are retired; see [save policy](save-policy.md).

## Death, replay and persistence

Death and victory retain ownership of ended adventures. Preview movement cannot move, revive or modify the actual character. Replay creates a new adventure with starting resources; it never carries service stock or stored goods across runs. Replay starts at the fixed town approach with a new dungeon and fresh stock.

Current v27 saves retain the played location and all owned state. They must not be moved into town, regenerated or granted resources on load. A town location must use `beacon-town:v2` and a valid walkable coordinate. Reject unknown layouts, blocked/out-of-bounds locations, a claimed dungeon floor 0, invalid stock or ownership inconsistent with depletion. Town visits preserve the actual positive-floor dungeon. Older save formats and town layouts are unsupported; see [save policy](save-policy.md).

## Acceptance scenarios

| Scenario | Required result |
| --- | --- |
| Different seed, dungeon size or floor count | Identical town dimensions, terrain, signs and entrance coordinates; unchanged dungeon settings. |
| Walk 100 town steps, inspect every closed shop, leave/re-enter or load | No free HP/MP, effect ticks, stock refill or advancement of the dungeon simulation. |
| Failed move, invalid coordinate, building roof or closed service | Safe rejection/status message; no ownership/resource changes and no dead-end dialog. |
| Enter from floor 1 without the ember, then return (#329) | Same dungeon actors, loot, exploration, turn and resources; deterministic valid arrival and map focus. |
| Carry ember, attempt recall/storage/town entry | No shortcut around the ascent; floor-1 entrance retains existing terminal victory. |
| Load a current dungeon save, die, replay | Preserve the loaded adventure; death stays terminal; replay starts fresh. |
| Preview the town while an adventure is running | Clearly marked preview; the adventure and its save/export remain unchanged. |

Original Larn inspires the town and its shops. This authored settlement belongs to The Last Ember; taxes, interest, classes, crafting and NPC quest systems are not implied by this plan. Developer review remains final acceptance.

The compact town uses `beacon-town:v2`; older layout identities are rejected.
