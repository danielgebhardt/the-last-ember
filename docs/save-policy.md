# Save format and compatibility policy

As of October 18, 2026, **v27 is the only supported format**. The developer is still the only player and explicitly retired v1–v26. Current v27 files and the browser slot remain usable. Old formats are rejected before inspecting their payload; they are never regenerated, migrated, overwritten or granted new stock/resources.

## Current boundary

- `SaveDocument.ts` selects persisted state explicitly. Runtime/UI additions must not automatically enter saved files.
- `SaveFormat.ts` writes actual played state, bounds JSON imports to 4 MiB, encodes/restores terrain and discovery, and produces summaries.
- `SaveShape.ts` directly validates v27 fields and activity variants. It does not manufacture earlier-version views of actors/events.
- `SaveValidation.ts` checks version, shape, then cross-field consistency once. Inventory is checked before resource calculations read equipment bonuses.
- The separate consistency owners enforce item ownership/stock depletion, capacities/effects, floor geometry/stairs, monster positions/intents/memory, chronology, victory, town access, portal anchors and the escape state.
- Local/file import paths share this boundary. Failure preserves the played session and existing browser slot. Loading alone never writes storage.

Validation remains necessary even without external players: incomplete writes, manual file edits, stale browser data and implementation mistakes can otherwise produce broken sessions. Removing migrations does not justify dropping ownership, bounds or continuation checks.

## Test ownership

Keep a captured `adventure-v27.json` fixture independent of future writers, current-format round trips, representative malformed/inconsistent inputs, deterministic continuation, town/stock/portal ownership, and UI storage/import failure behavior. Test each current invariant once at its owning boundary; feature-specific replay tests cover distinct behavior. Do not reproduce those checks under every retired version.

`SaveTestHelpers.savedAdventure()` builds a deterministic fixture lazily and returns a deep clone per caller. It is test-only: live adventures still generate from the requested seed and settings.

## When outside players start

Treat v27 as an explicit baseline, not a promise of perpetual compatibility. Before a persisted-contract change, decide whether to retain v27, provide a narrow migration, or deliberately retire it with a visible release note. Capture a representative prior file and test the actual supported transition. Keep older fixtures/adapters only while they serve a declared support policy. Never silently reinterpret an incompatible file as a new adventure.

## Ancient sarcophagi (#350)

Retain v27 with additive, explicitly selected fields: optional `Monster.heroic` and `DungeonObject.sarcophagusOutcome`. Existing v27 saves have neither and continue without regenerating content. New tombs fix their result from the saved seed and stable object identity; opening stores that result and the existing activated flag. Guardian health is saved as played, never rescaled on restore. Validation checks the selected result, guardian identity/kind/health and treasure ownership. No historical migration or save-format bump is introduced.

## Rare MR equipment (#374 / #375)

Retain v27. MR is immutable item-catalog data, so owned items persist only their ordinary ID, kind and optional enchantment. The optional `rareEquipment` record fixes the seeded dungeon allocation, acquired flag and original location. Previous v27 town allocations remain readable; new town stock is universal and independent of the dungeon roll.

New adventures also save `townEquipmentPurchases`, a per-copy purchase ledger. It prevents purchased/sold copies from reappearing in stock and permits one finite town copy of each MR item alongside the independent dungeon copy. Existing v27 saves without this ledger retain actual played stock/ownership; loading never adds the new universal stock. Three retired +1 store IDs remain recognized solely so existing stock/owned gear stays loadable. They are excluded from active offers and cannot be bought. This is current-v27 validation, with no retired-format migration or regeneration.

## Disease slice (#355 / #356)

Retain v27 with optional `afflictions`, explicitly selected by the writer. Missing means no afflictions; loading adds no conditions, cures or stock. Registered kinds, unique ownership of each condition, valid lifetime/source and derived effective resource bounds are validated. Disease is until-cured and stores a null remaining lifetime. Actual HP and source survive continuation; capacity is validated, never reapplied on load. Existing poison/buff timers remain unchanged. No historical migrations.

New adventures mark `dungeonRemedies: true` so adding remedy loot cannot reinterpret the reward sequence of an existing v27 chest or monster drop. Absent/false retains the previous loot pool; saved inventory remains authoritative. Sarcophagus reward selection stays unchanged. The marker is explicitly saved and validated; loading does not generate supplies.

## Plague Rat (#365)

Retain v27 with an optional, explicitly written `Monster.remedyDrop` marker for the first carrier's guaranteed Cure Disease drop. It is valid only on an affliction-source kind in a `dungeonRemedies` adventure and at most once. Existing saves keep their saved monsters; loading never adds carriers or remedies.

## Slowed (#358)

Retain v27. The optional `afflictions` array accepts Slowed with a numeric remaining lifetime; consistency requires each kind's lifetime to match its definition (Disease `null`, Slowed 1–10). Activity `affliction-changed` adds `expired`. No migration.

## Cleansing potion (#363)

Retain v27 with an optional, explicitly written `cleansingRemedies` marker. Only marked adventures add the Cleansing potion to chest/drop/floor selection; Disease-era saves with only `dungeonRemedies` keep their earlier reward sequences. Loading never generates supplies.

## Giant spider web (#366)

Retain v27 with an optional `Monster.webTurn` cooldown (web kinds only, never after the saved turn) and a `preparing-web` intent (web kinds only, a walkable target within range). `remedyDrop` generalizes to one marker per affliction, valid only when that affliction's remedy is enabled. Existing spiders gain the web as catalog behavior from their next action; no migration or regeneration.

## Forgotten Forge (#352)

Retain v27 with an optional, explicitly written `DungeonObject.forgeResult`. Valid only on a spent forge (floor 6+, at most one); a risky result must equal the seed-derived outcome. Raising the shared discovery budget changes only new adventures because saved objects are authoritative.

## Wishing Well (#349)

Retain v27 with an optional `DungeonObject.wellResult` (offering, outcome) that must match the seed. Reward gear and the reserved `floor:1000002` hostile creature are validated against their spent well. No migration; only new adventures can contain wells.
