# Adventure session and save validation review

Engineering epic [#274](https://github.com/danielgebhardt/larn-remake/issues/274), following the October 13 codebase review. Each refactor has its own commit; gameplay catalogs, balance and save format are unchanged.

## Session ownership — #275

`useAdventureSession` owns the game, active run configuration, fog settings, exploration and action feedback as one state value. New runs are fully constructed before replacing that value; loading likewise replaces a complete restored adventure. Actions still use the existing domain resolver, then project exploration and visible activity history exactly as before. Floor-specific objects, monsters and items retain their existing memoization.

Home owns configuration drafts and validation feedback, dialog lifecycle, focus restoration and keyboard/menu coordination. It calls session operations rather than independently setting active configuration, gameplay state and discovery. This is a bounded ownership extraction, not a new global state framework.

A new failure regression extends the existing terrain/stairs cases to gameplay-content creation. It failed against the old implementation because `createGameState` ran outside the generation guard. All three cases now retain the played map, active configuration and entered draft, and allow a later successful restart.

Focused new/load/exploration/replay coverage: 4 files, 37 tests passing. Complete frontend checks run through the normal commit hook.

## Deferred follow-ups

- [#277](https://github.com/danielgebhardt/larn-remake/issues/277): declared-toolchain CI and controlled browser smoke coverage.
- [#278](https://github.com/danielgebhardt/larn-remake/issues/278): measure cold startup before selectively splitting dialogs.
- [#279](https://github.com/danielgebhardt/larn-remake/issues/279): Small/Medium/Large start-dialog choices after or alongside difficulty #213. Exact fixed dimensions remain an implementation decision; the recommended balance baseline is 60×60×20.

Merchant SVG/display polish follows these refactors and has not been changed here.

## Save validation ownership — #276

`SaveSource.ts` centralizes source-version dispatch and derives the supported document union from the guard registry. The original 19 shape guards and migration adapters are unchanged. Source-specific consistency checks run before historical migration, and the migrated result is checked afterward. An already-current v19 document skips migration and the duplicate consistency pass. Unsupported, malformed and inconsistent input keep their existing error messages. No format version bump is needed.

`SaveConsistency.ts` now coordinates five bounded owners: inventory (slots, identity, merchant purchase ownership and cure), resources (health/mana, effects and assignments), geometry (floors/stairs/objects/discovery), actors (identity, position and intent) and history (chronology and victory summary). Small shared location/level helpers preserve the existing conventions. Inventory/equipment validation runs before resource calculations consult equipment bonuses. Check bodies and historical version differences are retained.

The new dispatch/consistency test file has 106 readable cases: all source versions load without mutation and remain valid after migration, while excess mana, duplicated ownership, nonreciprocal stairs and future history are rejected before migration. Malformed inputs and unsupported numeric/string versions retain their distinct feedback. These synthetic shared-field cases complement captured legacy fixtures and feature-specific migration tests; they do not replace those fixtures.

A matched local benchmark used the same seed-123 100×100×20 snapshot (1,536,439 bytes), one warm-up plus five timed parses: median 171.88 ms before, 93.01 ms afterward; maxima 177.53 and 95.37 ms. This is warm domain loading on this machine, not a cold browser performance claim. Further rewriting of layered shape guards is unnecessary for this bounded refactor.

Session commit verification: 290 files / 2,036 tests, Biome and TypeScript/production build passed. Save story verification uses the same full commit hook.
