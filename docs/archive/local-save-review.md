# Manual local adventure saves: review guide

Epic #143, stories #138–142. Branch `codex/local-adventure-saves`; one commit per story. Implemented October 11, 2026. Developer accepted the epic and merged it into main.

**UI refinement:** Save/Load now has its own header button and sheet, separate from Settings. Confirmations, file flows and the one-slot format are unchanged; gameplay pauses while the new sheet is open. The original commit/browser history below records the initial Settings placement.

| Story | Commit | Review focus |
| --- | --- | --- |
| #138 | `a5984d8` | Full versioned snapshots; compact terrain/discovery; validation and deterministic next-action continuation. |
| #139 | `24baf3d` | One isolated storage slot; missing/corrupt/unavailable distinction; failed replacements preserve the old slot. |
| #140 | `e6e0455` | Settings previews and both confirmations; safe Cancel focus; paused gameplay; complete restore and map focus. |
| #141 | `61415ad` | Download and file chooser; shared validation; no extra confirmation or local-slot overwrite; cancellation and resource cleanup. |
| #142 | This document's commit | Real adventure/death/max-size regression tests, combined configuration/progression restore, browser review and documentation. |

## Product behavior

Save always confirms, including the empty slot. Load confirms before replacing current progress. Cancel/Escape changes neither slot nor run and spends no turn. Save/Load confirmation previews seed, floor/depth, level and turn; the Save/Load slot also displays its saved time. A failed write never deletes the old slot first.

Export downloads the current run immediately; Import loads a chosen valid file immediately. Neither changes the browser slot. Invalid/incompatible/oversized/unreadable files leave progress intact. Selecting the same file again works, and closing Save/Load aborts a pending read. There is no autosave or startup auto-load: a page reload starts a fresh run until the player explicitly loads/imports.

All operations live in the dedicated Save/Load sheet; gameplay stays paused while it is open. Restore applies state/configuration/fog together, resets drafts/errors/transient menus and clears targeting. The map receives focus after the closing animation. Victory is retained and its summary reopens; death remains ended. Appearance stays separate from the save.

## Data and boundaries

Version 1 stores full terrain, stairs, rooms/corridors/partitions; seed/current floor/position; configuration/fog; turn, health/mana/progression/known spells; equipment/bag/potion shortcuts; surviving monster IDs/positions/HP, retained floor loot and kill count; quest/victory; activity and each explored floor. It stores neither a command log nor a seed-only reconstruction.

Terrain becomes `.#` row strings; fog memory becomes `01` row strings with floor numbers. Decode restores terrain arrays and the exploration Map, then recomputes current sight. Generation metadata and played state remain ordinary JSON. Menus, targeting, errors, drafts, cached visibility, focus and scroll are transient.

Validation checks all required shapes and catalog identifiers, ordered floor dimensions, walkable actors/player/items, linked stair destinations/arrivals, unique actor/item ownership, compatible equipment slots, quest/cure/victory consistency, derived health/mana bounds, fog dimensions and ordered activity. Activity event kinds are enumerated against the TypeScript union so new kinds require a validation entry. Validation happens before applying imported/stored data; no React/domain action runs while parsing.

The format version is independent of storage. Unknown versions are rejected, not partially loaded. Incompatible model/catalog changes need a deliberate version bump or migration later. Stored terrain survives generator changes; old saves still use the running game's combat/balance rules, so continuation across changed rules is not promised. Saved IDs/seed/turn preserve keyed randomness within the same rules.

`SaveFormat`/`SaveValidation` have no browser-storage dependency. `LocalAdventureSave` and `AdventureSaveFiles` adapt that format to the browser; they share the same parse boundary. No dependencies or backend endpoints were added.

## Follow-up save boundary cleanup

Reviewed and merged into main from `codex/turn-ownership-cleanup`:

- `5863a15` rejects monsters on protected stair/arrival tiles using the same location rule as gameplay.
- `6dae4f5` defines the v1 saved-state aggregate and monster fields explicitly in `SaveDocumentV1.ts`, with the writer selecting those fields. Runtime shapes are checked in `SaveShapeV1.ts`, semantic rules in `SaveConsistency.ts`, and format-version dispatch in `SaveValidation.ts`.
- A literal `adventure-v1.json` fixture is retained independently of the current writer. Tests verify restore/continuation and prevent incidental state/monster properties from entering v1 output.

The boundary cleanup kept **version 1**; no migration was needed at that point. Story #147 subsequently adds **version 2** with instance intent and validated v1-to-idle migration on `codex/enemy-tactics`, pending developer review. Local reads do not rewrite legacy slot bytes; the next confirmed save writes v2. See [the tactics review guide](enemy-tactics-review.md). Balance/catalog compatibility checks still use the running game’s rules and may reject older snapshots after tuning. Deterministic continuation is guaranteed within identical rules, not across balance changes.

## Maximum-size measurement

Measured fully explored 100×100×20 snapshots, including every floor's metadata, current initial actors/loot/quest/inventory, and a fixed timestamp:

| Seed | JSON UTF-8 bytes | Conservative UTF-16 bytes | 5 MiB quota-limited round-trip |
| --- | --- | --- | --- |
| 0 | 1,674,928 | 3,349,856 | Passed |
| 123 | 1,676,954 | 3,353,908 | Passed |

Serialization took about 2.8 ms; parse plus restore about 14–16 ms locally. These are diagnostic observations, not universal browser timings or an autosave benchmark. They exclude the browser's physical storage write. A regression covers seed 0, twenty fully discovered floors and a storage adapter rejecting values above 5 MiB by UTF-16 estimate. The bounded 100-entry activity log and a played bag/drop population add some data; quota exceptions are still handled, rather than claiming every browser has available capacity.

Input is capped at 4 MiB of UTF-8 before JSON parsing; files are size-checked before reading. localStorage has a separate browser quota, so an acceptable file may still fail to store if that origin has insufficient space. Export remains available if local storage fails.

## Verification

- Snapshot tests: played-state round-trip, earlier-floor discovery/current sight, actual seeded melee at the thirtieth-turn recovery boundary, dead-run retention, unknown version/content/events, invalid ownership/position/link/resources, malformed/oversized input.
- Storage/file tests: empty slot, validated replacement, failed/invalid write preservation, corrupt/blocked reads, downloaded format/name/URL release, invalid/incompatible/oversized/unreadable files and cancellation.
- Home tests: first-save confirmation, Cancel initial focus, gameplay pause, canceled replacement/load, exact map/turn continuation, focus restoration, missing/corrupt slot, failed write, no startup load, file import without confirmation/slot writes, repeated invalid file choice, unfinished import cancellation, combined configuration/fog/progression/resources/knowledge restore, future new-run configuration and revalidation of a changed slot.
- Real seed 0 adventure: save on floor 2, then compare every subsequent action's state/discovery against the uninterrupted run through cure return/victory (128 turns with current thirty-turn recovery). Won/dead snapshots preserve ended-run guards. Maximum-size storage regression passes.
- Actual browser at separate `127.0.0.1:5174` origin: first save with Cancel focus; canceled overwrite with both previews; export turn 1; confirm Load of stored turn 0; restored map focus; import exported turn 1 while slot remains turn 0; invalid-file feedback with retained run/slot; light/dark controls and 1280×720 confirmation; page reload started turn 0 while preserving the saved turn-1 slot. No new console warnings/errors observed. The existing server-connectivity diagnostic remains unchanged.
- Final frontend tests, Biome and strict TypeScript/Vite build run through the commit hook. Backend Gradle tests passed (up-to-date). See final commit output for the exact test count.

## Developer checkpoint and later scope

Try saving halfway through your own adventure, change floors/equipment/spells, then cancel and confirm Load. Export and re-import, try a bad file, reload the page and explicitly Load, and try saving a won/dead run. Confirm that remembered tiles, local metadata and current resources match your expectations.

Browser storage belongs to a particular origin and browser profile; localhost and a deployed URL have separate slots. Clearing site data or private-session closure may remove saves. File backups/manual transfer are supported. No account, cloud synchronization, multi-slot manager, autosave, automated migrations, compression dependency or IndexedDB implementation was included. Add those only when the manual flow or measured storage needs justify them.
